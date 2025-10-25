// DeepSeek API Configuration
// Replace 'YOUR_DEEPSEEK_API_KEY' with your actual DeepSeek API key
// Get your API key from: https://platform.deepseek.com/

const DEEPSEEK_CONFIG = {
    apiKey: 'sk-ac8a74958695407982c793531636cb29', // Your DeepSeek API key
    apiUrl: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat',
    maxTokens: 50,
    temperature: 0.7
};

// Export for use in main script
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DEEPSEEK_CONFIG;
}
