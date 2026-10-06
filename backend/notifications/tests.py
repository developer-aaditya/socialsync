from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase
from accounts.models import User
from posts.models import Post, Comment, PostInteraction
from .models import Notification


class NotificationsAPITests(APITestCase):

    def setUp(self):
        self.dummy_image = SimpleUploadedFile(
            name='notif_img.jpg',
            content=b'\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xFF\xDB\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.\' ",#\x1c\x1c(7),01444\x1f\'9=82<.342\xFF\xC0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xFF\xC4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\xFF\xDA\x00\x08\x01\x01\x00\x00?\x00\x7F\x00\xFF\xD9',
            content_type='image/jpeg'
        )

        self.user1 = User.objects.create_user(
            email='author@example.com',
            username='author_user',
            password='Password123!',
            full_name='Author User',
            date_of_birth='1990-01-01'
        )

        self.user2 = User.objects.create_user(
            email='interactor@example.com',
            username='interactor_user',
            password='Password123!',
            full_name='Interactor User',
            date_of_birth='1992-02-02'
        )

        self.post = Post.objects.create(
            user=self.user1,
            description='Test post for notifications',
            image=self.dummy_image
        )

        self.notif_list_url = reverse('get_user_notifications')
        self.mark_all_url = reverse('mark_all_notifications_read')

    def test_post_like_triggers_notification(self):
        # User2 likes User1's post
        PostInteraction.objects.create(
            user=self.user2,
            post=self.post,
            interaction_type=PostInteraction.LIKE
        )

        # Check notification for User1
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.notif_list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['unread_count'], 1)
        self.assertEqual(response.data['notifications'][0]['notification_type'], 'like')

    def test_post_comment_and_reply_trigger_notifications(self):
        # User2 comments on User1's post
        comment = Comment.objects.create(
            user=self.user2,
            post=self.post,
            text='Nice post!'
        )

        # Check User1 got comment notification
        self.assertEqual(Notification.objects.filter(receipient=self.user1, notification_type='comment').count(), 1)

        # User1 replies to User2's comment
        reply = Comment.objects.create(
            user=self.user1,
            post=self.post,
            parent_comment=comment,
            text='Thanks!'
        )

        # Check User2 got reply notification
        self.assertEqual(Notification.objects.filter(receipient=self.user2, notification_type='reply').count(), 1)

    def test_mark_notification_as_read(self):
        notif = Notification.objects.create(
            receipient=self.user1,
            actor=self.user2,
            notification_type='like',
            post=self.post
        )

        self.client.force_authenticate(user=self.user1)
        mark_read_url = reverse('mark_notification_as_read', kwargs={'notification_id': notif.id})
        res = self.client.patch(mark_read_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        notif.refresh_from_db()
        self.assertTrue(notif.read_status)

    def test_mark_all_notifications_as_read(self):
        Notification.objects.create(
            receipient=self.user1,
            actor=self.user2,
            notification_type='like',
            post=self.post
        )
        Notification.objects.create(
            receipient=self.user1,
            actor=self.user2,
            notification_type='comment',
            post=self.post
        )

        self.client.force_authenticate(user=self.user1)
        res = self.client.post(self.mark_all_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        unread_count = Notification.objects.filter(receipient=self.user1, read_status=False).count()
        self.assertEqual(unread_count, 0)

    def test_post_and_comment_mention_notifications(self):
        # User 1 posts with @interactor_user mention
        post = Post.objects.create(
            user=self.user1,
            description='Hey @interactor_user check out this awesome post!',
            image=self.dummy_image
        )

        # Check User 2 got mention notification
        mention_notif = Notification.objects.filter(receipient=self.user2, notification_type='mention', post=post).first()
        self.assertIsNotNone(mention_notif)
        self.assertEqual(mention_notif.actor, self.user1)

        # User 2 comments mentioning @author_user
        comment = Comment.objects.create(
            user=self.user2,
            post=post,
            text='Shoutout to @author_user for creating this!'
        )

        # Check User 1 got comment mention notification
        comm_mention_notif = Notification.objects.filter(receipient=self.user1, notification_type='mention', comment=comment).first()
        self.assertIsNotNone(comm_mention_notif)
        self.assertEqual(comm_mention_notif.actor, self.user2)
