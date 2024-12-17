# Image to GIF Converter API Documentation

## API Endpoints

### Create GIF
Convert multiple images into an animated GIF.

**Endpoint:** `POST /api/v1/create-gif`  
**Content-Type:** `multipart/form-data`

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| images[] | File[] | Yes | - | Array of image files to convert |
| duration | Integer | No | 200 | Frame duration in milliseconds (20-5000) |
| reverse | Boolean | No | true | Create forward-backward loop |
| quality | Integer | No | 85 | Output quality (1-100) |
| max_size | Integer | No | 800 | Maximum output size in pixels |

#### Response

On success: GIF file with `Content-Type: image/gif`

On error: JSON object with error details
```json
{
    "error": "Error message",
    "code": "ERROR_CODE"
}
```

#### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| NO_IMAGES | 400 | No images provided |
| INVALID_FILE_TYPE | 400 | Unsupported file type |
| INVALID_IMAGE | 400 | Corrupted or invalid image |
| INVALID_DURATION | 400 | Duration out of range |
| INVALID_QUALITY | 400 | Quality out of range |
| FILE_TOO_LARGE | 413 | File size exceeds limit |
| RATE_LIMIT_EXCEEDED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |

#### Example

Using cURL:
```bash
curl -X POST http://localhost:5000/api/v1/create-gif \
  -F "images[]=@image1.jpg" \
  -F "images[]=@image2.jpg" \
  -F "duration=200" \
  -F "reverse=true" \
  -F "quality=85" \
  -o output.gif
```

### Health Check
Check API health status.

**Endpoint:** `GET /api/v1/health`

#### Response
```json
{
    "status": "healthy",
    "version": "v0.1"
}
```

## Rate Limits

- API endpoints: 100 requests per hour
- Web interface: 200 requests per day, 50 per hour

## Supported Image Formats

- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- BMP (.bmp)
- WebP (.webp)

## File Size Limits

- Maximum file size per image: 16MB
- Maximum total request size: 32MB

## Best Practices

1. Optimize images before upload
2. Use appropriate quality settings
3. Limit frame duration for smooth animations
4. Consider using max_size parameter for large images

## Error Handling

- Always check response status codes
- Handle rate limiting with exponential backoff
- Validate file types before upload
- Implement proper error handling in your code

## Security

- API uses rate limiting to prevent abuse
- All files are validated for type and content
- Secure file handling with content verification
- No server-side file storage (memory only)
