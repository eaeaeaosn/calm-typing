class CalmTyping {
    constructor() {
        this.typingInput = document.getElementById('typingInput');
        this.currentWord = document.getElementById('currentWord');
        this.wordHistory = document.getElementById('wordHistory');
        this.historyList = document.getElementById('historyList');
        this.sentenceContainer = document.getElementById('sentenceContainer');
        this.backgroundMusic = document.getElementById('backgroundMusic');
        this.musicToggle = document.getElementById('musicToggle');
        
        this.typedWords = [];
        this.currentSentence = [];
        this.isHistoryVisible = false;
        this.isMusicPlaying = false;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.startBackgroundMusic();
        this.typingInput.focus();
        if (window.FishFX) {
            FishFX.config({
                maxConcurrency: 15,
                fishEmojis: ['🐠', '🐟', '🐡'],
            });
        }
    }
    
    setupEventListeners() {
        // Typing input events
        this.typingInput.addEventListener('input', (e) => {
            this.handleTyping(e);
        });
        
        this.typingInput.addEventListener('keydown', (e) => {
            this.handleKeyDown(e);
        });
        
        // Music toggle
        this.musicToggle.addEventListener('click', () => {
            this.toggleMusic();
        });
        
        // Click outside to hide history
        document.addEventListener('click', (e) => {
            if (!this.wordHistory.contains(e.target) && !this.typingInput.contains(e.target)) {
                this.hideHistory();
            }
        });
    }
    
    handleTyping(e) {
        const input = e.target.value;
        const words = input.trim().split(/\s+/);
        const currentWord = words[words.length - 1];
        
        if (currentWord) {
            this.displayCurrentWord(currentWord);
        } else {
            this.clearCurrentWord();
        }
    }
    
    handleKeyDown(e) {
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
        }
        if (window.FishFX) window.FishFX.onKeydown(e);
    }
    
    displayCurrentWord(word) {
        this.currentWord.textContent = word;
        this.currentWord.style.opacity = '1';
        this.currentWord.style.transform = 'scale(1)';
    }
    
    clearCurrentWord() {
        this.currentWord.style.opacity = '0';
        this.currentWord.style.transform = 'scale(0.8)';
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
        
        if (this.typedWords.length === 0) {
            this.historyList.innerHTML = '<p style="color: rgba(255,255,255,0.6); font-style: italic;">No words typed yet...</p>';
            return;
        }
        
        this.typedWords.forEach((word, index) => {
            const wordElement = document.createElement('div');
            wordElement.className = 'history-item';
            wordElement.textContent = `${index + 1}. ${word}`;
            this.historyList.appendChild(wordElement);
        });
    }
    
    handleEnter() {
        const input = this.typingInput.value.trim();
        if (input) {
            // Add words to history
            const words = input.split(/\s+/);
            words.forEach(word => {
                if (word.trim()) {
                    this.typedWords.push(word.trim());
                }
            });
            
            // Create sentence animation
            this.animateSentence(input);
            
            // Clear input
            this.typingInput.value = '';
            this.clearCurrentWord();
            
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
