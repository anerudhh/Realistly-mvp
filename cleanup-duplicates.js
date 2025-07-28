const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data', 'processed-listings.json');

/**
 * Generate a hash/fingerprint for a listing to detect duplicates
 */
function generateListingFingerprint(listing) {
  const keyFields = [
    listing.description?.trim()?.toLowerCase() || '',
    listing.property_type?.toLowerCase() || '',
    JSON.stringify(listing.location || '').toLowerCase(),
    JSON.stringify(listing.price || '').toLowerCase(),
    listing.bhk?.toString() || '',
    JSON.stringify(listing.area || '').toLowerCase(),
    (listing.contact_phone || '').replace(/\D/g, '') || '' // Remove non-digits from phone
  ];
  
  return keyFields.join('|');
}

function cleanupDuplicates() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      console.log('No data file found');
      return;
    }

    const data = fs.readFileSync(DATA_FILE, 'utf8');
    const listings = JSON.parse(data);
    
    console.log(`Found ${listings.length} total listings`);
    
    const uniqueListings = [];
    const seenFingerprints = new Set();
    let duplicatesRemoved = 0;
    
    listings.forEach(listing => {
      const fingerprint = generateListingFingerprint(listing);
      
      if (!seenFingerprints.has(fingerprint)) {
        uniqueListings.push(listing);
        seenFingerprints.add(fingerprint);
      } else {
        duplicatesRemoved++;
        console.log(`Removing duplicate: ${listing.description?.substring(0, 50)}...`);
      }
    });
    
    console.log(`Removed ${duplicatesRemoved} duplicates`);
    console.log(`${uniqueListings.length} unique listings remaining`);
    
    // Write back the cleaned data
    fs.writeFileSync(DATA_FILE, JSON.stringify(uniqueListings, null, 2));
    console.log('Data file cleaned successfully');
    
  } catch (error) {
    console.error('Error cleaning up duplicates:', error);
  }
}

cleanupDuplicates();
