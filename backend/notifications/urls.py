from django.urls import path
from . import views


urlpatterns = [
    path('notifications/', views.get_user_notifications_view, name='get_user_notifications'),
    path('notifications/<int:notification_id>/read/', views.mark_notification_as_read_view, name='mark_notification_as_read'),
    path('notifications/read-all/', views.mark_all_notifications_read_view, name='mark_all_notifications_read'),
]