import GifProcessor from './gifProcessor.js';

// Initialize GIF processor
const gifProcessor = new GifProcessor();

// Get DOM elements
const form = document.getElementById('uploadForm');
const fileInput = document.getElementById('fileInput');
const preview = document.getElementById('preview');
const imagePreview = document.getElementById('imagePreview');
const loading = document.getElementById('loading');
const previewContainer = document.getElementById('previewContainer');
const gifPreview = document.getElementById('gifPreview');
const durationInput = document.getElementById('duration');
const reverseSequence = document.getElementById('reverseSequence');
const durationPresets = document.querySelectorAll('.duration-preset');
const brightnessInput = document.getElementById('brightness');
const contrastInput = document.getElementById('contrast');
const saturationInput = document.getElementById('saturation');
const grayscaleInput = document.getElementById('grayscale');
const sepiaInput = document.getElementById('sepia');

let previewDebounceTimer;

// Toggle section visibility
window.toggleSection = function(sectionId) {
    const section = document.getElementById(sectionId);
    const arrow = document.getElementById(sectionId + 'Arrow');
    const content = document.getElementById(sectionId + 'Content');
    
    if (section.classList.contains('collapsed')) {
        section.classList.remove('collapsed');
        arrow.classList.add('rotate-180');
        content.classList.remove('hidden');
    } else {
        section.classList.add('collapsed');
        arrow.classList.remove('rotate-180');
        content.classList.add('hidden');
    }
};

// Initialize sections
document.addEventListener('DOMContentLoaded', function() {
    const sections = ['preview', 'adjustments'];
    sections.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (section) {
            section.classList.add('collapsed');
        }
    });
    
    // Load saved settings
    loadSavedSettings();
});

// Load saved settings from localStorage
function loadSavedSettings() {
    // Load duration
    const savedDuration = localStorage.getItem('gifDuration');
    if (savedDuration) {
        durationInput.value = savedDuration;
    }

    // Load reverse sequence setting
    const savedReverse = localStorage.getItem('gifReverse');
    if (savedReverse !== null) {
        reverseSequence.checked = savedReverse === 'true';
    }

    // Load adjustment values
    const adjustments = ['brightness', 'contrast', 'saturation', 'grayscale', 'sepia'];
    adjustments.forEach(adjustment => {
        const savedValue = localStorage.getItem(`gif${adjustment.charAt(0).toUpperCase() + adjustment.slice(1)}`);
        if (savedValue !== null) {
            document.getElementById(adjustment).value = savedValue;
        }
    });
}

// Save settings to localStorage
function saveSettings() {
    localStorage.setItem('gifDuration', durationInput.value);
    localStorage.setItem('gifReverse', reverseSequence.checked);
    
    // Save adjustment values
    const adjustments = ['brightness', 'contrast', 'saturation', 'grayscale', 'sepia'];
    adjustments.forEach(adjustment => {
        const value = document.getElementById(adjustment).value;
        localStorage.setItem(`gif${adjustment.charAt(0).toUpperCase() + adjustment.slice(1)}`, value);
    });
}

// Duration preset buttons
durationPresets.forEach(button => {
    button.addEventListener('click', () => {
        durationInput.value = button.dataset.duration;
        saveSettings();
        updatePreview();
    });
});

// Input event listeners
durationInput.addEventListener('input', () => {
    clearTimeout(previewDebounceTimer);
    previewDebounceTimer = setTimeout(() => {
        saveSettings();
        updatePreview();
    }, 500);
});

reverseSequence.addEventListener('change', () => {
    saveSettings();
    updatePreview();
});

// Preview update function
async function updatePreview() {
    if (fileInput.files.length < 2) return;

    const previewLoading = document.getElementById('previewLoading');
    previewLoading.classList.remove('hidden');
    previewContainer.classList.remove('hidden');

    const formData = new FormData();
    for (let file of fileInput.files) {
        formData.append('images[]', file);
    }
    formData.append('duration', durationInput.value);
    formData.append('reverse', reverseSequence.checked);

    try {
        const response = await fetch('/preview-gif', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            gifPreview.src = data.preview;
        } else if (response.status === 413) {
            const error = await response.json();
            alert(error.error);
        }
    } catch (error) {
        console.error('Preview generation failed:', error);
    } finally {
        previewLoading.classList.add('hidden');
    }
}

// Image adjustments
const updateAdjustments = () => {
    gifProcessor.setAdjustments({
        brightness: parseFloat(brightnessInput.value),
        contrast: parseFloat(contrastInput.value),
        saturation: parseFloat(saturationInput.value),
        grayscale: grayscaleInput.checked,
        sepia: sepiaInput.checked
    });
};

[brightnessInput, contrastInput, saturationInput, grayscaleInput, sepiaInput].forEach(input => {
    input.addEventListener('input', () => {
        saveSettings();
        updateAdjustments();
    });
});

// Drag and drop handlers
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    document.querySelector('.drag-area').addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    document.querySelector('.drag-area').addEventListener(eventName, () => {
        document.querySelector('.drag-area').classList.add('active');
    });
});

['dragleave', 'drop'].forEach(eventName => {
    document.querySelector('.drag-area').addEventListener(eventName, () => {
        document.querySelector('.drag-area').classList.remove('active');
    });
});

// File handling
document.querySelector('.drag-area').addEventListener('drop', handleDrop);
document.querySelector('.drag-area').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFiles);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles({ target: { files } });
}

function handleFiles(e) {
    const files = [...e.target.files];
    const MAX_FILE_SIZE = 16 * 1024 * 1024; // 16MB in bytes

    // Check file sizes
    for (const file of files) {
        if (file.size > MAX_FILE_SIZE) {
            alert(`File "${file.name}" is too large. Maximum size is 16MB.`);
            return;
        }
    }

    preview.classList.remove('hidden');
    imagePreview.innerHTML = '';

    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const div = document.createElement('div');
            div.className = 'relative aspect-square';
            div.innerHTML = `
                <img src="${e.target.result}" class="w-full h-full object-cover rounded-lg">
            `;
            imagePreview.appendChild(div);
        }
        reader.readAsDataURL(file);
    });

    updatePreview();
}

// Form submission
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const files = fileInput.files;

    if (files.length < 2) {
        alert('Please select at least 2 images');
        return;
    }

    loading.classList.remove('hidden');

    const formData = new FormData();
    for (let file of files) {
        formData.append('images[]', file);
    }
    formData.append('duration', durationInput.value);
    formData.append('reverse', reverseSequence.checked);

    try {
        const response = await fetch('/create-gif', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = response.headers.get('content-disposition').split('filename=')[1];
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to create GIF');
        }
    } catch (error) {
        alert('An error occurred while creating the GIF');
    } finally {
        loading.classList.add('hidden');
    }
});

// Mobile create button
document.getElementById('mobileCreate').addEventListener('click', () => {
    document.querySelector('#uploadForm button[type="submit"]').click();
});

// Service worker registration
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/static/js/serviceWorker.js')
        .then(registration => {
            console.log('ServiceWorker registration successful');
        })
        .catch(err => {
            console.log('ServiceWorker registration failed: ', err);
        });
}