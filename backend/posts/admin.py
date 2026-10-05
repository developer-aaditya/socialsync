"""
Django admin configuration for the posts app.

This file registers our Post and PostInteraction models with Django's 
admin interface for easy management.
"""

from django.contrib import admin
from .models import Post, PostInteraction


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    """
    Admin interface configuration for Post model.
    """
    
    # Fields to display in the post list
    list_display = ['id', 'user', 'description_preview', 'likes_count', 
                   'dislikes_count', 'created_at']
    
    # Fields that can be used to filter the post list
    list_filter = ['created_at', 'user']
    
    # Fields that can be searched
    search_fields = ['description', 'user__email', 'user__full_name']
    
    # Default ordering (newest posts first)
    ordering = ['-created_at']
    
    # Read-only fields (cannot be edited in admin)
    readonly_fields = ['created_at', 'likes_count', 'dislikes_count']
    
    def description_preview(self, obj):
        """Show a preview of the post description in the admin list."""
        return obj.description[:50] + "..." if len(obj.description) > 50 else obj.description
    
    description_preview.short_description = 'Description Preview'


@admin.register(PostInteraction)
class PostInteractionAdmin(admin.ModelAdmin):
    """
    Admin interface configuration for PostInteraction model.
    """
    
    # Fields to display in the interaction list
    list_display = ['id', 'user', 'post_preview', 'interaction_type', 'created_at']
    
    # Fields that can be used to filter the interaction list
    list_filter = ['interaction_type', 'created_at']
    
    # Fields that can be searched
    search_fields = ['user__email', 'post__description']
    
    # Default ordering (newest interactions first)
    ordering = ['-created_at']
    
    # Read-only fields
    readonly_fields = ['created_at']
    
    def post_preview(self, obj):
        """Show a preview of the related post in the admin list."""
        return f"Post {obj.post.id}: {obj.post.description[:30]}..."
    
    post_preview.short_description = 'Post'