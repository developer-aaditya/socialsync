from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.cache import cache
from .models import User, Follow
from posts.models import Post
import logging

logger = logging.getLogger(__name__)


def invalidate_user_profile_cache(user_id=None):
    """
    Evicts profile caches from Redis.
    If user_id is provided, evicts user-specific profile caches.
    Otherwise evicts all profile caches using pattern matching.
    """
    try:
        if user_id:
            cache.delete(f"user_profile:{user_id}")
            cache.delete_pattern(f"public_profile:target:{user_id}:*")
            cache.delete_pattern(f"public_profile:*:req:{user_id}")
        else:
            cache.delete_pattern("user_profile:*")
            cache.delete_pattern("public_profile:*")
        logger.info(f"Evicted profile cache keys for user_id={user_id}")
    except Exception as e:
        logger.error(f"Error evicting profile cache: {e}")


@receiver(post_save, sender=User)
def on_user_profile_update(sender, instance, **kwargs):
    """Invalidate cache when user details are updated."""
    invalidate_user_profile_cache(user_id=instance.id)


@receiver(post_save, sender=Follow)
@receiver(post_delete, sender=Follow)
def on_follow_change(sender, instance, **kwargs):
    """Invalidate profile cache when a user follows or unfollows."""
    invalidate_user_profile_cache(user_id=instance.follower_id)
    invalidate_user_profile_cache(user_id=instance.following_id)


@receiver(post_save, sender=Post)
@receiver(post_delete, sender=Post)
def on_user_post_change(sender, instance, **kwargs):
    """Invalidate author's profile cache when they publish or delete a post."""
    if instance.user_id:
        invalidate_user_profile_cache(user_id=instance.user_id)
