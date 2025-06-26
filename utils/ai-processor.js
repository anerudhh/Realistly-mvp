import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Process a real estate message using Gemini AI
 * @param {string} message - The WhatsApp message content
 * @returns {Object} - Structured property data
 */
export async function processRealEstateMessage(message) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

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

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Remove any markdown formatting (```json, ```, etc.)
    const cleanText = text.replace(/```json|```|`/g, '').trim();
    
    try {
      // Parse the JSON response
      const jsonData = JSON.parse(cleanText);
      return jsonData;
    } catch (parseError) {
      console.error("Error parsing AI response as JSON:", parseError);
      return {
        propertyType: null,
        location: null,
        price: null,
        area: null,
        bhk: null,
        description: null,
        contactInfo: null,
        amenities: [],
        missingFields: ["Failed to parse JSON from AI response"],
      };
    }
  } catch (error) {
    console.error("Error processing message with AI:", error);
    return {
      propertyType: null,
      location: null,
      price: null,
      area: null,
      bhk: null,
      description: null,
      contactInfo: null,
      amenities: [],
      missingFields: ["AI processing error"],
    };
  }
}

/**
 * Process a search query using Gemini AI to extract structured search parameters
 * @param {string} query - The user's natural language search query
 * @returns {Object} - Structured search parameters
 */
export async function processSearchQuery(query) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

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

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Remove any markdown formatting
    const cleanText = text.replace(/```json|```|`/g, '').trim();
    
    try {
      // Parse the JSON response
      return JSON.parse(cleanText);
    } catch (parseError) {
      console.error("Error parsing AI search response as JSON:", parseError);
      return {
        propertyType: null,
        location: null,
        budget: null,
        area: null,
        bhk: null,
        amenities: [],
        keywords: []
      };
    }
  } catch (error) {
    console.error("Error processing search query with AI:", error);
    return {
      propertyType: null,
      location: null,
      budget: null,
      area: null,
      bhk: null,
      amenities: [],
      keywords: []
    };
  }
}
