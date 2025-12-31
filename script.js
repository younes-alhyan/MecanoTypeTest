let wordsListES = [];
let wordsListEN = [];

const storedCount = localStorage.getItem('mecano_word_count');
let wordCount = (storedCount === 'infinite') ? 'infinite' : (parseInt(storedCount) || 25);
let currentLanguage = localStorage.getItem('mecano_language') || 'en';
let generationMode = localStorage.getItem('mecano_generation_mode') || 'random';
let zenModeEnabled = localStorage.getItem('mecano_zen_mode') === 'true';
let currentTheme = localStorage.getItem('mecano_theme') || 'light';
if (currentTheme === 'dark') document.body.classList.add('dark-mode');

const gameArea = document.getElementById('game-area');
const wordsContainer = document.getElementById('words');
const statsContainer = document.getElementById('stats');
const wpmEl = document.getElementById('wpm');
const accEl = document.getElementById('acc');
const errorsEl = document.getElementById('errors');
const weakKeysEl = document.getElementById('weak-keys');
const restartBtn = document.getElementById('restart-button');
const soundBtn = document.getElementById('sound-btn');
const suddenDeathBtn = document.getElementById('sudden-death-btn');
const numbersBtn = document.getElementById('numbers-btn');
const uppercaseBtn = document.getElementById('uppercase-btn');
const symbolsBtn = document.getElementById('symbols-btn');

let currentWords = [];
let currentWordIndex = 0;
let currentLetterIndex = 0;
let isGameActive = false;
let isGameFinished = false;
let startTime = 0;
let correctChars = 0;
let totalChars = 0;
let errorCount = 0;
let zenBaseTop = 0;
let charStats = JSON.parse(localStorage.getItem('mecano_char_stats')) || {};
let currentGameCharStats = {};

let soundEnabled = true;
let suddenDeathEnabled = false;
let numbersEnabled = false;
let uppercaseEnabled = false;
let symbolsEnabled = false;
let audioCtx = null;

let currentView = 'game';
let paperScrollY = 100;

window.addEventListener('wheel', (e) => {
    if (currentView === 'game') return;
    
    paperScrollY -= e.deltaY * 0.5;
    
    if (paperScrollY > 100) paperScrollY = 100;
    
    const activeSheet = document.querySelector('.sheet-content:not(.hidden)');
    if (activeSheet) {
        const contentHeight = activeSheet.offsetHeight;
        const minScroll = -contentHeight + 400; 
        if (paperScrollY < minScroll) paperScrollY = minScroll;
    }

    gameArea.style.transform = `translateY(${paperScrollY}px)`;
});

loadWords().then(() => {
    initGame();
});

async function loadWords() {
    try {
        const response = await fetch('words.json');
        const data = await response.json();
        wordsListES = data.es;
        wordsListEN = data.en;
    } catch (error) {
        console.error('Error loading words:', error);
        wordsListES = ["error", "loading", "words", "check", "console"];
        wordsListEN = ["error", "loading", "words", "check", "console"];
        alert("To load words from words.json, you need to run this project on a local server (due to CORS security policies). If you use VS Code, install the 'Live Server' extension and click 'Go Live'.");
    }
}

if (soundEnabled) {
    soundBtn.classList.add('active');
    soundBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
}

let noiseBuffer = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const bufferSize = audioCtx.sampleRate * 2;
        noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
    }
}

function playSound(type) {
    if (!soundEnabled || !audioCtx) return;
    
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    const t = audioCtx.currentTime;

    if (type === 'click') {
        const impact = audioCtx.createBufferSource();
        impact.buffer = noiseBuffer;
        const impactFilter = audioCtx.createBiquadFilter();
        impactFilter.type = 'lowpass';
        impactFilter.frequency.value = 800;
        const impactGain = audioCtx.createGain();
        
        impact.connect(impactFilter);
        impactFilter.connect(impactGain);
        impactGain.connect(audioCtx.destination);
        
        impact.start(t, Math.random() * 1.0);
        impactGain.gain.setValueAtTime(0.8, t);
        impactGain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
        impact.stop(t + 0.06);

        const body = audioCtx.createOscillator();
        body.type = 'triangle';
        body.frequency.setValueAtTime(150 + Math.random() * 30, t); 
        body.frequency.exponentialRampToValueAtTime(40, t + 0.08);
        const bodyGain = audioCtx.createGain();
        
        body.connect(bodyGain);
        bodyGain.connect(audioCtx.destination);
        
        bodyGain.gain.setValueAtTime(0.5, t);
        bodyGain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
        
        body.start(t);
        body.stop(t + 0.1);

        const texture = audioCtx.createBufferSource();
        texture.buffer = noiseBuffer;
        const textureFilter = audioCtx.createBiquadFilter();
        textureFilter.type = 'bandpass';
        textureFilter.frequency.value = 400;
        textureFilter.Q.value = 1;
        const textureGain = audioCtx.createGain();
        
        texture.connect(textureFilter);
        textureFilter.connect(textureGain);
        textureGain.connect(audioCtx.destination);
        
        texture.start(t, Math.random() * 1.0);
        textureGain.gain.setValueAtTime(0.4, t);
        textureGain.gain.exponentialRampToValueAtTime(0.01, t + 0.04);
        texture.stop(t + 0.05);

    } else if (type === 'error') {
        const thud = audioCtx.createOscillator();
        thud.type = 'sine';
        thud.frequency.setValueAtTime(150, t);
        thud.frequency.exponentialRampToValueAtTime(50, t + 0.2);
        
        const thudGain = audioCtx.createGain();
        thudGain.gain.setValueAtTime(2.0, t);
        thudGain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
        
        thud.connect(thudGain);
        thudGain.connect(audioCtx.destination);
        
        thud.start(t);
        thud.stop(t + 0.2);
        
        const noise = audioCtx.createBufferSource();
        noise.buffer = noiseBuffer;
        const noiseFilter = audioCtx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.value = 300;
        const noiseGain = audioCtx.createGain();
        
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(audioCtx.destination);
        
        noise.start(t, Math.random());
        noiseGain.gain.setValueAtTime(2.5, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
        noise.stop(t + 0.2);
    } else if (type === 'tear') {
        const duration = 0.55;
        
        const slide = audioCtx.createBufferSource();
        slide.buffer = noiseBuffer;
        
        const slideFilter = audioCtx.createBiquadFilter();
        slideFilter.type = 'lowpass';
        slideFilter.Q.value = 0.6; 
        
        slideFilter.frequency.setValueAtTime(150, t);
        slideFilter.frequency.exponentialRampToValueAtTime(500, t + duration);
        
        const slideGain = audioCtx.createGain();
        slideGain.gain.setValueAtTime(0, t);

        slideGain.gain.linearRampToValueAtTime(0.35, t + 0.08);
        slideGain.gain.linearRampToValueAtTime(0.25, t + duration - 0.15);
        slideGain.gain.exponentialRampToValueAtTime(0.001, t + duration);
        
        slide.connect(slideFilter);
        slideFilter.connect(slideGain);
        slideGain.connect(audioCtx.destination);
        
        slide.start(t);
        slide.stop(t + duration);
    }
}

function initGame(tearPaper = true) {
    const isRestart = wordsContainer.children.length > 0 || isGameFinished || currentView !== 'game';

    if (isRestart && tearPaper) {
        playSound('tear');
        const oldPaper = gameArea.cloneNode(true);
        oldPaper.id = 'old-paper';
        oldPaper.style.position = 'absolute';
        oldPaper.style.top = '0';
        oldPaper.style.left = '0';
        oldPaper.style.width = '100%';
        oldPaper.style.height = '100%';
        oldPaper.style.zIndex = '10';
        oldPaper.style.transform = gameArea.style.transform || 'translateY(100px)';
        
        oldPaper.style.transition = 'none';

        gameArea.parentElement.appendChild(oldPaper);

        void oldPaper.offsetWidth;

        oldPaper.classList.add('tearing');
        
        oldPaper.style.transition = 'transform 0.6s ease-in, opacity 0.6s ease-in';
        
        oldPaper.style.transform = 'translate(1000px, -200px) rotate(15deg)';
        oldPaper.style.opacity = '0';

        setTimeout(() => {
            oldPaper.remove();
        }, 600);
    }

    currentView = 'game';
    window.removeEventListener('keydown', handleKeydown);

    currentWordIndex = 0;
    currentLetterIndex = 0;
    isGameActive = false;
    isGameFinished = false;
    correctChars = 0;
    totalChars = 0;
    errorCount = 0;
    currentGameCharStats = {};
    
    wordsContainer.innerHTML = '';
    wordsContainer.scrollTop = 0;
    wordsContainer.classList.remove('hidden');
    document.getElementById('settings-sheet').classList.add('hidden');
    document.getElementById('stats-sheet').classList.add('hidden');
    
    statsContainer.classList.add('hidden');
    document.getElementById('restart-note').classList.add('hidden');
    restartBtn.classList.add('hidden');
    gameArea.style.alignItems = 'stretch';
    document.body.classList.remove('focus-mode');

    if (zenModeEnabled) {
        document.body.classList.add('zen-mode');
        currentWords = [];
        currentWords = [];
        const cursor = document.createElement('span');
        cursor.className = 'zen-cursor';
        wordsContainer.appendChild(cursor);
        
        // Ensure layout is updated before measuring
        requestAnimationFrame(() => {
            zenBaseTop = cursor.offsetTop;
        });
        // Ensure layout is updated before measuring
        requestAnimationFrame(() => {
            zenBaseTop = cursor.offsetTop;
        });
    } else {
        document.body.classList.remove('zen-mode');
        currentWords = generateWords();
        renderWords();
    }
    
    window.addEventListener('keydown', handleKeydown);
    
    if (!zenModeEnabled) updateCursor();

    if (isRestart && tearPaper) {
        gameArea.style.transition = 'none';
        gameArea.style.transform = 'translateY(100%)';
        
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                gameArea.style.transition = 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)';
                gameArea.style.transform = 'translateY(100px)';
            });
        });
    } else {
        gameArea.style.transform = 'translateY(100px)';
    }
}

function switchView(newView) {
    if (currentView === newView) return;
    
    playSound('tear');
    const oldPaper = gameArea.cloneNode(true);
    oldPaper.id = 'old-paper';
    oldPaper.style.position = 'absolute';
    oldPaper.style.top = '0';
    oldPaper.style.left = '0';
    oldPaper.style.width = '100%';
    oldPaper.style.height = '100%';
    oldPaper.style.zIndex = '10';
    oldPaper.style.transform = gameArea.style.transform || 'translateY(100px)';
    oldPaper.style.transition = 'none';
    
    oldPaper.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));

    gameArea.parentElement.appendChild(oldPaper);
    void oldPaper.offsetWidth;
    oldPaper.classList.add('tearing');
    oldPaper.style.transition = 'transform 0.6s ease-in, opacity 0.6s ease-in';
    oldPaper.style.transform = 'translate(1000px, -200px) rotate(15deg)';
    oldPaper.style.opacity = '0';
    setTimeout(() => oldPaper.remove(), 600);

    currentView = newView;
    
    document.getElementById('words').classList.add('hidden');
    document.getElementById('settings-sheet').classList.add('hidden');
    document.getElementById('stats-sheet').classList.add('hidden');
    statsContainer.classList.add('hidden');
    document.getElementById('restart-note').classList.add('hidden');
    restartBtn.classList.add('hidden');

    paperScrollY = 100;
    gameArea.style.transition = 'none';
    gameArea.style.transform = 'translateY(100%)';

    if (newView === 'game') {
        initGame(false); 
    } else if (newView === 'settings') {
        document.getElementById('settings-sheet').classList.remove('hidden');
    } else if (newView === 'stats') {
        document.getElementById('stats-sheet').classList.remove('hidden');
        renderGlobalStatsTable();
    }

    settingsBtn.classList.toggle('active', newView === 'settings');
    statsBtn.classList.toggle('active', newView === 'stats');

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            gameArea.style.transition = 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)';
            gameArea.style.transform = `translateY(${paperScrollY}px)`;
        });
    });
}

function generateWords() {
    let generated = [];
    const list = currentLanguage === 'es' ? wordsListES : wordsListEN;
    const count = wordCount === 'infinite' ? 100 : wordCount;
    
    let practiceWords = [];

    if (generationMode === 'learning') {
        const sortedWeakKeys = Object.entries(charStats)
            .sort((a, b) => b[1].errors - a[1].errors)
            .map(entry => entry[0]);
        
        const topWeakKeys = sortedWeakKeys.slice(0, 5);
        
        if (topWeakKeys.length > 0) {
            practiceWords = list.filter(word => 
                topWeakKeys.some(key => word.includes(key))
            );
        }
    }

    for (let i = 0; i < count; i++) {
        let word = "";
        
        if (generationMode === 'learning' && practiceWords.length > 0 && Math.random() < 0.6) {
            word = practiceWords[Math.floor(Math.random() * practiceWords.length)];
        } else {
            word = list[Math.floor(Math.random() * list.length)];
        }

        if (uppercaseEnabled) {
            if (Math.random() < 0.6) {
                word = word.charAt(0).toUpperCase() + word.slice(1);
            } else if (Math.random() < 0.1) {
                word = word.toUpperCase();
            }
        }

        if (numbersEnabled) {
            if (Math.random() < 0.15) {
                word = Math.floor(Math.random() * 2024).toString();
            } else if (Math.random() < 0.1) {
                word += Math.floor(Math.random() * 10);
            }
        }

        if (symbolsEnabled) {
            if (Math.random() < 0.25) {
                const symbols = ".,!?;:()\"'-@#";
                const symbol = symbols.charAt(Math.floor(Math.random() * symbols.length));
                
                if (".,!?;:".includes(symbol)) {
                    word += symbol;
                } else if ("(".includes(symbol)) {
                    word = "(" + word + ")";
                } else if ("\"".includes(symbol)) {
                    word = '"' + word + '"';
                } else if ("-".includes(symbol)) {
                    word = "-" + word;
                } else if ("@#".includes(symbol)) {
                    word = symbol + word;
                }
            }
        }

        generated.push(word);
    }
    
    return generated;
}

function renderWords(append = false) {
    if (!append) wordsContainer.innerHTML = '';
    
    const startIndex = append ? currentWords.length - (wordCount === 'infinite' ? 100 : wordCount) : 0;

    for (let i = startIndex; i < currentWords.length; i++) {
        const word = currentWords[i];
        const wordDiv = document.createElement('div');
        wordDiv.className = 'word';
        
        word.split('').forEach(char => {
            const letterSpan = document.createElement('span');
            letterSpan.className = 'letter';
            letterSpan.textContent = char;
            wordDiv.appendChild(letterSpan);
        });
        
        wordsContainer.appendChild(wordDiv);
    }
}

let typingTimeout;

function updateCursor() {
    if (zenModeEnabled) {
        updateZenCursor();
        return;
    }
    if (zenModeEnabled) {
        updateZenCursor();
        return;
    }
    document.querySelectorAll('.letter').forEach(el => el.classList.remove('current'));
    document.querySelectorAll('.word').forEach(el => el.classList.remove('current-word-end'));
    
    const wordDivs = wordsContainer.querySelectorAll('.word');
    const currentWordDiv = wordDivs[currentWordIndex];

    if (currentWordDiv) {
        const currentLetterSpan = currentWordDiv.children[currentLetterIndex];
        
        if (currentLetterSpan) {
            currentLetterSpan.classList.add('current');
        } else {
            currentWordDiv.classList.add('current-word-end'); 
        }

        const firstWordTop = wordDivs[0].offsetTop;
        const currentTop = currentWordDiv.offsetTop;
        const targetTranslate = -(currentTop - firstWordTop) + 100;
        
        gameArea.style.transition = 'transform 0.1s cubic-bezier(0, 0.9, 0.15, 1)';
        gameArea.style.transform = `translateY(${targetTranslate}px)`;
    }
}

window.addEventListener('resize', updateCursor);


function updateZenCursor() {
    const cursor = wordsContainer.querySelector('.zen-cursor');
    if (!cursor) return;

    const currentTop = cursor.offsetTop;
    
    const targetTranslate = -(currentTop - zenBaseTop) + 100; 
    
    gameArea.style.transition = 'transform 0.1s cubic-bezier(0, 0.9, 0.15, 1)';
    gameArea.style.transform = `translateY(${targetTranslate}px)`;
}

function handleZenInput(e) {
    if (e.key === 'Tab') {
        e.preventDefault();
        initGame();
        return;
    }
    
    if (['Shift', 'Control', 'Alt', 'CapsLock', 'Meta'].includes(e.key)) return;

    if (!isGameActive) {
        isGameActive = true;
        if (soundEnabled) initAudio();
    }

    const cursor = wordsContainer.querySelector('.zen-cursor');
    if (!cursor) return;

    if (e.key === 'Backspace') {
        const prev = cursor.previousSibling;
        if (prev) {
            if (prev.nodeType === Node.TEXT_NODE) {
                if (prev.textContent.length > 0) {
                    prev.textContent = prev.textContent.slice(0, -1);
                } 
                if (prev.textContent.length === 0) prev.remove();
            } else {
                prev.remove();
            }
        }
        updateZenCursor();
        return;
    }

    if (e.key === 'Enter') {
        e.preventDefault();
        playSound('click');
        const br = document.createElement('br');
        wordsContainer.insertBefore(br, cursor);
        updateZenCursor();
        return;
    }

    if (e.key.length === 1) {
        e.preventDefault();
        playSound('click');
        
        const prev = cursor.previousSibling;
        if (prev && prev.nodeType === Node.TEXT_NODE) {
            prev.textContent += e.key;
        } else {
            const text = document.createTextNode(e.key);
            wordsContainer.insertBefore(text, cursor);
        }
        updateZenCursor();
    }
}

function handleKeydown(e) {
    if (currentView !== 'game') return;

    if (zenModeEnabled) {
        handleZenInput(e);
        return;
    }

    if (isGameFinished) {
        if (e.key === 'Tab' || e.key === 'Enter') {
            e.preventDefault();
            initGame();
        }
        return;
    }

    if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'CapsLock') return;
    
    if (e.key === 'Tab') {
        e.preventDefault();
        initGame();
        return;
    }

    if (!isGameActive) {
        isGameActive = true;
        document.body.classList.add('focus-mode');
        startTime = Date.now();
        if (soundEnabled) initAudio();
    }

    const typebars = document.querySelector('.typebars-inner');
    if (typebars) {
        typebars.classList.remove('active');
        void typebars.offsetWidth;
        typebars.classList.add('active');
    }

    const currentWord = currentWords[currentWordIndex];
    const wordDivs = wordsContainer.querySelectorAll('.word');
    const currentWordDiv = wordDivs[currentWordIndex];
    const currentLetterSpan = currentWordDiv.children[currentLetterIndex];

    if (e.key === 'Backspace') {
        if (currentLetterIndex > 0) {
            currentLetterIndex--;
            const letter = currentWordDiv.children[currentLetterIndex];
            if (currentLetterIndex >= currentWord.length) {
                letter.remove();
            } else {
                letter.classList.remove('correct', 'incorrect');
            }
        } else if (currentWordIndex > 0 && currentLetterIndex === 0) {
            currentWordIndex--;
            const prevWordDiv = wordDivs[currentWordIndex];
            currentLetterIndex = prevWordDiv.children.length;
        }
        updateCursor();
        return;
    }

    if (e.key === ' ') {
        e.preventDefault();
        if (currentWordIndex < currentWords.length - 1) {
            totalChars++;

            let skippedErrors = 0;
            for (let i = currentLetterIndex; i < currentWord.length; i++) {
                const letter = currentWordDiv.children[i];
                letter.classList.add('incorrect');
                errorCount++;
                skippedErrors++;

                const char = currentWord[i];
                if (!charStats[char]) {
                    charStats[char] = { total: 0, errors: 0 };
                }
                charStats[char].total++;
                charStats[char].errors++;

                if (!currentGameCharStats[char]) {
                    currentGameCharStats[char] = 0;
                }
                currentGameCharStats[char]++;
            }
            
            if (skippedErrors > 0) {
                playSound('error');
                
                if (suddenDeathEnabled) {
                    finishGame();
                    return;
                }
            } else {
                playSound('click');
                correctChars++;
            }
            
            currentWordIndex++;
            currentLetterIndex = 0;
            
            if (wordCount === 'infinite') {
                if (currentWords.length - currentWordIndex < 50) {
                    const newWords = generateWords();
                    currentWords = currentWords.concat(newWords);
                    renderWords(true);
                }

                const bufferBehind = 80;
                if (currentWordIndex > bufferBehind) {
                    const wordsToRemove = currentWordIndex - bufferBehind;
                    
                    for (let i = 0; i < wordsToRemove; i++) {
                        if (wordsContainer.firstChild) {
                            wordsContainer.removeChild(wordsContainer.firstChild);
                        }
                    }
                    
                    currentWords.splice(0, wordsToRemove);
                    
                    currentWordIndex -= wordsToRemove;
                }
            }

            updateCursor();
        } else if (currentWordIndex === currentWords.length - 1) {
            finishGame();
        }
        return;
    }

    if (e.key.length === 1) {
        if (currentLetterIndex < currentWord.length) {
            const expectedChar = currentWord[currentLetterIndex];
            
            if (!charStats[expectedChar]) {
                charStats[expectedChar] = { total: 0, errors: 0 };
            }
            charStats[expectedChar].total++;

            if (e.key === expectedChar) {
                currentLetterSpan.classList.add('correct');
                correctChars++;
                playSound('click');
            } else {
                currentLetterSpan.classList.add('incorrect');
                errorCount++;
                playSound('error');
                
                charStats[expectedChar].errors++;
                
                if (!currentGameCharStats[expectedChar]) {
                    currentGameCharStats[expectedChar] = 0;
                }
                currentGameCharStats[expectedChar]++;

                if (suddenDeathEnabled) {
                    finishGame();
                    return;
                }
            }
        } else {
            const extraSpan = document.createElement('span');
            extraSpan.className = 'letter incorrect extra';
            extraSpan.textContent = e.key;
            currentWordDiv.appendChild(extraSpan);
            
            errorCount++;
            playSound('error');
            
            if (suddenDeathEnabled) {
                finishGame();
                return;
            }
        }
        
        totalChars++;
        currentLetterIndex++;
        
        updateCursor();

        if (currentWordIndex === currentWords.length - 1 && currentLetterIndex === currentWord.length) {
            if (wordCount === 'infinite') {
                const newWords = generateWords();
                currentWords = currentWords.concat(newWords);
                renderWords(true);
            } else {
                finishGame();
            }
        }
    }
}



function finishGame() {
    isGameFinished = true;
    document.body.classList.remove('focus-mode');
    
    localStorage.setItem('mecano_char_stats', JSON.stringify(charStats));
    
    const endTime = Date.now();
    const timeInMinutes = (endTime - startTime) / 60000;
    
    const grossWPM = Math.round((totalChars / 5) / timeInMinutes);
    const netWPM = Math.round(((totalChars - errorCount) / 5) / timeInMinutes);
    
    const totalProcessed = correctChars + errorCount;
    const accuracy = totalProcessed > 0 ? Math.round((correctChars / totalProcessed) * 100) : 0;
    
    wpmEl.textContent = Math.max(0, netWPM);
    accEl.textContent = accuracy + '%';
    errorsEl.textContent = errorCount;
    
    const sortedWeakKeys = Object.entries(currentGameCharStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(k => k[0])
        .join(' ');
        
    weakKeysEl.textContent = sortedWeakKeys || "None";

    statsContainer.classList.remove('hidden');
    document.getElementById('restart-note').classList.remove('hidden');
    restartBtn.classList.remove('hidden');
    
    restartBtn.focus();
}

const settingsBtn = document.getElementById('settings-btn');
const closeSettingsBtn = document.getElementById('close-settings-btn');

settingsBtn.addEventListener('click', () => {
    if (currentView === 'settings') {
        switchView('game');
        return;
    }
    document.querySelectorAll('[data-lang]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === currentLanguage);
    });
    document.querySelectorAll('[data-count]').forEach(btn => {
        const val = btn.dataset.count;
        btn.classList.toggle('active', val == wordCount);
    });
    document.querySelectorAll('[data-mode]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === generationMode);
    });
    document.querySelectorAll('[data-zen]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.zen === (zenModeEnabled ? 'true' : 'false'));
    });
    
document.querySelectorAll('[data-theme]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === currentTheme);
});
    switchView('settings');
});

closeSettingsBtn.addEventListener('click', () => {
    switchView('game');
});

document.querySelectorAll('[data-lang]').forEach(btn => {
    btn.addEventListener('click', () => {
        currentLanguage = btn.dataset.lang;
        localStorage.setItem('mecano_language', currentLanguage);
        
        document.querySelectorAll('[data-lang]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

document.querySelectorAll('[data-count]').forEach(btn => {
    btn.addEventListener('click', () => {
        const val = btn.dataset.count;
        wordCount = val === 'infinite' ? 'infinite' : parseInt(val);
        localStorage.setItem('mecano_word_count', wordCount);
        
        document.querySelectorAll('[data-count]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

document.querySelectorAll('[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
        generationMode = btn.dataset.mode;
        localStorage.setItem('mecano_generation_mode', generationMode);
        
        document.querySelectorAll('[data-mode]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

document.querySelectorAll('[data-zen]').forEach(btn => {
    btn.addEventListener('click', () => {
        zenModeEnabled = btn.dataset.zen === 'true';
        localStorage.setItem('mecano_zen_mode', zenModeEnabled);
        
        document.querySelectorAll('[data-zen]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

const statsBtn = document.getElementById('stats-btn');
const closeStatsBtn = document.getElementById('close-stats-btn');
const resetStatsBtn = document.getElementById('reset-stats-btn');
const globalStatsTableBody = document.querySelector('#global-stats-table tbody');

numbersBtn.addEventListener('click', () => {
    numbersEnabled = !numbersEnabled;
    numbersBtn.classList.toggle('active');
    if (currentView === 'game') initGame();
    numbersBtn.blur();
});

uppercaseBtn.addEventListener('click', () => {
    uppercaseEnabled = !uppercaseEnabled;
    uppercaseBtn.classList.toggle('active');
    if (currentView === 'game') initGame();
    uppercaseBtn.blur();
});

symbolsBtn.addEventListener('click', () => {
    symbolsEnabled = !symbolsEnabled;
    symbolsBtn.classList.toggle('active');
    if (currentView === 'game') initGame();
    symbolsBtn.blur();
});

soundBtn.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundBtn.classList.toggle('active');
    soundBtn.innerHTML = soundEnabled ? '<i class="fas fa-volume-up"></i>' : '<i class="fas fa-volume-mute"></i>';
    if (soundEnabled) initAudio();
});

suddenDeathBtn.addEventListener('click', () => {
    suddenDeathEnabled = !suddenDeathEnabled;
    suddenDeathBtn.classList.toggle('active');
    if (currentView === 'game') initGame();
});

statsBtn.addEventListener('click', () => {
    if (currentView === 'stats') {
        switchView('game');
    } else {
        switchView('stats');
    }
});

closeStatsBtn.addEventListener('click', () => {
    switchView('game');
});

resetStatsBtn.addEventListener('click', () => {
    if (confirm('¿Estás seguro de que quieres borrar todo tu historial de aprendizaje?')) {
        charStats = {};
        localStorage.removeItem('mecano_char_stats');
        renderGlobalStatsTable();
        weakKeysEl.textContent = "-";
    }
});

let currentSort = { column: 'rate', direction: 'desc' };
let currentFilter = 'all';

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderGlobalStatsTable();
    });
});

document.querySelectorAll('#global-stats-table th.sortable').forEach(th => {
    th.addEventListener('click', () => {
        const column = th.dataset.sort;
        if (currentSort.column === column) {
            currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            currentSort.column = column;
            currentSort.direction = 'desc';
        }
        renderGlobalStatsTable();
    });
});

function renderGlobalStatsTable() {
    globalStatsTableBody.innerHTML = '';
    
    document.querySelectorAll('#global-stats-table th.sortable').forEach(th => {
        th.classList.remove('asc', 'desc');
        if (th.dataset.sort === currentSort.column) {
            th.classList.add(currentSort.direction);
        }
    });

    const entries = Object.entries(charStats).filter(([char]) => {
        switch (currentFilter) {
            case 'lowercase': return /[a-zñ]/.test(char);
            case 'uppercase': return /[A-ZÑ]/.test(char);
            case 'accents': return /[áéíóúüÁÉÍÓÚÜ]/.test(char);
            case 'numbers': return /[0-9]/.test(char);
            case 'symbols': return !/[a-zñA-ZÑ0-9áéíóúüÁÉÍÓÚÜ]/.test(char);
            default: return true;
        }
    }).sort((a, b) => {
        const charA = a[0];
        const charB = b[0];
        const statsA = a[1];
        const statsB = b[1];
        
        const rateA = statsA.total > 0 ? (statsA.errors / statsA.total) : 0;
        const rateB = statsB.total > 0 ? (statsB.errors / statsB.total) : 0;

        let valA, valB;

        switch (currentSort.column) {
            case 'char':
                valA = charA;
                valB = charB;
                break;
            case 'total':
                valA = statsA.total;
                valB = statsB.total;
                break;
            case 'errors':
                valA = statsA.errors;
                valB = statsB.errors;
                break;
            case 'rate':
            default:
                valA = rateA;
                valB = rateB;
                break;
        }

        if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
        return 0;
    });

    if (entries.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="4">No data yet</td>`;
        globalStatsTableBody.appendChild(row);
        return;
    }

    entries.forEach(([char, stats]) => {
        if (stats.total === 0) return; 
        
        const row = document.createElement('tr');
        const errorRate = ((stats.errors / stats.total) * 100).toFixed(1);
        
        row.innerHTML = `
            <td>${char}</td>
            <td>${stats.total}</td>
            <td>${stats.errors}</td>
            <td style="color: ${errorRate > 0 ? 'var(--error-color)' : 'var(--text-color)'}">${errorRate}%</td>
        `;
        globalStatsTableBody.appendChild(row);
    });
}

restartBtn.addEventListener('click', initGame);
restartBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        initGame();
    }
});

const mobileInput = document.getElementById('mobile-input');

if (mobileInput) {
    window.addEventListener('touchstart', (e) => {
        if (!e.target.closest('button') && !e.target.closest('.modal')) {
            mobileInput.focus();
        }
    }, { passive: true });

    window.addEventListener('click', (e) => {
        if (!e.target.closest('button') && !e.target.closest('.modal') && window.innerWidth <= 1024) {
            mobileInput.focus();
        }
    });

    mobileInput.addEventListener('input', (e) => {
        
        if (e.inputType === 'deleteContentBackward') {
            handleKeydown({ key: 'Backspace', preventDefault: () => {} });
        } else if (e.inputType === 'insertLineBreak' || (e.data && e.data.includes('\n'))) {
             handleKeydown({ key: 'Enter', preventDefault: () => {} });
        } else if (e.data) {
            const char = e.data;
            if (char === ' ') {
                 handleKeydown({ key: ' ', preventDefault: () => {} });
            } else {
                 for (let c of char) {
                     handleKeydown({ key: c, preventDefault: () => {} });
                 }
            }
        }
        mobileInput.value = '';
    });
    
    mobileInput.addEventListener('keydown', (e) => {
        e.stopPropagation();
    });
}
// Theme Toggle Logic
document.querySelectorAll('[data-theme]').forEach(btn => {
    btn.addEventListener('click', () => {
        currentTheme = btn.dataset.theme;
        localStorage.setItem('mecano_theme', currentTheme);
        
        if (currentTheme === 'dark') {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }

        // Update UI buttons
        document.querySelectorAll('[data-theme]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        playSound('click');
    });
});
