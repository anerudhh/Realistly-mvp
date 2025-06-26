import formidable from 'formidable';
import fs from 'fs';
import { parseWhatsAppChat } from '../../utils/whatsapp-parser';
import { processRealEstateMessage } from '../../utils/ai-processor';
import { supabaseAdmin } from '../../utils/supabase';

// Disable body parsing, we'll handle the form data manually
export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Parse the incoming form data with formidable
 */
const parseForm = async (req) => {
  return new Promise((resolve, reject) => {
    // Handle formidable v3 or later
    const options = {
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      keepExtensions: true,
      multiples: false,
      filename: (_name, _ext, part) => {
        return `whatsapp-${Date.now()}.txt`;
      },
    };
    
    // Create a new form instance
    const form = formidable(options);
    
    try {
      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error("Form parsing error:", err);
          reject(err);
          return;
        }
        resolve({ fields, files });
      });
    } catch (error) {
      console.error("Formidable exception:", error);
      reject(error);
    }
  });
};

/**
 * Read the contents of the uploaded file
 */
const readFileContent = async (filepath) => {
  return new Promise((resolve, reject) => {
    try {
      console.log(`Attempting to read file at: ${filepath}`);
      
      // First check if the file exists
      if (!fs.existsSync(filepath)) {
        console.error(`File doesn't exist at path: ${filepath}`);
        reject(new Error(`File doesn't exist at path: ${filepath}`));
        return;
      }
      
      // Read file as utf-8 text
      fs.readFile(filepath, 'utf-8', (err, data) => {
        if (err) {
          console.error(`Error reading file: ${err.message}`);
          reject(err);
          return;
        }
        
        if (!data || data.length === 0) {
          console.error("File is empty");
          reject(new Error("File is empty"));
          return;
        }
        
        console.log(`Successfully read file, content length: ${data.length} bytes`);
        resolve(data);
      });
    } catch (error) {
      console.error(`Exception during file read: ${error.message}`);
      reject(error);
    }
  });
};

export default async function handler(req, res) {
  // Set proper headers to avoid CORS issues and ensure JSON content type
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log("=== Starting WhatsApp processing ===");

  try {
    // Parse the incoming form data
    console.log("Start parsing form data");
    let parseFormData;
    
    try {
      parseFormData = await parseForm(req);
    } catch (formError) {
      console.error("Form parsing error:", formError);
      return res.status(400).json({ error: 'Error parsing form data', details: formError.message });
    }
    
    const { files } = parseFormData;
    // Log the files object structure to debug
    console.log("Files object structure:", JSON.stringify(files, null, 2));
    
    if (!files) {
      console.error("No files object in the parsed form data");
      return res.status(400).json({ error: 'No files received in form data' });
    }
    
    // The key may be 'chatFile' or it might be something else if the frontend form field name doesn't match
    let chatFile;
    
    if (files.chatFile) {
      // Direct match with expected field name
      chatFile = Array.isArray(files.chatFile) ? files.chatFile[0] : files.chatFile;
      console.log("Found file with expected field name 'chatFile'");
    } else {
      // Try to find the first file in the files object
      const fileKeys = Object.keys(files);
      if (fileKeys.length > 0) {
        const firstKey = fileKeys[0];
        chatFile = Array.isArray(files[firstKey]) ? files[firstKey][0] : files[firstKey];
        console.log(`Found file with field name '${firstKey}'`);
      }
    }
    
    if (!chatFile) {
      console.error("No chat file found in the request");
      return res.status(400).json({ error: 'No chat file found in the request' });
    }
    
    console.log("Received file:", chatFile);
    
    // Check for filepath property (formidable v3+)
    if (!chatFile.filepath) {
      // For formidable v4, it might use a different property
      if (chatFile.path) {
        chatFile.filepath = chatFile.path;
        console.log("Using path property instead of filepath");
      } else {
        console.error("Invalid file object - missing filepath/path:", chatFile);
        return res.status(400).json({ error: 'Invalid file upload - missing filepath' });
      }
    }

    // Read the contents of the uploaded file
    let chatContent;
    try {
      chatContent = await readFileContent(chatFile.filepath);
      console.log("Chat content read, length:", chatContent ? chatContent.length : 0);
      
      // Basic validation to ensure we have valid text content
      if (!chatContent || chatContent.length < 20) {
        return res.status(400).json({ error: 'Invalid WhatsApp chat file. File appears to be empty or too small.' });
      }
      
      // Check if the file might be HTML instead of a WhatsApp export
      if (chatContent.trim().startsWith('<!DOCTYPE') || chatContent.trim().startsWith('<html')) {
        return res.status(400).json({ error: 'Invalid file format. The file appears to be HTML, not a WhatsApp chat export.' });
      }
    } catch (readError) {
      console.error("Error reading file content:", readError);
      return res.status(500).json({ error: 'Could not read file content', details: readError.message });
    }
    
    // Parse the WhatsApp chat messages
    let messages;
    try {
      console.log("Parsing WhatsApp chat...");
      messages = parseWhatsAppChat(chatContent);
      console.log("Messages parsed, count:", messages ? messages.length : 0);
      
      if (!messages || messages.length === 0) {
        console.warn("No messages found in chat file");
        return res.status(200).json({ 
          success: true,
          totalMessages: 0,
          processedListings: [],
          message: 'No valid WhatsApp messages found in the file. Please ensure this is a valid WhatsApp chat export.'
        });
      }
    } catch (parseError) {
      console.error("Error parsing WhatsApp messages:", parseError);
      return res.status(400).json({ 
        error: 'Failed to parse WhatsApp chat', 
        details: parseError.message 
      });
    }
    
    // Extract group name from file name if available
    const sourceGroup = chatFile.originalFilename 
      ? chatFile.originalFilename.replace('.txt', '').trim() 
      : 'Unknown Group';
    
    // Store raw messages in Supabase and collect their IDs
    const rawDataInsertions = [];
    const processedListings = [];
    
    for (const message of messages) {
      try {
        // Insert raw data
        const { data: rawData, error: rawError } = await supabaseAdmin
          .from('raw_data')
          .insert({
            timestamp: message.timestamp,
            sender_name: message.sender_name,
            sender_phone: message.sender_phone,
            raw_content: message.content,
            source: message.source,
            source_group: sourceGroup,
            media_urls: message.media_urls
          })
          .select()
          .single();
          
        if (rawError) {
          console.error("Error inserting raw data:", rawError);
          continue;
        }
        
        rawDataInsertions.push(rawData);
        
        // Process message with AI (with fallback if AI fails)
        let processedData;
        try {
          console.log(`Processing message ${rawDataInsertions.length} with AI...`);
          processedData = await processRealEstateMessage(message.content);
          console.log("AI processing result:", processedData);
        } catch (aiError) {
          console.error("AI processing failed, using fallback:", aiError);
          // Fallback processing if AI fails
          processedData = {
            propertyType: "Unknown",
            location: { area: "Not specified", city: null },
            price: { value: null, currency: "INR", formatted: "Price not mentioned" },
            area: { value: null, unit: null, formatted: "Area not specified" },
            bhk: null,
            description: message.content.substring(0, 200),
            contactInfo: message.sender_phone,
            amenities: [],
            missingFields: ["AI processing failed"]
          };
        }
        
        // Calculate confidence score based on how many fields were successfully extracted
        const totalFields = Object.keys(processedData).length;
        const nonNullFields = Object.values(processedData).filter(value => 
          value !== null && value !== undefined && 
          (typeof value !== 'object' || Object.keys(value).length > 0)
        ).length;
        const confidenceScore = totalFields > 0 ? (nonNullFields / totalFields) * 100 : 0;
        
        // Determine if follow-up is needed based on missing essential fields
        const essentialFields = ['propertyType', 'location', 'price', 'area', 'contactInfo'];
        const missingEssentialFields = essentialFields.filter(field => 
          !processedData[field] || processedData[field] === null
        );
        const needsFollowup = missingEssentialFields.length > 0;
        
        // Add metadata to processed data
        const listingData = {
          raw_data_id: rawData.id,
          property_type: processedData.propertyType,
          location: processedData.location,
          price: processedData.price,
          area: processedData.area,
          bhk: processedData.bhk,
          description: processedData.description,
          contact_person: message.sender_name,
          contact_phone: processedData.contactInfo || message.sender_phone,
          amenities: processedData.amenities,
          missing_fields: processedData.missingFields,
          needs_followup: needsFollowup,
          confidence_score: confidenceScore,
          status: confidenceScore > 70 ? 'verified' : 'needs_review',
          processed_at: new Date().toISOString()
        };
        
        // Skip if no essential fields were found
        const hasEssentialData = essentialFields.some(field => 
          processedData[field] !== null && processedData[field] !== undefined
        );
        
        if (hasEssentialData) {
          // Insert into processed_listings table
          const { data: insertedListing, error: insertError } = await supabaseAdmin
            .from('processed_listings')
            .insert(listingData)
            .select()
            .single();
            
          if (insertError) {
            console.error("Error inserting listing:", insertError);
          } else {
            processedListings.push(insertedListing || listingData);
          }
        }
      } catch (error) {
        console.error("Error processing message:", error);
      }
    }

    console.log(`Processed ${messages.length} messages, found ${processedListings.length} valid listings`);

    // Clean up the temporary file
    try {
      fs.unlink(chatFile.filepath, (err) => {
        if (err) console.error("Error removing temp file:", err);
      });
    } catch (cleanupErr) {
      console.error("Error during cleanup:", cleanupErr);
      // Continue anyway, this shouldn't stop the response
    }

    // Always return a success response, even if no listings were found
    if (processedListings.length === 0) {
      console.log("No valid property listings found in the messages");
      return res.status(200).json({
        success: true,
        totalMessages: messages.length,
        processedListings: [],
        message: "File processed successfully, but no property listings were detected. Try uploading a chat with real estate discussions."
      });
    }

    // Prepare a simple response for the frontend
    const safeProcessedListings = processedListings.map(listing => {
      try {
        // Format the complex objects into simple strings
        const formatLocation = (location) => {
          if (typeof location === 'object' && location !== null) {
            if (location.area && location.city) {
              return `${location.area}, ${location.city}`;
            } else if (location.area) {
              return location.area;
            } else if (location.city) {
              return location.city;
            }
          }
          return String(location || 'Not specified');
        };

        const formatPrice = (price) => {
          if (typeof price === 'object' && price !== null) {
            if (price.formatted) {
              return price.formatted;
            } else if (price.value && price.currency) {
              return `${price.currency} ${price.value}`;
            } else if (price.value) {
              return String(price.value);
            }
          }
          return String(price || 'Price not mentioned');
        };

        const formatArea = (area) => {
          if (typeof area === 'object' && area !== null) {
            if (area.formatted) {
              return area.formatted;
            } else if (area.value && area.unit) {
              return `${area.value} ${area.unit}`;
            } else if (area.value) {
              return String(area.value);
            }
          }
          return String(area || 'Area not specified');
        };

        return {
          id: listing.id || null,
          propertyType: listing.property_type || null,
          location: formatLocation(listing.location),
          price: formatPrice(listing.price),
          area: formatArea(listing.area),
          bhk: listing.bhk || null,
          description: listing.description || null,
          contactPhone: listing.contact_phone || null,
          amenities: Array.isArray(listing.amenities) ? listing.amenities : [],
          missingFields: Array.isArray(listing.missing_fields) ? listing.missing_fields : [],
        };
      } catch (formatError) {
        console.error("Error formatting listing for response:", formatError);
        return { 
          id: null,
          propertyType: "Error formatting listing",
          location: "N/A",
          price: "N/A",
          area: "N/A",
          bhk: null,
          description: "Error occurred while processing this listing",
          contactPhone: null,
          amenities: [],
          missingFields: []
        };
      }
    });
    
    // Send response
    try {
      console.log("Sending successful response with", safeProcessedListings.length, "listings");
      
      const responseObject = {
        success: true,
        totalMessages: messages.length,
        processedListings: safeProcessedListings
      };
      
      // Set explicit headers
      res.setHeader('Content-Type', 'application/json');
      
      // Send the response using .json() method
      return res.status(200).json(responseObject);
    } catch (responseError) {
      console.error("Error sending JSON response:", responseError);
      // Try a simplified response if we had trouble with the full one
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json({ 
        success: true, 
        message: "Processing completed but response was simplified due to serialization issues",
        totalMessages: messages ? messages.length : 0,
        processedListings: []
      });
    }
    
  } catch (error) {
    console.error("API error:", error);
    console.error("Error stack:", error.stack);
    
    // Make sure we always return a valid JSON response, even in case of errors
    try {
      return res.status(500).json({ 
        error: 'Processing error',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    } catch (responseError) {
      // Absolute fallback in case of any JSON serialization issues
      return res.status(500).send(JSON.stringify({ error: "An unexpected error occurred" }));
    }
  }
}
