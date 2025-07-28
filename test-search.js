// Test script to debug search functionality
const { searchListings } = require('./utils/file-storage');

async function testSearch() {
  console.log('Testing search for "bannerghatta"...');
  
  try {
    const results = await searchListings('bannerghatta');
    console.log('Search results:', results.length);
    
    if (results.length > 0) {
      console.log('Found results (this should be empty):');
      results.forEach((result, index) => {
        console.log(`${index + 1}. ${result.property_type} in ${JSON.stringify(result.location)}`);
      });
    } else {
      console.log('No results found (this is correct!)');
    }
  } catch (error) {
    console.error('Error during search:', error);
  }
}

testSearch();
