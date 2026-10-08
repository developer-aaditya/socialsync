from rest_framework import serializers
from django.contrib.auth import authenticate
from datetime import date
from dateutil.relativedelta import relativedelta
from .models import User
from posts.serializers import PostSerializer

# Serializer for user signup
class UserSignupSerializer(serializers.ModelSerializer):
    # Password field that won't be returned in API responses
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        style={'input_type': 'password'}
    )
    confirm_password = serializers.CharField(
        write_only=True,
        style={'input_type': 'password'}
    )
    
    # This serializer works with custom User model
    class Meta:
        model = User
        fields = ['email', 'username', 'full_name', 'description', 'date_of_birth',
                'profile_picture', 'password', 'confirm_password']
        extra_kwargs = {
            'email': {'required': True},
            'username': {'required': True},
            'full_name': {'required': True},
            'date_of_birth': {'required': True},
            'profile_picture': {'required': False, 'allow_null': True},
            'description': {'required': False, 'allow_null': True, 'allow_blank': True},
        }
    
    def validate_username(self, value):
        # Ensure username is lowercase and stripped of whitespace
        username = value.lower().strip()
        if User.objects.filter(username=username).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return username
    
    # Matches the password and confirm_password fields
    def validate(self, data):
        password = data.get('password')
        confirm_password = data.get('confirm_password')
        if password != confirm_password:
            raise serializers.ValidationError("Passwords do not match.")
        return data
    
    # Check if email is already in use
    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value
    
    # Check if user is at least 18 years old.
    def validate_date_of_birth(self, value):
        if value:
            today = date.today()
            age = relativedelta(today, value).years
            if age < 18:
                raise serializers.ValidationError("You must be at least 18 years old to register.")
        return value

    def validate_profile_picture(self, value):
        if value and not isinstance(value, str):
            if hasattr(value, 'size') and value.size > 10 * 1024 * 1024:
                raise serializers.ValidationError("Image file too large. Maximum size is 10MB.")
            if hasattr(value, 'content_type'):
                allowed_types = ['image/jpeg', 'image/jpg', 'image/png']
                if value.content_type not in allowed_types:
                    raise serializers.ValidationError("Only JPEG and PNG images are allowed.")
        return value
    
    # Create user with validated data
    def create(self, validated_data):
        # Remove confirm_password from data (we don't need to save it)
        validated_data.pop('confirm_password', None)
        
        # Create user using our custom UserManager
        user = User.objects.create_user(**validated_data)
        return user

# Serializer for user login
class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'}
    )
    
    # Validate user credentials and authenticate
    def validate(self, data):
        email = data.get('email')
        password = data.get('password')
        
        if email and password:
            # Try to authenticate user
            user = authenticate(email=email, password=password)
            
            if user:
                if user.is_active:
                    data['user'] = user
                    return data
                else:
                    raise serializers.ValidationError("User account is disabled.")
            else:
                raise serializers.ValidationError("Invalid email or password.")
        else:
            raise serializers.ValidationError("Must include email and password.")

class FlexibleImageField(serializers.ImageField):
    """
    Custom ImageField that gracefully ignores re-sent string URLs, null values, or empty strings
    when updating profile text fields without re-uploading a new image file.
    """
    def to_internal_value(self, data):
        if isinstance(data, str) or data is None or data in ('null', ''):
            return getattr(self.parent.instance, self.field_name, None) if (self.parent and self.parent.instance) else None
        return super().to_internal_value(data)


class FlexibleDateField(serializers.DateField):
    """
    Custom DateField that converts empty strings or 'null' string literals to None
    so field-level validation can enforce mandatory DOB rules cleanly.
    """
    def to_internal_value(self, data):
        if not data or data in ('null', ''):
            return None
        return super().to_internal_value(data)


# Serializer for user profile
class UserProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(read_only=True)
    username = serializers.CharField(required=False)
    full_name = serializers.CharField(required=False)
    date_of_birth = FlexibleDateField(required=False, allow_null=True)
    profile_picture = FlexibleImageField(required=False, allow_null=True)
    description = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    college = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()
    my_posts = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'full_name', 'date_of_birth', 
            'profile_picture', 'date_joined', 'college', 'description',
            'followers_count', 'following_count', 'my_posts'
        ]
        read_only_fields = ['id', 'email', 'date_joined']

    def validate_date_of_birth(self, value):
        if not value:
            if self.instance and self.instance.date_of_birth:
                return self.instance.date_of_birth
            raise serializers.ValidationError("Date of birth is mandatory. Please enter your date of birth.")

        today = date.today()
        age = relativedelta(today, value).years
        if age < 18:
            raise serializers.ValidationError("You must be at least 18 years old.")
        return value

    def validate_username(self, value):
        if value:
            username = value.lower().strip()
            if User.objects.exclude(pk=self.instance.pk).filter(username__iexact=username).exists():
                raise serializers.ValidationError("This username is already taken.")
            return username
        return value

    def get_followers_count(self, obj):
        return obj.followers.count()

    def get_following_count(self, obj):
        return obj.following.count()

    def get_my_posts(self, obj):
        request = self.context.get('request')
        posts = obj.posts.all().order_by('-created_at')
        return PostSerializer(posts, many=True, context={'request': request}).data

    def validate_profile_picture(self, value):
        if value and not isinstance(value, str):
            if hasattr(value, 'size') and value.size > 10 * 1024 * 1024:
                raise serializers.ValidationError("Image file too large. Maximum size is 10MB.")
            if hasattr(value, 'content_type'):
                allowed_types = ['image/jpeg', 'image/jpg', 'image/png']
                if value.content_type not in allowed_types:
                    raise serializers.ValidationError("Only JPEG and PNG images are allowed.")
        return value


class PublicUserProfileSerializer(serializers.ModelSerializer):
    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()  
    is_following = serializers.SerializerMethodField()
    is_following_back = serializers.SerializerMethodField()
    user_posts = serializers.SerializerMethodField()  
    
    class Meta:
        model = User
        fields = ['id', 'username', 'full_name', 'description', 'college',
                'profile_picture', 'followers_count', 'following_count',
                'is_following', 'is_following_back', 'user_posts']
    
    def get_followers_count(self, obj):
        return obj.followers.count()
    
    def get_following_count(self, obj):
        return obj.following.count()
    
    def get_is_following(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated and hasattr(request, 'user'):
            return obj.followers.filter(id=request.user.id).exists()
        return False
    
    def get_is_following_back(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated and hasattr(request, 'user'):
            return obj.following.filter(id=request.user.id).exists()
        return False

    def get_user_posts(self, obj):
        posts = obj.posts.all()
        return PostSerializer(posts, many=True).data