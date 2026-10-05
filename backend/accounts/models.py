from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.contrib.auth.base_user import BaseUserManager
from django.db import models
from django.core.validators import FileExtensionValidator


class UserManager(BaseUserManager):
    # Custom user manager that handles creating users with email instead of username.

    def create_user(self, email, password=None, **extra_fields):
        # Create and return a regular user with email and password.
        if not email:
            raise ValueError('Users must have an email address')
        
        # Normalize email (convert to lowercase, etc.)
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        # Create and return a superuser (admin) with email and password.
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    # Custom User model that uses email for authentication instead of username.
    
    email = models.EmailField(unique=True)
    
    full_name = models.CharField(max_length=150, blank=False)
    
    date_of_birth = models.DateField(null=False, blank=False)
    
    college = models.CharField(max_length=500, null=True, blank=True)
    
    profile_picture = models.ImageField(
        upload_to='profile_pictures/',
        blank=False,
        validators=[
            # Only allow common image formats
            FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png'])
        ],
    )
    
    # Required fields for Django's user system
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)
    
    # Tell Django to use our custom UserManager
    objects = UserManager()
    
    # Use email for authentication instead of username
    USERNAME_FIELD = 'email'
    # Fields required when creating superuser
    REQUIRED_FIELDS = ['full_name']
    
    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'
    
    def __str__(self):
        """String representation of the user (shown in admin interface)."""
        return self.email
    
    def get_full_name(self):
        """Return the user's full name."""
        return self.full_name
    
    def get_short_name(self):
        """Return the user's short name (first name)."""
        return self.full_name.split(' ')[0] if self.full_name else self.email