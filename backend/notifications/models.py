from django.db import models
from django.conf import settings
from posts.models import Post, Comment


class Notification(models.Model):
    NOTIFICATION_TYPES = (
        ('like', 'Post Like'),
        ('dislike', 'Post Dislike'),
        ('comment', 'Post Comment'),
        ('reply', 'Comment Reply'),
    )
    
    receipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='notifications'
    )
    
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='triggered_notifications'
    )
    
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    post = models.ForeignKey(Post, on_delete=models.CASCADE, null=True, blank=True)
    comment = models.ForeignKey(Comment, on_delete=models.CASCADE, null=True, blank=True)
    read_status = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    
    def __str__(self):
        return f"Notification for {self.receipient.email} - Type: {self.notification_type}d"
    
