// Simple test to see what the search API actually returns
async function testSearchAPI() {
  console.log('🔍 Testing search API directly...\n');

  try {
    const testQueries = [
      'apartment',
      'bengaluru',
      'koramangala',
      '2 bhk'
    ];

    for (const query of testQueries) {
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
      console.log(`Total: ${data.total || 0}`);
      
      if (data.results && data.results.length > 0) {
        console.log('First result sample:', {
          id: data.results[0].id,
          property_type: data.results[0].property_type,
          location: data.results[0].location,
          status: data.results[0].status
        });
      }
    }

  } catch (error) {
    console.error('Test error:', error);
  }
}

testSearchAPI();
