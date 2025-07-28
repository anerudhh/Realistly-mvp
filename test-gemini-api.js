const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGeminiAPI() {
    const apiKey = 'AIzaSyDn7KaksqqOkiMaiNFI8hOXAhSA9oUemYY';
    
    console.log('Testing Gemini API with key:', apiKey);
    
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        const prompt = 'Hello, are you working?';
        console.log('Sending test prompt:', prompt);
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        console.log('✅ Gemini API is working!');
        console.log('Response:', text);
        
    } catch (error) {
        console.log('❌ Gemini API failed:', error.message);
        console.log('Error details:', error);
    }
}

testGeminiAPI();
