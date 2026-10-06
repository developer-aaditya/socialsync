from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.contrib.auth.base_user import BaseUserManager
from django.db import models
from django.core.validators import FileExtensionValidator, RegexValidator
from django.conf import settings


class UserManager(BaseUserManager):
    # Custom user manager that handles creating users with email instead of username.

    def create_user(self, email, username, password=None, **extra_fields):
        # Create and return a regular user with email and password.
        if not email:
            raise ValueError('Users must have an email address')
        if not password:
            raise ValueError('Users must have a password')
        if not username:
            raise ValueError('Users must have a unique username handle')
        
        # Normalize email (convert to lowercase, etc.)
        email = self.normalize_email(email)
        username = username.lower().strip()
        user = self.model(email=email, username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, username, password=None, **extra_fields):
        # Create and return a superuser (admin) with email and password.
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        
        return self.create_user(email, username, password, **extra_fields)

username_validator = RegexValidator(
    # regex=r'^[a-zA-Z0-9_\.]+$',
    regex=r'^[a-zA-Z0-9_.]+$',
    message='Username must contain only letters, numbers, dots, and underscores.'
)


class User(AbstractBaseUser, PermissionsMixin):
    # Custom User model that uses email for authentication instead of username.
    
    email = models.EmailField(unique=True, db_index=True, blank=False)
    username = models.CharField(
        max_length=20,
        unique=True,
        db_index=True,
        validators=[username_validator],
        null=False,
        blank=False,
        help_text='Unique username. Only letters, numbers, dots, and underscores are allowed.'
    )
    full_name = models.CharField(max_length=150, blank=False)
    description = models.TextField(max_length=500, blank=True, null=True,
        help_text='User profile bio/description.'
    )
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
    REQUIRED_FIELDS = ['username', 'full_name']
    
    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'
    
    def __str__(self):
        """String representation of the user (shown in admin interface)."""
        return f"@{self.username}"
    
    def get_full_name(self):
        """Return the user's full name."""
        return self.full_name
    
    def get_short_name(self):
        """Return the user's short name (first name)."""
        return self.full_name.split(' ')[0] if self.full_name else self.email
    
    
class Follow(models.Model):
    # Model to represent the following relationship between users.
    follower = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='following',
        on_delete=models.CASCADE
    )
    following = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='followers',
        on_delete=models.CASCADE
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('follower', 'following')
        ordering = ['-created_at']
        verbose_name = 'Follow Relationship'
        verbose_name_plural = 'Follow Relationships'
    
    def __str__(self):
        """String representation of the follow relationship."""
        return f"@{self.follower.username} follows @{self.following.username}"