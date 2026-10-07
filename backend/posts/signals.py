from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.cache import cache
from .models import Post, PostInteraction, Comment
import logging


logger = logging.getLogger(__name__)


def invalidate_feed_cache():
    """
    Evicts all the cached feed keys from Redis whenever a write operation occurs.
    This guarantees 100% consistency between the database and the cache.
    """
    try:
        cache.delete_pattern('feed:*')  # Invalidate all feed cache keys
        logger.info(f"Cache evicted stale feed cache keys from Redis.")
    except Exception as e:
        logger.error(f"Error occurred while evicting feed cache: {e}")
        

@receiver(post_save, sender=Post)
@receiver(post_delete, sender=Post)
def handle_post_change(sender, instance, **kwargs):
    """
    Signal handler for Post model changes (create, update, delete).
    Evicts the feed cache whenever a Post is created, updated, or deleted.
    """
    invalidate_feed_cache()

 
@receiver(post_save, sender=PostInteraction)
@receiver(post_delete, sender=PostInteraction)
def handle_post_interaction_change(sender, instance, **kwargs):
    """
    Signal handler for PostInteraction model changes (create, update, delete).
    Evicts the feed cache whenever a PostInteraction is created, updated, or deleted.
    """
    invalidate_feed_cache()


@receiver(post_save, sender=Comment)
@receiver(post_delete, sender=Comment)
def handle_comment_change(sender, instance, **kwargs):
    """
    Signal handler for Comment model changes (create, update, delete).
    Evicts the feed cache whenever a Comment is created, updated, or deleted.
    """
    invalidate_feed_cache()