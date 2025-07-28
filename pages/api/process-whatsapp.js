import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { processRealEstateMessage } from '../../utils/ai-processor';

// Disable body parsing, we'll handle the form data manually
export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Parse WhatsApp chat export text and extract messages
 * @param {string} content - The raw WhatsApp chat export content
 * @returns {Array} - Array of parsed messages
 */
function parseWhatsAppChat(content) {
  const lines = content.split('\n');
  const messages = [];
  let currentMessage = null;

  for (const line of lines) {
    // WhatsApp message format: [Date, Time] Contact Name: Message
    const messageMatch = line.match(/^\[?(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s*(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)\]?\s*-?\s*([^:]+):\s*(.+)$/i);
    
    if (messageMatch) {
      // Start of a new message
      if (currentMessage) {
        messages.push(currentMessage);
      }
      
      const [, date, time, contact, messageContent] = messageMatch;
      currentMessage = {
        date: date.trim(),
        time: time.trim(),
        contact: contact.trim(),
        content: messageContent.trim(),
        fullText: messageContent.trim()
      };
    } else if (currentMessage && line.trim()) {
      // Continuation of previous message
      currentMessage.content += ' ' + line.trim();
      currentMessage.fullText += ' ' + line.trim();
    } else if (currentMessage && !line.trim()) {
      // Empty line, end current message
      messages.push(currentMessage);
      currentMessage = null;
    }
  }
  
  // Add the last message if exists
  if (currentMessage) {
    messages.push(currentMessage);
  }

  return messages;
}

/**
 * Check if a message is likely about real estate
 * @param {string} content - Message content
 * @returns {boolean} - True if likely real estate related
 */
function isRealEstateMessage(content) {
  const realEstateKeywords = [
    'bhk', 'apartment', 'villa', 'house', 'flat', 'property', 'rent', 'sale',
    'buy', 'sell', 'broker', 'agent', 'sq ft', 'sqft', 'crore', 'lakh',
    'lakhs', 'crores', 'bedroom', 'bathroom', 'kitchen', 'balcony',
    'parking', 'gym', 'pool', 'security', 'lift', 'furnished', 'unfurnished'
  ];

  const lowerContent = content.toLowerCase();
  return realEstateKeywords.some(keyword => lowerContent.includes(keyword));
}

export default async function handler(req, res) {
  // Set JSON response headers
  res.setHeader('Content-Type', 'application/json');
  
  console.log("API HIT! Method:", req.method);
  
  if (req.method !== 'POST') {
    console.log("Method not allowed, returning 405");
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log("=== WhatsApp Processing Started ===");

  try {
    // Parse the incoming form data
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);
    console.log("Form parsed successfully");
    console.log("Files received:", Object.keys(files));

    // Get the uploaded file
    const uploadedFile = files.file;
    if (!uploadedFile || !uploadedFile[0]) {
      console.log("No file uploaded");
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = uploadedFile[0];
    console.log("Processing file:", file.originalFilename, "Size:", file.size);

    // Read the file content
    const fileContent = fs.readFileSync(file.filepath, 'utf8');
    console.log("File content read, length:", fileContent.length);

    // Parse WhatsApp messages
    const messages = parseWhatsAppChat(fileContent);
    console.log("Total messages parsed:", messages.length);

    // Filter real estate messages
    const realEstateMessages = messages.filter(msg => isRealEstateMessage(msg.content));
    console.log("Real estate messages found:", realEstateMessages.length);

    // Process each real estate message
    const processedListings = [];
    let processedCount = 0;

    for (const message of realEstateMessages.slice(0, 20)) { // Limit to first 20 messages
      try {
        console.log(`Processing message ${processedCount + 1}:`, message.content.substring(0, 100));
        
        const propertyData = await processRealEstateMessage(message.content);
        
        if (propertyData) {
          processedListings.push({
            id: processedCount + 1,
            originalMessage: {
              contact: message.contact,
              date: message.date,
              time: message.time,
              content: message.content
            },
            ...propertyData
          });
        }
        
        processedCount++;
      } catch (error) {
        console.error(`Error processing message ${processedCount + 1}:`, error);
      }
    }

    console.log("Processing completed. Total listings:", processedListings.length);

    // Clean up uploaded file
    try {
      fs.unlinkSync(file.filepath);
    } catch (cleanupError) {
      console.warn("Failed to clean up uploaded file:", cleanupError);
    }

    return res.status(200).json({
      success: true,
      totalMessages: messages.length,
      realEstateMessages: realEstateMessages.length,
      processedListings,
      message: `Successfully processed ${processedListings.length} property listings from ${realEstateMessages.length} real estate messages out of ${messages.length} total messages.`
    });

  } catch (error) {
    console.error("Error processing WhatsApp chat:", error);
    return res.status(500).json({ 
      error: "Failed to process WhatsApp chat", 
      details: error.message 
    });
  }
}
