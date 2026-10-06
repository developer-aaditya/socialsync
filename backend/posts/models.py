from django.db import models
from django.conf import settings
from django.core.validators import FileExtensionValidator
from datetime import timedelta
from django.utils import timezone


class Post(models.Model):
    # Link to the user who created this post
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='posts'
    )
    
    image = models.ImageField(
        upload_to='post_images/',
        validators=[
            # Only allow common image formats
            FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png'])
        ]
    )
    
    description = models.TextField(max_length=500)
    likes_count = models.PositiveIntegerField(default=0)
    dislikes_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Show to Admins in Django Admin
    class Meta:
        # Order posts by creation date (newest first)
        ordering = ['-created_at']
        verbose_name = 'Post'
        verbose_name_plural = 'Posts'
    
    def __str__(self):
        # String representation of the post.
        return f"Post by {self.user.email} - {self.description[:50]}..."


class PostInteraction(models.Model):
    # Interaction types
    LIKE = 'like'
    DISLIKE = 'dislike'
    
    INTERACTION_CHOICES = [
        (LIKE, 'Like'),
        (DISLIKE, 'Dislike'),
    ]
    
    # The user who made the interaction
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )
    
    # The post being interacted with
    post = models.ForeignKey(
        Post,
        on_delete=models.CASCADE,
        # Access post interactions with post.interactions.all()
        related_name='interactions'
    )
    
    # Type of interaction (like or dislike)
    interaction_type = models.CharField(
        max_length=10,
        choices=INTERACTION_CHOICES
    )
    
    # When the interaction was made
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        # Ensure a user can only have one interaction per post
        unique_together = ['user', 'post']
        verbose_name = 'Post Interaction'
        verbose_name_plural = 'Post Interactions'
    
    def __str__(self):
        # String representation of the interaction.
        return f"{self.user.email} {self.interaction_type}d post {self.post.id}"
    

class Comment(models.Model):
    # The user who made the comment
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='comments'
    )
    
    # The post being commented on
    post = models.ForeignKey(
        Post,
        on_delete=models.CASCADE,
        related_name='comments'
    )
    
    # Self-referential foreign key for replies to comments
    parent_comment = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='replies'
    )
    
    # The text of the comment
    text = models.TextField(max_length=300)
    
    # When the comment was created
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        # Order comments by creation date (newest first)
        ordering = ['-created_at']
        verbose_name = 'Comment'
        verbose_name_plural = 'Comments'
        
    def __str__(self):
        # String representation of the comment.
        return f"Comment by {self.user.email} on post {self.post.id}: {self.text[:50]}..."
    
    
class CommentInteraction(models.Model):
    # Interaction types
    LIKE = 'like'
    DISLIKE = 'dislike'
    
    INTERACTION_CHOICES = [
        (LIKE, 'Like'),
        (DISLIKE, 'Dislike'),
    ]
    
    # The user who made the interaction
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )
    
    # The comment being interacted with
    comment = models.ForeignKey(
        Comment,
        on_delete=models.CASCADE,
        related_name='interactions'
    )
    
    # Type of interaction (like or dislike)
    interaction_type = models.CharField(
        max_length=10,
        choices=INTERACTION_CHOICES
    )
    
    # When the interaction was made
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        # Ensure a user can only have one interaction per comment
        unique_together = ['user', 'comment']
        verbose_name = 'Comment Interaction'
        verbose_name_plural = 'Comment Interactions'
    
    def __str__(self):
        # String representation of the interaction.
        return f"{self.user.email} {self.interaction_type}d comment {self.comment.id}"


class ActiveStoryManager(models.Manager):
    """
    Manager that automatically filters out expired stories (>24h old).
    """
    def get_queryset(self):
        return super().get_queryset().filter(expires_at__gt=timezone.now())


class Story(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='stories'
    )
    image = models.ImageField(
        upload_to='story_images/',
        validators=[FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png'])]
    )
    caption = models.CharField(max_length=200, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(db_index=True)

    objects = models.Manager()
    active = ActiveStoryManager()

    class Meta:
        ordering = ['created_at']
        verbose_name = 'Story'
        verbose_name_plural = 'Stories'

    def save(self, *args, **kwargs):
        if not self.expires_at:
            # Set default 24-hour expiration window
            self.expires_at = timezone.now() + timedelta(hours=24)
        super().save(*args, **kwargs)

    def is_expired(self):
        return timezone.now() >= self.expires_at

    def __str__(self):
        return f"Story by @{self.user.username} (Expires: {self.expires_at})"


class StoryView(models.Model):
    story = models.ForeignKey(
        Story,
        on_delete=models.CASCADE,
        related_name='views'
    )
    viewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='story_views'
    )
    viewed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('story', 'viewer')
        ordering = ['-viewed_at']
        verbose_name = 'Story View'
        verbose_name_plural = 'Story Views'

    def __str__(self):
        return f"@{self.viewer.username} viewed story {self.story.id}"