import { processSearchQuery } from './utils/ai-processor.js';

async function testAIProcessing() {
  console.log('🤖 Testing AI search processing...\n');

  try {
    const queries = [
      'property in mars',
      'house in atlantis', 
      'apartment in koramangala',
      'villa in whitefield'
    ];

    for (const query of queries) {
      console.log(`\n=== Testing AI processing for: "${query}" ===`);
      
      const searchParams = await processSearchQuery(query);
      console.log('AI extracted parameters:', JSON.stringify(searchParams, null, 2));
    }

  } catch (error) {
    console.error('AI processing test error:', error);
  }
}

testAIProcessing();
