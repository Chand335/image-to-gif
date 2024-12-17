from flask import Blueprint, request, jsonify, send_file
from werkzeug.utils import secure_filename
from utils import validate_image, create_gif_sequence
import os
from PIL import Image
from app import allowed_file, limiter

api = Blueprint('api', __name__, url_prefix='/api/v1')

@api.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'version': '1.0.0'
    })

@api.route('/create-gif', methods=['POST'])
@limiter.limit("100 per hour")
def create_gif_api():
    """Create a GIF from uploaded images."""
    if 'images[]' not in request.files:
        return jsonify({'error': 'No images provided'}), 400

    files = request.files.getlist('images[]')
    if len(files) < 2:
        return jsonify({'error': 'At least 2 images are required'}), 400

    # Validate each image
    for file in files:
        if not allowed_file(file.filename):
            return jsonify({
                'error': f'Invalid file type: {file.filename}',
                'code': 'INVALID_FILE_TYPE'
            }), 400
        
        is_valid, message = validate_image(file)
        if not is_valid:
            return jsonify({'error': f'Invalid image: {message}'}), 400

    try:
        duration = int(request.form.get('duration', 200))
        reverse = request.form.get('reverse', 'false').lower() == 'true'
        
        # Process images
        images = []
        for file in files:
            img = Image.open(file)
            
            # Resize if needed
            if img.width > 800 or img.height > 800:
                ratio = min(800 / img.width, 800 / img.height)
                new_size = (int(img.width * ratio), int(img.height * ratio))
                img = img.resize(new_size, Image.Resampling.LANCZOS)

            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            images.append(img)

        # Create GIF
        output = create_gif_sequence(images, duration, reverse)
        if not output:
            return jsonify({'error': 'Failed to create GIF'}), 500

        # Generate unique filename
        filename = secure_filename('animated.gif')
        
        return send_file(
            output,
            mimetype='image/gif',
            as_attachment=True,
            download_name=filename
        )

    except Exception as e:
        return jsonify({'error': str(e)}), 500
