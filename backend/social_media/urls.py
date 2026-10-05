"""
Main URL configuration for social_media_api project.
This file routes URLs to the appropriate app URLs.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # Django admin interface (for managing data)
    path('admin/', admin.site.urls),
    path('api/', include('accounts.urls')),
    path('api/', include('posts.urls')),
    path('api/', include('notifications.urls')),
]

# Serve media files during development
# In production, you'd use a web server like Nginx for this
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)