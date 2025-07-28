/**
 * Image processing utilities for extracting text from property images
 */

import sharp from 'sharp';
import { createWorker } from 'tesseract.js';
import vision from '@google-cloud/vision';

// Initialize Google Cloud Vision client
let visionClient = null;
try {
  if (process.env.GOOGLE_CLOUD_PROJECT_ID && 
      process.env.GOOGLE_CLOUD_PRIVATE_KEY && 
      process.env.GOOGLE_CLOUD_CLIENT_EMAIL) {
    
    const credentials = {
      type: 'service_account',
      project_id: process.env.GOOGLE_CLOUD_PROJECT_ID,
      private_key_id: process.env.GOOGLE_CLOUD_PRIVATE_KEY_ID,
      private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
      client_id: process.env.GOOGLE_CLOUD_CLIENT_ID,
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.GOOGLE_CLOUD_CLIENT_EMAIL)}`
    };

    visionClient = new vision.ImageAnnotatorClient({ credentials });
  }
} catch (error) {
  console.warn('Google Cloud Vision not configured:', error.message);
}

/**
 * Preprocess image for better OCR results
 * @param {Buffer} imageBuffer - The image buffer
 * @returns {Buffer} - Processed image buffer
 */
export async function preprocessImage(imageBuffer) {
  try {
    const processedImage = await sharp(imageBuffer)
      .resize(null, 1000, { 
        withoutEnlargement: true,
        kernel: sharp.kernel.lanczos3 
      })
      .greyscale()
      .normalize()
      .sharpen()
      .png()
      .toBuffer();

    return processedImage;
  } catch (error) {
    console.error('Error preprocessing image:', error);
    return imageBuffer; // Return original if processing fails
  }
}

/**
 * Extract text from image using Google Cloud Vision (primary method)
 * @param {Buffer} imageBuffer - The image buffer
 * @returns {string} - Extracted text
 */
export async function extractTextWithGoogleVision(imageBuffer) {
  if (!visionClient) {
    throw new Error('Google Cloud Vision not configured');
  }

  try {
    // Preprocess the image
    const processedImage = await preprocessImage(imageBuffer);
    
    // Perform text detection
    const [result] = await visionClient.textDetection({
      image: { content: processedImage }
    });
    
    const detections = result.textAnnotations;
    const extractedText = detections && detections.length > 0 ? detections[0].description : '';
    
    console.log('Google Vision extracted text length:', extractedText.length);
    return extractedText || '';
  } catch (error) {
    console.error('Google Vision OCR error:', error);
    throw error;
  }
}

/**
 * Extract text from image using Tesseract.js (fallback method)
 * @param {Buffer} imageBuffer - The image buffer
 * @returns {string} - Extracted text
 */
export async function extractTextWithTesseract(imageBuffer) {
  const worker = await createWorker('eng');
  
  try {
    // Preprocess the image
    const processedImage = await preprocessImage(imageBuffer);
    
    // Configure Tesseract for better accuracy
    await worker.setParameters({
      tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz .,/-₹$()[]',
      tessedit_pageseg_mode: '6', // Assume a single uniform block of text
    });
    
    const { data: { text } } = await worker.recognize(processedImage);
    
    console.log('Tesseract extracted text length:', text.length);
    return text || '';
  } catch (error) {
    console.error('Tesseract OCR error:', error);
    return '';
  } finally {
    await worker.terminate();
  }
}

/**
 * Extract text from image with fallback strategy
 * @param {Buffer} imageBuffer - The image buffer
 * @returns {string} - Extracted text
 */
export async function extractTextFromImage(imageBuffer) {
  console.log('Starting text extraction from image...');
  
  try {
    // Try Google Cloud Vision first (better accuracy)
    if (visionClient) {
      try {
        const text = await extractTextWithGoogleVision(imageBuffer);
        if (text && text.trim().length > 10) {
          console.log('✅ Successfully extracted text with Google Vision');
          return text.trim();
        }
      } catch (error) {
        console.warn('Google Vision failed, falling back to Tesseract:', error.message);
      }
    }
    
    // Fallback to Tesseract.js
    console.log('Using Tesseract.js for text extraction...');
    const text = await extractTextWithTesseract(imageBuffer);
    
    if (text && text.trim().length > 5) {
      console.log('✅ Successfully extracted text with Tesseract');
      return text.trim();
    } else {
      console.warn('⚠️ Extracted text is too short or empty');
      return text || '';
    }
  } catch (error) {
    console.error('❌ All OCR methods failed:', error);
    return '';
  }
}

/**
 * Check if file is a supported image type
 * @param {string} filename - The filename
 * @param {string} mimetype - The file MIME type
 * @returns {boolean} - Whether the file is a supported image
 */
export function isSupportedImageType(filename, mimetype) {
  const supportedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/tiff',
    'image/bmp'
  ];
  
  const supportedExtensions = [
    '.jpg', '.jpeg', '.png', '.webp', '.tiff', '.tif', '.bmp'
  ];
  
  const hasValidMimeType = supportedTypes.includes(mimetype?.toLowerCase());
  const hasValidExtension = supportedExtensions.some(ext => 
    filename?.toLowerCase().endsWith(ext)
  );
  
  return hasValidMimeType || hasValidExtension;
}

/**
 * Get image metadata
 * @param {Buffer} imageBuffer - The image buffer
 * @returns {Object} - Image metadata
 */
export async function getImageMetadata(imageBuffer) {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: imageBuffer.length,
      density: metadata.density,
      hasAlpha: metadata.hasAlpha,
      isAnimated: metadata.pages > 1
    };
  } catch (error) {
    console.error('Error getting image metadata:', error);
    return null;
  }
}

/**
 * Validate and prepare image for processing
 * @param {Buffer} imageBuffer - The image buffer
 * @param {string} filename - The filename
 * @returns {Object} - Validation result and metadata
 */
export async function validateAndPrepareImage(imageBuffer, filename) {
  try {
    // Check file size (limit to 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (imageBuffer.length > maxSize) {
      return {
        valid: false,
        error: 'File size too large (max 10MB)',
        size: imageBuffer.length
      };
    }
    
    // Get image metadata
    const metadata = await getImageMetadata(imageBuffer);
    if (!metadata) {
      return {
        valid: false,
        error: 'Invalid image file or corrupted data'
      };
    }
    
    // Check dimensions (minimum 100x100, maximum 5000x5000)
    if (metadata.width < 100 || metadata.height < 100) {
      return {
        valid: false,
        error: 'Image too small (minimum 100x100 pixels)',
        metadata
      };
    }
    
    if (metadata.width > 5000 || metadata.height > 5000) {
      return {
        valid: false,
        error: 'Image too large (maximum 5000x5000 pixels)',
        metadata
      };
    }
    
    return {
      valid: true,
      metadata,
      filename
    };
  } catch (error) {
    console.error('Error validating image:', error);
    return {
      valid: false,
      error: 'Failed to validate image: ' + error.message
    };
  }
}
