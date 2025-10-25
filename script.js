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
    
    init() {
        this.setupEventListeners();
        this.startBackgroundMusic();
        this.initializeCloudSync();
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
                fishEmojis: ['🐠', '🐟', '🐡']
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
    
    startBackgroundMusic() {
        // Try to play background music (will be muted by default due to browser autoplay policies)
        this.backgroundMusic.volume = 0.3;
        this.backgroundMusic.play().catch(() => {
            console.log('Autoplay prevented. Click the music button to enable sound.');
        });
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
    
    // Cloud storage methods for passages
    async savePassageToCloud(content) {
        try {
            // Check if user is authenticated or is a guest
            const authToken = localStorage.getItem('authToken');
            const guestId = localStorage.getItem('guestId');
            
            if (!authToken && !guestId) {
                console.log('No authentication found, skipping cloud save');
                return;
            }
            
            const title = `Passage ${new Date().toLocaleDateString()}`;
            const wordCount = content.trim().split(/\s+/).length;
            
            const endpoint = authToken ? '/api/user/passages' : '/api/guest/passages';
            const headers = {
                'Content-Type': 'application/json'
            };
            
            if (authToken) {
                headers['Authorization'] = `Bearer ${authToken}`;
            } else {
                headers['x-guest-id'] = guestId;
            }
            
            const response = await fetch(`${window.location.origin}${endpoint}`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    title: title,
                    content: content
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('Passage saved to cloud:', result);
                this.showCloudSaveNotification('Passage saved to cloud!');
                
                // Also save locally for offline access
                this.savePassageLocally(content);
            } else {
                console.error('Failed to save passage to cloud:', response.statusText);
                // Save locally as fallback
                this.savePassageLocally(content);
            }
        } catch (error) {
            console.error('Error saving passage to cloud:', error);
        }
    }
    
    async loadPassagesFromCloud() {
        try {
            const authToken = localStorage.getItem('authToken');
            const guestId = localStorage.getItem('guestId');
            
            if (!authToken && !guestId) {
                console.log('No authentication found, skipping cloud load');
                return [];
            }
            
            const endpoint = authToken ? '/api/user/passages' : '/api/guest/passages';
            const headers = {};
            
            if (authToken) {
                headers['Authorization'] = `Bearer ${authToken}`;
            } else {
                headers['x-guest-id'] = guestId;
            }
            
            const response = await fetch(`${window.location.origin}${endpoint}`, {
                method: 'GET',
                headers: headers
            });
            
            if (response.ok) {
                const result = await response.json();
                return result.passages || [];
            } else {
                console.error('Failed to load passages from cloud:', response.statusText);
                return [];
            }
        } catch (error) {
            console.error('Error loading passages from cloud:', error);
            return [];
        }
    }
    
    showCloudSaveNotification(message) {
        // Create a temporary notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(76, 175, 80, 0.9);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 10000;
            animation: slideDown 0.3s ease;
        `;
        notification.textContent = message;
        
        // Add animation keyframes
        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideDown {
                    from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
                    to { transform: translateX(-50%) translateY(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
    
    // Cloud sync initialization
    initializeCloudSync() {
        // Set up periodic sync every 5 minutes
        this.syncInterval = setInterval(() => {
            this.performBackgroundSync();
        }, 5 * 60 * 1000); // 5 minutes
        
        // Sync on page load
        this.performBackgroundSync();
        
        // Sync when user becomes active (after being away)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.performBackgroundSync();
            }
        });
        
        // Sync when network comes back online
        window.addEventListener('online', () => {
            this.performBackgroundSync();
        });
    }
    
    async performBackgroundSync() {
        try {
            const authToken = localStorage.getItem('authToken');
            const guestId = localStorage.getItem('guestId');
            
            if (!authToken && !guestId) {
                return; // No authentication, skip sync
            }
            
            // Load passages from cloud
            const cloudPassages = await this.loadPassagesFromCloud();
            
            // Load local passages
            const localPassages = this.getLocalPassages();
            
            // Sync logic: merge local and cloud passages
            await this.syncPassages(localPassages, cloudPassages);
            
        } catch (error) {
            console.log('Background sync failed:', error);
        }
    }
    
    getLocalPassages() {
        try {
            const saved = localStorage.getItem('localPassages');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Error loading local passages:', error);
            return [];
        }
    }
    
    saveLocalPassages(passages) {
        try {
            localStorage.setItem('localPassages', JSON.stringify(passages));
        } catch (error) {
            console.error('Error saving local passages:', error);
        }
    }
    
    savePassageLocally(content) {
        try {
            const localPassages = this.getLocalPassages();
            const newPassage = {
                content: content,
                timestamp: new Date().toISOString(),
                title: `Passage ${new Date().toLocaleDateString()}`
            };
            localPassages.push(newPassage);
            this.saveLocalPassages(localPassages);
        } catch (error) {
            console.error('Error saving passage locally:', error);
        }
    }
    
    async syncPassages(localPassages, cloudPassages) {
        const mergedPassages = [...cloudPassages];
        
        // Add local passages that don't exist in cloud
        for (const localPassage of localPassages) {
            const existsInCloud = cloudPassages.some(cloud => 
                cloud.content === localPassage.content && 
                Math.abs(new Date(cloud.created_at) - new Date(localPassage.timestamp)) < 60000 // Within 1 minute
            );
            
            if (!existsInCloud) {
                // Save local passage to cloud
                await this.savePassageToCloud(localPassage.content);
            }
        }
        
        // Update local storage with cloud passages
        this.saveLocalPassages(cloudPassages);
        
        console.log('Passages synced successfully');
    }
    
    // Cleanup method
    destroy() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const calmTyping = new CalmTyping();
    
    // Initialize passages management
    initializePassagesManagement(calmTyping);
});

// Passages management functionality
function initializePassagesManagement(calmTyping) {
    const viewPassagesBtn = document.getElementById('view-passages-btn');
    const syncPassagesBtn = document.getElementById('sync-passages-btn');
    const passagesModal = document.getElementById('passages-modal');
    const closePassagesBtn = document.getElementById('close-passages-btn');
    const refreshPassagesBtn = document.getElementById('refresh-passages-btn');
    const passagesList = document.getElementById('passages-list');
    
    // View passages button
    if (viewPassagesBtn) {
        viewPassagesBtn.addEventListener('click', async () => {
            passagesModal.style.display = 'flex';
            await loadPassagesList();
        });
    }
    
    // Sync passages button
    if (syncPassagesBtn) {
        syncPassagesBtn.addEventListener('click', async () => {
            try {
                const passages = await calmTyping.loadPassagesFromCloud();
                calmTyping.showCloudSaveNotification(`Synced ${passages.length} passages from cloud!`);
            } catch (error) {
                console.error('Error syncing passages:', error);
                calmTyping.showCloudSaveNotification('Error syncing passages');
            }
        });
    }
    
    // Close passages modal
    if (closePassagesBtn) {
        closePassagesBtn.addEventListener('click', () => {
            passagesModal.style.display = 'none';
        });
    }
    
    // Refresh passages button
    if (refreshPassagesBtn) {
        refreshPassagesBtn.addEventListener('click', async () => {
            await loadPassagesList();
        });
    }
    
    // Close modal when clicking outside
    if (passagesModal) {
        passagesModal.addEventListener('click', (e) => {
            if (e.target === passagesModal) {
                passagesModal.style.display = 'none';
            }
        });
    }
    
    async function loadPassagesList() {
        try {
            const passages = await calmTyping.loadPassagesFromCloud();
            displayPassages(passages);
        } catch (error) {
            console.error('Error loading passages:', error);
            passagesList.innerHTML = '<p style="color: #666; text-align: center;">Error loading passages. Please try again.</p>';
        }
    }
    
    function displayPassages(passages) {
        if (!passages || passages.length === 0) {
            passagesList.innerHTML = '<p style="color: #666; text-align: center;">No passages saved yet. Start typing to create your first passage!</p>';
            return;
        }
        
        passagesList.innerHTML = '';
        
        passages.forEach((passage, index) => {
            const passageElement = document.createElement('div');
            passageElement.style.cssText = `
                border: 1px solid #ddd;
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 15px;
                background: #f9f9f9;
            `;
            
            const title = passage.title || `Passage ${index + 1}`;
            const date = new Date(passage.created_at).toLocaleDateString();
            const wordCount = passage.word_count || 0;
            
            passageElement.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                    <h4 style="margin: 0; color: #333; font-size: 16px;">${title}</h4>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="editPassage(${passage.id})" style="background: #2196F3; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">Edit</button>
                        <button onclick="deletePassage(${passage.id})" style="background: #f44336; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">Delete</button>
                    </div>
                </div>
                <div style="color: #666; font-size: 12px; margin-bottom: 8px;">
                    ${date} • ${wordCount} words
                </div>
                <div style="color: #555; line-height: 1.4; max-height: 100px; overflow-y: auto;">
                    ${passage.content}
                </div>
            `;
            
            passagesList.appendChild(passageElement);
        });
    }
    
    // Global functions for passage actions
    window.editPassage = async function(passageId) {
        try {
            const authToken = localStorage.getItem('authToken');
            const guestId = localStorage.getItem('guestId');
            
            if (!authToken && !guestId) {
                alert('Please log in to edit passages');
                return;
            }
            
            const endpoint = authToken ? `/api/user/passages/${passageId}` : `/api/guest/passages/${passageId}`;
            const headers = {};
            
            if (authToken) {
                headers['Authorization'] = `Bearer ${authToken}`;
            } else {
                headers['x-guest-id'] = guestId;
            }
            
            const response = await fetch(`${window.location.origin}${endpoint}`, {
                method: 'GET',
                headers: headers
            });
            
            if (response.ok) {
                const result = await response.json();
                const newTitle = prompt('Enter new title:', result.passage.title);
                if (newTitle !== null) {
                    const newContent = prompt('Edit content:', result.passage.content);
                    if (newContent !== null) {
                        await updatePassage(passageId, newTitle, newContent);
                    }
                }
            } else {
                alert('Error loading passage for editing');
            }
        } catch (error) {
            console.error('Error editing passage:', error);
            alert('Error editing passage');
        }
    };
    
    window.deletePassage = async function(passageId) {
        if (!confirm('Are you sure you want to delete this passage?')) {
            return;
        }
        
        try {
            const authToken = localStorage.getItem('authToken');
            const guestId = localStorage.getItem('guestId');
            
            if (!authToken && !guestId) {
                alert('Please log in to delete passages');
                return;
            }
            
            const endpoint = authToken ? `/api/user/passages/${passageId}` : `/api/guest/passages/${passageId}`;
            const headers = {};
            
            if (authToken) {
                headers['Authorization'] = `Bearer ${authToken}`;
            } else {
                headers['x-guest-id'] = guestId;
            }
            
            const response = await fetch(`${window.location.origin}${endpoint}`, {
                method: 'DELETE',
                headers: headers
            });
            
            if (response.ok) {
                await loadPassagesList(); // Refresh the list
                calmTyping.showCloudSaveNotification('Passage deleted successfully');
            } else {
                alert('Error deleting passage');
            }
        } catch (error) {
            console.error('Error deleting passage:', error);
            alert('Error deleting passage');
        }
    };
    
    async function updatePassage(passageId, title, content) {
        try {
            const authToken = localStorage.getItem('authToken');
            const guestId = localStorage.getItem('guestId');
            
            const endpoint = authToken ? `/api/user/passages/${passageId}` : `/api/guest/passages/${passageId}`;
            const headers = {
                'Content-Type': 'application/json'
            };
            
            if (authToken) {
                headers['Authorization'] = `Bearer ${authToken}`;
            } else {
                headers['x-guest-id'] = guestId;
            }
            
            const response = await fetch(`${window.location.origin}${endpoint}`, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify({
                    title: title,
                    content: content
                })
            });
            
            if (response.ok) {
                await loadPassagesList(); // Refresh the list
                calmTyping.showCloudSaveNotification('Passage updated successfully');
            } else {
                alert('Error updating passage');
            }
        } catch (error) {
            console.error('Error updating passage:', error);
            alert('Error updating passage');
        }
    }
}

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
