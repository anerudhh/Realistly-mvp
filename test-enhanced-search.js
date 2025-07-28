import { searchListings } from './utils/file-storage.js';

// Test enhanced search functionality
console.log('Testing enhanced search functionality...\n');

// Test 1: Simple text search
console.log('=== Test 1: Simple text search ===');
const simpleResults = searchListings('Koramangala');
console.log(`Simple search for "Koramangala" found ${simpleResults.length} results`);
if (simpleResults.length > 0) {
  console.log('First result:', {
    property_type: simpleResults[0].property_type,
    location: simpleResults[0].location,
    listingType: simpleResults[0].listingType
  });
}

// Test 2: Search with filters
console.log('\n=== Test 2: Search with filters ===');
const filteredResults = searchListings({
  query: 'apartment',
  listingType: 'sale',
  propertyType: 'apartment',
  bhk: '2'
});
console.log(`Filtered search found ${filteredResults.length} results`);

// Test 3: List all properties to see what we have
console.log('\n=== Test 3: All available properties ===');
import { getAllListings } from './utils/file-storage.js';
const allListings = getAllListings();
console.log(`Total listings in database: ${allListings.length}`);

if (allListings.length > 0) {
  console.log('\nSample properties:');
  allListings.slice(0, 3).forEach((listing, index) => {
    console.log(`${index + 1}. Type: ${listing.property_type}, Location: ${JSON.stringify(listing.location)}, Listing Type: ${listing.listingType || 'Not set'}`);
  });
}

// Test 4: Search by location
console.log('\n=== Test 4: Location-based search ===');
const locationResults = searchListings({
  query: 'Bengaluru'
});
console.log(`Location search for "Bengaluru" found ${locationResults.length} results`);

console.log('\nTest complete!');
