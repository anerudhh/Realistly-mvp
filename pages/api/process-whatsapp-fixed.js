import formidable from 'formidable';
import fs from 'fs';
import { parseWhatsAppChat } from '../../utils/whatsapp-parser';
import { processRealEstateMessage } from '../../utils/ai-processor';
import { supabaseAdmin } from '../../utils/supabase';
import { saveListings } from '../../utils/file-storage';

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
  
  // Check if Supabase is properly configured
  const hasValidSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL && 
                           process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder.supabase.co' &&
                           process.env.SUPABASE_SERVICE_KEY &&
                           process.env.SUPABASE_SERVICE_KEY !== 'placeholder_service_key';
  
  if (!hasValidSupabase) {
    console.warn("Supabase not configured - running in test mode");
  }

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
      console.log("First 500 characters of chat content:", chatContent.substring(0, 500));
      messages = parseWhatsAppChat(chatContent);
      console.log("Messages parsed, count:", messages ? messages.length : 0);
      
      if (messages && messages.length > 0) {
        console.log("First few messages:", messages.slice(0, 3).map(m => ({
          sender: m.sender_name,
          content: m.content.substring(0, 100)
        })));
      }
      
      if (!messages || messages.length === 0) {
        console.warn("No messages found in chat file");
        return res.status(200).json({ 
          success: true,
          totalMessages: 0,
          processedListings: [],
          message: 'No valid WhatsApp messages found in the file. Please ensure this is a valid WhatsApp chat export.',
          debug: {
            contentLength: chatContent.length,
            firstChars: chatContent.substring(0, 200)
          }
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
    
    // Filter for real estate related messages with comprehensive keyword matching
    const isRealEstateMessage = (content) => {
      const lowerContent = content.toLowerCase();
      
      // Core real estate keywords
      const coreKeywords = [
        'bhk', 'apartment', 'villa', 'house', 'flat', 'property', 'rent', 'sale',
        'buy', 'sell', 'broker', 'agent', 'realtor', 'builder', 'developer',
        'sq ft', 'sqft', 'square feet', 'area', 'carpet area', 'built up area',
        'crore', 'lakh', 'lakhs', 'crores', 'price', 'cost', 'budget',
        'bedroom', 'bathroom', 'kitchen', 'hall', 'balcony', 'terrace',
        'furnished', 'unfurnished', 'semi-furnished', 'semi furnished',
        'parking', 'car parking', 'bike parking', 'covered parking',
        'gym', 'pool', 'swimming pool', 'club house', 'clubhouse',
        'security', 'lift', 'elevator', 'garden', 'park', 'playground',
        'gated community', 'society', 'complex', 'tower', 'wing',
        'floor', 'ground floor', 'top floor', 'penthouse', 'duplex',
        'studio', 'commercial', 'office', 'shop', 'warehouse', 'godown',
        'plot', 'land', 'site', 'layout', 'venture', 'project',
        'ready to move', 'under construction', 'new launch', 'possession',
        'rera', 'approved', 'loan', 'emi', 'home loan', 'bank loan',
        'registration', 'legal', 'clear title', 'khata', 'ec'
      ];
      
      // Location-specific keywords (Indian cities and areas)
      const locationKeywords = [
        'koramangala', 'whitefield', 'hsr layout', 'hsr', 'indiranagar', 'electronic city',
        'jayanagar', 'hebbal', 'sarjapur', 'marathahalli', 'banashankari', 'jp nagar',
        'btm layout', 'btm', 'yelahanka', 'rajajinagar', 'malleswaram', 'basavanagudi',
        'frazer town', 'richmond town', 'mg road', 'brigade road', 'commercial street',
        'silk board', 'bommanahalli', 'bagalur', 'devanahalli', 'kengeri',
        'rajarajeshwari nagar', 'rr nagar', 'vijayanagar', 'magadi road', 'mysore road',
        'tumkur road', 'hebbal flyover', 'outer ring road', 'orr', 'sarjapur road',
        'hosur road', 'old airport road', 'bellandur', 'kasravahalli', 'kadugodi',
        'varthur', 'mahadevapura', 'bangalore', 'bengaluru',
        'bandra', 'andheri', 'powai', 'borivali', 'malad', 'goregaon', 'kandivali',
        'juhu', 'versova', 'lokhandwala', 'bandra kurla complex', 'bkc', 'lower parel',
        'worli', 'colaba', 'nariman point', 'fort', 'churchgate', 'marine drive',
        'thane', 'navi mumbai', 'vashi', 'kharghar', 'panvel', 'kalyan', 'dombivli',
        'mumbai', 'gurgaon', 'gurugram', 'noida', 'faridabad', 'ghaziabad', 'dwarka',
        'rohini', 'janakpuri', 'lajpat nagar', 'cp', 'connaught place', 'karol bagh',
        'rajouri garden', 'pitampura', 'shalimar bagh', 'model town', 'civil lines',
        'vasant kunj', 'vasant vihar', 'greater kailash', 'defence colony', 'friends colony',
        'delhi', 'new delhi', 't nagar', 'adyar', 'besant nagar', 'velachery',
        'tambaram', 'chromepet', 'omr', 'ecr', 'anna nagar', 'guindy', 'mylapore',
        'triplicane', 'egmore', 'chennai', 'koregaon park', 'kalyani nagar',
        'viman nagar', 'aundh', 'baner', 'wakad', 'hinjewadi', 'magarpatta',
        'kothrud', 'karve nagar', 'shivajinagar', 'pune', 'hitech city', 'gachibowli',
        'kondapur', 'jubilee hills', 'banjara hills', 'madhapur', 'secunderabad',
        'begumpet', 'ameerpet', 'kukatpally', 'hyderabad'
      ];
      
      // Price/currency indicators
      const priceIndicators = [
        '₹', 'rs', 'rupees', 'inr', 'lakh', 'lakhs', 'crore', 'crores',
        'price', 'cost', 'budget', 'rent', 'deposit', 'advance', 'token',
        'booking', 'down payment', 'emi', 'per month', '/month', 'monthly'
      ];
      
      // Contact indicators
      const contactIndicators = [
        'contact', 'call', 'phone', 'mobile', 'whatsapp', 'email', 'visit',
        'interested', 'available', 'immediate', 'urgent', 'requirement'
      ];
      
      // Check if message contains any combination of keywords
      const hasCore = coreKeywords.some(keyword => lowerContent.includes(keyword));
      const hasLocation = locationKeywords.some(keyword => lowerContent.includes(keyword));
      const hasPrice = priceIndicators.some(indicator => lowerContent.includes(indicator));
      const hasContact = contactIndicators.some(indicator => lowerContent.includes(indicator));
      
      // Additional patterns for property dimensions and specifications
      const hasPropertySpecs = /\d+\s*(bhk|bedroom|bath|sq\.?\s*ft|sqft|floor|acre)/.test(lowerContent);
      const hasPropertyTypes = /(apartment|villa|house|flat|plot|land|office|commercial|pg|hostel)/.test(lowerContent);
      const hasPropertyActions = /(for\s+sale|for\s+rent|to\s+let|available|looking\s+for|wanted|urgent|immediate)/.test(lowerContent);
      
      // Message must have at least 2 of these categories or specific strong indicators
      const categoryCount = [hasCore, hasLocation, hasPrice, hasContact, hasPropertySpecs, hasPropertyTypes, hasPropertyActions]
        .filter(Boolean).length;
      
      // Strong indicators that definitely indicate real estate
      const strongIndicators = [
        /\d+\s*bhk/i,
        /₹\s*\d+/,
        /\d+\s*lakh/i,
        /\d+\s*crore/i,
        /\d+\s*sq\.?\s*ft/i,
        /for\s+(sale|rent)/i,
        /property\s+(for|available)/i,
        /apartment\s+(for|available)/i,
        /villa\s+(for|available)/i,
        /house\s+(for|available)/i,
        /flat\s+(for|available)/i,
        /plot\s+(for|available)/i,
        /real\s+estate/i,
        /property\s+(dealer|agent|broker)/i
      ];
      
      const hasStrongIndicator = strongIndicators.some(pattern => pattern.test(content));
      
      // Return true if we have strong indicators OR sufficient category coverage
      return hasStrongIndicator || categoryCount >= 2;
    };
    
    const realEstateMessages = messages.filter(msg => {
      const isRealEstate = isRealEstateMessage(msg.content);
      if (isRealEstate) {
        console.log(`Real estate message found from ${msg.sender_name}: "${msg.content.substring(0, 100)}..."`);
      }
      return isRealEstate;
    });
    
    console.log(`Found ${realEstateMessages.length} real estate messages out of ${messages.length} total messages`);
    
    // Debug: Show some sample messages if no real estate messages found
    if (realEstateMessages.length === 0) {
      console.log("No real estate messages found. Here are some sample messages:");
      messages.slice(0, 5).forEach((msg, index) => {
        console.log(`Sample ${index + 1} from ${msg.sender_name}: "${msg.content.substring(0, 200)}"`);
      });
    }
    
    if (realEstateMessages.length === 0) {
      console.log("No real estate messages found");
      return res.status(200).json({ 
        success: true,
        totalMessages: messages.length,
        realEstateMessages: 0,
        processedListings: [],
        message: 'No property listings were found in the chat file. Try a different file.',
        debug: {
          allMessages: messages.slice(0, 3).map(m => ({ 
            sender: m.sender_name, 
            content: m.content.substring(0, 100) 
          }))
        }
      });
    }
    
    // Store raw messages in Supabase and collect their IDs
    const rawDataInsertions = [];
    const processedListings = [];
    
    // Process ALL real estate messages (no limit)
    const messagesToProcess = realEstateMessages.length;
    console.log(`Processing ALL ${messagesToProcess} real estate messages found`);
    
    for (const message of realEstateMessages) {
      try {
        // Insert raw data (skip database if not configured)
        let rawData;
        if (hasValidSupabase) {
          const { data: dbRawData, error: rawError } = await supabaseAdmin
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
          rawData = dbRawData;
        } else {
          // Test mode - create mock raw data
          rawData = {
            id: Date.now() + Math.random(),
            timestamp: message.timestamp,
            sender_name: message.sender_name,
            sender_phone: message.sender_phone,
            raw_content: message.content,
            source: message.source,
            source_group: sourceGroup,
            media_urls: message.media_urls
          };
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
          // Insert into processed_listings table (skip database if not configured)
          let insertedListing;
          if (hasValidSupabase) {
            const { data: dbInsertedListing, error: insertError } = await supabaseAdmin
              .from('processed_listings')
              .insert(listingData)
              .select()
              .single();
              
            if (insertError) {
              console.error("Error inserting listing:", insertError);
            } else {
              insertedListing = dbInsertedListing;
            }
          } else {
            // Test mode - create mock inserted listing
            insertedListing = {
              ...listingData,
              id: Date.now() + Math.random(),
              created_at: new Date().toISOString()
            };
          }
          
          if (insertedListing) {
            processedListings.push(insertedListing);
          } else if (!hasValidSupabase) {
            processedListings.push(listingData);
          }
        }
      } catch (error) {
        console.error("Error processing message:", error);
      }
    }

    console.log(`Processed ${messagesToProcess} real estate messages, found ${processedListings.length} valid listings`);
    console.log(`Total messages in file: ${messages.length}, Real estate messages: ${realEstateMessages.length}, Processed: ${messagesToProcess}, Valid listings: ${processedListings.length}`);

    // Save to file storage if database is not configured
    if (!hasValidSupabase && processedListings.length > 0) {
      console.log("Saving listings to file storage...");
      const fileStorageSuccess = saveListings(processedListings);
      if (fileStorageSuccess) {
        console.log("Successfully saved listings to file storage");
      } else {
        console.error("Failed to save listings to file storage");
      }
    }

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
      console.log("No valid property listings found in the real estate messages");
      return res.status(200).json({
        success: true,
        totalMessages: messages.length,
        realEstateMessages: realEstateMessages.length,
        processedListings: [],
        message: `Processed ${messagesToProcess} real estate messages from ${messages.length} total messages, but could not extract complete property listings. The messages may lack essential details like price, location, or contact information.`
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
        realEstateMessages: realEstateMessages.length,
        processedListings: safeProcessedListings,
        message: `Successfully processed ${safeProcessedListings.length} property listings from ${messagesToProcess} real estate messages out of ${messages.length} total messages.`
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
