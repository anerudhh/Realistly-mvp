import OpenAI from 'openai';
import { getCoordinatesFromAddress, standardizeIndianAddress, getLocationStringForGeocoding } from './geocoding.js';

// Initialize the OpenAI client
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// Debug the initialization
console.log("AI Processor initialization:");
console.log("- OPENAI_API_KEY exists:", !!process.env.OPENAI_API_KEY);
console.log("- OpenAI client initialized:", !!openai);
if (process.env.OPENAI_API_KEY) {
  console.log("- API key preview:", process.env.OPENAI_API_KEY.substring(0, 20) + "...");
}

/**
 * Fallback function to extract basic property info using simple text parsing
 * @param {string} message - The WhatsApp message content
 * @returns {Object} - Structured property data
 */
function extractPropertyDataFallback(message) {
  console.log("Using fallback property extraction for:", message.substring(0, 150));
  
  const lowerMessage = message.toLowerCase();

  const data = {
    propertyType: "Unknown",
    location: { area: "Not specified", city: null, landmarks: [] },
    price: { value: null, currency: "INR", formatted: "Price not mentioned" },
    area: { value: null, unit: null, formatted: "Area not specified" },
    bhk: null,
    description: message.substring(0, 300),
    contactInfo: null,
    amenities: [],
    missingFields: []
  };

  // Extract BHK configuration
  const bhkPatterns = [
    /(\d+)\s*bhk/i,
    /(\d+)\s*bed/i,
    /(\d+)\s*bedroom/i,
    /(\d+)br/i
  ];
  
  for (const pattern of bhkPatterns) {
    const match = message.match(pattern);
    if (match) {
      data.bhk = parseInt(match[1]);
      break;
    }
  }

  // Extract price with better patterns
  const pricePatterns = [
    // Indian currency patterns
    /₹\s*(\d+(?:\.\d+)?)\s*(lakh|lakhs|crore|crores)/i,
    /rs\.?\s*(\d+(?:\.\d+)?)\s*(lakh|lakhs|crore|crores)/i,
    /(\d+(?:\.\d+)?)\s*(lakh|lakhs|crore|crores)/i,
    /₹\s*(\d+(?:,\d+)*)/i,
    /rs\.?\s*(\d+(?:,\d+)*)/i,
    // Budget/price range patterns
    /budget:?\s*₹?\s*(\d+(?:\.\d+)?)\s*(lakh|lakhs|crore|crores)/i,
    /price:?\s*₹?\s*(\d+(?:\.\d+)?)\s*(lakh|lakhs|crore|crores)/i,
    /cost:?\s*₹?\s*(\d+(?:\.\d+)?)\s*(lakh|lakhs|crore|crores)/i
  ];

  for (const pattern of pricePatterns) {
    const match = message.match(pattern);
    if (match) {
      const value = parseFloat(match[1].replace(/,/g, ''));
      const unit = match[2] ? match[2].toLowerCase() : null;
      
      let actualValue = value;
      if (unit && unit.includes('crore')) {
        actualValue = value * 10000000; // Convert crores to rupees
      } else if (unit && unit.includes('lakh')) {
        actualValue = value * 100000; // Convert lakhs to rupees
      }
      
      data.price = {
        value: actualValue,
        currency: "INR",
        formatted: unit ? `₹${match[1]} ${unit}` : `₹${match[1]}`
      };
      break;
    }
  }

  // Extract area with better patterns
  const areaPatterns = [
    /(\d+)\s*sq\.?\s*ft/i,
    /(\d+)\s*sqft/i,
    /(\d+)\s*square\s*feet/i,
    /(\d+)\s*sq\.?\s*m/i,
    /(\d+)\s*sq\.?\s*meter/i,
    /(\d+)\s*acres?/i,
    /area:?\s*(\d+)\s*sq\.?\s*ft/i,
    /size:?\s*(\d+)\s*sq\.?\s*ft/i
  ];

  for (const pattern of areaPatterns) {
    const match = message.match(pattern);
    if (match) {
      const value = parseInt(match[1]);
      let unit = "sq ft";
      
      if (lowerMessage.includes("sq.m") || lowerMessage.includes("sq m") || lowerMessage.includes("meter")) {
        unit = "sq m";
      } else if (lowerMessage.includes("acre")) {
        unit = "acres";
      }
      
      data.area = {
        value: value,
        unit: unit,
        formatted: `${value} ${unit}`
      };
      break;
    }
  }

  // Extract property type with comprehensive patterns
  const propertyTypes = [
    { pattern: /\b(apartment|flat|unit)\b/i, type: "apartment" },
    { pattern: /\b(villa|bungalow|independent\s+house)\b/i, type: "villa" },
    { pattern: /\b(house|home)\b/i, type: "house" },
    { pattern: /\b(penthouse)\b/i, type: "penthouse" },
    { pattern: /\b(studio)\b/i, type: "studio" },
    { pattern: /\b(duplex)\b/i, type: "duplex" },
    { pattern: /\b(plot|land)\b/i, type: "plot" },
    { pattern: /\b(office|commercial)\b/i, type: "commercial" },
    { pattern: /\b(warehouse|godown)\b/i, type: "warehouse" },
    { pattern: /\b(shop|showroom)\b/i, type: "retail" },
    { pattern: /\b(pg|paying\s+guest)\b/i, type: "pg" },
    { pattern: /\b(hostel)\b/i, type: "hostel" }
  ];
  
  for (const { pattern, type } of propertyTypes) {
    if (pattern.test(message)) {
      data.propertyType = type;
      break;
    }
  }

  // Detect if property is for rent or sale
  const rentKeywords = /\b(rent|rental|lease|monthly|per month|\/month|tenant|letting)\b/i;
  const saleKeywords = /\b(sale|sell|selling|buy|purchase|investment|lakhs?|crores?|own|ownership)\b/i;
  
  if (rentKeywords.test(message)) {
    data.listingType = "rent";
  } else if (saleKeywords.test(message)) {
    data.listingType = "sale";
  } else {
    // If price is very high (> 50 lakhs), likely for sale
    if (data.price && data.price.value && data.price.value > 5000000) {
      data.listingType = "sale";
    } else if (data.price && data.price.value && data.price.value < 200000) {
      // If price is low (< 2 lakhs), likely rent
      data.listingType = "rent";
    } else {
      data.listingType = "unknown";
    }
  }

  // Extract phone numbers with better patterns
  const phonePatterns = [
    /\b(\d{10})\b/g,
    /\b(\+91\s*\d{10})\b/g,
    /\b(\+91[-\s]?\d{5}[-\s]?\d{5})\b/g,
    /\b(\d{3}[-\s]?\d{3}[-\s]?\d{4})\b/g,
    /contact:?\s*(\d{10})/i,
    /call:?\s*(\d{10})/i,
    /phone:?\s*(\d{10})/i,
    /mobile:?\s*(\d{10})/i
  ];

  for (const pattern of phonePatterns) {
    const matches = message.match(pattern);
    if (matches) {
      data.contactInfo = matches[0].replace(/[-\s+]/g, '');
      break;
    }
  }

  // Extract amenities with comprehensive list
  const amenityKeywords = [
    'parking', 'car parking', 'bike parking', 'covered parking',
    'swimming pool', 'pool', 'gym', 'fitness center', 'fitness',
    'security', '24/7 security', 'cctv', 'gated community',
    'lift', 'elevator', 'garden', 'park', 'playground',
    'balcony', 'terrace', 'rooftop', 'club house', 'clubhouse',
    'power backup', 'generator', 'inverter', 'solar',
    'water supply', 'bore well', 'tank', 'wifi', 'internet',
    'school', 'hospital', 'metro', 'bus stop', 'mall',
    'ac', 'air conditioning', 'furnished', 'semi-furnished',
    'modular kitchen', 'modern kitchen', 'wardrobe', 'cupboard'
  ];
  
  data.amenities = amenityKeywords.filter(amenity => 
    new RegExp(`\\b${amenity}\\b`, 'i').test(message)
  );

  // Extract location with comprehensive Indian city/area patterns
  const locationPatterns = [
    // Bangalore areas
    'koramangala', 'whitefield', 'hsr layout', 'hsr', 'indiranagar', 'electronic city',
    'jayanagar', 'hebbal', 'sarjapur', 'marathahalli', 'banashankari', 'jp nagar',
    'btm layout', 'btm', 'yelahanka', 'rajajinagar', 'malleswaram', 'basavanagudi',
    'frazer town', 'richmond town', 'mg road', 'brigade road', 'commercial street',
    'silk board', 'bommanahalli', 'electronic city phase 1', 'electronic city phase 2',
    'bagalur', 'devanahalli', 'kengeri', 'rajarajeshwari nagar', 'rr nagar',
    'vijayanagar', 'magadi road', 'mysore road', 'tumkur road', 'hebbal flyover',
    'outer ring road', 'orr', 'sarjapur road', 'hosur road', 'old airport road',
    'bellandur', 'kasravahalli', 'kadugodi', 'varthur', 'mahadevapura',
    
    // Mumbai areas
    'bandra', 'andheri', 'powai', 'borivali', 'malad', 'goregaon', 'kandivali',
    'juhu', 'versova', 'lokhandwala', 'bandra kurla complex', 'bkc', 'lower parel',
    'worli', 'colaba', 'nariman point', 'fort', 'churchgate', 'marine drive',
    'thane', 'navi mumbai', 'vashi', 'kharghar', 'panvel', 'kalyan', 'dombivli',
    
    // Delhi areas
    'gurgaon', 'noida', 'faridabad', 'ghaziabad', 'dwarka', 'rohini', 'janakpuri',
    'lajpat nagar', 'cp', 'connaught place', 'karol bagh', 'rajouri garden',
    'pitampura', 'shalimar bagh', 'model town', 'civil lines', 'vasant kunj',
    'vasant vihar', 'greater kailash', 'defence colony', 'friends colony',
    
    // Chennai areas
    't nagar', 'adyar', 'besant nagar', 'velachery', 'tambaram', 'chromepet',
    'omr', 'ecr', 'anna nagar', 'guindy', 'mylapore', 'triplicane', 'egmore',
    
    // Pune areas
    'koregaon park', 'kalyani nagar', 'viman nagar', 'aundh', 'baner', 'wakad',
    'hinjewadi', 'magarpatta', 'kothrud', 'karve nagar', 'shivajinagar',
    
    // Hyderabad areas
    'hitech city', 'gachibowli', 'kondapur', 'jubilee hills', 'banjara hills',
    'madhapur', 'secunderabad', 'begumpet', 'ameerpet', 'kukatpally',
    
    // General city names
    'bangalore', 'bengaluru', 'mumbai', 'delhi', 'new delhi', 'gurgaon', 'gurugram',
    'noida', 'pune', 'chennai', 'hyderabad', 'kolkata', 'ahmedabad', 'jaipur',
    'chandigarh', 'lucknow', 'kanpur', 'nagpur', 'indore', 'bhopal', 'visakhapatnam',
    'kochi', 'thiruvananthapuram', 'coimbatore', 'madurai', 'vijayawada'
  ];
  
  for (const location of locationPatterns) {
    const pattern = new RegExp(`\\b${location}\\b`, 'i');
    if (pattern.test(message)) {
      data.location.area = location;
      
      // Set city based on area
      if (['koramangala', 'whitefield', 'hsr layout', 'hsr', 'indiranagar', 'electronic city',
           'jayanagar', 'hebbal', 'sarjapur', 'marathahalli', 'banashankari', 'jp nagar',
           'btm layout', 'btm', 'yelahanka', 'rajajinagar', 'malleswaram', 'basavanagudi',
           'frazer town', 'richmond town', 'mg road', 'brigade road', 'commercial street',
           'silk board', 'bommanahalli', 'electronic city phase 1', 'electronic city phase 2',
           'bagalur', 'devanahalli', 'kengeri', 'rajarajeshwari nagar', 'rr nagar',
           'vijayanagar', 'magadi road', 'mysore road', 'tumkur road', 'hebbal flyover',
           'outer ring road', 'orr', 'sarjapur road', 'hosur road', 'old airport road',
           'bellandur', 'kasravahalli', 'kadugodi', 'varthur', 'mahadevapura',
           'bangalore', 'bengaluru'].includes(location.toLowerCase())) {
        data.location.city = 'Bengaluru';
      } else if (['bandra', 'andheri', 'powai', 'borivali', 'malad', 'goregaon', 'kandivali',
                  'juhu', 'versova', 'lokhandwala', 'bandra kurla complex', 'bkc', 'lower parel',
                  'worli', 'colaba', 'nariman point', 'fort', 'churchgate', 'marine drive',
                  'thane', 'navi mumbai', 'vashi', 'kharghar', 'panvel', 'kalyan', 'dombivli',
                  'mumbai'].includes(location.toLowerCase())) {
        data.location.city = 'Mumbai';
      } else if (['gurgaon', 'gurugram', 'noida', 'faridabad', 'ghaziabad', 'dwarka', 'rohini',
                  'janakpuri', 'lajpat nagar', 'cp', 'connaught place', 'karol bagh', 'rajouri garden',
                  'pitampura', 'shalimar bagh', 'model town', 'civil lines', 'vasant kunj',
                  'vasant vihar', 'greater kailash', 'defence colony', 'friends colony',
                  'delhi', 'new delhi'].includes(location.toLowerCase())) {
        data.location.city = 'Delhi';
      } else if (['t nagar', 'adyar', 'besant nagar', 'velachery', 'tambaram', 'chromepet',
                  'omr', 'ecr', 'anna nagar', 'guindy', 'mylapore', 'triplicane', 'egmore',
                  'chennai'].includes(location.toLowerCase())) {
        data.location.city = 'Chennai';
      } else if (['koregaon park', 'kalyani nagar', 'viman nagar', 'aundh', 'baner', 'wakad',
                  'hinjewadi', 'magarpatta', 'kothrud', 'karve nagar', 'shivajinagar',
                  'pune'].includes(location.toLowerCase())) {
        data.location.city = 'Pune';
      } else if (['hitech city', 'gachibowli', 'kondapur', 'jubilee hills', 'banjara hills',
                  'madhapur', 'secunderabad', 'begumpet', 'ameerpet', 'kukatpally',
                  'hyderabad'].includes(location.toLowerCase())) {
        data.location.city = 'Hyderabad';
      }
      break;
    }
  }

  // Determine missing fields
  if (!data.price.value) data.missingFields.push('price');
  if (!data.area.value) data.missingFields.push('area');
  if (!data.location.area || data.location.area === 'Not specified') data.missingFields.push('location');
  if (!data.contactInfo) data.missingFields.push('contact');
  if (!data.bhk) data.missingFields.push('bhk');

  return data;
}

/**
 * Enhance location data with geocoding information
 * @param {Object} locationData - The location object from property extraction
 * @returns {Object} - Enhanced location object with coordinates
 */
export async function enhanceLocationWithGeocoding(locationData) {
  if (!locationData) return locationData;

  try {
    // Get address string for geocoding
    const addressToGeocode = getLocationStringForGeocoding(locationData);
    
    if (addressToGeocode) {
      console.log(`Geocoding address: ${addressToGeocode}`);
      
      const standardizedAddress = standardizeIndianAddress(addressToGeocode);
      const geocodingResult = await getCoordinatesFromAddress(standardizedAddress);
      
      if (geocodingResult) {
        console.log(`Successfully geocoded: ${geocodingResult.formatted_address}`);
        
        return {
          ...locationData,
          standardized_address: geocodingResult.formatted_address,
          coordinates: {
            latitude: geocodingResult.latitude,
            longitude: geocodingResult.longitude
          },
          place_id: geocodingResult.place_id,
          address_components: geocodingResult.address_components,
          geocoded_at: new Date().toISOString()
        };
      } else {
        console.log(`Failed to geocode: ${addressToGeocode}`);
      }
    }

    return locationData;
  } catch (error) {
    console.error('Error enhancing location with geocoding:', error);
    return locationData;
  }
}

/**
 * Process a real estate message using Gemini AI or fallback parsing
 * @param {string} message - The WhatsApp message content
 * @returns {Object} - Structured property data
 */
export async function processRealEstateMessage(message) {
  // Use fallback parsing if OpenAI is not available
  if (!openai) {
    console.log("OpenAI API key not found, using fallback extraction");
    const fallbackData = extractPropertyDataFallback(message);
    
    // Enhance location with geocoding even in fallback mode
    if (fallbackData.location) {
      console.log("Enhancing fallback location with geocoding...");
      fallbackData.location = await enhanceLocationWithGeocoding(fallbackData.location);
    }
    
    return fallbackData;
  }

  console.log("Attempting to use OpenAI for message processing...");

  try {
    // Format the prompt for property extraction with detailed instructions
    const prompt = `
      You are a real estate data extraction specialist. Extract structured information from this WhatsApp message about a property.
      Be as precise as possible and structure the data in a consistent format.
      
      Message: ${message}
      
      Extract and return a JSON object with these fields (use null for missing fields):
      - propertyType: (apartment, villa, plot, commercial, etc.)
      - location: {
          area: (specific neighborhood/locality),
          city: (city name),
          landmarks: (array of nearby landmarks if mentioned)
        }
      - price: {
          value: (numeric value only),
          currency: (INR, USD, etc.),
          formatted: (full price with currency and formatting),
          negotiable: (boolean, true if price is mentioned as negotiable)
        }
      - area: {
          value: (numeric value only),
          unit: (sq.ft, sq.m, acres, etc.),
          formatted: (full area with unit)
        }
      - bhk: (number of bedrooms-hall-kitchen)
      - description: (concise description highlighting key selling points)
      - contactInfo: (phone number or other contact details)
      - amenities: (array of amenities mentioned)
      - features: (array of additional features not covered in amenities)
      - availability: (immediate, under construction, specific date if mentioned)
      - propertyCondition: (new, resale, under construction, etc.)
      - furnishing: (unfurnished, semi-furnished, fully furnished)
      - legalClear: (boolean, true if mentioned as clear title/legal)
      - missingFields: (array of important fields that are not mentioned in the message)
      
      Return only the JSON object without any markdown formatting or explanation.
    `;

    const completion = await openai.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'gpt-3.5-turbo',
      temperature: 0.1,
      max_tokens: 1500,
    });

    const text = completion.choices[0].message.content;
    
    // Remove any markdown formatting (```json, ```, etc.)
    const cleanText = text.replace(/```json|```|`/g, '').trim();
    
    try {
      // Parse the JSON response
      const jsonData = JSON.parse(cleanText);
      
      // Enhance location with geocoding
      if (jsonData.location) {
        console.log("Enhancing location with geocoding...");
        jsonData.location = await enhanceLocationWithGeocoding(jsonData.location);
      }
      
      return jsonData;
    } catch (parseError) {
      console.error("Error parsing AI response as JSON:", parseError);
      console.log("Falling back to basic extraction");
      return extractPropertyDataFallback(message);
    }
  } catch (error) {
    console.error("Error processing message with AI:", error);
    console.error("Error details:", {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    console.log("Falling back to basic extraction");
    return extractPropertyDataFallback(message);
  }
}

/**
 * Fallback function to parse search queries without AI
 * @param {string} query - The user's natural language search query
 * @returns {Object} - Structured search parameters
 */
function processSearchQueryFallback(query) {
  console.log("Using fallback search query processing for:", query);
  
  const lowerQuery = query.toLowerCase();
  
  const searchParams = {
    propertyType: null,
    location: { area: null, city: null },
    price: { min: null, max: null },
    area: { min: null, max: null },
    bhk: null,
    amenities: [],
    listingType: null, // rent or sale
    keywords: query.split(" ").filter(word => word.length > 2)
  };

  // Extract BHK
  const bhkPatterns = [
    /(\d+)\s*bhk/i,
    /(\d+)\s*bed/i,
    /(\d+)\s*bedroom/i
  ];
  
  for (const pattern of bhkPatterns) {
    const match = query.match(pattern);
    if (match) {
      searchParams.bhk = parseInt(match[1]);
      break;
    }
  }

  // Extract property type
  const propertyTypes = [
    { pattern: /\b(apartment|flat|unit)\b/i, type: "apartment" },
    { pattern: /\b(villa|bungalow|independent\s+house)\b/i, type: "villa" },
    { pattern: /\b(house|home)\b/i, type: "house" },
    { pattern: /\b(penthouse)\b/i, type: "penthouse" },
    { pattern: /\b(studio)\b/i, type: "studio" },
    { pattern: /\b(duplex)\b/i, type: "duplex" },
    { pattern: /\b(plot|land)\b/i, type: "plot" },
    { pattern: /\b(office|commercial)\b/i, type: "commercial" }
  ];
  
  for (const { pattern, type } of propertyTypes) {
    if (pattern.test(query)) {
      searchParams.propertyType = type;
      break;
    }
  }

  // Extract listing type
  if (/\b(rent|rental|lease|monthly)\b/i.test(query)) {
    searchParams.listingType = "rent";
  } else if (/\b(sale|sell|buy|purchase)\b/i.test(query)) {
    searchParams.listingType = "sale";
  }

  // Extract price range
  const pricePatterns = [
    /(\d+(?:\.\d+)?)\s*(?:to|-)?\s*(\d+(?:\.\d+)?)\s*(lakh|lakhs|crore|crores)/i,
    /under\s*(\d+(?:\.\d+)?)\s*(lakh|lakhs|crore|crores)/i,
    /below\s*(\d+(?:\.\d+)?)\s*(lakh|lakhs|crore|crores)/i,
    /above\s*(\d+(?:\.\d+)?)\s*(lakh|lakhs|crore|crores)/i,
    /budget:?\s*(\d+(?:\.\d+)?)\s*(lakh|lakhs|crore|crores)/i
  ];

  for (const pattern of pricePatterns) {
    const match = query.match(pattern);
    if (match) {
      const value1 = parseFloat(match[1]);
      const value2 = match[2] && !isNaN(parseFloat(match[2])) ? parseFloat(match[2]) : null;
      const unit = match[match.length - 1].toLowerCase();
      
      let multiplier = 1;
      if (unit.includes('lakh')) {
        multiplier = 100000;
      } else if (unit.includes('crore')) {
        multiplier = 10000000;
      }
      
      if (query.includes('under') || query.includes('below')) {
        searchParams.price.max = value1 * multiplier;
      } else if (query.includes('above')) {
        searchParams.price.min = value1 * multiplier;
      } else if (value2) {
        searchParams.price.min = value1 * multiplier;
        searchParams.price.max = value2 * multiplier;
      } else {
        searchParams.price.max = value1 * multiplier;
      }
      break;
    }
  }

  // Extract area range
  const areaPatterns = [
    /(\d+)\s*(?:to|-)?\s*(\d+)\s*sq\.?\s*ft/i,
    /(\d+)\s*sq\.?\s*ft/i,
    /above\s*(\d+)\s*sq\.?\s*ft/i,
    /under\s*(\d+)\s*sq\.?\s*ft/i
  ];

  for (const pattern of areaPatterns) {
    const match = query.match(pattern);
    if (match) {
      const value1 = parseInt(match[1]);
      const value2 = match[2] && !isNaN(parseInt(match[2])) ? parseInt(match[2]) : null;
      
      if (query.includes('under') || query.includes('below')) {
        searchParams.area.max = value1;
      } else if (query.includes('above')) {
        searchParams.area.min = value1;
      } else if (value2) {
        searchParams.area.min = value1;
        searchParams.area.max = value2;
      }
      break;
    }
  }

  // Extract location - major Indian cities and areas
  const locationPatterns = [
    // Bangalore
    'koramangala', 'whitefield', 'hsr layout', 'hsr', 'indiranagar', 'electronic city',
    'jayanagar', 'hebbal', 'sarjapur', 'marathahalli', 'banashankari', 'jp nagar',
    'btm layout', 'btm', 'yelahanka', 'rajajinagar', 'malleswaram', 'basavanagudi',
    'bangalore', 'bengaluru',
    
    // Mumbai
    'bandra', 'andheri', 'powai', 'borivali', 'malad', 'goregaon', 'juhu', 'thane',
    'navi mumbai', 'mumbai',
    
    // Delhi
    'gurgaon', 'gurugram', 'noida', 'faridabad', 'ghaziabad', 'dwarka', 'rohini',
    'delhi', 'new delhi',
    
    // Chennai
    't nagar', 'adyar', 'velachery', 'tambaram', 'anna nagar', 'chennai',
    
    // Pune
    'koregaon park', 'viman nagar', 'aundh', 'baner', 'wakad', 'hinjewadi', 'pune',
    
    // Hyderabad
    'hitech city', 'gachibowli', 'kondapur', 'jubilee hills', 'banjara hills', 'hyderabad'
  ];
  
  for (const location of locationPatterns) {
    if (new RegExp(`\\b${location}\\b`, 'i').test(query)) {
      searchParams.location.area = location;
      
      // Set city based on area
      if (['bangalore', 'bengaluru'].includes(location.toLowerCase()) || 
          ['koramangala', 'whitefield', 'hsr layout', 'hsr', 'indiranagar', 'electronic city',
           'jayanagar', 'hebbal', 'sarjapur', 'marathahalli', 'banashankari', 'jp nagar',
           'btm layout', 'btm', 'yelahanka', 'rajajinagar', 'malleswaram', 'basavanagudi'].includes(location.toLowerCase())) {
        searchParams.location.city = 'Bengaluru';
      } else if (['mumbai'].includes(location.toLowerCase()) || 
                 ['bandra', 'andheri', 'powai', 'borivali', 'malad', 'goregaon', 'juhu', 'thane', 'navi mumbai'].includes(location.toLowerCase())) {
        searchParams.location.city = 'Mumbai';
      } else if (['delhi', 'new delhi'].includes(location.toLowerCase()) || 
                 ['gurgaon', 'gurugram', 'noida', 'faridabad', 'ghaziabad', 'dwarka', 'rohini'].includes(location.toLowerCase())) {
        searchParams.location.city = 'Delhi';
      } else if (['chennai'].includes(location.toLowerCase()) || 
                 ['t nagar', 'adyar', 'velachery', 'tambaram', 'anna nagar'].includes(location.toLowerCase())) {
        searchParams.location.city = 'Chennai';
      } else if (['pune'].includes(location.toLowerCase()) || 
                 ['koregaon park', 'viman nagar', 'aundh', 'baner', 'wakad', 'hinjewadi'].includes(location.toLowerCase())) {
        searchParams.location.city = 'Pune';
      } else if (['hyderabad'].includes(location.toLowerCase()) || 
                 ['hitech city', 'gachibowli', 'kondapur', 'jubilee hills', 'banjara hills'].includes(location.toLowerCase())) {
        searchParams.location.city = 'Hyderabad';
      }
      break;
    }
  }

  // Extract amenities
  const amenityKeywords = [
    'parking', 'pool', 'gym', 'security', 'lift', 'garden', 'balcony', 
    'terrace', 'clubhouse', 'backup', 'wifi', 'furnished', 'ac'
  ];
  
  searchParams.amenities = amenityKeywords.filter(amenity => 
    new RegExp(`\\b${amenity}\\b`, 'i').test(query)
  );

  console.log("Fallback search parameters:", searchParams);
  return searchParams;
}

/**
 * Process a search query using Gemini AI to extract structured search parameters
 * @param {string} query - The user's natural language search query
 * @returns {Object} - Structured search parameters
 */
export async function processSearchQuery(query) {
  // Use enhanced fallback parsing if OpenAI is not available
  if (!openai) {
    console.log("OpenAI API key not found, using fallback search parsing");
    return processSearchQueryFallback(query);
  }

  console.log("Attempting to use OpenAI for search query processing...");

  try {
    // Format the prompt for search parameter extraction
    const prompt = `
      You are a real estate search specialist. Extract structured search parameters from this natural language query.
      
      Search query: "${query}"
      
      Return a JSON object with these fields (use null for fields not mentioned):
      - propertyType: (apartment, villa, plot, commercial, etc.)
      - location: {
          areas: (array of area/neighborhood names mentioned),
          city: (city name if mentioned)
        }
      - budget: {
          min: (minimum price as a number only, null if not specified),
          max: (maximum price as a number only),
          currency: (INR, USD, etc. - default to INR if not specified)
        }
      - area: {
          min: (minimum area as a number only, null if not specified),
          max: (maximum area as a number only, null if not specified),
          unit: (sq.ft, sq.m, acres, etc.)
        }
      - bhk: (number of bedrooms, null if not specified)
      - amenities: (array of required amenities mentioned)
      - furnished: (boolean or null if not specified)
      - sortBy: ("price_asc", "price_desc", "recent", "relevance", etc. based on query hints)
      - keywords: (array of other important keywords from the query)
      
      Return only the JSON object without any markdown formatting or explanation.
    `;

    const completion = await openai.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'gpt-3.5-turbo',
      temperature: 0.1,
      max_tokens: 1000,
    });

    const text = completion.choices[0].message.content;
    
    // Remove any markdown formatting
    const cleanText = text.replace(/```json|```|`/g, '').trim();
    
    try {
      // Parse the JSON response
      return JSON.parse(cleanText);
    } catch (parseError) {
      console.error("Error parsing AI search response as JSON:", parseError);
      return {
        propertyType: null,
        location: { areas: [], city: null },
        budget: { min: null, max: null, currency: "INR" },
        area: { min: null, max: null, unit: "sq.ft" },
        bhk: null,
        amenities: [],
        keywords: query.split(' ').filter(word => word.length > 2)
      };
    }
  } catch (error) {
    console.error("Error processing search query with AI:", error);
    console.error("Error details:", {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    console.log("Falling back to basic search parsing...");
    return processSearchQueryFallback(query);
  }
}

/**
 * Search for properties by distance from a given location
 * @param {number} centerLat - Center latitude
 * @param {number} centerLng - Center longitude
 * @param {number} radiusKm - Search radius in kilometers
 * @param {Array} properties - Array of properties to search through
 * @returns {Array} - Properties within the specified radius with distance
 */
export function searchByDistance(centerLat, centerLng, radiusKm, properties) {
  if (!centerLat || !centerLng || !properties) {
    return [];
  }

  const { calculateDistance } = require('./geocoding');
  
  const propertiesWithDistance = properties
    .filter(property => 
      property.location && 
      property.location.coordinates && 
      property.location.coordinates.latitude && 
      property.location.coordinates.longitude
    )
    .map(property => ({
      ...property,
      distance: calculateDistance(
        centerLat, 
        centerLng, 
        property.location.coordinates.latitude, 
        property.location.coordinates.longitude
      )
    }))
    .filter(property => property.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);

  return propertiesWithDistance;
}

/**
 * Enhance search query with geocoding to enable location-based search
 * @param {Object} searchParams - Search parameters from processSearchQuery
 * @returns {Object} - Enhanced search parameters with coordinates
 */
export async function enhanceSearchWithGeocoding(searchParams) {
  if (!searchParams.location) {
    return searchParams;
  }

  try {
    // Try to geocode the search location
    let addressToGeocode = null;
    
    if (searchParams.location.areas && searchParams.location.areas.length > 0) {
      addressToGeocode = searchParams.location.areas[0];
      if (searchParams.location.city) {
        addressToGeocode += `, ${searchParams.location.city}`;
      }
    } else if (searchParams.location.city) {
      addressToGeocode = searchParams.location.city;
    }

    if (addressToGeocode) {
      console.log(`Geocoding search location: ${addressToGeocode}`);
      
      const standardizedAddress = standardizeIndianAddress(addressToGeocode);
      const geocodingResult = await getCoordinatesFromAddress(standardizedAddress);
      
      if (geocodingResult) {
        console.log(`Search location geocoded: ${geocodingResult.formatted_address}`);
        
        return {
          ...searchParams,
          location: {
            ...searchParams.location,
            coordinates: {
              latitude: geocodingResult.latitude,
              longitude: geocodingResult.longitude
            },
            standardized_address: geocodingResult.formatted_address,
            place_id: geocodingResult.place_id
          }
        };
      }
    }

    return searchParams;
  } catch (error) {
    console.error('Error enhancing search with geocoding:', error);
    return searchParams;
  }
}
