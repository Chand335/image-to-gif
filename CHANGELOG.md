# Changelog

All notable changes to this project will be documented in this file.

## [0.1] - 2024-12-17

### Added
- Initial release of the Image to GIF converter web application
- Basic Features:
  - Web-based interface with drag-and-drop support
  - Multiple image upload
  - Real-time GIF preview
  - Customizable frame duration (100ms to 3000ms)
  - Duration presets (Fast, Normal, Slow)
  - Forward-backward loop option
  - Automatic GIF generation and download
  - Responsive design with two-column layout
  - Preview window with 600x600 maximum size

### Technical Details
- Built with Flask and Pillow
- Modern UI using Tailwind CSS
- Client-side preview generation
- Automatic image format conversion
- Error handling and validation

### Dependencies
- Python 3.7+
- Flask 3.0.0
- Pillow 10.1.0
