# DeepSeek API Setup Guide

## 🚀 How to Set Up DeepSeek API for Word Suggestions

### Step 1: Get Your DeepSeek API Key

1. Visit [DeepSeek Platform](https://platform.deepseek.com/)
2. Sign up or log in to your account
3. Navigate to the API section
4. Create a new API key
5. Copy your API key

### Step 2: Configure Your API Key

1. Open `config.js` in your project
2. Replace `YOUR_DEEPSEEK_API_KEY` with your actual API key:

```javascript
const DEEPSEEK_CONFIG = {
    apiKey: 'sk-your-actual-api-key-here', // Replace with your actual API key
    apiUrl: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat',
    maxTokens: 50,
    temperature: 0.7
};
```

### Step 3: Test the Integration

1. Open `index.html` in your browser
2. Start typing letters
3. After typing 2+ characters, you should see word suggestions appear below the current letter
4. Click on any suggestion to select it

## 🎯 Features

- **Smart Word Suggestions**: AI-powered word completion based on your typed letters
- **Fallback System**: If API fails, uses local word suggestions
- **Click to Select**: Click any suggested word to use it
- **Auto-hide**: Suggestions disappear when you press space or backspace
- **Debounced Requests**: Waits 500ms after you stop typing before requesting suggestions

## 🔧 Troubleshooting

### If suggestions don't appear:
1. Check your API key in `config.js`
2. Open browser console (F12) to see any error messages
3. Ensure you have internet connection
4. Verify your DeepSeek account has API credits

### If API requests fail:
- The system will automatically fall back to local word suggestions
- Check the browser console for detailed error messages

## 💡 Usage Tips

- Type at least 2 characters to see suggestions
- Suggestions appear after a 500ms delay
- Click any suggestion to select it
- Press space to move to the next word
- Press backspace to edit your current word

Enjoy your AI-enhanced calm typing experience! 🌊✨
