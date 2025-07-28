import { searchListings, getAllListings } from './utils/file-storage.js';

console.log('=== DEBUGGING SEARCH ISSUE ===\n');

// Test 1: Check total listings
const allListings = getAllListings();
console.log(`✅ Total listings in database: ${allListings.length}`);

// Test 2: Show locations available
console.log('\n📍 Available locations:');
const locations = new Set();
allListings.forEach(listing => {
  if (listing.location && typeof listing.location === 'object' && listing.location.area) {
    locations.add(listing.location.area);
  } else if (typeof listing.location === 'string') {
    locations.add(listing.location);
  }
});
console.log([...locations]);

// Test 3: Test simple search for common terms
console.log('\n=== Testing Simple Searches ===');

const testQueries = ['Bengaluru', 'apartment', 'BHK', 'sale', 'rent'];

for (const query of testQueries) {
  const results = searchListings(query);
  console.log(`🔍 "${query}" → ${results.length} results`);
}

// Test 4: Test specific location searches
console.log('\n=== Testing Location Searches ===');
const locationTests = ['Koramangala', 'Whitefield', 'HSR Layout', 'Bengaluru'];

for (const location of locationTests) {
  const results = searchListings(location);
  console.log(`📍 "${location}" → ${results.length} results`);
  if (results.length > 0) {
    console.log(`   First result: ${results[0].property_type} in ${JSON.stringify(results[0].location)}`);
  }
}

// Test 5: Test object-based search
console.log('\n=== Testing Object-Based Search ===');
const objectSearch = searchListings({
  query: 'Bengaluru'
});
console.log(`🏢 Object search for "Bengaluru" → ${objectSearch.length} results`);

// Test 6: Check for duplicate detection issues
console.log('\n=== Checking for Duplicate Issues ===');
const bengaluruListings = allListings.filter(listing => {
  if (listing.location && typeof listing.location === 'object') {
    return listing.location.city === 'Bengaluru';
  }
  return false;
});
console.log(`📊 Raw Bengaluru listings (no filtering): ${bengaluruListings.length}`);

// Test 7: Manual search simulation
console.log('\n=== Manual Search Simulation ===');
const query = 'bengaluru';
const manualResults = allListings.filter(listing => {
  const searchableText = [
    listing.description || '',
    listing.property_type || '',
    typeof listing.location === 'object' ? JSON.stringify(listing.location) : (listing.location || ''),
    typeof listing.price === 'object' ? JSON.stringify(listing.price) : (listing.price || ''),
    typeof listing.area === 'object' ? JSON.stringify(listing.area) : (listing.area || ''),
    listing.contact_phone || '',
    (listing.amenities || []).join(' ')
  ].join(' ').toLowerCase();
  
  return searchableText.includes(query);
});
console.log(`🔧 Manual filter for "bengaluru" → ${manualResults.length} results`);

console.log('\n=== Summary ===');
console.log(`Total listings: ${allListings.length}`);
console.log(`Bengaluru properties (raw): ${bengaluruListings.length}`);
console.log(`Search function result: ${searchListings('Bengaluru').length}`);
console.log(`Manual filter result: ${manualResults.length}`);
