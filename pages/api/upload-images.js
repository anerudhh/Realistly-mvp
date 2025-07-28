import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { extractTextFromImage, validateAndPrepareImage, isSupportedImageType } from '../../utils/image-processor';
import { processRealEstateMessage } from '../../utils/ai-processor';

// Disable Next.js default body parser to handle multipart/form-data
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('📷 Image upload API called');

  try {
    // Parse the multipart form data
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      maxFiles: 5, // Allow up to 5 files
      allowEmptyFiles: false,
      multiples: true
    });

    const [fields, files] = await form.parse(req);
    
    console.log('📋 Form fields:', Object.keys(fields));
    console.log('🖼️ Files received:', Object.keys(files));

    if (!files.images && !files.image) {
      return res.status(400).json({ 
        error: 'No image files provided',
        expectedField: 'images or image'
      });
    }

    // Handle both single and multiple files
    const imageFiles = files.images || files.image || [];
    const fileArray = Array.isArray(imageFiles) ? imageFiles : [imageFiles];

    if (fileArray.length === 0) {
      return res.status(400).json({ error: 'No valid image files found' });
    }

    const results = [];
    let totalTextExtracted = '';

    // Process each image
    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      console.log(`\n🔄 Processing image ${i + 1}/${fileArray.length}: ${file.originalFilename}`);

      try {
        // Validate file type
        if (!isSupportedImageType(file.originalFilename, file.mimetype)) {
          console.log(`❌ Unsupported file type: ${file.mimetype}`);
          results.push({
            filename: file.originalFilename,
            success: false,
            error: 'Unsupported image type',
            supportedTypes: ['JPEG', 'PNG', 'WebP', 'TIFF', 'BMP']
          });
          continue;
        }

        // Read the image file
        const imageBuffer = fs.readFileSync(file.filepath);
        
        // Validate and prepare image
        const validation = await validateAndPrepareImage(imageBuffer, file.originalFilename);
        if (!validation.valid) {
          console.log(`❌ Image validation failed: ${validation.error}`);
          results.push({
            filename: file.originalFilename,
            success: false,
            error: validation.error,
            metadata: validation.metadata
          });
          continue;
        }

        console.log(`✅ Image validated: ${validation.metadata.width}x${validation.metadata.height} ${validation.metadata.format}`);

        // Extract text from image
        console.log('🔍 Starting OCR text extraction...');
        const extractedText = await extractTextFromImage(imageBuffer);
        
        if (!extractedText || extractedText.length < 10) {
          console.log(`⚠️ Little or no text extracted from ${file.originalFilename}`);
          results.push({
            filename: file.originalFilename,
            success: false,
            error: 'No readable text found in image',
            extractedText: extractedText,
            metadata: validation.metadata
          });
          continue;
        }

        console.log(`📝 Extracted ${extractedText.length} characters of text`);
        console.log(`📄 Text preview: ${extractedText.substring(0, 200)}...`);

        // Add to total text for combined processing
        totalTextExtracted += `\n\n=== Text from ${file.originalFilename} ===\n${extractedText}`;

        results.push({
          filename: file.originalFilename,
          success: true,
          extractedText: extractedText,
          textLength: extractedText.length,
          metadata: validation.metadata
        });

        // Clean up temp file
        fs.unlinkSync(file.filepath);

      } catch (error) {
        console.error(`❌ Error processing ${file.originalFilename}:`, error);
        results.push({
          filename: file.originalFilename,
          success: false,
          error: error.message
        });

        // Clean up temp file on error
        try {
          fs.unlinkSync(file.filepath);
        } catch (cleanupError) {
          console.warn('Could not clean up temp file:', cleanupError.message);
        }
      }
    }

    // If we extracted text from any images, process it as real estate data
    let processedData = null;
    if (totalTextExtracted.trim()) {
      console.log('\n🏠 Processing extracted text as real estate data...');
      try {
        processedData = await processRealEstateMessage(totalTextExtracted);
        console.log('✅ Successfully processed real estate data');
      } catch (error) {
        console.error('❌ Error processing real estate data:', error);
      }
    }

    // Return comprehensive results
    const response = {
      success: true,
      totalFiles: fileArray.length,
      successfulExtractions: results.filter(r => r.success).length,
      failedExtractions: results.filter(r => !r.success).length,
      results: results,
      combinedText: totalTextExtracted,
      processedData: processedData
    };

    console.log(`\n📊 Processing complete: ${response.successfulExtractions}/${response.totalFiles} successful`);
    
    return res.status(200).json(response);

  } catch (error) {
    console.error('❌ Error in image upload API:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
