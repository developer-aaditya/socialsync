from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import UserSignupSerializer, UserLoginSerializer, UserProfileSerializer
from rest_framework.throttling import AnonRateThrottle
from django.shortcuts import get_object_or_404
from .models import User, Follow
from notifications.models import Notification
from posts.models import Post
from posts.serializers import PostSerializer
from django.db import transaction
from django.db.models import Q


class AuthRateThrottle(AnonRateThrottle):
    scope = 'auth'


def get_tokens_for_user(user):
    # Generate JWT tokens for a user.
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([AuthRateThrottle])
def signup_view(request):
    serializer = UserSignupSerializer(data=request.data)
    
    # Check if data is valid
    if serializer.is_valid():
        user = serializer.save()
        tokens = get_tokens_for_user(user)
        
        # Return success response with tokens
        return Response({
            'message': 'User created successfully',
            'user': {
                'id': user.id,
                'email': user.email,
                'full_name': user.full_name,
            },
            'tokens': tokens
        }, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([AuthRateThrottle])
def login_view(request):
    serializer = UserLoginSerializer(data=request.data)
    
    # Check if credentials are valid
    if serializer.is_valid():
        user = serializer.validated_data['user']
        tokens = get_tokens_for_user(user)
        
        # Return success response with tokens
        return Response({
            'message': 'Login successful',
            'user': {
                'id': user.id,
                'email': user.email,
                'full_name': user.full_name,
            },
            'tokens': tokens
        }, status=status.HTTP_200_OK)
    
    # Return validation errors if credentials are invalid
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def profile_view(request):
    user = request.user
    
    if request.method == 'GET':
        serializer = UserProfileSerializer(user, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    elif request.method == 'PATCH':
        serializer = UserProfileSerializer(user, data=request.data, partial=True, context={'request': request})
        
        if serializer.is_valid():
            serializer.save()
            return Response({
                'message': 'Profile updated successfully',
                'user': serializer.data
            }, status=status.HTTP_200_OK)
        
        # Extract first error string for top-level frontend alert display
        first_error_msg = "Failed to update profile due to validation errors."
        for field, errs in serializer.errors.items():
            if isinstance(errs, list) and len(errs) > 0:
                first_error_msg = str(errs[0])
                break
            elif isinstance(errs, str):
                first_error_msg = errs
                break

        print(f"[Profile Update 400 Validation Error] {serializer.errors}")
        return Response({
            'error': first_error_msg,
            'message': first_error_msg,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    
@api_view(['GET'])
@permission_classes([AllowAny])
def check_username_availability(request):
    raw_handle = request.query_params.get('username', '').strip()
    if not raw_handle or len(raw_handle) < 3:
        return Response({
            'available': False,
            'reason': 'Username must be at least 3 characters long.'
        }, status=status.HTTP_400_BAD_REQUEST)

    if ' ' in raw_handle:
        return Response({
            'available': False,
            'reason': 'Username cannot contain spaces.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # B-Tree index lookup: Check if the username already exists
    is_taken = User.objects.filter(username__iexact=raw_handle).exists()
    
    return Response({
        'username': raw_handle, 
        'available': not is_taken
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_profile_by_username(request, username):
    target_user = get_object_or_404(User, username__iexact=username)
    current_user = request.user

    followers_count = target_user.followers.count()
    following_count = target_user.following.count()
    
    is_following = False
    is_following_back = False
    
    if current_user and current_user.pk != target_user.pk:
        is_following = Follow.objects.filter(follower=current_user, following=target_user).exists()
        is_following_back = Follow.objects.filter(follower=target_user, following=current_user).exists()
    
    # Get the user's posts
    posts = Post.objects.filter(user=target_user).order_by('-created_at')
    posts_serializer = PostSerializer(posts, many=True, context={'request': request})
    
    return Response({
        'user': {
            'id': target_user.id,
            'username': target_user.username,
            'full_name': target_user.full_name,
            'description': target_user.description,
            'college': target_user.college,
            'profile_picture': request.build_absolute_uri(target_user.profile_picture.url) if target_user.profile_picture else None,
            'followers_count': followers_count,
            'following_count': following_count,
            'is_following': is_following,
            'is_following_back': is_following_back,
        },
        'posts': posts_serializer.data
    }, status=status.HTTP_200_OK)
    
    
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def toggle_follow(request, username):
    target_user = get_object_or_404(
        User, 
        username__iexact=username
    )
    current_user = request.user
    
    if current_user.pk == target_user.pk:
        return Response({
            'error': 'You cannot follow yourself.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    with transaction.atomic():
        follow_instance = Follow.objects.filter(
            follower=current_user, 
            following=target_user
        ).first()

        if follow_instance:
            # Unfollow the user
            follow_instance.delete()
            action = 'unfollowed'
            
            # Optionally, delete the notification for unfollowing
            Notification.objects.filter(
                actor=current_user, 
                receipient=target_user,
                notification_type__in=['follow', 'follow_back']
            ).delete()
            notification_type = 'unfollow'
            
        else:
            # Follow the user
            Follow.objects.create(follower=current_user, following=target_user)
            
            is_reciprocal = Follow.objects.filter(follower=target_user, following=current_user).exists()
            notification_type = 'follow_back' if is_reciprocal else 'follow'
            
            action = 'followed'
            
            # Create a notification for the followed user
            Notification.objects.create(
                actor=current_user,
                receipient=target_user,
                notification_type=notification_type
            )

        return Response({
            'message': f'You have {action} @{target_user.username}.',
            'is_following': action == 'followed',
            'followers_count': target_user.followers.count(),
            'notification': {
                'actor': current_user.username,
                'receipient': target_user.username,
                'type': notification_type,
            },
        }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_users(request):
    """
    Search users by username handle or full name for @mention autocompletion.
    """
    query = request.query_params.get('q', '').strip()
    if not query:
        return Response([], status=status.HTTP_200_OK)

    if query.startswith('@'):
        query = query[1:]

    users = User.objects.filter(
        Q(username__icontains=query) | Q(full_name__icontains=query)
    )[:10]

    results = []
    for user in users:
        avatar_url = request.build_absolute_uri(user.profile_picture.url) if user.profile_picture else None
        results.append({
            'id': user.id,
            'username': user.username,
            'full_name': user.full_name,
            'profile_picture': avatar_url,
        })

    return Response(results, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_followers(request, username):
    """
    Get list of users who follow the target user.
    """
    target_user = get_object_or_404(User, username__iexact=username)
    followers_relations = Follow.objects.filter(following=target_user).select_related('follower')
    results = []
    for rel in followers_relations:
        u = rel.follower
        avatar_url = request.build_absolute_uri(u.profile_picture.url) if u.profile_picture else None
        results.append({
            'id': u.id,
            'username': u.username,
            'full_name': u.full_name,
            'profile_picture': avatar_url,
        })
    return Response(results, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_following(request, username):
    """
    Get list of users whom the target user is following.
    """
    target_user = get_object_or_404(User, username__iexact=username)
    following_relations = Follow.objects.filter(follower=target_user).select_related('following')
    results = []
    for rel in following_relations:
        u = rel.following
        avatar_url = request.build_absolute_uri(u.profile_picture.url) if u.profile_picture else None
        results.append({
            'id': u.id,
            'username': u.username,
            'full_name': u.full_name,
            'profile_picture': avatar_url,
        })
    return Response(results, status=status.HTTP_200_OK)

