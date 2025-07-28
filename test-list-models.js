const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listAvailableModels() {
    const apiKey = 'AIzaSyDn7KaksqqOkiMaiNFI8hOXAhSA9oUemYY';
    
    console.log('Listing available Gemini models...');
    
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        
        // List all available models
        const models = await genAI.listModels();
        
        console.log('✅ Available models:');
        models.forEach(model => {
            console.log(`- ${model.name} (${model.supportedGenerationMethods?.join(', ') || 'No methods listed'})`);
        });
        
    } catch (error) {
        console.log('❌ Failed to list models:', error.message);
        console.log('Error details:', error);
    }
}

listAvailableModels();
