from PIL import Image
import os
import imghdr
import magic
import io
from werkzeug.utils import secure_filename
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'}
ALLOWED_MIME_TYPES = {'image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def validate_image(file):
    try:
        # Check if file is present
        if not file:
            return False, "No file provided"

        # Check filename
        if not allowed_file(file.filename):
            return False, "File type not allowed"

        # Read file content
        file_content = file.read()
        file.seek(0)  # Reset file pointer

        # Check MIME type
        mime = magic.from_buffer(file_content, mime=True)
        if mime not in ALLOWED_MIME_TYPES:
            return False, f"Invalid file type: {mime}"

        # Verify it's a valid image
        try:
            img = Image.open(io.BytesIO(file_content))
            img.verify()
            return True, "Valid image"
        except Exception as e:
            return False, f"Invalid image file: {str(e)}"
    except Exception as e:
        return False, f"Error validating image: {str(e)}"

def create_gif_sequence(images, duration=200, reverse=False):
    """Create a GIF sequence from a list of PIL Image objects."""
    try:
        logger.info(f"Creating GIF sequence from {len(images)} images")
        if not images:
            logger.error("No images provided")
            return None

        # Convert all images to RGBA mode for consistency
        frames = []
        max_size = (800, 800)  # Maximum size for preview
        
        for i, img in enumerate(images):
            try:
                logger.info(f"Processing frame {i+1}/{len(images)}")
                # Convert to RGB mode if necessary
                if img.mode in ('RGBA', 'LA'):
                    logger.info(f"Converting frame {i+1} from {img.mode} to RGB")
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    background.paste(img, mask=img.split()[-1])
                    img = background
                elif img.mode != 'RGB':
                    logger.info(f"Converting frame {i+1} from {img.mode} to RGB")
                    img = img.convert('RGB')
                
                # Resize if needed
                if img.size[0] > max_size[0] or img.size[1] > max_size[1]:
                    logger.info(f"Resizing frame {i+1} from {img.size} to fit within {max_size}")
                    img.thumbnail(max_size, Image.Resampling.LANCZOS)
                
                frames.append(img)
                logger.info(f"Frame {i+1} processed successfully")
            except Exception as e:
                logger.error(f"Error processing frame {i+1}: {str(e)}")
                return None
        
        if not frames:
            logger.error("No valid frames to create GIF")
            return None
        
        # Get dimensions of first image
        width, height = frames[0].size
        logger.info(f"Base dimensions: {width}x{height}")
        
        # Resize all frames to match first frame
        logger.info("Resizing frames to match first frame")
        frames = [frame.resize((width, height), Image.Resampling.LANCZOS) for frame in frames]
        
        # Add reverse sequence if requested
        if reverse:
            logger.info("Adding reverse sequence")
            frames.extend(frames[::-1])
        
        # Save to bytes buffer
        output = io.BytesIO()
        logger.info(f"Saving GIF with {len(frames)} frames, duration: {duration}ms")
        
        try:
            # Save as animated GIF
            frames[0].save(
                output,
                format='GIF',
                save_all=True,
                append_images=frames[1:],
                duration=duration,
                loop=0,
                optimize=True
            )
            logger.info("GIF saved successfully")
            
            output.seek(0)
            return output
            
        except Exception as e:
            logger.error(f"Error saving GIF: {str(e)}")
            return None
        
    except Exception as e:
        logger.error(f"Error creating GIF sequence: {str(e)}")
        return None
