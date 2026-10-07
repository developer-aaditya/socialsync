from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import CursorPagination
from django.shortcuts import get_object_or_404
from django.db import transaction
from .models import Post, PostInteraction, Comment, CommentInteraction, Story, StoryView
from .serializers import (
    PostSerializer, PostCreateSerializer, CommentSerializer, CommentCreateSerializer,
    StorySerializer, StoryCreateSerializer, StoryViewerSerializer
)
from notifications.models import Notification
from rest_framework.throttling import ScopedRateThrottle
from django.db.models import F, Count, Case, When, Value, IntegerField, ExpressionWrapper
from django.utils import timezone
from datetime import timedelta
from .tasks import compress_and_convert_post_image
from django.core.cache import cache
from django.conf import settings



class LatestPostCursorPagination(CursorPagination):
    page_size = 10  # Number of posts per page
    ordering = '-created_at'  # Order by creation date, newest first
    cursor_query_param = 'cursor'  # Query parameter for the cursor
    

class ForYouPostCursorPagination(CursorPagination):
    page_size = 10  # Number of posts per page
    ordering = '-score'  # Order by engagement score, highest first
    cursor_query_param = 'cursor'  # Query parameter for the cursor


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_posts_view(request):
    # Retrieve pagenated posts feed with redis caching
    feed_type = request.query_params.get('feed_type', 'latest') # Default to 'latest' feed if not specified
    cursor_param = request.query_params.get('cursor', 'first_page')  # Default to first page if no cursor is provided

    # Build a unique cache key based on feed type, user ID, and cursor parameter
    cache_key = f"feed:{feed_type}:user:{request.user.id}:cursor:{cursor_param}"
    
    # Check if the feed is already cached in Redis
    cached_response = cache.get(cache_key)
    if cached_response:
        return Response(cached_response, status=status.HTTP_200_OK)

    # If not cached, fetch posts from the database based on feed type
    if feed_type == 'for_you':
        # Fetch posts from the last 7 days for the "For You" feed.
        seven_days_ago = timezone.now() - timedelta(days=7)
        user_college = getattr(request.user, 'college', None)
        posts = Post.objects.filter(created_at__gte=seven_days_ago)
        
        # Compute Engagement Score directly in the database using annotations for performance.
        posts = posts.annotate(
            comment_count=Count('comments', distinct=True),
            college_bonus=Case(
                When(user__college__iexact=user_college, then=Value(15)),
                default=Value(0),
                output_field=IntegerField()
            )
        ).annotate(
            score=ExpressionWrapper(
                (F('likes_count') * 2) - (F('dislikes_count') * 1) + (F('comment_count') * 3) + F('college_bonus'),
                output_field=IntegerField()
            )
        )
        # 3. Apply Cursor Pagination on DB-ranked QuerySet (LIMIT 5 per fetch)
        paginator = ForYouPostCursorPagination()
        
    else:
        # Default latest feed with cursor pagination for performance and scalability.
        posts = Post.objects.all().order_by('-created_at')
        paginator = LatestPostCursorPagination()
        
    paginated_posts = paginator.paginate_queryset(posts, request)
    serializer = PostSerializer(paginated_posts, many=True, context={'request': request})
    response = paginator.get_paginated_response(serializer.data).data

    # Cache the response for future requests
    cache_set_ttl = getattr(settings, 'CACHE_TTL', 60 * 15)  # Use the cache TTL defined in settings.py
    cache.set(cache_key, response, timeout=cache_set_ttl)

    # Return the DRF paginated response (includes next/previous links and count)
    return response(response, status=status.HTTP_200_OK)
    

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([ScopedRateThrottle])
def posts_view(request):
    # Handle listing (GET) and creating (POST) posts on the same endpoint.
    if request.method == 'GET':
        posts = Post.objects.filter(user=request.user)
        serializer = PostSerializer(posts, many=True, context={'request': request})
        return Response(
            {
                'count': posts.count(),
                'posts': serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    # POST (Creating a new post for throttled to 10 requests per minute)
    request.throttle_scope = 'post_creation'
    serializer = PostCreateSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        post = serializer.save()
        
        # Trigger the background celery task to compress and convert image asynchronously
        compress_and_convert_post_image.delay(post.id) 
        
        response_serializer = PostSerializer(post, context={'request': request})
        return Response(
            {
                'message': 'Post created successfully',
                'post': response_serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'DELETE'])
@permission_classes([IsAuthenticated])
def single_post_view(request, post_id):
    post = get_object_or_404(Post, id=post_id)
    if request.method == 'GET':
        serializer = PostSerializer(post, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    # DELETE
    if post.user != request.user:
        return Response({
            'error': 'You can only delete your own posts'
        }, status=status.HTTP_403_FORBIDDEN)
    post.delete()
    return Response({
        'message': 'Post deleted successfully'
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def like_post_view(request, post_id):
    # database transaction to ensure data consistency
    with transaction.atomic():
        post = Post.objects.select_for_update().get(id=post_id)
        if not post:
            return Response({
                'error': 'Post not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # # Users cannot like their own posts
        # if post.user == request.user:
        #     return Response({
        #         'error': 'You cannot like your own post'
        #     }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if user already has an interaction with this post
        try:
            interaction = PostInteraction.objects.get(user=request.user, post=post)
            
            if interaction.interaction_type == PostInteraction.LIKE:
                # User already liked this post, so remove the like
                interaction.delete()
                post.likes_count = max(post.likes_count - 1, 0)  # Ensure likes_count doesn't go negative
                message = 'Like removed'
                user_interaction = None
            else:
                # User disliked this post, change to like
                interaction.interaction_type = PostInteraction.LIKE
                interaction.save()
                post.dislikes_count = max(post.dislikes_count - 1, 0)  # Ensure dislikes_count doesn't go negative
                post.likes_count += 1
                message = 'Post liked'
                user_interaction = 'like'
                if post.user != request.user:
                    Notification.objects.create(
                        receipient=post.user,
                        actor=request.user,
                        notification_type='like',
                        post=post
                    )
                
        except PostInteraction.DoesNotExist:
            # User hasn't interacted with this post yet, create new like
            PostInteraction.objects.create(
                user=request.user,
                post=post,
                interaction_type=PostInteraction.LIKE
            )
            post.likes_count += 1
            message = 'Post liked'
            user_interaction = 'like'
            if post.user != request.user:
                Notification.objects.create(
                    receipient=post.user,
                    actor=request.user,
                    notification_type='like',
                    post=post
                )
    
        # Save the post after updating counts
        post.save()
            
    return Response({
        'message': message,
        'likes_count': post.likes_count,
        'dislikes_count': post.dislikes_count,
        'user_interaction': user_interaction
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def dislike_post_view(request, post_id):
    # Use database transaction to ensure data consistency
    with transaction.atomic():
        post = Post.objects.select_for_update().get(id=post_id)
        
        # Users cannot dislike their own posts
        if post.user == request.user:
            return Response({
                'error': 'You cannot dislike your own post'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if user already has an interaction with this post
        try:
            interaction = PostInteraction.objects.get(user=request.user, post=post)
            
            if interaction.interaction_type == PostInteraction.DISLIKE:
                # User already disliked this post, so remove the dislike
                interaction.delete()
                post.dislikes_count = max(post.dislikes_count - 1, 0)
                message = 'Dislike removed'
                user_interaction = None
            else:
                # User liked this post, change to dislike
                interaction.interaction_type = PostInteraction.DISLIKE
                interaction.save()
                post.likes_count = max(post.likes_count - 1, 0)
                post.dislikes_count += 1
                message = 'Post disliked'
                user_interaction = 'dislike'
                
        except PostInteraction.DoesNotExist:
            # User hasn't interacted with this post yet, create new dislike
            PostInteraction.objects.create(
                user=request.user,
                post=post,
                interaction_type=PostInteraction.DISLIKE
            )
            post.dislikes_count += 1
            message = 'Post disliked'
            user_interaction = 'dislike'
    
        # Save the post after updating counts
        post.save()
        
    return Response({
        'message': message,
        'likes_count': post.likes_count,
        'dislikes_count': post.dislikes_count,
        'user_interaction': user_interaction
    }, status=status.HTTP_200_OK)
    

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def post_comments_view(request, post_id):
    post = get_object_or_404(Post, id=post_id)
    
    # GET: List all top-level comments for this post (parent_comment is None)
    if request.method == 'GET':
        top_level_comments = Comment.objects.filter(post=post, parent_comment=None)
        serializer = CommentSerializer(top_level_comments, many=True, context={'request': request})
        return Response({
            'count': top_level_comments.count(),
            'comments': serializer.data,
        }, status=status.HTTP_200_OK)
        

    # POST: Create a new comment for this post
    serializer = CommentCreateSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        parent_comment = serializer.validated_data.get('parent_comment')
        
        # If parent_comment is provided, ensure it belongs to the same post
        if parent_comment and parent_comment.post != post:
            return Response({
                'error': 'Parent comment must belong to the same post'
            }, status=status.HTTP_400_BAD_REQUEST)
            
        comment = serializer.save(user=request.user, post=post)
        
        # Create notification for post author (if not commenting on own post)
        if post.user != request.user:
            Notification.objects.create(
                receipient=post.user,
                actor=request.user,
                notification_type='comment',
                post=post,
                comment=comment
            )
            
        # Create notification for parent comment author (if this is a reply)
        if parent_comment and parent_comment.user != request.user and parent_comment.user != post.user:
            Notification.objects.create(
                receipient=parent_comment.user,
                actor=request.user,
                notification_type='reply',
                post=post,
                comment=comment
            )

        response_serializer = CommentSerializer(comment, context={'request': request})
        return Response({
            'message': 'Comment created successfully',
            'comment': response_serializer.data,
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_comment_view(request, comment_id):
    comment = get_object_or_404(Comment, id=comment_id)
    
    # Check if the current user owns this comment
    if comment.user != request.user and comment.post.user != request.user:
        return Response({
            'error': 'You can only delete your own comments or comments on your posts'
        }, status=status.HTTP_403_FORBIDDEN)
    
    comment.delete()
    return Response({
        'message': 'Comment deleted successfully'
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def like_comment_view(request, comment_id):
    comment = get_object_or_404(Comment, id=comment_id)
    
    with transaction.atomic():
        try:
            interaction = CommentInteraction.objects.get(user=request.user, comment=comment)
            if interaction.interaction_type == CommentInteraction.LIKE:
                # User already liked this comment, so remove the like
                interaction.delete()
                message = 'Like removed from comment'
            else:
                # User disliked this comment, change to like
                interaction.interaction_type = CommentInteraction.LIKE
                interaction.save()
                message = 'Comment liked'
        except CommentInteraction.DoesNotExist:
            # User hasn't interacted with this comment yet, create new like
            CommentInteraction.objects.create(
                user=request.user,
                comment=comment,
                interaction_type=CommentInteraction.LIKE
            )
            message = 'Comment liked'
    return Response({'message': message}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def dislike_comment_view(request, comment_id):
    comment = get_object_or_404(Comment, id=comment_id)

    # User cannot dislike their own comment
    if comment.user == request.user:
        return Response({
            'error': 'You cannot dislike your own comment'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    with transaction.atomic():
        try:
            interaction = CommentInteraction.objects.get(user=request.user, comment=comment)
            if interaction.interaction_type == CommentInteraction.DISLIKE:
                # User already disliked this comment, so remove the dislike
                interaction.delete()
                message = 'Dislike removed from comment'
            else:
                # User liked this comment, change to dislike
                interaction.interaction_type = CommentInteraction.DISLIKE
                interaction.save()
                message = 'Comment disliked'
        except CommentInteraction.DoesNotExist:
            # User hasn't interacted with this comment yet, create new dislike
            CommentInteraction.objects.create(
                user=request.user,
                comment=comment,
                interaction_type=CommentInteraction.DISLIKE
            )
            message = 'Comment disliked'
    return Response({'message': message}, status=status.HTTP_200_OK)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def stories_view(request):
    """
    GET: List active non-expired 24-hour stories.
    POST: Upload a new 24-hour story.
    """
    if request.method == 'GET':
        active_stories = Story.active.all().order_by('-created_at')
        serializer = StorySerializer(active_stories, many=True, context={'request': request})
        return Response({
            'count': active_stories.count(),
            'stories': serializer.data
        }, status=status.HTTP_200_OK)

    elif request.method == 'POST':
        serializer = StoryCreateSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            story = serializer.save(user=request.user)
            res_serializer = StorySerializer(story, context={'request': request})
            return Response({
                'message': 'Story published successfully (expires in 24 hours)',
                'story': res_serializer.data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_story_viewed_view(request, story_id):
    """
    Mark a story as viewed by the authenticated user.
    """
    story = get_object_or_404(Story, id=story_id)
    if story.is_expired():
        return Response({'error': 'This story has expired.'}, status=status.HTTP_410_GONE)

    view_obj, created = StoryView.objects.get_or_create(story=story, viewer=request.user)
    return Response({
        'message': 'Story marked as viewed',
        'already_viewed': not created,
        'views_count': story.views.count()
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_story_viewers_view(request, story_id):
    """
    Get the list of viewers for a story (Only accessible by story owner).
    """
    story = get_object_or_404(Story, id=story_id)
    if story.user != request.user:
        return Response({'error': 'You can only view viewer lists for your own stories.'}, status=status.HTTP_403_FORBIDDEN)

    views = story.views.all()
    serializer = StoryViewerSerializer(views, many=True, context={'request': request})
    return Response({
        'count': views.count(),
        'viewers': serializer.data
    }, status=status.HTTP_200_OK)