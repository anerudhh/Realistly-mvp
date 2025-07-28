// Test search for non-existent properties
async function testNonExistentSearch() {
  console.log('🔍 Testing search for non-existent properties...\n');

  try {
    const nonExistentQueries = [
      'property in mars',
      'house in atlantis',
      'apartment in pluto',
      'villa in xyz123 location',
      'castle in wonderland'
    ];

    for (const query of nonExistentQueries) {
      console.log(`\n=== Testing query: "${query}" ===`);
      
      const response = await fetch('http://localhost:3003/api/search-fixed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        console.error(`Error: ${response.status} ${response.statusText}`);
        continue;
      }

      const data = await response.json();
      console.log(`Results: ${data.results?.length || 0}`);
      
      if (data.results && data.results.length > 0) {
        console.log('⚠️ PROBLEM: Found results for non-existent location!');
        console.log('Sample results:');
        data.results.slice(0, 3).forEach((result, index) => {
          console.log(`${index + 1}. ${result.property_type} in ${JSON.stringify(result.location)}`);
        });
      } else {
        console.log('✅ Correctly returned no results');
      }
    }

  } catch (error) {
    console.error('Test error:', error);
  }
}

testNonExistentSearch();
