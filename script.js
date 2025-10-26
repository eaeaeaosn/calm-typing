// API Configuration
const API_BASE = window.location.origin;

class CalmTyping {
    constructor() {
        this.currentLetter = document.getElementById('currentLetter');
        this.wordSuggestion = document.getElementById('wordSuggestion');
        this.wordHistory = document.getElementById('wordHistory');
        this.historyList = document.getElementById('historyList');
        this.sentenceContainer = document.getElementById('sentenceContainer');
        this.backgroundMusic = document.getElementById('backgroundMusic');
        this.musicToggle = document.getElementById('musicToggle');
        this.typingInput = document.getElementById('typingInput');
        
        // Audio settings and state
        this.defaultAudioSources = {
            forest: 'Audios/the-sound-of-a-mountain-stream-_nature-sound-201930.mp3',
            ocean: 'Audios/ocean-waves-376898.mp3',
            mountain: 'Audios/15-minutes-of-rain-sound-for-relaxation-and-sleep-study-312863.mp3'
        };
        
        this.customAudioSources = {
            forest: null,
            ocean: null,
            mountain: null
        };

        // Load custom audio assignments from localStorage
        this.loadAudioSettings();
        
        this.typedLetters = [];
        this.typedWords = [];
        this.typedSentences = [];
        this.currentSentence = [];
        this.isHistoryVisible = false;
        this.isMusicPlaying = false;
        this.currentText = '';
        this.suggestionTimeout = null;
        
        // DeepSeek API configuration
        this.deepseekApiKey = typeof DEEPSEEK_CONFIG !== 'undefined' ? DEEPSEEK_CONFIG.apiKey : 'YOUR_DEEPSEEK_API_KEY';
        this.deepseekApiUrl = typeof DEEPSEEK_CONFIG !== 'undefined' ? DEEPSEEK_CONFIG.apiUrl : 'https://api.deepseek.com/v1/chat/completions';
        
        this.init();
    }
    
    loadAudioSettings() {
        try {
            const savedSettings = localStorage.getItem('customAudioSettings');
            if (savedSettings) {
                this.customAudioSources = JSON.parse(savedSettings);
            }
        } catch (e) {
            console.warn('Failed to load audio settings:', e);
        }
    }

    saveAudioSettings() {
        try {
            localStorage.setItem('customAudioSettings', JSON.stringify(this.customAudioSources));
        } catch (e) {
            console.warn('Failed to save audio settings:', e);
        }
    }

    init() {
        this.setupEventListeners();
        this.startBackgroundMusic();
        // Focus management: prefer input if present, otherwise focus body
        if (this.typingInput) {
            this.typingInput.focus();
        } else {
            document.body.focus();
            document.body.tabIndex = -1;
        }
        // Configure fish effect if available
        if (window.FishFX && typeof FishFX.config === 'function') {
            FishFX.config({
                maxConcurrency: 15,
                fishEmojis: ['🐠', '🐟', '🐡'],
                birdEmojis: ['🐦', '🦜', '🕊️'],
                forestEmojis: ['🦔', '🐿️', '🦨'],
                peacockEmoji: '🦚',
                eagleEmoji: '🦅',
                sharkEmoji: '🦈'
            });
        }
    }
    
    setupEventListeners() {
        // Global keyboard events
        document.addEventListener('keydown', (e) => {
            this.handleKeyDown(e);
        });
        
        // Music toggle
        this.musicToggle.addEventListener('click', () => {
            this.toggleMusic();
        });
        
        // Click outside to hide history
        document.addEventListener('click', (e) => {
            if (!this.wordHistory.contains(e.target)) {
                this.hideHistory();
            }
        });

        // Audio upload and UI events
        const audioUploadFile = document.getElementById('audio-upload-file');
        const audioUploadUrl = document.getElementById('audio-upload-url');
        const audioAssignBtn = document.getElementById('audio-assign-btn');
        const audioRemoveBtn = document.getElementById('audio-remove-btn');
        const audioBgSelect = document.getElementById('audio-bg-select');

        if (audioUploadFile) {
            audioUploadFile.addEventListener('change', (e) => this.handleAudioFileUpload(e));
        }
        if (audioAssignBtn) {
            audioAssignBtn.addEventListener('click', () => this.assignCustomAudio());
        }
        if (audioRemoveBtn) {
            audioRemoveBtn.addEventListener('click', () => this.removeCustomAudio());
        }
        if (audioBgSelect) {
            audioBgSelect.addEventListener('change', () => this.updateAudioCurrentLabel());
        }
    }
    
    handleKeyDown(e) {
        // Handle special keys
        switch(e.key) {
            case 'Tab':
                e.preventDefault();
                this.toggleHistory();
                break;
            case 'Enter':
                e.preventDefault();
                this.handleEnter();
                break;
            case 'Escape':
                this.hideHistory();
                break;
            case 'Backspace':
                e.preventDefault();
                this.handleBackspace();
                break;
            case ' ':
                e.preventDefault();
                this.handleSpace();
                break;
            default:
                // Handle regular letter input
                if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
                    this.handleLetter(e.key);
                }
                break;
        }
        if (window.FishFX) window.FishFX.onKeydown(e);
    }
    
    handleLetter(letter) {
        this.currentText += letter;
        this.displayCurrentLetter(letter);
        this.typedLetters.push(letter);
        this.playTypingSound();
    }
    
    handleBackspace() {
        if (this.currentText.length > 0) {
            this.currentText = this.currentText.slice(0, -1);
            this.typedLetters.pop();
            
            if (this.currentText.length > 0) {
                const lastLetter = this.currentText.slice(-1);
                this.displayCurrentLetter(lastLetter);
            } else {
                this.clearCurrentLetter();
            }
        }
    }
    
    async handleSpace() {
        if (this.currentText.trim()) {
            // Auto-correct the word before saving
            const correctedWord = await this.autoCorrectWord(this.currentText.trim());
            this.currentSentence.push(correctedWord);
            this.typedWords.push(correctedWord);
            this.currentText = '';
            this.clearCurrentLetter();
            this.hideWordSuggestions();
        }
    }
    
    displayCurrentLetter(letter) {
        this.currentLetter.textContent = letter.toUpperCase();
        this.currentLetter.style.opacity = '1';
        this.currentLetter.style.transform = 'scale(1)';
    }
    
    clearCurrentLetter() {
        this.currentLetter.style.opacity = '0';
        this.currentLetter.style.transform = 'scale(0.8)';
    }
    
    // Auto-correction methods
    async autoCorrectWord(word) {
        console.log('Auto-correcting word:', word);
        
        // Check if API key is set
        if (this.deepseekApiKey === 'YOUR_DEEPSEEK_API_KEY' || !this.deepseekApiKey) {
            console.log('DeepSeek API key not configured, using local correction');
            return this.getLocalCorrection(word);
        }
        
        try {
            console.log('Calling DeepSeek API for correction...');
            const correctedWord = await this.callDeepSeekCorrection(word);
            console.log('DeepSeek correction:', correctedWord);
            return correctedWord;
        } catch (error) {
            console.log('DeepSeek API error:', error);
            console.log('Falling back to local correction');
            return this.getLocalCorrection(word);
        }
    }
    
    async callDeepSeekCorrection(word) {
        const response = await fetch(this.deepseekApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.deepseekApiKey}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'user',
                        content: `Analyze this word: "${word}". 
                        1. If it's a curse word, profanity, or inappropriate language, replace it with a cute kaomoji (like (╯°□°）╯︵ ┻━┻ or (╯︵╰,) or ٩(◕‿◕)۶)
                        2. If it's a misspelled normal word, correct it to proper English
                        3. If it's already correct, return it unchanged
                        Return only the result, nothing else.`
                    }
                ],
                max_tokens: 30,
                temperature: 0.3
            })
        });
        
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }
        
        const data = await response.json();
        const correctedWord = data.choices[0].message.content.trim();
        
        return correctedWord || word; // Return original if correction fails
    }
    
    getKaomojiForCurseWord(word) {
        // Curse word detection and kaomoji replacement
        const curseWords = {
            'shit': '(╯°□°）╯︵ ┻━┻',
            'fuck': '(╯︵╰,)',
            'damn': '٩(◕‿◕)۶',
            'hell': '(╯°□°）╯︵ ┻━┻',
            'bitch': '(╯︵╰,)',
            'ass': '(╯°□°）╯︵ ┻━┻',
            'crap': '(╯︵╰,)',
            'piss': '٩(◕‿◕)۶',
            'dick': '(╯°□°）╯︵ ┻━┻',
            'cock': '(╯︵╰,)',
            'pussy': '٩(◕‿◕)۶',
            'fag': '(╯°□°）╯︵ ┻━┻',
            'gay': '(╯︵╰,)',
            'retard': '٩(◕‿◕)۶',
            'stupid': '(╯°□°）╯︵ ┻━┻',
            'idiot': '(╯︵╰,)',
            'moron': '٩(◕‿◕)۶',
            'bastard': '(╯°□°）╯︵ ┻━┻',
            'whore': '(╯︵╰,)',
            'slut': '٩(◕‿◕)۶',
            'bitch': '(╯°□°）╯︵ ┻━┻',
            'fucking': '(╯︵╰,)',
            'shitty': '٩(◕‿◕)۶',
            'damned': '(╯°□°）╯︵ ┻━┻',
            'hellish': '(╯︵╰,)',
            'cursed': '٩(◕‿◕)۶',
            'fucked': '(╯°□°）╯︵ ┻━┻',
            'shitted': '(╯︵╰,)',
            'damning': '٩(◕‿◕)۶'
        };
        
        const lowerWord = word.toLowerCase();
        return curseWords[lowerWord] || null;
    }
    
    getLocalCorrection(word) {
        // First check for curse words
        const kaomoji = this.getKaomojiForCurseWord(word);
        if (kaomoji) {
            console.log('Local curse word detected, converting to kaomoji:', word, '->', kaomoji);
            return kaomoji;
        }
        
        // Check if word is already correct (common words)
        const commonWords = [
            'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'man', 'men', 'put', 'say', 'she', 'too', 'use', 'want', 'been', 'call', 'come', 'does', 'each', 'find', 'give', 'good', 'have', 'here', 'just', 'know', 'like', 'long', 'look', 'make', 'many', 'more', 'most', 'much', 'name', 'need', 'only', 'over', 'part', 'place', 'right', 'said', 'same', 'seem', 'should', 'small', 'still', 'such', 'take', 'than', 'them', 'there', 'these', 'they', 'this', 'time', 'very', 'well', 'were', 'what', 'when', 'where', 'which', 'while', 'will', 'with', 'work', 'would', 'write', 'your', 'about', 'after', 'again', 'before', 'below', 'between', 'during', 'except', 'inside', 'outside', 'through', 'under', 'within', 'without'
        ];
        
        if (commonWords.includes(word.toLowerCase())) {
            console.log('Word is already correct:', word);
            return word;
        }
        
        // Simple local correction using common misspellings
        const corrections = {
            // Common misspellings
            'teh': 'the',
            'adn': 'and',
            'taht': 'that',
            'recieve': 'receive',
            'seperate': 'separate',
            'occured': 'occurred',
            'definately': 'definitely',
            'accomodate': 'accommodate',
            'begining': 'beginning',
            'beleive': 'believe',
            'calender': 'calendar',
            'cemetary': 'cemetery',
            'concious': 'conscious',
            'existance': 'existence',
            'goverment': 'government',
            'independant': 'independent',
            'occassion': 'occasion',
            'priviledge': 'privilege',
            'rythm': 'rhythm',
            'thier': 'their',
            'untill': 'until',
            'wich': 'which',
            'writting': 'writing',
            'youself': 'yourself',
            'acheive': 'achieve',
            'becuase': 'because',
            'comming': 'coming',
            'differnt': 'different',
            'enviroment': 'environment',
            'finnally': 'finally',
            'frend': 'friend',
            'grate': 'great',
            'happend': 'happened',
            'immediatly': 'immediately',
            'knowlege': 'knowledge',
            'lenght': 'length',
            'mispell': 'misspell',
            'neccessary': 'necessary',
            'occured': 'occurred',
            'publically': 'publicly',
            'recieve': 'receive',
            'seperate': 'separate',
            'succesful': 'successful',
            'thier': 'their',
            'untill': 'until',
            'wich': 'which',
            'writting': 'writing'
        };
        
        const corrected = corrections[word.toLowerCase()] || word;
        console.log('Local correction:', word, '->', corrected);
        return corrected;
    }
    
    hideWordSuggestions() {
        this.wordSuggestion.classList.remove('show');
        this.wordSuggestion.innerHTML = '';
    }
    
    toggleHistory() {
        if (this.isHistoryVisible) {
            this.hideHistory();
        } else {
            this.showHistory();
        }
    }
    
    showHistory() {
        this.wordHistory.classList.remove('hidden');
        this.isHistoryVisible = true;
        this.updateHistoryDisplay();
    }
    
    hideHistory() {
        this.wordHistory.classList.add('hidden');
        this.isHistoryVisible = false;
    }
    
    updateHistoryDisplay() {
        this.historyList.innerHTML = '';
        
        if (this.typedWords.length === 0 && this.typedSentences.length === 0) {
            this.historyList.innerHTML = '<p style="color: rgba(255,255,255,0.6); font-style: italic;">No words typed yet...</p>';
            return;
        }
        
        // Show recent words (last 15)
        if (this.typedWords.length > 0) {
            const recentWords = this.typedWords.slice(-15);
            recentWords.forEach((word, index) => {
                const wordElement = document.createElement('div');
                wordElement.className = 'history-item';
                wordElement.textContent = `${index + 1}. ${word}`;
                this.historyList.appendChild(wordElement);
            });
        }
        
        // Show recent sentences (last 5)
        if (this.typedSentences.length > 0) {
            const recentSentences = this.typedSentences.slice(-5);
            recentSentences.forEach((sentence, index) => {
                const sentenceElement = document.createElement('div');
                sentenceElement.className = 'history-item sentence-item';
                sentenceElement.style.fontStyle = 'italic';
                sentenceElement.style.marginTop = '10px';
                sentenceElement.textContent = `"${sentence}"`;
                this.historyList.appendChild(sentenceElement);
            });
        }
    }
    
    async handleEnter() {
        if (this.currentSentence.length > 0 || this.currentText.trim()) {
            // Add current text to sentence if it exists (with auto-correction)
            if (this.currentText.trim()) {
                const correctedWord = await this.autoCorrectWord(this.currentText.trim());
                this.currentSentence.push(correctedWord);
                this.typedWords.push(correctedWord);
            }
            
            // Create sentence animation
            const fullSentence = this.currentSentence.join(' ');
            if (fullSentence.trim()) {
                this.typedSentences.push(fullSentence);
                this.animateSentence(fullSentence);
                
                // Save passage to cloud storage
                await this.savePassageToCloud(fullSentence);
            }
            
            // Clear everything
            this.currentText = '';
            this.currentSentence = [];
            this.clearCurrentLetter();
            this.hideWordSuggestions();
            
            // Add gentle typing sound effect
            this.playTypingSound();
        }
    }
    
    animateSentence(sentence) {
        const sentenceElement = document.createElement('div');
        sentenceElement.className = 'sentence-item';
        sentenceElement.textContent = sentence;
        
        // Random vertical position
        const randomY = Math.random() * 200 - 100; // -100px to 100px from center
        sentenceElement.style.top = `${randomY}px`;
        
        this.sentenceContainer.appendChild(sentenceElement);
        
        // Remove element after animation
        setTimeout(() => {
            if (sentenceElement.parentNode) {
                sentenceElement.parentNode.removeChild(sentenceElement);
            }
        }, 8000);
    }
    
    handleAudioFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Create object URL for the uploaded file
        const audioUrl = URL.createObjectURL(file);
        const selectedBg = document.getElementById('audio-bg-select').value;
        
        if (selectedBg !== 'none') {
            this.customAudioSources[selectedBg] = audioUrl;
            this.saveAudioSettings();
            this.updateAudioCurrentLabel();
            
            // If this background is currently active, update the audio
            if (this.currentBackground === this.getBackgroundIndex(selectedBg)) {
                this.updateBackgroundAudio();
            }
        }
    }

    assignCustomAudio() {
        const urlInput = document.getElementById('audio-upload-url');
        const selectedBg = document.getElementById('audio-bg-select').value;
        
        if (selectedBg !== 'none' && urlInput.value) {
            // Validate URL
            try {
                new URL(urlInput.value);
                this.customAudioSources[selectedBg] = urlInput.value;
                this.saveAudioSettings();
                this.updateAudioCurrentLabel();
                
                // If this background is currently active, update the audio
                if (this.currentBackground === this.getBackgroundIndex(selectedBg)) {
                    this.updateBackgroundAudio();
                }
                
                urlInput.value = ''; // Clear input after successful assignment
            } catch (e) {
                alert('Please enter a valid URL');
            }
        }
    }

    removeCustomAudio() {
        const selectedBg = document.getElementById('audio-bg-select').value;
        if (selectedBg !== 'none') {
            this.customAudioSources[selectedBg] = null;
            this.saveAudioSettings();
            this.updateAudioCurrentLabel();
            
            // If this background is currently active, revert to default audio
            if (this.currentBackground === this.getBackgroundIndex(selectedBg)) {
                this.updateBackgroundAudio();
            }
        }
    }

    getBackgroundIndex(name) {
        switch (name) {
            case 'forest': return 1;
            case 'ocean': return 2;
            case 'mountain': return 3;
            default: return 0;
        }
    }

    getBackgroundName(index) {
        switch (index) {
            case 1: return 'forest';
            case 2: return 'ocean';
            case 3: return 'mountain';
            default: return 'none';
        }
    }

    updateAudioCurrentLabel() {
        const selectedBg = document.getElementById('audio-bg-select').value;
        const label = document.getElementById('audio-current-label');
        
        if (selectedBg === 'none') {
            label.textContent = 'Select a background to manage its music.';
            return;
        }
        
        if (this.customAudioSources[selectedBg]) {
            label.textContent = 'Custom music assigned to ' + selectedBg;
        } else {
            label.textContent = 'Using default music for ' + selectedBg;
        }
    }

    updateBackgroundAudio() {
        const bgName = this.getBackgroundName(this.currentBackground);
        const audioSrc = this.customAudioSources[bgName] || this.defaultAudioSources[bgName];
        
        if (this.backgroundMusic && audioSrc) {
            const wasPlaying = !this.backgroundMusic.paused;
            this.backgroundMusic.src = audioSrc;
            if (wasPlaying) {
                this.backgroundMusic.play().catch(console.error);
            }
        }
    }

    startBackgroundMusic() {
        // Update audio source based on current background
        this.updateBackgroundAudio();
        
        if (this.backgroundMusic) {
            this.backgroundMusic.volume = 0.3;
            this.backgroundMusic.play().catch(() => {
                console.log('Autoplay prevented. Click the music button to enable sound.');
            });
        }
    }
    
    toggleMusic() {
        if (this.isMusicPlaying) {
            this.backgroundMusic.pause();
            this.musicToggle.textContent = '🔇';
            this.musicToggle.classList.add('muted');
            this.isMusicPlaying = false;
        } else {
            this.backgroundMusic.play().then(() => {
                this.musicToggle.textContent = '🔊';
                this.musicToggle.classList.remove('muted');
                this.isMusicPlaying = true;
            }).catch(() => {
                console.log('Could not play music. User interaction required.');
            });
        }
    }
    
    playTypingSound() {
        // Create a gentle typing sound using Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    }
    
    // Save passage to cloud storage (user-specific)
    async savePassageToCloud(sentence) {
        try {
            console.log('Saving passage to cloud:', sentence);
            
            // Get current timestamp
            const timestamp = new Date().toISOString();
            
            // Create history entry
            const historyEntry = {
                text: sentence,
                timestamp: timestamp,
                wordCount: sentence.split(' ').length
            };
            
            // Check authentication status from localStorage
            const authToken = localStorage.getItem('authToken');
            const guestId = localStorage.getItem('guestId');
            const isAuthenticated = authToken && localStorage.getItem('user');
            
            console.log('Save status - Auth:', isAuthenticated, 'Guest:', guestId);
            
            if (isAuthenticated) {
                // Save to authenticated user's history
                await this.saveToUserHistory(historyEntry, authToken);
            } else if (guestId) {
                // Save to guest session
                await this.saveToGuestHistory(historyEntry, guestId);
            } else {
                console.log('No authentication found, saving locally only');
                // Save to local storage as fallback
                this.saveToLocalHistory(historyEntry);
            }
        } catch (error) {
            console.error('Error saving passage to cloud:', error);
            // Fallback to local storage
            this.saveToLocalHistory({
                text: sentence,
                timestamp: new Date().toISOString(),
                wordCount: sentence.split(' ').length
            });
        }
    }
    
    // Save to authenticated user's history
    async saveToUserHistory(historyEntry, authToken) {
        try {
            const response = await fetch(`${API_BASE}/api/user/history`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(historyEntry)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('User history saved:', result);
        } catch (error) {
            console.error('Error saving to user history:', error);
            throw error;
        }
    }
    
    // Save to guest session history
    async saveToGuestHistory(historyEntry, guestId) {
        try {
            const response = await fetch(`${API_BASE}/api/guest/history`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-guest-id': guestId
                },
                body: JSON.stringify(historyEntry)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Guest history saved:', result);
        } catch (error) {
            console.error('Error saving to guest history:', error);
            throw error;
        }
    }
    
    // Save to local storage as fallback
    saveToLocalHistory(historyEntry) {
        try {
            const existingHistory = JSON.parse(localStorage.getItem('typingHistory') || '[]');
            existingHistory.push(historyEntry);
            
            // Keep only last 100 entries to prevent storage bloat
            if (existingHistory.length > 100) {
                existingHistory.splice(0, existingHistory.length - 100);
            }
            
            localStorage.setItem('typingHistory', JSON.stringify(existingHistory));
            console.log('History saved to local storage');
        } catch (error) {
            console.error('Error saving to local storage:', error);
        }
    }
    
    // Load user's writing history
    async loadUserHistory() {
        try {
            let history = [];
            
            if (typeof isAuthenticated !== 'undefined' && isAuthenticated && typeof authToken !== 'undefined' && authToken) {
                // Load from authenticated user's history
                const response = await fetch(`${API_BASE}/api/user/history`, {
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    }
                });
                
                if (response.ok) {
                    const result = await response.json();
                    history = result.history || [];
                }
            } else if (typeof guestId !== 'undefined' && guestId) {
                // Load from guest session
                const response = await fetch(`${API_BASE}/api/guest/history`, {
                    headers: {
                        'x-guest-id': guestId
                    }
                });
                
                if (response.ok) {
                    const result = await response.json();
                    history = result.history || [];
                }
            } else {
                // Load from local storage
                history = JSON.parse(localStorage.getItem('typingHistory') || '[]');
            }
            
            return history;
        } catch (error) {
            console.error('Error loading user history:', error);
            // Return empty array for security - no fallback to shared localStorage
            return [];
        }
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new CalmTyping();
});

// Add some calming particle effects
class OceanParticles {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        
        this.setupCanvas();
        this.createParticles();
        this.animate();
    }
    
    setupCanvas() {
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '0';
        document.body.appendChild(this.canvas);
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    createParticles() {
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 3 + 1,
                speedX: (Math.random() - 0.5) * 0.5,
                speedY: (Math.random() - 0.5) * 0.5,
                opacity: Math.random() * 0.5 + 0.2
            });
        }
    }
    
    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.particles.forEach(particle => {
            particle.x += particle.speedX;
            particle.y += particle.speedY;
            
            // Wrap around screen
            if (particle.x < 0) particle.x = this.canvas.width;
            if (particle.x > this.canvas.width) particle.x = 0;
            if (particle.y < 0) particle.y = this.canvas.height;
            if (particle.y > this.canvas.height) particle.y = 0;
            
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(255, 255, 255, ${particle.opacity})`;
            this.ctx.fill();
        });
        
        requestAnimationFrame(() => this.animate());
    }
}

// Initialize particles
document.addEventListener('DOMContentLoaded', () => {
    new OceanParticles();
});

// Rotate table: cycle through multiple themes (5 colors) and rotate button each click
(function(){
  const rotateBtn = document.getElementById('rotateTable');
  if (!rotateBtn) return;

  const themes = ['blue', 'yellow', 'green', 'purple', 'coral'];
  let currentIndex = 0;
  let rotationAngle = 0;
  const step = 360 / themes.length; // 72 degrees for 5 themes

  // initialize default theme
  document.body.classList.add(`theme-${themes[currentIndex]}`);

  // ensure smooth rotation transition
  rotateBtn.style.transition = 'transform 0.6s cubic-bezier(.2,.8,.2,1)';

  rotateBtn.addEventListener('click', () => {
    // advance theme index
    currentIndex = (currentIndex + 1) % themes.length;

    // remove all theme classes then add the new one
    themes.forEach(t => document.body.classList.remove(`theme-${t}`));
    document.body.classList.add(`theme-${themes[currentIndex]}`);

    // rotate the button cumulatively
    rotationAngle = (rotationAngle + step) % 360;
    rotateBtn.style.transform = `rotate(${rotationAngle}deg)`;
  });
})();
