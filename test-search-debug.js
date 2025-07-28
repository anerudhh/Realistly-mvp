async function testSearchAPI() {
    console.log('🔍 Testing search API with debugging...');
    
    const tests = [
        { query: "koramangala", expected: "Should return only Koramangala properties" },
        { query: "property in mars", expected: "Should return 0 results" }
    ];
    
    for (const test of tests) {
        console.log(`\n=== Testing query: "${test.query}" ===`);
        
        try {
            const response = await fetch('http://localhost:3000/api/search-fixed', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: test.query
                })
            });
            
            const data = await response.json();
            
            console.log(`Results: ${data.results?.length || 0}`);
            console.log(`Expected: ${test.expected}`);
            
            if (data.results && data.results.length > 0) {
                const locations = data.results.slice(0, 4).map(r => r.location?.area || 'Not specified');
                console.log('Sample locations found:', locations);
                
                if (test.query === "koramangala") {
                    const relevantResults = data.results.filter(r => 
                        r.location?.area?.toLowerCase().includes('koramangala')
                    ).length;
                    console.log(`✅ Relevant results: ${relevantResults}/${data.results.length}`);
                    if (relevantResults < data.results.length) {
                        console.log('⚠️ PROBLEM: Non-Koramangala results found!');
                    }
                } else if (test.query.includes("mars") || test.query.includes("pluto")) {
                    console.log('⚠️ PROBLEM: Found results for non-existent location!');
                }
            } else {
                console.log('✅ No results found (as expected for non-existent locations)');
            }
            
        } catch (error) {
            console.error(`❌ Error testing "${test.query}":`, error.message);
        }
    }
}

testSearchAPI();
