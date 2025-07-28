/**
 * Parse WhatsApp chat export files into structured message objects
 * @param {string} chatContent - Content of the WhatsApp .txt export file
 * @param {string} sourceGroup - Optional group name for the WhatsApp chat
 * @returns {Array} - Array of message objects
 */
export function parseWhatsAppChat(chatContent, sourceGroup = 'Unknown Group') {
  // Validate input
  if (!chatContent || typeof chatContent !== 'string') {
    console.error("Invalid chat content provided to parser");
    return [];
  }

  console.log("=== WhatsApp Parser Debug ===");
  console.log("Content length:", chatContent.length);
  console.log("First 300 characters:", chatContent.substring(0, 300));
  console.log("Sample lines:");
  const lines = chatContent.split('\n').slice(0, 10);
  lines.forEach((line, i) => {
    console.log(`Line ${i + 1}: "${line}"`);
  });

  try {
    // Clean the content - remove BOM and normalize line endings
    const cleanContent = chatContent.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Split into lines to better handle multi-line messages
    const lines = cleanContent.split('\n');
    const messages = [];
    let currentMessage = null;
    
    console.log("Processing lines individually for better multi-line support...");
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip empty lines
      if (!line.trim()) continue;
      
      // Multiple regex patterns for different WhatsApp formats
      const patterns = [
        // Format 1: [DD/MM/YY, HH:MM:SS AM/PM] Author: Message
        /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),\s+(\d{1,2}:\d{2}:\d{2}\s+(?:AM|PM))\]\s*([^:]+?):\s*(.*)$/,
        // Format 2: [DD/MM/YY, HH:MM AM/PM] Author: Message (without seconds)
        /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),\s+(\d{1,2}:\d{2}\s+(?:AM|PM))\]\s*([^:]+?):\s*(.*)$/,
        // Format 3: [DD/MM/YY, HH:MM:SS] Author: Message
        /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),\s+(\d{1,2}:\d{2}:\d{2})\]\s*([^:]+?):\s*(.*)$/,
        // Format 4: [DD/MM/YY, HH:MM] Author: Message
        /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),\s+(\d{1,2}:\d{2})\]\s*([^:]+?):\s*(.*)$/,
        // Format 5: DD/MM/YY, HH:MM:SS AM/PM - Author: Message
        /^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s+(\d{1,2}:\d{2}:\d{2}\s+(?:AM|PM))\s*-\s*([^:]+?):\s*(.*)$/,
        // Format 6: DD/MM/YY, HH:MM AM/PM - Author: Message
        /^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s+(\d{1,2}:\d{2}\s+(?:AM|PM))\s*-\s*([^:]+?):\s*(.*)$/
      ];
      
      let matched = false;
      
      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
          // Save the previous message if it exists
          if (currentMessage && currentMessage.content.trim()) {
            if (isValidMessage(currentMessage)) {
              const messageObj = buildMessageObject(currentMessage, sourceGroup);
              if (messageObj) {
                messages.push(messageObj);
              }
            }
          }
          
          // Start new message
          let datePart, timePart, author, content;
          
          if (match.length === 5) {
            // Format: [date, time] author: content or date, time - author: content
            [, datePart, timePart, author, content] = match;
          } else if (match.length === 6) {
            // Legacy format with separate AM/PM (shouldn't happen with new patterns)
            [, datePart, timePart, , author, content] = match;
          }
          
          currentMessage = {
            datePart,
            timePart,
            author: author.trim(),
            content: content.trim()
          };
          
          matched = true;
          break;
        }
      }
      
      // If no pattern matched, this might be a continuation of the previous message
      if (!matched && currentMessage) {
        currentMessage.content += '\n' + line;
      }
    }
    
    // Don't forget to add the last message
    if (currentMessage && currentMessage.content.trim()) {
      if (isValidMessage(currentMessage)) {
        const messageObj = buildMessageObject(currentMessage, sourceGroup);
        if (messageObj) {
          messages.push(messageObj);
        }
      }
    }
    
    console.log(`Parsed ${messages.length} valid messages from chat content`);
    return messages;
  } catch (error) {
    console.error("Error parsing WhatsApp chat:", error);
    return [];
  }
}

/**
 * Check if a message is valid and not a system message
 */
function isValidMessage(message) {
  if (!message || !message.author || !message.content) return false;
  
  const author = message.author.trim();
  const content = message.content.trim();
  
  // Remove any Unicode left-to-right marks and other invisible characters
  const cleanContent = content.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim();
  
  // Skip system messages and very short messages
  if (
    author.includes("System") || 
    cleanContent.length < 5 ||  // Reduced from 10 to catch more messages
    cleanContent.includes("Messages and calls are end-to-end encrypted") ||
    cleanContent.includes("created this group") ||
    cleanContent.includes("created group") ||
    cleanContent.includes("added you") ||
    cleanContent.includes("added +") ||
    cleanContent.includes("joined using this group's invite link") ||
    cleanContent.includes("left the group") ||
    cleanContent.includes("removed") ||
    cleanContent.includes("changed the group description") ||
    cleanContent.includes("changed the group name") ||
    cleanContent.includes("changed the group picture") ||
    cleanContent.includes("<This message was deleted>") ||
    cleanContent.includes("This message was deleted") ||
    cleanContent.startsWith("‎") || // Unicode character for system messages
    cleanContent.startsWith("⁨") || // Another Unicode character for system messages
    /^\+?\d{10,15}$/.test(cleanContent) // Just a phone number
  ) {
    return false;
  }
  
  return true;
}

/**
 * Build a message object from parsed data
 */
function buildMessageObject(messageData, sourceGroup) {
  try {
    const { datePart, timePart, author, content } = messageData;
    
    // Regular expressions for extracting additional info
    const mediaRegex = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|mp4|pdf|doc|docx))/gi;
    const phoneRegex = /(\+?\d{10,15}|\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/g;
    
    return parseMessageData(datePart, timePart, author, content, sourceGroup, mediaRegex, phoneRegex);
  } catch (error) {
    console.error("Error building message object:", error);
    return null;
  }
}
/**
 * Helper function to parse individual message data
 */
function parseMessageData(datePart, timePart, author, content, sourceGroup, mediaRegex, phoneRegex) {
  try {
    // Parse the date into ISO format
    const dateParts = datePart.split('/');
    if (dateParts.length !== 3) {
      console.warn("Invalid date format:", datePart);
      return null;
    }
    
    let [day, month, yearShort] = dateParts;
    
    // Handle different year formats and assume 20xx for two-digit years
    let year;
    if (yearShort.length === 2) {
      // For 2-digit years, assume 20xx if >= 00 and <= 30, otherwise 19xx
      const yearNum = parseInt(yearShort);
      year = yearNum <= 30 ? `20${yearShort}` : `19${yearShort}`;
    } else {
      year = yearShort;
    }
    
    // Create ISO date string (YYYY-MM-DD)
    const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    
    // Handle time format (with or without AM/PM)
    let isoTime = timePart;
    if (timePart.includes('AM') || timePart.includes('PM')) {
      // Convert 12-hour to 24-hour format
      const timeMatch = timePart.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)/i);
      if (timeMatch) {
        let [, hours, minutes, seconds, ampm] = timeMatch;
        hours = parseInt(hours);
        
        if (ampm.toUpperCase() === 'PM' && hours !== 12) {
          hours += 12;
        } else if (ampm.toUpperCase() === 'AM' && hours === 12) {
          hours = 0;
        }
        
        isoTime = `${hours.toString().padStart(2, '0')}:${minutes}${seconds ? ':' + seconds : ':00'}`;
      }
    } else {
      // Ensure seconds are included
      if (isoTime.split(':').length === 2) {
        isoTime += ':00';
      }
    }
    
    // Extract media URLs if any
    const mediaUrls = content.match(mediaRegex) || [];
    
    // Try to extract phone number from the author or content
    let senderPhone = null;
    const phoneMatches = content.match(phoneRegex) || [];
    if (phoneMatches.length > 0) {
      senderPhone = phoneMatches[0].replace(/[-.\s]/g, '');
    }
    
    // Extract sender name (remove any phone number from the author if present)
    const senderName = author.trim().replace(phoneRegex, '').trim().replace(/[‎⁨]/g, ''); // Remove system message characters
    
    let timestamp;
    try {
      timestamp = new Date(`${isoDate}T${isoTime}`).toISOString();
    } catch (dateError) {
      console.warn("Invalid date/time format:", isoDate, isoTime);
      timestamp = new Date().toISOString(); // Fallback to current time
    }      return {
        date: isoDate,
        time: isoTime,
        timestamp: timestamp,
        sender_name: senderName,
        sender_phone: senderPhone,
        content: content.trim().replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069‎⁨]/g, ''), // Remove system message characters and LTR marks
        source: 'whatsapp',
        source_group: sourceGroup,
        media_urls: mediaUrls.length > 0 ? mediaUrls : null
      };
  } catch (error) {
    console.error("Error parsing message data:", error);
    return null;
  }
}

/**
 * Enhanced WhatsApp chat parser that handles both text and images
 * Parse WhatsApp chat export folder containing text file and media
 * @param {string} chatFolderPath - Path to the WhatsApp chat export folder
 * @returns {Array} - Array of processed messages with extracted property data
 */
export async function parseWhatsAppChatWithImages(chatFolderPath) {
  console.log(`Parsing WhatsApp chat folder: ${chatFolderPath}`);
  
  try {
    const fs = await import('fs');
    const path = await import('path');
    const { extractTextFromImage, isSupportedImageType } = await import('./image-processor');
    const { processRealEstateMessage } = await import('./ai-processor');
    
    // Check if folder exists
    if (!fs.existsSync(chatFolderPath)) {
      throw new Error(`Chat folder not found: ${chatFolderPath}`);
    }

    const folderContents = fs.readdirSync(chatFolderPath);
    console.log('Folder contents:', folderContents);

    // Find the chat text file
    const chatTextFile = folderContents.find(file => 
      file.endsWith('.txt') && file.toLowerCase().includes('chat')
    );

    if (!chatTextFile) {
      throw new Error('No WhatsApp chat text file found in folder');
    }

    // Find all image files
    const imageFiles = folderContents.filter(file => {
      const filePath = path.join(chatFolderPath, file);
      const stats = fs.statSync(filePath);
      return stats.isFile() && isSupportedImageType(file, null);
    });

    console.log(`Found chat file: ${chatTextFile}`);
    console.log(`Found ${imageFiles.length} image files:`, imageFiles);

    // Parse the text chat
    const chatTextPath = path.join(chatFolderPath, chatTextFile);
    const chatContent = fs.readFileSync(chatTextPath, 'utf-8');
    const textMessages = parseWhatsAppChat(chatContent);

    console.log(`Parsed ${textMessages.length} text messages`);

    // Process images and extract text
    const imageMessages = [];
    
    for (const imageFile of imageFiles) {
      console.log(`\nProcessing image: ${imageFile}`);
      
      try {
        const imagePath = path.join(chatFolderPath, imageFile);
        const imageBuffer = fs.readFileSync(imagePath);
        
        // Extract text from image
        const extractedText = await extractTextFromImage(imageBuffer);
        
        if (extractedText && extractedText.trim().length > 10) {
          // Try to find timestamp from filename or use current time
          const timestamp = extractTimestampFromFilename(imageFile) || new Date().toISOString();
          
          imageMessages.push({
            type: 'image',
            filename: imageFile,
            timestamp: timestamp,
            extractedText: extractedText,
            textLength: extractedText.length,
            sender_name: 'unknown', // We can't determine sender from image alone
            content: extractedText,
            source: 'whatsapp',
            source_group: 'Image Processing'
          });
          
          console.log(`Extracted ${extractedText.length} characters from ${imageFile}`);
        } else {
          console.log(`No text extracted from ${imageFile}`);
        }
      } catch (error) {
        console.error(`Error processing ${imageFile}:`, error.message);
      }
    }

    // Combine all messages and sort by timestamp
    const allMessages = [...textMessages, ...imageMessages].sort((a, b) => {
      return new Date(a.timestamp) - new Date(b.timestamp);
    });

    console.log(`Total messages: ${allMessages.length} (${textMessages.length} text, ${imageMessages.length} images)`);

    // Process each message for real estate data
    const processedMessages = [];
    
    for (let i = 0; i < allMessages.length; i++) {
      const message = allMessages[i];
      console.log(`\nProcessing message ${i + 1}/${allMessages.length}...`);
      
      try {
        // Get the content to process
        const contentToProcess = message.content;
        
        if (!contentToProcess || contentToProcess.trim().length < 20) {
          console.log('Skipping message - too short or empty');
          continue;
        }

        // Process with AI
        const propertyData = await processRealEstateMessage(contentToProcess);
        
        if (propertyData && hasValidPropertyData(propertyData)) {
          processedMessages.push({
            ...message,
            propertyData: propertyData,
            processed: true,
            processingTimestamp: new Date().toISOString()
          });
          
          console.log(`Extracted property data from ${message.type || 'text'} message`);
        } else {
          console.log(`No property data found in ${message.type || 'text'} message`);
        }
        
        // Add delay to respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`Error processing message:`, error.message);
      }
    }

    console.log(`\nProcessing complete! Found ${processedMessages.length} messages with property data`);
    
    return {
      totalMessages: allMessages.length,
      textMessages: textMessages.length,
      imageMessages: imageMessages.length,
      processedMessages: processedMessages.length,
      messages: processedMessages,
      allMessages: allMessages // Include all messages for debugging
    };

  } catch (error) {
    console.error('Error parsing WhatsApp chat with images:', error);
    throw error;
  }
}

/**
 * Process a single image file and extract property data
 * @param {string} imagePath - Path to the image file
 * @returns {Object} - Processed property data
 */
export async function processImageFile(imagePath) {
  console.log(`Processing single image: ${imagePath}`);
  
  try {
    const fs = await import('fs');
    const path = await import('path');
    const { extractTextFromImage } = await import('./image-processor');
    const { processRealEstateMessage } = await import('./ai-processor');
    
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`);
    }
    
    const imageBuffer = fs.readFileSync(imagePath);
    const filename = path.basename(imagePath);
    
    // Extract text from image
    const extractedText = await extractTextFromImage(imageBuffer);
    
    if (!extractedText || extractedText.trim().length < 10) {
      return {
        success: false,
        error: 'No readable text found in image',
        filename: filename
      };
    }
    
    // Process as real estate data
    const propertyData = await processRealEstateMessage(extractedText);
    
    return {
      success: true,
      filename: filename,
      extractedText: extractedText,
      propertyData: propertyData,
      hasValidPropertyData: hasValidPropertyData(propertyData)
    };
    
  } catch (error) {
    console.error('Error processing image file:', error);
    return {
      success: false,
      error: error.message,
      filename: path.basename(imagePath)
    };
  }
}

/**
 * Extract timestamp from image filename (if available)
 * @param {string} filename - Image filename
 * @returns {string|null} - ISO timestamp or null
 */
function extractTimestampFromFilename(filename) {
  // WhatsApp image naming patterns: IMG-YYYYMMDD-WAnnnn.jpg
  const patterns = [
    /IMG-(\d{8})-WA\d+/,
    /VID-(\d{8})-WA\d+/,
    /(\d{8})-(\d{6})/,
    /(\d{4})(\d{2})(\d{2})/
  ];
  
  for (const pattern of patterns) {
    const match = filename.match(pattern);
    if (match) {
      try {
        const dateStr = match[1];
        if (dateStr.length === 8) {
          const year = dateStr.substring(0, 4);
          const month = dateStr.substring(4, 6);
          const day = dateStr.substring(6, 8);
          return new Date(`${year}-${month}-${day}`).toISOString();
        }
      } catch (error) {
        continue;
      }
    }
  }
  
  return null;
}

/**
 * Check if property data contains valid real estate information
 * @param {Object} propertyData - Processed property data
 * @returns {boolean} - Whether data contains valid property info
 */
function hasValidPropertyData(propertyData) {
  if (!propertyData || typeof propertyData !== 'object') {
    return false;
  }
  
  // Check for essential property fields
  const hasPropertyType = propertyData.propertyType && propertyData.propertyType !== 'Unknown';
  const hasLocation = propertyData.location && (propertyData.location.area || propertyData.location.city);
  const hasPrice = propertyData.price && (propertyData.price.value || propertyData.price.formatted);
  const hasBHK = propertyData.bhk && propertyData.bhk > 0;
  
  // At least 2 of these should be present for valid property data
  const validFields = [hasPropertyType, hasLocation, hasPrice, hasBHK].filter(Boolean).length;
  
  return validFields >= 2;
}
