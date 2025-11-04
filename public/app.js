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
/*                          SOCKET.IO SETUP                                   */
/* -------------------------------------------------------------------------- */
const socket = io();

// User identification (assigned by server)
let userId = null;
let userColor = null;

// Listen for color assignment from server
socket.on('assignColor', (data) => {
    userId = data.userId;
    userColor = data.color;
    console.log('Assigned color:', userColor);
    console.log('User ID:', userId);
});

// Listen for pixels from other users
socket.on('pixelBroadcast', (pixelData) => {
    // Add pixel from another user to our display
    allPixelsFromDB.push({
        x: pixelData.x,
        y: pixelData.y,
        color: pixelData.color,
        size: pixelData.size,
        userId: pixelData.userId
    });
    console.log('Received pixel from another user!');
});

/* -------------------------------------------------------------------------- */
/*                            FERTILIZER SYSTEM                               */
/* -------------------------------------------------------------------------- */
let fertilizerMarks = []; // Stores all marks (local + from database)
let backgroundImage; // Garden background

/* -------------------------------------------------------------------------- */
/*                          PIXEL PARTICLE SYSTEM                             */
/* -------------------------------------------------------------------------- */
let particles = []; // Active particles flying from soundwave
let settledPixels = []; // Pixels that have settled (local session)
let allPixelsFromDB = []; // All pixels from ALL users (real-time only)

// Limits to keep it smooth
const MAX_PIXELS_PER_USER = 150; // Limit per session
const PARTICLE_SPAWN_RATE = 0.15; // Probability per frame when audio level is high
let userPixelCount = 0; // Track current user's pixel count

// Particle class - represents a flying pixel
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = p5.Vector.random2D().x * 2; // Random horizontal velocity
        this.vy = p5.Vector.random2D().y * 2; // Random vertical velocity
        this.color = userColor; // Use the user's assigned color
        this.life = 1.0; // Full opacity
        this.settled = false;
        this.size = Math.random() * 3 + 2; // 2-5 pixels
    }
    
    update() {
        // Move particle
        this.x += this.vx;
        this.y += this.vy;
        
        // Slow down over time
        this.vx *= 0.98;
        this.vy *= 0.98;
        
        // Gravity effect
        this.vy += 0.05;
        
        // Fade over time
        this.life -= 0.01;
        
        // Check if settled (stopped moving much)
        if (Math.abs(this.vx) < 0.1 && Math.abs(this.vy) < 0.1) {
            this.settled = true;
        }
    }
    
    display(p) {
        p.noStroke();
        p.fill(this.color[0], this.color[1], this.color[2], this.life * 255);
        p.circle(this.x, this.y, this.size);
    }
}

/* -------------------------------------------------------------------------- */
/*                              INITIALIZATION                                */
/* -------------------------------------------------------------------------- */

window.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    console.log('App initialized, waiting for color assignment...');
});

function setupEventListeners() {
    // Get all buttons
    const startBtn = document.getElementById('startBtn');
    const toRecordBtn = document.getElementById('toRecordBtn');
    const recordBtn = document.getElementById('recordBtn');
    const nextQuestionBtn = document.getElementById('nextQuestionBtn');
    const afterQuoteBtn = document.getElementById('afterQuoteBtn');
    const startOverBtn = document.getElementById('startOverBtn');
    
    // Attach event listeners
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            switchScreen('welcome', 'initialQuestion');
        });
    }
    
    if (toRecordBtn) {
        toRecordBtn.addEventListener('click', () => {
            switchScreen('initialQuestion', 'recordPrompt');
        });
    }
    
    if (recordBtn) {
        recordBtn.addEventListener('click', () => {
            startRecording();
            switchScreen('recordPrompt', 'question');
            // Show garden and start questions
            document.getElementById('gardenScreen').style.display = 'block';
            initializeGarden();
            loadQuestion();
        });
    }
    
    if (nextQuestionBtn) {
        nextQuestionBtn.addEventListener('click', () => {
            nextQuestion();
        });
    }
    
    if (afterQuoteBtn) {
        afterQuoteBtn.addEventListener('click', () => {
            switchScreen('quote', 'final');
        });
    }
    
    if (startOverBtn) {
        startOverBtn.addEventListener('click', () => {
            location.reload(); // Simple restart
        });
    }
    
    console.log('All event listeners attached');
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
            changeStageBackground();
        } else {
            // All questions done - go to quote screen
            endInterview();
        }
    }
}

function endInterview() {
    console.log('Interview complete!');
    stopRecording();
    
    // Switch to quote screen
    switchScreen('question', 'quote');
}

function changeStageBackground() {
    const stageNames = ['infatuation', 'crystallization', 'deterioration'];
    const stageName = stageNames[currentStage];

    currentBackgroundImage = backgroundImages[stageName];
    console.log(`Changed background to: ${stageName}`);
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
    
    // Only close if context exists and is not already closed
    if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
        console.log('AudioContext closed');
    } else {
        console.log('AudioContext already closed or does not exist');
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
                deterioration: p.loadImage('/img/Deterioration.webp'),
                background1: p.loadImage('/img/Background_1.webp'),
                background2: p.loadImage('/img/Background_2.webp'),
                background3: p.loadImage('/img/Background_3.webp'),
                imprintsBG: p.loadImage('/img/Imprints_Background.webp'),
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

            // Draw all settled pixels from database (all users)
            drawAllPixels(p);

            // Update and draw active particles
            updateAndDrawParticles(p);

            // Draw soundwave if recording
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
    // This is now handled by drawAllPixels() in p.draw()
    // Keeping this for backwards compatibility
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
    
    // Draw the waveform and emit particles
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
        
        // Spawn particles from waveform when audio is active
        if (level > 0.2 && Math.random() < PARTICLE_SPAWN_RATE && userPixelCount < MAX_PIXELS_PER_USER) {
            // Use user's assigned color
            const particle = new Particle(x, y);
            particles.push(particle);
        }
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

function updateAndDrawParticles(p) {
    // Update and draw active particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        
        particle.update();
        particle.display(p);
        
        // If particle has settled, save it
        if (particle.settled && userPixelCount < MAX_PIXELS_PER_USER) {
            const settledPixel = {
                x: particle.x,
                y: particle.y,
                color: particle.color,
                size: particle.size
            };
            
            // Add to local display
            settledPixels.push(settledPixel);
            allPixelsFromDB.push(settledPixel);
            userPixelCount++;
            
            // Send to other users via Socket.io
            socket.emit('newPixel', settledPixel);
            
            // Remove from active particles
            particles.splice(i, 1);
        }
        // Remove if faded out
        else if (particle.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function drawAllPixels(p) {
    // Draw all pixels from database (accumulated from all users)
    p.noStroke();
    for (let pixel of allPixelsFromDB) {
        p.fill(pixel.color[0], pixel.color[1], pixel.color[2], 180);
        p.circle(pixel.x, pixel.y, pixel.size);
    }
}