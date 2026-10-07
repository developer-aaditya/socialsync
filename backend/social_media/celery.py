import os
from celery import Celery

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'social_media.settings')

# Instantiate a Celery application named social_media and configure it to use the settings from the Django project.
app = Celery('social_media')

# Read configuration from Django settings, using a namespace of 'CELERY' to avoid conflicts with other settings.
# This allows Celery to pick up any relevant configuration options defined in the Django settings file.
# Example: CELERY_BROKER_URL in settings.py became app.conf.broker_url in Celery.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Automatically discover tasks from all installed Django apps.
# Scans all app directories (accounts/tasks.py, posts/tasks.py) and registers tasks automatically.
app.autodiscover_tasks()

@app.task(bind=True, ignore_result=True)
def debug_task(self):
    """A simple debug task to print the request information."""
    print(f'Request: {self.request!r}')