/* -------------------------------------------------------------------------- */
/*                            FIREBASE CONFIGURATION                          */
/* -------------------------------------------------------------------------- */

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyASYfPDFxWE-uJYeiEKkF6-iZkxSKdcb28",
    authDomain: "whispered-love-letter.firebaseapp.com",
    projectId: "whispered-love-letter",
    storageBucket: "whispered-love-letter.firebasestorage.app",
    messagingSenderId: "779331896401",
    appId: "1:779331896401:web:8b286b293f91d826afa470"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
console.log('Firebase initialized');

/* -------------------------------------------------------------------------- */
/*                         APPLICATION STATE MANAGEMENT                       */
/* -------------------------------------------------------------------------- */

// Current state of the application
let appState = 'welcome'; // 'welcome', 'question', 'recording', 'garden'
let currentStage = 0; // 0 = infatuation, 1 = crystallization, 2 = deterioration
let currentQuestionIndex = 0;

// Interview questions organized by stage
const interviewData = {
    intro: [
        "Do you remember (ever) loving someone?",
        "How did it start? What was your first impression about this person?",
        "What would you call that feeling?",
        "Was it love? What does it mean to love?",
        "Maybe it was something else?"
    ],
    stages: [
        {
            name: "Infatuation",
            questions: [
                "How did the flame / feeling develop?",
                "What attracted you to this person?"
            ]
        },
        {
            name: "Crystallization",
            questions: [
                "Did you start retreating into your imagination or inner narratives rather than engaging with reality?",
                "Did the feeling linger for longer than it should have?"
            ]
        },
        {
            name: "Deterioration",
            questions: [
                "Does this feeling still serve you?",
                "Do you wish to let go?",
                "Record your last memory here."
            ]
        }
    ]
};

/* -------------------------------------------------------------------------- */
/*                              AUDIO VARIABLES                               */
/* -------------------------------------------------------------------------- */
let audioContext;
let analyser;
let dataArray;
let isRecording = false;

/* -------------------------------------------------------------------------- */
/*                            FERTILIZER SYSTEM                               */
/* -------------------------------------------------------------------------- */
let fertilizerMarks = []; // Stores all marks (local + from database)
let backgroundImage; // Garden background

/* -------------------------------------------------------------------------- */
/*                              INITIALIZATION                                */
/* -------------------------------------------------------------------------- */

window.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
});

function setupEventListeners() {
    const startBtn = document.getElementById('startBtn');
    const recordBtn = document.getElementById('recordBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (!startBtn) {
        console.error('❌ Start button not found!');
        return;
    }
    if (!recordBtn) {
        console.error('❌ Record button not found!');
        return;
    }
    if (!nextBtn) {
        console.error('❌ Next button not found!');
        return;
    }
    
    startBtn.addEventListener('click', () => {
        console.log('🔘 Start button clicked!');
        startInterview();
    });
    
    recordBtn.addEventListener('click', () => {
        console.log('🔘 Record button clicked!');
        toggleRecording();
    });
    
    nextBtn.addEventListener('click', () => {
        console.log('🔘 Next button clicked!');
        nextQuestion();
    });
    
    console.log('✅ All event listeners attached');
}

/* -------------------------------------------------------------------------- */
/*                            NAVIGATION FUNCTIONS                            */
/* -------------------------------------------------------------------------- */

function startInterview() {
    console.log('Starting interview...');

    // Hide welcome screen, show question and garden screens
    switchScreen('welcome', 'question');
    
    // ALSO make garden screen active (it starts hidden!)
    document.getElementById('gardenScreen').classList.add('active');

    // Initialize the garden/canvas BEFORE loading first question
    initializeGarden();

    // Load first question
    loadQuestion();

    // Start the question timer (auto-advance every 10 seconds)
    startQuestionTimer();
}

function switchScreen(fromScreen, toScreen) {
    // Fade out current screen
    const fromElement = document.getElementById(fromScreen + 'Screen');
    fromElement.style.opacity = '0';

    setTimeout(() => {
        fromElement.classList.remove('active');

        // Fade in new screen
        const toElement = document.getElementById(toScreen + 'Screen');
        toElement.classList.add('active');
        toElement.style.opacity = '0';

        // Trigger reflow
        toElement.offsetHeight;

        toElement.style.opacity = '1';
    }, 500);
}

function loadQuestion() {
    const stage = interviewData.stages[currentStage];
    const question = stage.questions[currentQuestionIndex];

    // Update UI
    document.getElementById('stageTitle').textContent = stage.name;
    document.getElementById('questionText').textContent = question;

    // Show record button only on first question if not already recording
    const recordBtn = document.getElementById('recordBtn');
    if (currentStage === 0 && currentQuestionIndex === 0 && !isRecording) {
        recordBtn.style.display = 'block';
    } else if (isRecording) {
        recordBtn.style.display = 'none'; // Hide once recording starts
    }

    console.log(`Stage: ${stage.name}, Question ${currentQuestionIndex + 1}: ${question}`);
}

function nextQuestion() {
    const currentStageData = interviewData.stages[currentStage];

    // Check if there are more questions in current stage
    if (currentQuestionIndex < currentStageData.questions.length - 1) {
        // Move to next question in same stage
        currentQuestionIndex++;
        loadQuestion();
    } else {
        // Check if there are more stages
        if (currentStage < interviewData.stages.length - 1) {
            // Move to next stage
            currentStage++;
            currentQuestionIndex = 0;
            loadQuestion();

            // Change background for new stage
            changeStageBackground();
        } else {
            // All questions done
            endInterview();
        }
    }
}

function changeStageBackground() {
    const stageNames = ['infatuation', 'crystallization', 'deterioration'];
    const stageName = stageNames[currentStage];

    currentBackgroundImage = backgroundImages[stageName];
    console.log(`Changed background to: ${stageName}`);
}

function endInterview() {
    console.log('Interview complete!');
    stopQuestionTimer();
    stopRecording();

    // TODO: Show final garden view with all users' marks
}

function toggleRecording() {
    if (!isRecording) {
        startRecording();
    } else {
        stopRecording();
    }
}

async function startRecording() {
    try {
        console.log('Requesting microphone access...');
        
        // Request microphone permission
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        console.log('Microphone access granted!');
        
        // Set up Web Audio API
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        
        // Configure analyser
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        
        // Connect microphone to analyser
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        
        // Set recording flag
        isRecording = true;
        
        // Update button
        const recordBtn = document.getElementById('recordBtn');
        recordBtn.textContent = 'Recording...';
        recordBtn.classList.add('recording');
        
        // Hide button after a moment
        setTimeout(() => {
            recordBtn.style.display = 'none';
        }, 1000);
        
        console.log('Recording started!');
        
    } catch (error) {
        console.error('Microphone access denied:', error);
        alert('Please allow microphone access to continue.');
    }
}

function stopRecording() {
    console.log('Stopping recording...');
    isRecording = false;
    
    if (audioContext) {
        audioContext.close();
    }
    
    console.log('Recording stopped.');
}

/* -------------------------------------------------------------------------- */
/*                            AUDIO ANALYSIS                                  */
/* -------------------------------------------------------------------------- */

function getAudioLevel() {
    if (!analyser || !isRecording) {
        return 0;
    }
    
    // Get current audio data
    analyser.getByteTimeDomainData(dataArray);
    
    // Calculate RMS (Root Mean Square) amplitude
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
        const value = (dataArray[i] - 128) / 128; // Normalize to -1 to 1
        sum += value * value;
    }
    
    const rms = Math.sqrt(sum / dataArray.length);
    
    // Amplify and clamp between 0 and 1
    return Math.min(rms * 5, 1);
}

/* -------------------------------------------------------------------------- */
/*                         p5.js GARDEN SKETCH                                */
/* -------------------------------------------------------------------------- */

let gardenCanvas;
let currentBackgroundImage;
let questionTimer;
let questionInterval = 10000; // 10 seconds per question

function initializeGarden() {
    console.log('Initializing garden...');

    // Create p5 sketch in instance mode
    const sketch = (p) => {

        p.preload = function () {
            // Preload all background images
            backgroundImages = {
                infatuation: p.loadImage('/img/Infatuation.webp'),
                crystallization: p.loadImage('/img/Crystallization.webp'),
                deterioration: p.loadImage('/img/Deterioration.webp')
            };
        };

        p.setup = function () {
            // Create canvas that fills the garden screen
            let canvas = p.createCanvas(p.windowWidth, p.windowHeight);
            canvas.parent('gardenScreen');

            // Set initial background
            currentBackgroundImage = backgroundImages.infatuation;

            console.log('Garden canvas created');
        };

        p.draw = function () {
            // Draw current background image
            if (currentBackgroundImage) {
                p.image(currentBackgroundImage, 0, 0, p.width, p.height);
            }

            // Draw fertilizer marks (we'll add this later)
            drawFertilizerMarks(p);

            // Draw soundwave if recording (we'll add this later)
            if (isRecording) {
                drawSoundwave(p);
            }
        };

        p.windowResized = function () {
            p.resizeCanvas(p.windowWidth, p.windowHeight);
        };
    };

    // Create the p5 instance
    gardenCanvas = new p5(sketch);
}

// Global object to store background images
let backgroundImages = {};

// Placeholder functions (we'll implement these next)
function drawFertilizerMarks(p) {
    // TODO: Draw fertilizer marks from array
}

function drawSoundwave(p) {
    if (!analyser || !isRecording) return;
    
    // Get waveform data
    analyser.getByteTimeDomainData(dataArray);
    
    // Get overall audio level for intensity
    const level = getAudioLevel();
    
    p.push();
    
    // Draw from center of screen
    const centerX = p.width / 2;
    const centerY = p.height / 2;
    
    // Line styling
    p.noFill();
    p.strokeWeight(3);
    
    // Color based on stage
    const stageColors = [
        [255, 182, 193],  // Infatuation - soft pink
        [255, 140, 180],  // Crystallization - vibrant pink
        [180, 140, 200]   // Deterioration - purple
    ];
    
    const color = stageColors[currentStage];
    p.stroke(color[0], color[1], color[2], 200);
    
    // Draw the waveform
    p.beginShape();
    
    const waveWidth = p.width * 0.6; // 60% of screen width
    const waveHeight = 100 + (level * 150); // Varies with volume
    
    for (let i = 0; i < dataArray.length; i++) {
        // Map data index to x position
        const x = p.map(i, 0, dataArray.length, centerX - waveWidth/2, centerX + waveWidth/2);
        
        // Map audio value to y position
        const audioValue = dataArray[i];
        const y = p.map(audioValue, 0, 255, centerY - waveHeight/2, centerY + waveHeight/2);
        
        p.vertex(x, y);
    }
    
    p.endShape();
    
    // Add glow effect
    if (level > 0.1) {
        p.noStroke();
        p.fill(color[0], color[1], color[2], level * 30);
        p.circle(centerX, centerY, 200 + level * 100);
    }
    
    p.pop();
}

/* -------------------------------------------------------------------------- */
/*                               QUESTION TIMER                               */
/* -------------------------------------------------------------------------- */

function startQuestionTimer() {
    // Clear any existing timer
    if (questionTimer) {
        clearInterval(questionTimer);
    }

    // Advance to next question every 10 seconds
    questionTimer = setInterval(() => {
        nextQuestion();
    }, questionInterval);
}

function stopQuestionTimer() {
    if (questionTimer) {
        clearInterval(questionTimer);
        questionTimer = null;
    }
}