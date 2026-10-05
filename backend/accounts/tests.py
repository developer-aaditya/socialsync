import os
from datetime import date
from django.test import TestCase
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase
from .models import User


class UserAuthenticationTests(APITestCase):

    def setUp(self):
        self.signup_url = reverse('signup')
        self.login_url = reverse('login')
        self.profile_url = reverse('profile')

        # Dummy image for signup/profile tests
        self.dummy_image = SimpleUploadedFile(
            name='test_avatar.jpg',
            content=b'\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xFF\xDB\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.\' ",#\x1c\x1c(7),01444\x1f\'9=82<.342\xFF\xC0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xFF\xC4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\xFF\xDA\x00\x08\x01\x01\x00\x00?\x00\x7F\x00\xFF\xD9',
            content_type='image/jpeg'
        )

    def test_signup_success(self):
        data = {
            'email': 'newuser@example.com',
            'full_name': 'New User',
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
            password='Password123!',
            full_name='Profile User',
            date_of_birth='1998-08-08',
            profile_picture=self.dummy_image
        )
        self.client.force_authenticate(user=user)

        # GET Profile
        get_res = self.client.get(self.profile_url)
        self.assertEqual(get_res.status_code, status.HTTP_200_OK)
        self.assertEqual(get_res.data['full_name'], 'Profile User')

        # PATCH Profile
        patch_res = self.client.patch(self.profile_url, {'college': 'Harvard University', 'full_name': 'Profile User Updated'})
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_res.data['user']['college'], 'Harvard University')
        self.assertEqual(patch_res.data['user']['full_name'], 'Profile User Updated')
