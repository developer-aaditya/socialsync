import re
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from posts.models import Post, PostInteraction, Comment
from .models import Notification

User = get_user_model()


# Signal to create a notification when a post is liked or disliked
@receiver(post_save, sender=PostInteraction)
def create_like_notification(sender, instance, created, **kwargs):
    if created and instance.interaction_type == PostInteraction.LIKE:
        post_owner = instance.post.user
        actor = instance.user
        
        if post_owner != actor:
            Notification.objects.create(
                receipient=post_owner,
                actor=actor,
                notification_type='like',
                post=instance.post
            )


# Signal to parse @username mentions in Posts
@receiver(post_save, sender=Post)
def create_post_mention_notifications(sender, instance, created, **kwargs):
    if created and instance.description:
        actor = instance.user
        handles = set(re.findall(r'@([a-zA-Z0-9_.]+)', instance.description))
        if handles:
            mentioned_users = User.objects.filter(username__in=handles).exclude(id=actor.id)
            for user in mentioned_users:
                Notification.objects.create(
                    receipient=user,
                    actor=actor,
                    notification_type='mention',
                    post=instance
                )


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
                Notification.objects.create(
                    receipient=user,
                    actor=actor,
                    notification_type='mention',
                    post=instance.post,
                    comment=instance
                )

        # Reply to an existing comment
        if instance.parent_comment:
            comment_owner = instance.parent_comment.user
            if comment_owner != actor and comment_owner.id not in mentioned_user_ids:
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
            if post_owner != actor and post_owner.id not in mentioned_user_ids:
                Notification.objects.create(
                    receipient=post_owner,
                    actor=actor,
                    notification_type='comment',
                    post=instance.post,
                    comment=instance
                )