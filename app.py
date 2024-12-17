from flask import Flask, render_template, request, send_file, jsonify
from PIL import Image
import os
from datetime import datetime
import io

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def create_gif_sequence(images, reverse_sequence=True):
    if reverse_sequence:
        # Create reversed sequence and merge with original
        reversed_images = images.copy()
        reversed_images.reverse()
        # Combine original and reversed sequences (excluding duplicate frames at transition)
        return images + reversed_images[1:]
    return images

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/create-gif', methods=['POST'])
def create_gif():
    if 'images[]' not in request.files:
        return jsonify({'error': 'No images uploaded'}), 400
    
    files = request.files.getlist('images[]')
    if not files or files[0].filename == '':
        return jsonify({'error': 'No images selected'}), 400

    try:
        # Convert uploaded images to PIL Image objects
        images = []
        for file in files:
            img = Image.open(file)
            if img.mode != 'RGB':
                img = img.convert('RGB')
            images.append(img)

        reverse_sequence = request.form.get('reverse', 'true').lower() == 'true'
        all_images = create_gif_sequence(images, reverse_sequence)

        # Create output buffer
        output_buffer = io.BytesIO()
        
        duration = int(request.form.get('duration', 200))
        all_images[0].save(
            output_buffer,
            format='GIF',
            save_all=True,
            append_images=all_images[1:],
            duration=duration,
            loop=0
        )
        
        output_buffer.seek(0)
        return send_file(
            output_buffer,
            mimetype='image/gif',
            as_attachment=True,
            download_name=f'animated_{datetime.now().strftime("%Y%m%d_%H%M%S")}.gif'
        )

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/preview-gif', methods=['POST'])
def preview_gif():
    if 'images[]' not in request.files:
        return jsonify({'error': 'No images uploaded'}), 400
    
    files = request.files.getlist('images[]')
    if not files or files[0].filename == '':
        return jsonify({'error': 'No images selected'}), 400

    try:
        # Convert uploaded images to PIL Image objects
        images = []
        for file in files:
            img = Image.open(file)
            if img.mode != 'RGB':
                img = img.convert('RGB')
            # Resize image for preview to reduce size
            img.thumbnail((600, 600), Image.Resampling.LANCZOS)
            images.append(img)

        reverse_sequence = request.form.get('reverse', 'true').lower() == 'true'
        all_images = create_gif_sequence(images, reverse_sequence)

        # Create output buffer
        output_buffer = io.BytesIO()
        
        duration = int(request.form.get('duration', 200))
        all_images[0].save(
            output_buffer,
            format='GIF',
            save_all=True,
            append_images=all_images[1:],
            duration=duration,
            loop=0
        )
        
        output_buffer.seek(0)
        # Convert to base64 for embedding in HTML
        import base64
        gif_base64 = base64.b64encode(output_buffer.getvalue()).decode('utf-8')
        return jsonify({'preview': f'data:image/gif;base64,{gif_base64}'})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
