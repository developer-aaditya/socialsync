from django.urls import path
from . import views

urlpatterns = [
    # Post CRUD operations
    path('posts/all/', views.get_all_posts_view, name='all_posts'),
    path('posts/', views.posts_view, name='posts'),
    path('posts/<int:post_id>/', views.single_post_view, name='single_post'),
    # Post interactions
    path('posts/<int:post_id>/like/', views.like_post_view, name='like_post'),
    path('posts/<int:post_id>/dislike/', views.dislike_post_view, name='dislike_post'),
    # Comment operations
    path('posts/<int:post_id>/comments/', views.post_comments_view, name='post_comments'),
    path('comments/<int:comment_id>/', views.delete_comment_view, name='delete_comment'),
    # Comment interactions
    path('comments/<int:comment_id>/like/', views.like_comment_view, name='like_comment'),
    path('comments/<int:comment_id>/dislike/', views.dislike_comment_view, name='dislike_comment'),
    # Ephemeral Stories (24h Expiration)
    path('stories/', views.stories_view, name='stories'),
    path('stories/<int:story_id>/view/', views.mark_story_viewed_view, name='mark_story_viewed'),
    path('stories/<int:story_id>/viewers/', views.get_story_viewers_view, name='get_story_viewers'),
]