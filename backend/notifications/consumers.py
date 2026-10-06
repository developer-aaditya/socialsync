import json
from channels.generic.websocket import AsyncWebsocketConsumer


class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get('user')
        if not self.user or not self.user.is_authenticated:
            await self.close()
            return
        
        # Unique group name for the user
        self.room_group_name = f'notifications_{self.user.id}'
    
        # Join the private group room in the channel layer for this user
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        # Accept the WebSocket connection
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'user') and self.user and self.user.is_authenticated:
            # Leave the private group room in the channel layer for this user
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        pass

    async def send_notification(self, event):
        # Send a notification to the WebSocket client
        notification_data = event.get('notification', {})
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'notification': notification_data
        }))