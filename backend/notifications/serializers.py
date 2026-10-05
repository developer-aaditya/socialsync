from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    actor_email = serializers.CharField(source='actor.email', read_only=True)
    actor_name = serializers.CharField(source='actor.full_name', read_only=True)
    is_read = serializers.BooleanField(source='read_status', read_only=True)
    
    class Meta:
        model = Notification
        fields = [
            'id', 'receipient', 'actor', 'actor_email', 'actor_name',
            'notification_type', 'post', 'comment', 'created_at', 'is_read'
        ]
        read_only_fields = ['id', 'receipient', 'actor', 'actor_email', 
                            'actor_name', 'notification_type', 
                            'post', 'comment', 'created_at']