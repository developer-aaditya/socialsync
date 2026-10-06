import re
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from posts.models import Post, PostInteraction, Comment
from .models import Notification
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

User = get_user_model()


def push_live_notification(notification):
    """
    Broadcasts a newly created Notification over WebSockets to the recipient.
    """
    try:
        channel_layer = get_channel_layer()
        if channel_layer:
            group_name = f'notifications_{notification.receipient.id}'
            payload = {
                'id': notification.id,
                'actor_username': notification.actor.username,
                'actor_full_name': notification.actor.get_full_name(),
                'actor_profile_picture': notification.actor.profile_picture.url if notification.actor.profile_picture else None,
                'notification_type': notification.notification_type,
                'created_at': notification.created_at.isoformat(),
                'comment_id': notification.comment.id if notification.comment else None,
                'read_status': notification.read_status,
                'post_id': notification.post.id if notification.post else None,
            }
        
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': 'send_notification',
                    'notification': payload
                }
            )
    except Exception as e:
        print(f"[WebSocket] Error pushing notification: {e}")


# Signal to create a notification when a post is liked or disliked
@receiver(post_save, sender=PostInteraction)
def create_like_notification(sender, instance, created, **kwargs):
    if created and instance.interaction_type == PostInteraction.LIKE:
        post_owner = instance.post.user
        actor = instance.user
        
        if post_owner != actor:
            notification = Notification.objects.create(
                receipient=post_owner,
                actor=actor,
                notification_type='like',
                post=instance.post
            )
            push_live_notification(notification)


# Signal to parse @username mentions in Posts
@receiver(post_save, sender=Post)
def create_post_mention_notifications(sender, instance, created, **kwargs):
    if created and instance.description:
        actor = instance.user
        handles = set(re.findall(r'@([a-zA-Z0-9_.]+)', instance.description))
        if handles:
            mentioned_users = User.objects.filter(username__in=handles).exclude(id=actor.id)
            for user in mentioned_users:
                notification = Notification.objects.create(
                    receipient=user,
                    actor=actor,
                    notification_type='mention',
                    post=instance
                )
                push_live_notification(notification)


# Signal to create a notification when a comment/reply or @mention is made
@receiver(post_save, sender=Comment)
def create_comment_notification(sender, instance, created, **kwargs):
    if created:
        actor = instance.user

        # Parse @username mentions in comment text
        handles = set(re.findall(r'@([a-zA-Z0-9_.]+)', instance.text)) if instance.text else set()
        mentioned_user_ids = set()

        if handles:
            mentioned_users = User.objects.filter(username__in=handles).exclude(id=actor.id)
            for user in mentioned_users:
                mentioned_user_ids.add(user.id)
                notification = Notification.objects.create(
                    receipient=user,
                    actor=actor,
                    notification_type='mention',
                    post=instance.post,
                    comment=instance
                )
                push_live_notification(notification)

        # Reply to an existing comment
        if instance.parent_comment:
            comment_owner = instance.parent_comment.user
            if comment_owner != actor and comment_owner.id not in mentioned_user_ids:
                notification = Notification.objects.create(
                    receipient=comment_owner,
                    actor=actor,
                    notification_type='reply',
                    post=instance.post,
                    comment=instance
                )
                push_live_notification(notification)
        # New high-level comment on a post
        else:
            post_owner = instance.post.user
            if post_owner != actor and post_owner.id not in mentioned_user_ids:
                notification = Notification.objects.create(
                    receipient=post_owner,
                    actor=actor,
                    notification_type='comment',
                    post=instance.post,
                    comment=instance
                )
                push_live_notification(notification)