// Test Gemini API and search accuracy
async function testSearchIssues() {
  console.log('🔍 Testing search issues...\n');

  try {
    const testQueries = [
      'koramangala',          // Should return only Koramangala properties
      'property in mars',     // Should return 0 results
      'apartment in pluto',   // Should return 0 results
      'bengaluru'            // Should return Bengaluru properties
    ];

    for (const query of testQueries) {
      console.log(`\n=== Testing query: "${query}" ===`);
      
      const response = await fetch('http://localhost:3002/api/search-fixed', {
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
        console.log('Sample locations found:');
        const locations = [...new Set(data.results.slice(0, 5).map(r => 
          typeof r.location === 'object' ? r.location.area : r.location
        ))];
        console.log(locations);
        
        // Check if results match the query
        if (query === 'koramangala') {
          const koramangalaResults = data.results.filter(r => 
            (typeof r.location === 'object' && r.location.area?.toLowerCase().includes('koramangala')) ||
            (typeof r.location === 'string' && r.location.toLowerCase().includes('koramangala'))
          );
          console.log(`✅ Relevant results: ${koramangalaResults.length}/${data.results.length}`);
          if (koramangalaResults.length < data.results.length) {
            console.log('⚠️ PROBLEM: Non-Koramangala results found!');
          }
        }
        
        if (query.includes('mars') || query.includes('pluto')) {
          console.log('⚠️ PROBLEM: Found results for non-existent location!');
        }
      } else {
        console.log('✅ No results returned');
      }
    }

  } catch (error) {
    console.error('Test error:', error);
  }
}

testSearchIssues();
