import os
from datetime import date
from django.test import TestCase
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase
from .models import User, Follow
from notifications.models import Notification


class UserAuthenticationTests(APITestCase):

    def setUp(self):
        self.signup_url = reverse('signup')
        self.login_url = reverse('login')
        self.profile_url = reverse('profile')
        self.username_check_url = reverse('check_username_availability')

        # Dummy image for signup/profile tests
        self.dummy_image = SimpleUploadedFile(
            name='test_avatar.jpg',
            content=b'\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xFF\xDB\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.\' ",#\x1c\x1c(7),01444\x1f\'9=82<.342\xFF\xC0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xFF\xC4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\xFF\xDA\x00\x08\x01\x01\x00\x00?\x00\x7F\x00\xFF\xD9',
            content_type='image/jpeg'
        )

    def test_signup_success(self):
        data = {
            'email': 'newuser@example.com',
            'username': 'newuser',
            'full_name': 'New User',
            'description': 'Hello world bio!',
            'date_of_birth': '2000-01-01',
            'password': 'Password123!',
            'confirm_password': 'Password123!',
            'profile_picture': self.dummy_image
        }
        response = self.client.post(self.signup_url, data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('tokens', response.data)
        self.assertIn('access', response.data['tokens'])

    def test_signup_under_18_fails(self):
        data = {
            'email': 'underage@example.com',
            'username': 'underage',
            'full_name': 'Under Age',
            'date_of_birth': f"{date.today().year - 15}-01-01",
            'password': 'Password123!',
            'confirm_password': 'Password123!',
            'profile_picture': self.dummy_image
        }
        response = self.client.post(self.signup_url, data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('date_of_birth', response.data)

    def test_login_success(self):
        User.objects.create_user(
            email='testlogin@example.com',
            username='testlogin',
            password='Password123!',
            full_name='Test Login',
            date_of_birth='1995-05-05',
            profile_picture=self.dummy_image
        )
        data = {
            'email': 'testlogin@example.com',
            'password': 'Password123!'
        }
        response = self.client.post(self.login_url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('tokens', response.data)

    def test_profile_retrieval_and_update(self):
        user = User.objects.create_user(
            email='profileuser@example.com',
            username='profileuser',
            password='Password123!',
            full_name='Profile User',
            description='Original bio',
            date_of_birth='1998-08-08',
            profile_picture=self.dummy_image
        )
        self.client.force_authenticate(user=user)

        # GET Profile
        get_res = self.client.get(self.profile_url)
        self.assertEqual(get_res.status_code, status.HTTP_200_OK)
        self.assertEqual(get_res.data['full_name'], 'Profile User')
        self.assertEqual(get_res.data['username'], 'profileuser')

        # PATCH Profile
        patch_res = self.client.patch(self.profile_url, {
            'college': 'Harvard University', 
            'full_name': 'Profile User Updated',
            'description': 'Updated bio text'
        })
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_res.data['user']['college'], 'Harvard University')
        self.assertEqual(patch_res.data['user']['description'], 'Updated bio text')

    def test_username_availability_check(self):
        User.objects.create_user(
            email='existing@example.com',
            username='john_doe',
            password='Password123!',
            full_name='John Doe',
            date_of_birth='1995-05-05',
            profile_picture=self.dummy_image
        )

        # Check taken username
        res1 = self.client.get(f"{self.username_check_url}?username=john_doe")
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        self.assertFalse(res1.data['available'])

        # Check available username
        res2 = self.client.get(f"{self.username_check_url}?username=jane_doe")
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertTrue(res2.data['available'])

    def test_public_profile_and_follow_flow(self):
        user1 = User.objects.create_user(
            email='user1@example.com',
            username='user1',
            password='Password123!',
            full_name='User One',
            description='Bio for User 1',
            date_of_birth='1995-01-01',
            profile_picture=self.dummy_image
        )
        user2 = User.objects.create_user(
            email='user2@example.com',
            username='user2',
            password='Password123!',
            full_name='User Two',
            description='Bio for User 2',
            date_of_birth='1996-02-02',
            profile_picture=self.dummy_image
        )

        public_profile_url = reverse('public_profile', kwargs={'username': 'user2'})
        follow_url = reverse('toggle_follow', kwargs={'username': 'user2'})

        # Authenticate as user1
        self.client.force_authenticate(user=user1)

        # 1. View user2's public profile before following
        res = self.client.get(public_profile_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['user']['username'], 'user2')
        self.assertFalse(res.data['user']['is_following'])

        # 2. User 1 follows User 2
        follow_res = self.client.post(follow_url)
        self.assertEqual(follow_res.status_code, status.HTTP_200_OK)
        self.assertTrue(follow_res.data['is_following'])

        # Check notification for user2
        notification = Notification.objects.get(receipient=user2, actor=user1)
        self.assertEqual(notification.notification_type, 'follow')

        # 3. User 2 follows back User 1 (reciprocal follow)
        self.client.force_authenticate(user=user2)
        follow_back_url = reverse('toggle_follow', kwargs={'username': 'user1'})
        follow_back_res = self.client.post(follow_back_url)
        self.assertEqual(follow_back_res.status_code, status.HTTP_200_OK)

        # Check follow_back notification for user1
        fb_notification = Notification.objects.get(receipient=user1, actor=user2)
        self.assertEqual(fb_notification.notification_type, 'follow_back')

    def test_user_search_api(self):
        User.objects.create_user(
            email='alex@example.com',
            username='alex_coder',
            password='Password123!',
            full_name='Alex Rivera',
            date_of_birth='1995-05-05',
            profile_picture=self.dummy_image
        )

        search_url = reverse('search_users')
        res = self.client.get(f"{search_url}?q=alex")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['username'], 'alex_coder')
