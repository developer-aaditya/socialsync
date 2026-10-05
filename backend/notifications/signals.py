from django.db.models.signals import post_save
from django.dispatch import receiver
from posts.models import PostInteraction, Comment
from .models import Notification


# Signal to create a notification when a post is liked or disliked
@receiver(post_save, sender=PostInteraction)
def create_like_notification(sender, instance, created, **kwargs):
    # Check if the interaction is a like and if it's a new interaction
    if created and instance.interaction_type == PostInteraction.LIKE:
        post_owner = instance.post.user
        actor = instance.user
        
        # Guard against self-notifications
        if post_owner != actor:
            Notification.objects.create(
                receipient=post_owner,
                actor=actor,
                notification_type='like',
                post=instance.post
            )
            

# Signal to create a notification when a comment and reply is made
@receiver(post_save, sender=Comment)
def create_comment_notification(sender, instance, created, **kwargs):
    # Check if it's a new comment
    if created:
        actor = instance.user

        # Reply to an existing comment
        if instance.parent_comment:
            comment_owner = instance.parent_comment.user
            if comment_owner != actor:
                Notification.objects.create(
                    receipient=comment_owner,
                    actor=actor,
                    notification_type='reply',
                    post=instance.post,
                    comment=instance
                )
        # New high-level comment on a post
        else:
            post_owner = instance.post.user
            if post_owner != actor:
                Notification.objects.create(
                    receipient=post_owner,
                    actor=actor,
                    notification_type='comment',
                    post=instance.post,
                    comment=instance
                )