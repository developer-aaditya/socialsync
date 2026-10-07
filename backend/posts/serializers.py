from rest_framework import serializers
from .models import Post, PostInteraction, Comment, CommentInteraction, Story, StoryView
from .ai_moderation import check_content_toxicity


class PostSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True)
    user_profile_picture = serializers.SerializerMethodField()
    user_description = serializers.CharField(source='user.description', read_only=True)
    user_college = serializers.CharField(source='user.college', read_only=True)
    
    # Show if current user has liked/disliked this post (read-only)
    user_interaction = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = [
            'id', 'user_email', 'user_name', 'user_username', 'user_profile_picture',
            'user_description', 'user_college',
            'image', 'description', 'likes_count', 'dislikes_count', 'created_at',
            'user_interaction'
        ]
        read_only_fields = ['id', 'user_email', 'user_name', 'user_username',
                           'user_profile_picture', 'user_description',
                           'user_college', 'likes_count', 'dislikes_count',
                           'created_at', 'user_interaction']

    def get_user_profile_picture(self, obj):
        request = self.context.get('request')
        if obj.user.profile_picture and request:
            return request.build_absolute_uri(obj.user.profile_picture.url)
        return None
    
    # Get the current user's interaction with this post
    def get_user_interaction(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            try:
                interaction = PostInteraction.objects.get(user=request.user, post=obj)
                return interaction.interaction_type
            except PostInteraction.DoesNotExist:
                return None
        return None
    
    # Custom validation for image and description fields
    def validate_image(self, value):
        if value:
            if value.size > 10 * 1024 * 1024:
                raise serializers.ValidationError("Image file too large. Maximum size is 10MB.")
            allowed_types = ['image/jpeg', 'image/jpg', 'image/png']
            if value.content_type not in allowed_types:
                raise serializers.ValidationError("Only JPEG and PNG images are allowed.")
        return value
    
    def validate_description(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Description cannot be empty.")
        if len(value.strip()) < 5:
            raise serializers.ValidationError("Description must be at least 5 characters long.")
        return value.strip()


class PostCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Post
        fields = ['image', 'description']
    
    # Custom validation for image and description fields
    def validate_image(self, value):
        if not value:
            raise serializers.ValidationError("Image is required for creating a post.")
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError("Image file too large. Maximum size is 10MB.")
        allowed_types = ['image/jpeg', 'image/jpg', 'image/png']
        if value.content_type not in allowed_types:
            raise serializers.ValidationError("Only JPEG and PNG images are allowed.")
        return value
    
    def validate_description(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Description cannot be empty.")
        if len(value.strip()) < 5:
            raise serializers.ValidationError("Description must be at least 5 characters long.")
        
        is_toxic, reason = check_content_toxicity(value)
        if is_toxic:
            raise serializers.ValidationError(f"Post Rejected by AI Moderation: {reason}")
        return value.strip()
    
    def create(self, validated_data):
        # Get the current user from the request context
        request = self.context.get('request')
        validated_data['user'] = request.user
        return super().create(validated_data)
    

class CommentSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True)
    user_profile_picture = serializers.SerializerMethodField()
    
    # Recursive field: Show replies to this comment (if any)
    replies = serializers.SerializerMethodField()
    
    # count of likes and dislikes for this comment
    likes_count = serializers.SerializerMethodField()
    dislikes_count = serializers.SerializerMethodField()
    user_interaction = serializers.SerializerMethodField()
    
    class Meta:
        model = Comment
        fields = [
            'id', 'post', 'user_email', 'user_name', 'user_username',
            'user_profile_picture', 'text', 'parent_comment', 'replies',
            'likes_count', 'dislikes_count', 'created_at', 'user_interaction'
        ]
        read_only_fields = ['id', 'post', 'user_email', 'user_name', 'user_username',
                           'user_profile_picture', 'replies']

    def get_user_profile_picture(self, obj):
        request = self.context.get('request')
        if obj.user.profile_picture and request:
            return request.build_absolute_uri(obj.user.profile_picture.url)
        return None
        
    # Method to fetch child replies for a comment
    def get_replies(self, obj):
        # Fetch all replies where parent_comment is this comment
        replies = obj.replies.all()
        if replies.exists():
            return CommentSerializer(replies, many=True, context=self.context).data
        return []
    
    def get_likes_count(self, obj):
        return obj.interactions.filter(interaction_type=PostInteraction.LIKE).count()
    
    def get_dislikes_count(self, obj):
        return obj.interactions.filter(interaction_type=PostInteraction.DISLIKE).count()
    
    def get_user_interaction(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            try:
                interaction = CommentInteraction.objects.get(user=request.user, comment=obj)
                return interaction.interaction_type
            except CommentInteraction.DoesNotExist:
                return None
        return None
    

class CommentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ['text', 'parent_comment']
        
    def validate_text(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Comment text cannot be empty.")
        if len(value.strip()) < 2:
            raise serializers.ValidationError("Comment text must be at least 2 characters long.")

        is_toxic, reason = check_content_toxicity(value)
        if is_toxic:
            raise serializers.ValidationError(f"Comment Rejected by AI Moderation: {reason}")
        return value.strip()


class StorySerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    full_name = serializers.CharField(source='user.full_name', read_only=True)
    profile_picture = serializers.SerializerMethodField()
    views_count = serializers.SerializerMethodField()
    has_viewed = serializers.SerializerMethodField()

    class Meta:
        model = Story
        fields = [
            'id', 'user', 'username', 'full_name', 'profile_picture',
            'image', 'caption', 'created_at', 'expires_at',
            'views_count', 'has_viewed'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'expires_at']

    def get_profile_picture(self, obj):
        request = self.context.get('request')
        if obj.user.profile_picture and request:
            return request.build_absolute_uri(obj.user.profile_picture.url)
        return None

    def get_views_count(self, obj):
        return obj.views.count()

    def get_has_viewed(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return StoryView.objects.filter(story=obj, viewer=request.user).exists()
        return False


class StoryCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Story
        fields = ['image', 'caption']

    def validate_image(self, value):
        if not value:
            raise serializers.ValidationError("Story image is required.")
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError("Image file too large. Maximum size is 10MB.")
        allowed_types = ['image/jpeg', 'image/jpg', 'image/png']
        if value.content_type not in allowed_types:
            raise serializers.ValidationError("Only JPEG and PNG images are allowed.")
        return value


class StoryViewerSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='viewer.username', read_only=True)
    full_name = serializers.CharField(source='viewer.full_name', read_only=True)
    profile_picture = serializers.SerializerMethodField()

    class Meta:
        model = StoryView
        fields = ['id', 'username', 'full_name', 'profile_picture', 'viewed_at']

    def get_profile_picture(self, obj):
        request = self.context.get('request')
        if obj.viewer.profile_picture and request:
            return request.build_absolute_uri(obj.viewer.profile_picture.url)
        return None