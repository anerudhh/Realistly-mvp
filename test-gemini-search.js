// Test if Gemini API is working with the search query processing
const { processSearchQuery } = require('./utils/ai-processor');

async function testGeminiSearch() {
  console.log('🧠 Testing Gemini search processing...\n');

  const testQueries = [
    'koramangala',
    'property in mars',
    'apartment in bengaluru'
  ];

  for (const query of testQueries) {
    console.log(`=== Testing query: "${query}" ===`);
    try {
      const result = await processSearchQuery(query);
      console.log('Processed result:', JSON.stringify(result, null, 2));
    } catch (error) {
      console.log('❌ Error:', error.message);
    }
    console.log('');
  }
}

testGeminiSearch();
