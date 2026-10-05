from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Notification
from .serializers import NotificationSerializer


# API view to list all notifications for the authenticated user
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_notifications_view(request):
    # Fetch notifications for the authenticated user
    notifications = Notification.objects.filter(receipient=request.user)
    
    # Calculate the number of unread notifications
    unread_count = notifications.filter(read_status=False).count()
    
    # Serialize the notifications
    serializer = NotificationSerializer(notifications, many=True)
    
    # Return the serialized data in the response
    return Response({
        'unread_count': unread_count,
        'count': notifications.count(),
        'notifications': serializer.data
    }, status=status.HTTP_200_OK)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def mark_notification_as_read_view(request, notification_id):
    # Retrieve the notification object for the authenticated user
    notification = get_object_or_404(Notification, id=notification_id, receipient=request.user)
    
    notification.read_status = True  # Mark the notification as read
    notification.save()  # Save the changes to the database
    
    return Response({'message': 'Notification marked as read.'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_all_notifications_read_view(request):
    # Update all unread notifications for recipient in a single bulk query
    Notification.objects.filter(receipient=request.user, read_status=False).update(read_status=True)
    
    return Response({
        'message': 'All notifications marked as read'
    }, status=status.HTTP_200_OK)