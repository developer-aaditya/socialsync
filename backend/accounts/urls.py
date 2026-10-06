from django.urls import path
from . import views
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    # User authentication endpoints
    path('signup/', views.signup_view, name='signup'),
    path('login/', views.login_view, name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # User profile endpoints
    path('profile/', views.profile_view, name='profile'),
    
    # Username availability check & social profile endpoints
    path('username-check/', views.check_username_availability, name='check_username_availability'),
    path('profile/user/<str:username>/', views.get_user_profile_by_username, name='public_profile'),
    path('profile/user/<str:username>/follow/', views.toggle_follow, name='toggle_follow'),
    path('profile/user/<str:username>/followers/', views.get_user_followers, name='user_followers'),
    path('profile/user/<str:username>/following/', views.get_user_following, name='user_following'),
    path('search/', views.search_users, name='search_users'),
]