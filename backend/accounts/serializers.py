from rest_framework import serializers
from django.contrib.auth import authenticate
from datetime import date
from dateutil.relativedelta import relativedelta
from .models import User

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
        fields = ['email', 'full_name', 'date_of_birth', 'profile_picture', 
                 'password', 'confirm_password']
        extra_kwargs = {
            'email': {'required': True},
            'full_name': {'required': True},
        }
    
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

# Serializer for user profile
class UserProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(read_only=True)
    
    class Meta:
        model = User
        fields = ['email', 'full_name', 'date_of_birth', 'profile_picture', 'date_joined', 'college']
        extra_kwargs = {
            'date_joined': {'read_only': True},
        }
    
    # Validate profile picture
    def validate_profile_picture(self, value):
        if value:
            if value.size > 5 * 1024 * 1024:
                raise serializers.ValidationError("Image file too large. Maximum size is 5MB.")
            allowed_types = ['image/jpeg', 'image/jpg', 'image/png']
            if value.content_type not in allowed_types:
                raise serializers.ValidationError("Only JPEG and PNG images are allowed.")
        return value