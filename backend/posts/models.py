from django.db import models
from django.conf import settings
from django.core.validators import FileExtensionValidator


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