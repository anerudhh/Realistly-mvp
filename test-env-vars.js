// Test environment variables in Node.js
require('dotenv').config({ path: '.env.local' });

console.log('Environment variables test:');
console.log('GOOGLE_GENERATIVE_AI_API_KEY:', process.env.GOOGLE_GENERATIVE_AI_API_KEY ? 'Present' : 'Missing');
console.log('Key length:', process.env.GOOGLE_GENERATIVE_AI_API_KEY?.length || 0);

// Now test the AI processor
const { processSearchQuery } = require('./utils/ai-processor');

async function testWithEnv() {
  console.log('\n🧠 Testing with environment loaded...\n');
  
  const result = await processSearchQuery('koramangala');
  console.log('Result:', JSON.stringify(result, null, 2));
}

testWithEnv();
