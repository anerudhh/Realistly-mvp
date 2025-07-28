import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'processed-listings.json');

/**
 * Read all processed listings from the JSON file
 * @returns {Array} Array of processed listings
 */
export function getAllListings() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return [];
    }
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading listings file:', error);
    return [];
  }
}

/**
 * Generate a hash/fingerprint for a listing to detect duplicates
 * @param {Object} listing - The listing object
 * @returns {string} A unique fingerprint for the listing
 */
function generateListingFingerprint(listing) {
  // Create a unique fingerprint based on key fields
  const keyFields = [
    listing.description?.trim()?.toLowerCase() || '',
    listing.property_type?.toLowerCase() || '',
    JSON.stringify(listing.location || '').toLowerCase(),
    JSON.stringify(listing.price || '').toLowerCase(),
    listing.bhk?.toString() || '',
    JSON.stringify(listing.area || '').toLowerCase(),
    listing.contact_phone?.replace(/\D/g, '') || '' // Remove non-digits from phone
  ];
  
  return keyFields.join('|');
}

/**
 * Save processed listings to the JSON file
 * @param {Array} newListings - Array of new listings to add
 * @returns {boolean} Success status
 */
export function saveListings(newListings) {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Read existing listings
    const existingListings = getAllListings();
    
    // Create a set of existing listing fingerprints to detect duplicates
    const existingFingerprints = new Set();
    existingListings.forEach(listing => {
      const fingerprint = generateListingFingerprint(listing);
      existingFingerprints.add(fingerprint);
    });
    
    // Filter out duplicate listings
    const uniqueNewListings = [];
    let duplicatesSkipped = 0;
    
    newListings.forEach(listing => {
      const fingerprint = generateListingFingerprint(listing);
      
      if (!existingFingerprints.has(fingerprint)) {
        uniqueNewListings.push(listing);
        existingFingerprints.add(fingerprint); // Also track new ones to avoid duplicates within the new batch
      } else {
        duplicatesSkipped++;
        console.log(`Skipping duplicate listing: ${listing.description?.substring(0, 50)}...`);
      }
    });
    
    // Add unique new listings with IDs
    const allListings = [...existingListings];
    uniqueNewListings.forEach((listing, index) => {
      allListings.push({
        ...listing,
        id: Date.now() + index,
        created_at: new Date().toISOString()
      });
    });
    
    // Write back to file
    fs.writeFileSync(DATA_FILE, JSON.stringify(allListings, null, 2));
    console.log(`Saved ${uniqueNewListings.length} new unique listings to file storage`);
    if (duplicatesSkipped > 0) {
      console.log(`Skipped ${duplicatesSkipped} duplicate listings`);
    }
    return true;
  } catch (error) {
    console.error('Error saving listings file:', error);
    return false;
  }
}

/**
 * Search listings based on query parameters
 * @param {Object|string} searchParams - Search parameters from AI processing or simple string
 * @returns {Array} Filtered listings
 */
export function searchListings(searchParams) {
  try {
    const allListings = getAllListings();
    
    // If searchParams is a string (simple search), convert it to search object
    if (typeof searchParams === 'string') {
      const query = searchParams.toLowerCase();
      console.log(`Performing simple text search for: "${query}"`);
      
      // Simple text search in all fields
      const filteredListings = allListings.filter(listing => {
        const searchableText = [
          listing.description || '',
          listing.property_type || '',
          typeof listing.location === 'object' ? JSON.stringify(listing.location) : (listing.location || ''),
          typeof listing.price === 'object' ? JSON.stringify(listing.price) : (listing.price || ''),
          typeof listing.area === 'object' ? JSON.stringify(listing.area) : (listing.area || ''),
          listing.contact_phone || '',
          (listing.amenities || []).join(' ')
        ].join(' ').toLowerCase();
        
        const matches = searchableText.includes(query);
        if (matches) {
          console.log(`Found match for "${query}" in listing:`, {
            id: listing.id,
            property_type: listing.property_type,
            location: listing.location,
            matchedText: searchableText.substring(0, 200)
          });
        }
        return matches;
      });
      
      console.log(`Simple text search found ${filteredListings.length} results for "${query}"`);
      return filteredListings; // Return all results, no limit
    }
    
    if (!searchParams || allListings.length === 0) {
      return []; // Return empty array instead of all listings when no search params
    }
    
    let filteredListings = allListings;
    
    // Extract filters from searchParams
    const { query, listingType, propertyType, bhk } = searchParams;
    
    // First apply text search if query exists
    if (query && query.trim()) {
      const queryLower = query.toLowerCase();
      filteredListings = filteredListings.filter(listing => {
        const searchableText = [
          listing.description || '',
          listing.property_type || '',
          typeof listing.location === 'object' ? JSON.stringify(listing.location) : (listing.location || ''),
          typeof listing.price === 'object' ? JSON.stringify(listing.price) : (listing.price || ''),
          typeof listing.area === 'object' ? JSON.stringify(listing.area) : (listing.area || ''),
          listing.contact_phone || '',
          (listing.amenities || []).join(' ')
        ].join(' ').toLowerCase();
        
        return searchableText.includes(queryLower);
      });
    }
    
    // Apply listing type filter (rent/sale)
    if (listingType && listingType.trim()) {
      filteredListings = filteredListings.filter(listing => 
        listing.listingType === listingType || listing.listing_type === listingType
      );
    }
    
    // Apply property type filter
    if (propertyType && propertyType.trim()) {
      filteredListings = filteredListings.filter(listing => 
        listing.property_type && 
        listing.property_type.toLowerCase().includes(propertyType.toLowerCase())
      );
    }
    
    // Apply BHK filter
    if (bhk && bhk.trim()) {
      const bhkNum = parseInt(bhk);
      if (!isNaN(bhkNum)) {
        filteredListings = filteredListings.filter(listing => 
          listing.bhk === bhkNum
        );
      }
    }
    
    // Filter by property type
    if (searchParams.propertyType) {
      filteredListings = filteredListings.filter(listing => 
        listing.property_type && 
        listing.property_type.toLowerCase().includes(searchParams.propertyType.toLowerCase())
      );
    }
    
    // Filter by location
    if (searchParams.location) {
      if (searchParams.location.areas && searchParams.location.areas.length > 0) {
        filteredListings = filteredListings.filter(listing => {
          if (!listing.location) return false;
          
          const locationStr = typeof listing.location === 'object' 
            ? JSON.stringify(listing.location).toLowerCase()
            : listing.location.toLowerCase();
            
          return searchParams.location.areas.some(area => 
            locationStr.includes(area.toLowerCase())
          );
        });
      } else if (searchParams.location.city) {
        filteredListings = filteredListings.filter(listing => {
          if (!listing.location) return false;
          
          const locationStr = typeof listing.location === 'object' 
            ? JSON.stringify(listing.location).toLowerCase()
            : listing.location.toLowerCase();
            
          return locationStr.includes(searchParams.location.city.toLowerCase());
        });
      }
    }
    
    // Filter by BHK
    if (searchParams.bhk) {
      filteredListings = filteredListings.filter(listing => 
        listing.bhk === searchParams.bhk
      );
    }
    
    // Filter by price range
    if (searchParams.budget && (searchParams.budget.min || searchParams.budget.max)) {
      filteredListings = filteredListings.filter(listing => {
        if (!listing.price || typeof listing.price !== 'object' || !listing.price.value) {
          return false;
        }
        
        const listingPrice = listing.price.value;
        
        if (searchParams.budget.min && listingPrice < searchParams.budget.min) {
          return false;
        }
        
        if (searchParams.budget.max && listingPrice > searchParams.budget.max) {
          return false;
        }
        
        return true;
      });
    }
    
    // Filter by area range
    if (searchParams.area && (searchParams.area.min || searchParams.area.max)) {
      filteredListings = filteredListings.filter(listing => {
        if (!listing.area || typeof listing.area !== 'object' || !listing.area.value) {
          return false;
        }
        
        const listingArea = listing.area.value;
        
        if (searchParams.area.min && listingArea < searchParams.area.min) {
          return false;
        }
        
        if (searchParams.area.max && listingArea > searchParams.area.max) {
          return false;
        }
        
        return true;
      });
    }
    
    // Filter by amenities
    if (searchParams.amenities && searchParams.amenities.length > 0) {
      filteredListings = filteredListings.filter(listing => {
        if (!listing.amenities || !Array.isArray(listing.amenities)) {
          return false;
        }
        
        return searchParams.amenities.some(amenity => 
          listing.amenities.some(listingAmenity => 
            listingAmenity.toLowerCase().includes(amenity.toLowerCase())
          )
        );
      });
    }
    
    return filteredListings; // Return all results, no limit
  } catch (error) {
    console.error('Error searching listings:', error);
    return [];
  }
}

/**
 * Clear all listings (for testing purposes)
 * @returns {boolean} Success status
 */
export function clearAllListings() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
    console.log('Cleared all listings from file storage');
    return true;
  } catch (error) {
    console.error('Error clearing listings file:', error);
    return false;
  }
}
