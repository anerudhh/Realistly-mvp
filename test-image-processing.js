/**
 * Test script for image processing functionality
 * Run this to test OCR and property extraction from images
 */

import { extractTextFromImage, validateAndPrepareImage } from './utils/image-processor.js';
import { processRealEstateMessage } from './utils/ai-processor.js';
import fs from 'fs';
import path from 'path';

async function testImageProcessing() {
  console.log('🧪 Testing Image Processing System');
  console.log('=====================================\n');

  // Check if we have test images
  const testImagesDir = path.join(process.cwd(), 'test-images');
  
  if (!fs.existsSync(testImagesDir)) {
    console.log('📁 Creating test-images directory...');
    fs.mkdirSync(testImagesDir, { recursive: true });
    console.log('⚠️ Please add some test property images to the test-images/ folder and run this script again.');
    return;
  }

  const imageFiles = fs.readdirSync(testImagesDir)
    .filter(file => /\.(jpg|jpeg|png|webp|bmp|tiff?)$/i.test(file));

  if (imageFiles.length === 0) {
    console.log('⚠️ No image files found in test-images/ directory');
    console.log('Please add some property advertisement images to test with.');
    return;
  }

  console.log(`🖼️ Found ${imageFiles.length} test images:`);
  imageFiles.forEach((file, i) => console.log(`   ${i + 1}. ${file}`));
  console.log('');

  // Process each test image
  for (let i = 0; i < imageFiles.length; i++) {
    const filename = imageFiles[i];
    const imagePath = path.join(testImagesDir, filename);
    
    console.log(`\n🔍 Processing Image ${i + 1}/${imageFiles.length}: ${filename}`);
    console.log('=' .repeat(50));
    
    try {
      // Read image
      const imageBuffer = fs.readFileSync(imagePath);
      console.log(`📄 Image size: ${(imageBuffer.length / 1024).toFixed(2)} KB`);
      
      // Validate image
      const validation = await validateAndPrepareImage(imageBuffer, filename);
      if (!validation.valid) {
        console.log(`❌ Image validation failed: ${validation.error}`);
        continue;
      }
      
      console.log(`✅ Image validated: ${validation.metadata.width}x${validation.metadata.height} ${validation.metadata.format}`);
      
      // Extract text
      console.log('🔍 Extracting text from image...');
      const startTime = Date.now();
      const extractedText = await extractTextFromImage(imageBuffer);
      const extractionTime = Date.now() - startTime;
      
      if (!extractedText || extractedText.length < 5) {
        console.log('⚠️ No text extracted from image');
        continue;
      }
      
      console.log(`📝 Text extraction completed in ${extractionTime}ms`);
      console.log(`📄 Extracted ${extractedText.length} characters`);
      console.log('📄 Extracted Text:');
      console.log('─'.repeat(30));
      console.log(extractedText.substring(0, 500) + (extractedText.length > 500 ? '...' : ''));
      console.log('─'.repeat(30));
      
      // Process as real estate data
      console.log('\n🏠 Processing as real estate data...');
      const propertyData = await processRealEstateMessage(extractedText);
      
      if (propertyData) {
        console.log('✅ Property data extracted:');
        console.log('📋 Property Details:');
        console.log(`   🏘️  Type: ${propertyData.propertyType || 'Not specified'}`);
        console.log(`   📍 Location: ${propertyData.location?.area || propertyData.location?.city || 'Not specified'}`);
        console.log(`   💰 Price: ${propertyData.price?.formatted || 'Not specified'}`);
        console.log(`   📐 Area: ${propertyData.area?.formatted || 'Not specified'}`);
        console.log(`   🏠 BHK: ${propertyData.bhk || 'Not specified'}`);
        console.log(`   📞 Contact: ${propertyData.contactInfo || 'Not specified'}`);
        
        if (propertyData.amenities && propertyData.amenities.length > 0) {
          console.log(`   ✨ Amenities: ${propertyData.amenities.slice(0, 5).join(', ')}${propertyData.amenities.length > 5 ? '...' : ''}`);
        }
        
        // Check if location has coordinates
        if (propertyData.location?.coordinates) {
          console.log(`   🗺️  Coordinates: ${propertyData.location.coordinates.latitude}, ${propertyData.location.coordinates.longitude}`);
          console.log(`   🏛️  Standardized: ${propertyData.location.standardized_address || 'N/A'}`);
        }
        
        console.log('✅ Successfully processed property from image!');
      } else {
        console.log('⚠️ No valid property data could be extracted');
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${filename}:`, error.message);
    }
    
    // Add delay between images to respect API limits
    if (i < imageFiles.length - 1) {
      console.log('\n⏳ Waiting 2 seconds before next image...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('\n🎉 Image processing test complete!');
  console.log('\n📊 Test Summary:');
  console.log(`   🖼️  Total images tested: ${imageFiles.length}`);
  console.log('   ✅ Check the output above for results');
  console.log('\n💡 Tips for better results:');
  console.log('   • Use high-quality, clear images');
  console.log('   • Ensure text is not too small or blurry');
  console.log('   • Property advertisements work best');
  console.log('   • Screenshots of listings are ideal');
}

// Helper function to test with a sample property image
async function createSamplePropertyImage() {
  const samplePropertyText = `
🏠 3 BHK APARTMENT FOR SALE 🏠

📍 Location: Koramangala, Bengaluru
💰 Price: ₹2.5 Crores
📐 Area: 1,800 sq ft
🏢 Floor: 4th Floor

✨ Amenities:
• Parking space
• Swimming pool 
• Gym
• Security
• Power backup

📞 Contact: 9876543210
🏛️ Ready to move
  `;
  
  console.log('📝 Sample property text for testing:');
  console.log(samplePropertyText);
  console.log('\n💡 You can create images with similar property details to test the OCR functionality.');
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testImageProcessing().catch(console.error);
}
