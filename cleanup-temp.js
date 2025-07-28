import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'processed-listings.json');

function generateListingFingerprint(listing) {
  const keyFields = [
    listing.description?.trim()?.toLowerCase() || '',
    listing.property_type?.toLowerCase() || '',
    JSON.stringify(listing.location || '').toLowerCase(),
    JSON.stringify(listing.price || '').toLowerCase(),
    listing.bhk?.toString() || '',
    JSON.stringify(listing.area || '').toLowerCase(),
    listing.contact_phone?.replace(/\D/g, '') || ''
  ];
  return keyFields.join('|');
}

function cleanupDuplicates() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      console.log('No processed listings file found');
      return;
    }

    const data = fs.readFileSync(DATA_FILE, 'utf8');
    const allListings = JSON.parse(data);
    
    console.log(`Starting with ${allListings.length} listings`);
    
    const seenFingerprints = new Set();
    const uniqueListings = [];
    let duplicatesRemoved = 0;
    
    allListings.forEach((listing, index) => {
      const fingerprint = generateListingFingerprint(listing);
      
      if (!seenFingerprints.has(fingerprint)) {
        seenFingerprints.add(fingerprint);
        uniqueListings.push(listing);
      } else {
        duplicatesRemoved++;
        console.log(`Removing duplicate #${index}: ${listing.description?.substring(0, 50)}...`);
      }
    });
    
    fs.writeFileSync(DATA_FILE, JSON.stringify(uniqueListings, null, 2));
    
    console.log(`Cleanup complete: ${allListings.length} -> ${uniqueListings.length} (${duplicatesRemoved} duplicates removed)`);
    
  } catch (error) {
    console.error('Error cleaning up duplicates:', error);
  }
}

cleanupDuplicates();
