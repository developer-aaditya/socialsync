"""
Django admin configuration for the accounts app.

This file registers our models with Django's admin interface,
making it easy to manage users through a web interface.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


class UserAdmin(BaseUserAdmin):
    """
    Custom admin interface for our User model.
    This defines how users are displayed and edited in the admin interface.
    """
    
    # Fields to display in the user list
    list_display = ['email', 'full_name', 'is_active', 'is_staff', 'date_joined']
    
    # Fields that can be used to filter the user list
    list_filter = ['is_active', 'is_staff', 'date_joined']
    
    # Fields that can be searched
    search_fields = ['email', 'full_name']
    
    # Default ordering (newest users first)
    ordering = ['-date_joined']
    
    # Fields to show when editing a user
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('full_name', 'date_of_birth', 'profile_picture')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    
    # Fields to show when creating a new user
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'full_name', 'date_of_birth', 'password1', 'password2'),
        }),
    )


# Register our User model with the custom admin interface
admin.site.register(User, UserAdmin)