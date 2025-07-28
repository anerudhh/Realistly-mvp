// Test the actual search API endpoint
const testSearchAPI = async (query) => {
  try {
    console.log(`Testing API search for: "${query}"`);
    
    const response = await fetch('http://localhost:3003/api/search-fixed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        query: query,
        listingType: '',
        propertyType: '',
        bhk: ''
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`API returned ${data.results?.length || 0} results`);
    console.log('First few results:');
    
    if (data.results && data.results.length > 0) {
      data.results.slice(0, 3).forEach((result, index) => {
        console.log(`${index + 1}. ${result.property_type} in ${JSON.stringify(result.location)} (ID: ${result.id})`);
      });
    }
    
    return data;
  } catch (error) {
    console.error(`API test failed:`, error);
    return null;
  }
};

// Test various searches
const testQueries = ['Bengaluru', 'apartment', 'BHK'];

(async () => {
  for (const query of testQueries) {
    await testSearchAPI(query);
    console.log('---');
  }
})();
