from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase
from datetime import timedelta
from django.utils import timezone
from accounts.models import User
from .models import Post, PostInteraction, Comment, CommentInteraction, Story, StoryView


class PostsAndCommentsAPITests(APITestCase):

    def setUp(self):
        # Create test image
        self.dummy_image = SimpleUploadedFile(
            name='post_img.jpg',
            content=b'\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xFF\xDB\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.\' ",#\x1c\x1c(7),01444\x1f\'9=82<.342\xFF\xC0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xFF\xC4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\xFF\xDA\x00\x08\x01\x01\x00\x00?\x00\x7F\x00\xFF\xD9',
            content_type='image/jpeg'
        )

        self.user1 = User.objects.create_user(
            email='user1@example.com',
            username='user1',
            password='Password123!',
            full_name='User One',
            date_of_birth='1990-01-01',
            college='MIT'
        )

        self.user2 = User.objects.create_user(
            email='user2@example.com',
            username='user2',
            password='Password123!',
            full_name='User Two',
            date_of_birth='1992-02-02',
            college='MIT'
        )

        self.posts_url = reverse('posts')
        self.all_posts_url = reverse('all_posts')

    def test_create_post_success(self):
        self.client.force_authenticate(user=self.user1)
        data = {
            'description': 'This is a awesome clean test post description!',
            'image': self.dummy_image
        }
        response = self.client.post(self.posts_url, data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Post.objects.count(), 1)
        self.assertEqual(Post.objects.first().user, self.user1)

    def test_create_post_ai_moderation_toxic_rejection(self):
        self.client.force_authenticate(user=self.user1)
        data = {
            'description': 'I hate idiot people and stupid harassment!',
            'image': self.dummy_image
        }
        response = self.client.post(self.posts_url, data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('description', response.data)
        self.assertIn('AI Moderation', str(response.data['description'][0]))

    def test_get_all_posts_cursor_pagination(self):
        self.client.force_authenticate(user=self.user1)
        # Create 3 posts
        for i in range(3):
            Post.objects.create(
                user=self.user1,
                description=f'Test post number {i+1}',
                image=self.dummy_image
            )
        response = self.client.get(self.all_posts_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertEqual(len(response.data['results']), 3)

    def test_post_like_and_dislike_atomic_toggle(self):
        post = Post.objects.create(
            user=self.user1,
            description='Post for like testing',
            image=self.dummy_image
        )
        like_url = reverse('like_post', kwargs={'post_id': post.id})
        dislike_url = reverse('dislike_post', kwargs={'post_id': post.id})

        # User2 likes User1's post
        self.client.force_authenticate(user=self.user2)
        res1 = self.client.post(like_url)
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        self.assertEqual(res1.data['likes_count'], 1)
        self.assertEqual(res1.data['user_interaction'], 'like')

        # User2 toggles like off
        res2 = self.client.post(like_url)
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(res2.data['likes_count'], 0)
        self.assertIsNone(res2.data['user_interaction'])

        # User2 dislikes User1's post
        res3 = self.client.post(dislike_url)
        self.assertEqual(res3.status_code, status.HTTP_200_OK)
        self.assertEqual(res3.data['dislikes_count'], 1)
        self.assertEqual(res3.data['user_interaction'], 'dislike')

    def test_delete_post_permissions(self):
        post = Post.objects.create(
            user=self.user1,
            description='Post to be deleted',
            image=self.dummy_image
        )
        delete_url = reverse('delete_post', kwargs={'post_id': post.id})

        # User2 attempts to delete User1's post -> 403 Forbidden
        self.client.force_authenticate(user=self.user2)
        res_forbidden = self.client.delete(delete_url)
        self.assertEqual(res_forbidden.status_code, status.HTTP_403_FORBIDDEN)

        # User1 deletes own post -> 200 OK
        self.client.force_authenticate(user=self.user1)
        res_success = self.client.delete(delete_url)
        self.assertEqual(res_success.status_code, status.HTTP_200_OK)
        self.assertEqual(Post.objects.count(), 0)

    def test_nested_comments_and_interactions(self):
        post = Post.objects.create(
            user=self.user1,
            description='Post with comments',
            image=self.dummy_image
        )
        comment_url = reverse('post_comments', kwargs={'post_id': post.id})

        # User2 leaves a top-level comment
        self.client.force_authenticate(user=self.user2)
        res_comm = self.client.post(comment_url, {'text': 'Great picture!'})
        self.assertEqual(res_comm.status_code, status.HTTP_201_CREATED)
        parent_comment_id = res_comm.data['comment']['id']

        # User1 replies to User2's comment
        self.client.force_authenticate(user=self.user1)
        res_reply = self.client.post(comment_url, {'text': 'Thank you!', 'parent_comment': parent_comment_id})
        self.assertEqual(res_reply.status_code, status.HTTP_201_CREATED)

        # Fetch comments list
        get_comm_res = self.client.get(comment_url)
        self.assertEqual(get_comm_res.status_code, status.HTTP_200_OK)
        self.assertEqual(get_comm_res.data['count'], 1)  # 1 top-level comment
        self.assertEqual(len(get_comm_res.data['comments'][0]['replies']), 1)  # 1 nested reply

        # User1 likes User2's comment
        like_comm_url = reverse('like_comment', kwargs={'comment_id': parent_comment_id})
        res_like_c = self.client.post(like_comm_url)
        self.assertEqual(res_like_c.status_code, status.HTTP_200_OK)

    def test_ephemeral_stories_workflow(self):
        stories_url = reverse('stories')

        # 1. User1 posts a story
        self.client.force_authenticate(user=self.user1)
        res_create = self.client.post(stories_url, {
            'image': self.dummy_image,
            'caption': 'My 24h story!'
        }, format='multipart')
        self.assertEqual(res_create.status_code, status.HTTP_201_CREATED)
        story_id = res_create.data['story']['id']

        # 2. User2 views active stories list
        self.client.force_authenticate(user=self.user2)
        res_list = self.client.get(stories_url)
        self.assertEqual(res_list.status_code, status.HTTP_200_OK)
        self.assertEqual(res_list.data['count'], 1)

        # 3. User2 marks User1's story as viewed
        view_url = reverse('mark_story_viewed', kwargs={'story_id': story_id})
        res_view = self.client.post(view_url)
        self.assertEqual(res_view.status_code, status.HTTP_200_OK)
        self.assertTrue(res_view.data['already_viewed'] == False)

        # 4. User1 checks who viewed their story
        self.client.force_authenticate(user=self.user1)
        viewers_url = reverse('get_story_viewers', kwargs={'story_id': story_id})
        res_viewers = self.client.get(viewers_url)
        self.assertEqual(res_viewers.status_code, status.HTTP_200_OK)
        self.assertEqual(res_viewers.data['count'], 1)
        self.assertEqual(res_viewers.data['viewers'][0]['username'], 'user2')

        # 5. Create an expired story (>24h ago) and verify it is auto-excluded
        expired_story = Story.objects.create(
            user=self.user1,
            image=self.dummy_image,
            caption='Old story',
            expires_at=timezone.now() - timedelta(hours=2)
        )
        res_list_after = self.client.get(stories_url)
        # Should still be count=1 (expired story excluded)
        self.assertEqual(res_list_after.data['count'], 1)
