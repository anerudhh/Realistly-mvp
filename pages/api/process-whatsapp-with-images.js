import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { parseWhatsAppChatWithImages } from '../../utils/whatsapp-parser';
import { supabaseAdmin } from '../../utils/supabase';

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

  console.log('📱 WhatsApp chat with images processing API called');

  // Create temp directory for processing
  const tempDir = path.join(process.cwd(), 'temp', 'whatsapp-' + Date.now());
  
  try {
    // Ensure temp directory exists
    fs.mkdirSync(tempDir, { recursive: true });

    // Parse the multipart form data
    const form = formidable({
      maxFileSize: 50 * 1024 * 1024, // 50MB limit for WhatsApp exports
      maxFiles: 50, // Allow multiple files (chat + images)
      allowEmptyFiles: false,
      multiples: true,
      uploadDir: tempDir
    });

    const [fields, files] = await form.parse(req);
    
    console.log('📋 Form fields:', Object.keys(fields));
    console.log('📁 Files received:', Object.keys(files));

    // Get all uploaded files
    const allFiles = Object.values(files).flat();
    
    if (allFiles.length === 0) {
      return res.status(400).json({ 
        error: 'No files provided',
        expectedFiles: 'WhatsApp chat .txt file and optional image files'
      });
    }

    console.log(`📄 Processing ${allFiles.length} files`);

    // Move files to temp directory and organize them
    const chatFiles = [];
    const imageFiles = [];

    for (const file of allFiles) {
      const originalName = file.originalFilename || file.newFilename;
      const newPath = path.join(tempDir, originalName);
      
      // Move file to organized location
      fs.renameSync(file.filepath, newPath);
      
      if (originalName.endsWith('.txt')) {
        chatFiles.push(newPath);
      } else if (originalName.match(/\.(jpg|jpeg|png|webp|bmp|tiff?)$/i)) {
        imageFiles.push(newPath);
      }
    }

    console.log(`📝 Found ${chatFiles.length} chat files`);
    console.log(`🖼️ Found ${imageFiles.length} image files`);

    if (chatFiles.length === 0) {
      return res.status(400).json({
        error: 'No WhatsApp chat text file found',
        receivedFiles: allFiles.map(f => f.originalFilename),
        expectedFile: 'WhatsApp Chat with [Contact Name].txt'
      });
    }

    // Process the WhatsApp chat with images
    console.log('🔄 Starting WhatsApp chat processing...');
    const result = await parseWhatsAppChatWithImages(tempDir);

    // Save processed messages to database if configured
    let savedCount = 0;
    
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && 
        process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder.supabase.co' &&
        process.env.SUPABASE_SERVICE_KEY) {
      
      console.log('💾 Saving processed messages to database...');
      
      try {
        for (const message of result.messages) {
          const { error } = await supabaseAdmin
            .from('processed_listings')
            .insert({
              content: message.content,
              sender_name: message.sender_name,
              sender_phone: message.sender_phone,
              timestamp: message.timestamp,
              source: message.source,
              source_group: message.source_group,
              property_type: message.propertyData?.propertyType,
              location: message.propertyData?.location,
              price: message.propertyData?.price,
              area: message.propertyData?.area,
              bhk: message.propertyData?.bhk,
              amenities: message.propertyData?.amenities,
              contact_info: message.propertyData?.contactInfo,
              description: message.propertyData?.description,
              processed_at: message.processingTimestamp,
              // Add image-specific fields
              extracted_from_image: message.type === 'image',
              image_filename: message.type === 'image' ? message.filename : null,
              // Add geocoding fields if available
              latitude: message.propertyData?.location?.coordinates?.latitude,
              longitude: message.propertyData?.location?.coordinates?.longitude,
              standardized_address: message.propertyData?.location?.standardized_address,
              place_id: message.propertyData?.location?.place_id
            });

          if (error) {
            console.error('Database insert error:', error);
          } else {
            savedCount++;
          }
        }
        
        console.log(`✅ Saved ${savedCount}/${result.messages.length} messages to database`);
      } catch (dbError) {
        console.error('Database operation failed:', dbError);
      }
    }

    // Prepare response
    const response = {
      success: true,
      summary: {
        totalFiles: allFiles.length,
        chatFiles: chatFiles.length,
        imageFiles: imageFiles.length,
        totalMessages: result.totalMessages,
        textMessages: result.textMessages,
        imageMessages: result.imageMessages,
        processedMessages: result.processedMessages,
        savedToDatabase: savedCount
      },
      messages: result.messages,
      processingDetails: {
        tempDirectory: tempDir,
        processedAt: new Date().toISOString()
      }
    };

    console.log('\n📊 Processing Summary:');
    console.log(`   📁 Files processed: ${response.summary.totalFiles}`);
    console.log(`   💬 Total messages: ${response.summary.totalMessages}`);
    console.log(`   🏠 Property messages: ${response.summary.processedMessages}`);
    console.log(`   💾 Saved to DB: ${response.summary.savedToDatabase}`);

    return res.status(200).json(response);

  } catch (error) {
    console.error('❌ Error processing WhatsApp chat:', error);
    
    return res.status(500).json({
      error: 'Failed to process WhatsApp chat',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    // Clean up temp directory
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
        console.log('🧹 Cleaned up temp directory');
      }
    } catch (cleanupError) {
      console.warn('⚠️ Could not clean up temp directory:', cleanupError.message);
    }
  }
}
