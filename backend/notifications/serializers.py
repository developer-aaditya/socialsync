from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    actor_email = serializers.CharField(source='actor.email', read_only=True)
    actor_name = serializers.CharField(source='actor.full_name', read_only=True)
    actor_username = serializers.CharField(source='actor.username', read_only=True)
    is_read = serializers.BooleanField(source='read_status', read_only=True)
    target_post_id = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            'id', 'receipient', 'actor', 'actor_email', 'actor_name', 'actor_username',
            'notification_type', 'post', 'comment', 'target_post_id', 'created_at', 'is_read'
        ]
        read_only_fields = ['id', 'receipient', 'actor', 'actor_email', 
                            'actor_name', 'actor_username', 'notification_type', 
                            'post', 'comment', 'target_post_id', 'created_at']

    def get_target_post_id(self, obj):
        if obj.post_id:
            return obj.post_id
        if obj.comment and obj.comment.post_id:
            return obj.comment.post_id
        return None