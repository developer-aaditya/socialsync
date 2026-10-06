from urllib.parse import parse_qs
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model

User = get_user_model()


@database_sync_to_async
def get_user_from_token(token):
    try:
        clean_token = token.strip().strip('"\'')
        access_token = AccessToken(clean_token)
        user_id = access_token['user_id']
        return User.objects.get(id=user_id)
    except Exception as e:
        print(f"[WebSocket Auth Error] Invalid or expired token: {e}")
        return AnonymousUser()
    

class JWTAuthMiddleware:
    """
    Custom middleware to authenticate WebSocket connections using JWT tokens.
    """

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        # Extract the token from the query string
        query_string = scope.get('query_string', b'').decode()
        query_params = parse_qs(query_string)
        token = query_params.get('token', [None])[0]

        if token:
            # Get the user associated with the token
            user = await get_user_from_token(token)
            scope['user'] = user
        else:
            scope['user'] = AnonymousUser()

        return await self.inner(scope, receive, send)