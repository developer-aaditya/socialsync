import os
from PIL import Image
from celery import shared_task
from django.apps import apps
import logging

logger = logging.getLogger(__name__)


@shared_task(bind=True, ignore_result=True)
def compress_and_convert_post_image(self, post_id):
    """Compress and convert the image of a post to WebP format."""
    try:
        Post = apps.get_model('posts', 'Post')
        post = Post.objects.get(id=post_id)
        if not post.image or not os.path.exists(post.image.path):
            logger.warning(f"Post with ID {post_id} has no image or the image path does not exist.")
            return
        
        image_path = post.image.path
        filename, _ = os.path.splitext(image_path) #Filename without extension
        webp_image_path = f"{filename}.webp"
        
        # Open the original image
        with Image.open(image_path) as img:
            # Convert RGBA images to RGB to avoid issues with transparency in WebP
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
                
            # Resize the image to a maximum of 1080x1080 pixels while maintaining aspect ratio
            max_size = (1080, 1080)
            img.thumbnail(max_size, Image.Resampling.LANCZOS)

            # Save the image in WebP format with quality=80
            img.save(webp_image_path, "WEBP", quality=80, optimize=True)
            
        # Remove the original image if the WebP image was created successfully
        if webp_image_path != image_path and os.path.exists(webp_image_path):
            if os.path.exists(image_path):
                os.remove(image_path)  # Remove the original image
                
            # Update Django Post model instance with the relative path to the new WebP image
            relative_webp_path = os.path.relpath(
                webp_image_path, 
                start=os.path.join(os.path.dirname(image_path), '')
            )

            # Ensure the path is relative and uses forward slashes
            post.image.name = relative_webp_path.replace("\\", "/").lstrip('/')
            post.save(update_fields=['image'])
            
            logger.info(f"Successfully compressed and converted image for Post ID {post_id} to WebP format.")

    except Post.DoesNotExist:
        logger.error(f"Post with ID {post_id} does not exist.")
    except Exception as e:
        logger.error(f"Error processing image for Post ID {post_id}: {e}")
        # Automatically retry the task up to 3 times
        raise self.retry(exc=e, max_retries=3)