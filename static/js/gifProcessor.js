// GIF processing using Web Workers and client-side processing
class GifProcessor {
    constructor() {
        this.worker = null;
        this.initWorker();
        this.cache = new Map();
        this.imageAdjustments = {
            brightness: 100,
            contrast: 100,
            saturation: 100,
            grayscale: false,
            sepia: false
        };
    }

    initWorker() {
        const workerCode = `
            importScripts('https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js');
            
            let gif = null;

            self.onmessage = function(e) {
                const { type, data } = e.data;
                
                switch(type) {
                    case 'init':
                        gif = new GIF({
                            workers: 2,
                            quality: 10,
                            width: data.width,
                            height: data.height
                        });
                        
                        gif.on('progress', progress => {
                            self.postMessage({ type: 'progress', data: progress });
                        });
                        
                        gif.on('finished', blob => {
                            self.postMessage({ type: 'finished', data: blob });
                            gif = null;
                        });
                        break;
                        
                    case 'addFrame':
                        if (gif) {
                            gif.addFrame(data.imageData, {
                                delay: data.delay,
                                copy: true
                            });
                        }
                        break;
                        
                    case 'render':
                        if (gif) {
                            gif.render();
                        }
                        break;
                }
            };
        `;

        const blob = new Blob([workerCode], { type: 'application/javascript' });
        this.worker = new Worker(URL.createObjectURL(blob));
    }

    setAdjustments(adjustments) {
        this.imageAdjustments = { ...this.imageAdjustments, ...adjustments };
    }

    applyImageAdjustments(ctx, imageData) {
        const { brightness, contrast, saturation, grayscale, sepia } = this.imageAdjustments;
        
        // Apply adjustments
        const pixels = imageData.data;
        for (let i = 0; i < pixels.length; i += 4) {
            let r = pixels[i];
            let g = pixels[i + 1];
            let b = pixels[i + 2];

            // Apply brightness
            const brightnessFactor = brightness / 100;
            r *= brightnessFactor;
            g *= brightnessFactor;
            b *= brightnessFactor;

            // Apply contrast
            const contrastFactor = (contrast / 100) ** 2;
            r = ((r / 255 - 0.5) * contrastFactor + 0.5) * 255;
            g = ((g / 255 - 0.5) * contrastFactor + 0.5) * 255;
            b = ((b / 255 - 0.5) * contrastFactor + 0.5) * 255;

            // Apply saturation
            const saturationFactor = saturation / 100;
            const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
            r = gray + saturationFactor * (r - gray);
            g = gray + saturationFactor * (g - gray);
            b = gray + saturationFactor * (b - gray);

            // Apply grayscale
            if (grayscale) {
                r = g = b = gray;
            }

            // Apply sepia
            if (sepia) {
                const tr = 0.393 * r + 0.769 * g + 0.189 * b;
                const tg = 0.349 * r + 0.686 * g + 0.168 * b;
                const tb = 0.272 * r + 0.534 * g + 0.131 * b;
                r = tr;
                g = tg;
                b = tb;
            }

            // Clamp values
            pixels[i] = Math.min(255, Math.max(0, r));
            pixels[i + 1] = Math.min(255, Math.max(0, g));
            pixels[i + 2] = Math.min(255, Math.max(0, b));
        }

        return imageData;
    }

    async processImages(images, options = {}) {
        const {
            maxWidth = 600,
            maxHeight = 600,
            delay = 200,
            useCache = true
        } = options;

        // Check cache
        const cacheKey = this.getCacheKey(images, options);
        if (useCache && this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Calculate dimensions
            let width = 0;
            let height = 0;
            images.forEach(img => {
                width = Math.max(width, img.naturalWidth);
                height = Math.max(height, img.naturalHeight);
            });

            // Scale to fit maxWidth/maxHeight while maintaining aspect ratio
            const scale = Math.min(1, maxWidth / width, maxHeight / height);
            canvas.width = width * scale;
            canvas.height = height * scale;

            // Initialize worker
            this.worker.postMessage({
                type: 'init',
                data: { width: canvas.width, height: canvas.height }
            });

            // Handle worker messages
            this.worker.onmessage = (e) => {
                const { type, data } = e.data;
                
                if (type === 'progress') {
                    if (options.onProgress) {
                        options.onProgress(data);
                    }
                } else if (type === 'finished') {
                    const gifBlob = data;
                    if (useCache) {
                        this.cache.set(cacheKey, gifBlob);
                    }
                    resolve(gifBlob);
                }
            };

            // Process each image
            images.forEach(img => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                // Apply image adjustments
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const adjustedImageData = this.applyImageAdjustments(ctx, imageData);
                ctx.putImageData(adjustedImageData, 0, 0);

                this.worker.postMessage({
                    type: 'addFrame',
                    data: {
                        imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
                        delay: delay
                    }
                });
            });

            // Start rendering
            this.worker.postMessage({ type: 'render' });
        });
    }

    getCacheKey(images, options) {
        const imageHashes = images.map(img => img.src).join(',');
        return `${imageHashes}-${JSON.stringify(options)}-${JSON.stringify(this.imageAdjustments)}`;
    }

    clearCache() {
        this.cache.forEach(url => URL.revokeObjectURL(url));
        this.cache.clear();
    }
}

// Export for module use
export default GifProcessor;
