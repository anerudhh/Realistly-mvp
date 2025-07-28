import { searchListings, getAllListings } from './utils/file-storage.js';

console.log('=== Debugging filtered search ===');

// Get all listings first
const allListings = getAllListings();
console.log(`Total listings: ${allListings.length}`);

// Count by listing type
const byType = {};
allListings.forEach(listing => {
  const type = listing.listingType || 'undefined';
  byType[type] = (byType[type] || 0) + 1;
});
console.log('Listings by type:', byType);

// Test exact filters
console.log('\n=== Test rent filter ===');
const rentResults = searchListings({
  query: '',
  listingType: 'rent'
});
console.log(`Rent filter found ${rentResults.length} results`);

console.log('\n=== Test sale filter ===');
const saleResults = searchListings({
  query: '',
  listingType: 'sale'
});
console.log(`Sale filter found ${saleResults.length} results`);

console.log('\n=== Test apartment + sale ===');
const apartmentSaleResults = searchListings({
  query: '',
  listingType: 'sale',
  propertyType: 'apartment'
});
console.log(`Apartment + Sale filter found ${apartmentSaleResults.length} results`);

// Show what apartment properties we have for sale
console.log('\n=== Available apartments for sale ===');
const apartments = allListings.filter(l => 
  l.property_type === 'apartment' && l.listingType === 'sale'
);
console.log(`Found ${apartments.length} apartments for sale:`);
apartments.forEach(apt => {
  console.log(`- ${apt.property_type} in ${JSON.stringify(apt.location)} (${apt.listingType})`);
});
