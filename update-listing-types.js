import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'processed-listings.json');

/**
 * Detect if property is for rent or sale based on description and price
 */
function detectListingType(listing) {
  const description = (listing.description || '').toLowerCase();
  
  // Keywords that strongly indicate rent
  const rentKeywords = /\b(rent|rental|lease|monthly|per month|\/month|tenant|letting)\b/i;
  
  // Keywords that strongly indicate sale
  const saleKeywords = /\b(sale|sell|selling|buy|purchase|investment|lakhs?|crores?|own|ownership)\b/i;
  
  if (rentKeywords.test(description)) {
    return "rent";
  } else if (saleKeywords.test(description)) {
    return "sale";
  } else {
    // Use price-based heuristics
    const priceValue = listing.price?.value;
    
    if (priceValue) {
      // If price is very high (> 50 lakhs), likely for sale
      if (priceValue > 5000000) {
        return "sale";
      } 
      // If price is low (< 2 lakhs), likely rent
      else if (priceValue < 200000) {
        return "rent";
      }
    }
    
    // Default assumption based on price format in description
    if (description.includes('lakh') || description.includes('crore')) {
      return "sale";
    }
    
    return "unknown";
  }
}

/**
 * Update existing listings with listingType field
 */
function updateListingsWithType() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      console.log('No processed listings file found');
      return;
    }

    const data = fs.readFileSync(DATA_FILE, 'utf8');
    const allListings = JSON.parse(data);
    
    console.log(`Updating ${allListings.length} listings with listing types...`);
    
    let updatedCount = 0;
    
    const updatedListings = allListings.map(listing => {
      const currentType = listing.listingType || listing.listing_type;
      
      if (!currentType || currentType === 'unknown') {
        const detectedType = detectListingType(listing);
        updatedCount++;
        
        console.log(`Listing ${listing.id}: "${listing.description?.substring(0, 50)}..." -> ${detectedType}`);
        
        return {
          ...listing,
          listingType: detectedType,
          listing_type: detectedType // Keep both for compatibility
        };
      }
      
      return listing;
    });
    
    // Write updated data back
    fs.writeFileSync(DATA_FILE, JSON.stringify(updatedListings, null, 2));
    
    console.log(`\nUpdate complete:`);
    console.log(`- Total listings: ${allListings.length}`);
    console.log(`- Updated with listing type: ${updatedCount}`);
    
    // Show distribution
    const typeCount = {};
    updatedListings.forEach(listing => {
      const type = listing.listingType || 'unknown';
      typeCount[type] = (typeCount[type] || 0) + 1;
    });
    
    console.log('\nListing type distribution:');
    Object.entries(typeCount).forEach(([type, count]) => {
      console.log(`- ${type}: ${count}`);
    });
    
  } catch (error) {
    console.error('Error updating listings:', error);
  }
}

// Run the update
updateListingsWithType();
