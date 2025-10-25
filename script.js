class CalmTyping {
    constructor() {
        this.currentLetter = document.getElementById('currentLetter');
        this.wordSuggestion = document.getElementById('wordSuggestion');
        this.wordHistory = document.getElementById('wordHistory');
        this.historyList = document.getElementById('historyList');
        this.sentenceContainer = document.getElementById('sentenceContainer');
        this.backgroundMusic = document.getElementById('backgroundMusic');
        this.musicToggle = document.getElementById('musicToggle');
        
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
        // Focus on the page to capture keyboard input
        document.body.focus();
        document.body.tabIndex = -1;
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
                        content: `Correct this misspelled word to the most likely intended English word: "${word}". Return only the corrected word, nothing else.`
                    }
                ],
                max_tokens: 20,
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
    
    getLocalCorrection(word) {
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
