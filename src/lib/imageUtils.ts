/**
 * Image Processing Utilities
 * Handles image cropping, compression, and optimization for profile pictures
 */

export interface ImageCropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ProcessedImage {
  webpBlob: Blob;
  webpFile: File;
  jpegBlob?: Blob;
  jpegFile?: File;
  previewUrl: string;
  originalDimensions: { width: number; height: number };
  processedDimensions: { width: number; height: number };
}

// Image validation
export const IMAGE_CONFIG = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  MIN_DIMENSIONS: 400, // 400x400px minimum
  OUTPUT_SIZE: 512, // 512x512px for processing
  ACCEPTED_FORMATS: ['image/jpeg', 'image/png', 'image/webp'],
  ACCEPTED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp'],
};

/**
 * Validate image file
 * @param file The image file to validate
 * @returns Object with validation result and error message
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > IMAGE_CONFIG.MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size must be less than 5MB. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
    };
  }

  // Check file type
  if (!IMAGE_CONFIG.ACCEPTED_FORMATS.includes(file.type)) {
    return {
      valid: false,
      error: `File format must be JPG, PNG, or WebP. Received: ${file.type}`,
    };
  }

  return { valid: true };
}

/**
 * Load image and get dimensions
 * @param file The image file to load
 * @returns Promise with Image element and dimensions
 */
export function loadImage(file: File): Promise<{ img: HTMLImageElement; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          img,
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Validate image dimensions
 * @param width Image width
 * @param height Image height
 * @returns Object with validation result and error message
 */
export function validateImageDimensions(width: number, height: number): { valid: boolean; error?: string } {
  if (width < IMAGE_CONFIG.MIN_DIMENSIONS || height < IMAGE_CONFIG.MIN_DIMENSIONS) {
    return {
      valid: false,
      error: `Image must be at least ${IMAGE_CONFIG.MIN_DIMENSIONS}x${IMAGE_CONFIG.MIN_DIMENSIONS}px. Current: ${width}x${height}px`,
    };
  }

  return { valid: true };
}

/**
 * Crop image to square and resize
 * @param img HTMLImageElement
 * @param cropArea Crop area coordinates
 * @returns Promise with cropped canvas
 */
export function cropImageToSquare(
  img: HTMLImageElement,
  cropArea: ImageCropArea
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('Failed to get canvas context');

  // Set canvas to square dimensions
  const size = IMAGE_CONFIG.OUTPUT_SIZE;
  canvas.width = size;
  canvas.height = size;

  // Draw cropped image on canvas
  ctx.drawImage(
    img,
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
    0,
    0,
    size,
    size
  );

  return canvas;
}

/**
 * Get default crop area for square image
 * Crops to the largest centered square
 * @param width Image width
 * @param height Image height
 * @returns ImageCropArea
 */
export function getDefaultCropArea(width: number, height: number): ImageCropArea {
  const size = Math.min(width, height);
  const x = (width - size) / 2;
  const y = (height - size) / 2;

  return { x, y, width: size, height: size };
}

/**
 * Convert canvas to WebP Blob
 * @param canvas HTMLCanvasElement
 * @param quality Compression quality (0-1)
 * @returns Promise with Blob
 */
export function canvasToWebP(canvas: HTMLCanvasElement, quality: number = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to WebP'));
        }
      },
      'image/webp',
      quality
    );
  });
}

/**
 * Convert canvas to JPEG Blob
 * @param canvas HTMLCanvasElement
 * @param quality Compression quality (0-1)
 * @returns Promise with Blob
 */
export function canvasToJPEG(canvas: HTMLCanvasElement, quality: number = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to JPEG'));
        }
      },
      'image/jpeg',
      quality
    );
  });
}

/**
 * Create File from Blob
 * @param blob The blob to convert
 * @param filename The filename
 * @returns File object
 */
export function blobToFile(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: blob.type });
}

/**
 * Process image: validate, load, crop, and optimize
 * @param file The image file to process
 * @param cropArea Optional crop area. If not provided, uses default square crop
 * @returns Promise with processed image data
 */
export async function processImage(
  file: File,
  cropArea?: ImageCropArea
): Promise<ProcessedImage> {
  // Validate file
  const fileValidation = validateImageFile(file);
  if (!fileValidation.valid) {
    throw new Error(fileValidation.error);
  }

  // Load image
  const { img, width: originalWidth, height: originalHeight } = await loadImage(file);

  // Validate dimensions
  const dimensionValidation = validateImageDimensions(originalWidth, originalHeight);
  if (!dimensionValidation.valid) {
    throw new Error(dimensionValidation.error);
  }

  // Get crop area (default to centered square)
  const area = cropArea || getDefaultCropArea(originalWidth, originalHeight);

  // Crop image
  const croppedCanvas = cropImageToSquare(img, area);

  // Convert to WebP (main format)
  const webpBlob = await canvasToWebP(croppedCanvas, 0.85);
  const webpFile = blobToFile(webpBlob, file.name.replace(/\.[^.]+$/, '.webp'));

  // Also create JPEG as fallback
  const jpegBlob = await canvasToJPEG(croppedCanvas, 0.85);
  const jpegFile = blobToFile(jpegBlob, file.name.replace(/\.[^.]+$/, '.jpg'));

  // Create preview URL
  const previewUrl = URL.createObjectURL(webpBlob);

  return {
    webpBlob,
    webpFile,
    jpegBlob,
    jpegFile,
    previewUrl,
    originalDimensions: { width: originalWidth, height: originalHeight },
    processedDimensions: { width: IMAGE_CONFIG.OUTPUT_SIZE, height: IMAGE_CONFIG.OUTPUT_SIZE },
  };
}

/**
 * Get image file size in readable format
 * @param bytes File size in bytes
 * @returns Readable file size string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Create circular crop preview (for UI display)
 * @param canvas HTMLCanvasElement
 * @returns HTMLCanvasElement with circular crop
 */
export function createCircularCropCanvas(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const circleCanvas = document.createElement('canvas');
  circleCanvas.width = canvas.width;
  circleCanvas.height = canvas.height;

  const ctx = circleCanvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  // Draw circle
  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height / 2, canvas.width / 2, 0, Math.PI * 2);
  ctx.fillStyle = 'white';
  ctx.fill();

  // Draw image inside circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height / 2, canvas.width / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(canvas, 0, 0);
  ctx.restore();

  return circleCanvas;
}

/**
 * Resize image to specific dimensions
 * @param img HTMLImageElement
 * @param width Target width
 * @param height Target height
 * @returns HTMLCanvasElement with resized image
 */
export function resizeImage(
  img: HTMLImageElement,
  width: number,
  height: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  ctx.drawImage(img, 0, 0, width, height);
  return canvas;
}