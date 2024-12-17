from flask import Flask, render_template, request, send_file, jsonify, send_from_directory
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.utils import secure_filename
import os
from datetime import datetime
from utils import validate_image, create_gif_sequence, allowed_file
import hashlib
import io
from PIL import Image

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['STATIC_FOLDER'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static')
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'}
ALLOWED_MIME_TYPES = {'image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'}

# Configure rate limiting
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def secure_file_path(filename):
    """Generate a secure file path with content hash"""
    hash_obj = hashlib.sha256()
    while True:
        chunk = filename.read(4096)
        if not chunk:
            break
        hash_obj.update(chunk)
    filename.seek(0)
    
    base_name = secure_filename(os.path.splitext(filename.filename)[0])
    ext = os.path.splitext(filename.filename)[1]
    return f"{base_name}_{hash_obj.hexdigest()[:8]}{ext}"

@app.route('/')
def index():
    """Render the main page."""
    return render_template('index.html')

@app.route('/static/js/<path:filename>')
def serve_js(filename):
    """Serve JavaScript files with proper MIME type."""
    try:
        return send_from_directory(
            os.path.join(app.config['STATIC_FOLDER'], 'js'),
            filename,
            mimetype='application/javascript'
        )
    except Exception as e:
        app.logger.error(f"Error serving static file {filename}: {str(e)}")
        return str(e), 500

@app.route('/create-gif', methods=['POST'])
@limiter.limit("50 per hour")
def create_gif():
    """Create a GIF from uploaded images."""
    if 'images[]' not in request.files:
        return jsonify({'error': 'No images uploaded'}), 400

    files = request.files.getlist('images[]')
    if len(files) < 2:
        return jsonify({'error': 'At least 2 images are required'}), 400

    # Validate each image
    for file in files:
        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type'}), 400
        
        is_valid, message = validate_image(file)
        if not is_valid:
            return jsonify({'error': message}), 400

    try:
        duration = int(request.form.get('duration', 200))
        reverse = request.form.get('reverse', 'false').lower() == 'true'

        # Create GIF
        images = []
        for file in files:
            img = Image.open(file)
            if img.mode != 'RGB':
                img = img.convert('RGB')
            images.append(img)
            file.seek(0)  # Reset file pointer after reading

        # Create GIF using create_gif_sequence
        output_buffer = create_gif_sequence(images, duration, reverse)
        if not output_buffer:
            return jsonify({'error': 'Failed to create GIF'}), 500

        # Generate unique filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = secure_filename(f'animated_{timestamp}.gif')

        return send_file(
            output_buffer,
            mimetype='image/gif',
            as_attachment=True,
            download_name=filename
        )

    except Exception as e:
        app.logger.error(f"Error in create_gif: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/preview-gif', methods=['POST'])
@limiter.limit("100 per hour")
def preview_gif():
    """Generate a preview GIF."""
    try:
        app.logger.info("Received preview-gif request")
        
        if 'images[]' not in request.files:
            app.logger.error("No images found in request")
            return jsonify({'error': 'No images uploaded'}), 400

        files = request.files.getlist('images[]')
        app.logger.info(f"Received {len(files)} files")
        
        if len(files) < 2:
            app.logger.error("Less than 2 images provided")
            return jsonify({'error': 'At least 2 images are required'}), 400

        # Validate each image
        for file in files:
            app.logger.info(f"Validating file: {file.filename}")
            is_valid, message = validate_image(file)
            if not is_valid:
                app.logger.error(f"Invalid image {file.filename}: {message}")
                return jsonify({'error': message}), 400
            file.seek(0)  # Reset file pointer after validation

        try:
            duration = int(request.form.get('duration', 200))
            reverse = request.form.get('reverse', 'false').lower() == 'true'
            app.logger.info(f"Processing with duration={duration}, reverse={reverse}")

            # Create preview GIF with reduced quality
            images = []
            for file in files:
                app.logger.info(f"Opening image: {file.filename}")
                img = Image.open(file)
                app.logger.info(f"Converting image mode: {img.mode}")
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                images.append(img)
                file.seek(0)  # Reset file pointer after reading

            app.logger.info(f"Creating GIF sequence with {len(images)} images")
            output = create_gif_sequence(images, duration, reverse)
            app.logger.info("GIF sequence created")
            
            if not output:
                app.logger.error("Failed to create GIF sequence")
                return jsonify({'error': 'Failed to create preview'}), 500

            # Convert to base64 for preview
            app.logger.info("Converting to base64")
            output_data = output.getvalue()
            import base64
            gif_base64 = base64.b64encode(output_data).decode('utf-8')
            app.logger.info("Base64 conversion complete")
            
            return jsonify({
                'preview': f'data:image/gif;base64,{gif_base64}'
            })

        except ValueError as e:
            app.logger.error(f"Value error: {str(e)}")
            return jsonify({'error': f'Invalid parameter: {str(e)}'}), 400

    except Exception as e:
        app.logger.error(f"Error in preview_gif: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

# Register error handlers
@app.errorhandler(413)
def request_entity_too_large(error):
    return jsonify({
        'error': 'File too large',
        'code': 'FILE_TOO_LARGE'
    }), 413

@app.errorhandler(429)
def ratelimit_handler(e):
    return jsonify({
        'error': f"Rate limit exceeded. {e.description}",
        'code': 'RATE_LIMIT_EXCEEDED'
    }), 429

@app.errorhandler(500)
def internal_error(error):
    app.logger.error(f'Server Error: {error}')
    return jsonify({
        'error': 'Internal server error',
        'code': 'INTERNAL_ERROR'
    }), 500

def init_app():
    """Initialize the Flask application with blueprints."""
    from api import api as api_blueprint
    app.register_blueprint(api_blueprint)
    return app

if __name__ == '__main__':
    app = init_app()
    app.run(debug=True)
