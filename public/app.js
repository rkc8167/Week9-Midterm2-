/* -------------------------------------------------------------------------- */
/*                     p5.js CANVAS AND SOCKET CONNECTION                     */
/* -------------------------------------------------------------------------- */
let socket;
// Connect to the socket server
socket = io();
// Log when connected
socket.on('connect', () => {
    console.log('Someone connected to the server with ID: ' + socket.id);
});
// Listen for other users' audio activity
socket.on('audioActivityBroadcast', (data) => {
    // Find the flower with this user's ID
    for (let i = 0; i < flowers.length; i++) {
        if (flowers[i].id === data.id) {
            // Update their line data
            flowers[i].hasLine = true;
            flowers[i].audioLevel = data.level;
            flowers[i].lineTarget = data.lineTarget;
            break;
        }
    }
});

/* -------------------------------------------------------------------------- */
/*                         SOCKET.IO EVENT LISTENERS                          */
/* -------------------------------------------------------------------------- */

// Listen for new flowers from other users
socket.on('flowerBroadcast', (data) => {
    console.log('Received flower from user:', data.id);

    // Don't add the flower from actual user again
    if (data.id === socket.id) {
        return;
    }

    // Create a flower object from the received data (simplified)
    let newFlower = {
        x: data.x,
        y: data.y,
        emoji: data.emoji,
        stage: data.stage,
        id: data.id
    };

    // Add to the flowers array
    flowers.push(newFlower);

    console.log('Total flowers in garden:', flowers.length);
});

// Listen for when a user disconnects
socket.on('userDisconnected', (disconnectedId) => {
    console.log('User disconnected:', disconnectedId);

    // Claude recommended we used the filter method. This will remove any flower from the array if its id matches the disconnectedId.
    flowers = flowers.filter(flower => flower.id !== disconnectedId);

    // Also check if it was the current user's flower is the one from the disconnected user. If so, remove it by changing it to null.
    if (myFlower && myFlower.id === disconnectedId) {
        myFlower = null;
    }

    console.log('Remaining flowers:', flowers.length);
});

/* -------------------------------------------------------------------------- */
/*                           BUTTON EVENT LISTENERS                           */
/* -------------------------------------------------------------------------- */

// Wait for the DOM to load
window.addEventListener('DOMContentLoaded', () => {
    // Get the button element from the HTML <button id="recordBtn">
    let recordBtn = document.getElementById('recordBtn');

    // When button is clicked the recording starts
    recordBtn.addEventListener('click', startRecording);
});

// Function to record audio from the microphone and create a flower
function startRecording() {
    console.log('Button clicked! Creating flower...');

    // If user already has a flower, don't create another one
    if (myFlower !== null && myFlower !== undefined) {
        console.log('You already have a flower!');
        return;
    }

    // Create a flower at a random position in the center area of the garden
    let flowerX = random(width * 0.3, width * 0.7);  // Center 40% horizontally
    let flowerY = random(height * 0.3, height * 0.7); // Center 40% vertically

    myFlower = createFlower(flowerX, flowerY);

    // Add user's flower to the flowers array so it gets drawn
    flowers.push(myFlower);

    console.log('Flower created at:', myFlower.x, myFlower.y);

    // Emit the flower data to the server and make it available for all the other users
    // Emit the flower data to the server (simplified for emoji)
    socket.emit('newFlower', {
        id: socket.id,
        x: myFlower.x,
        y: myFlower.y,
        emoji: myFlower.emoji,
        stage: myFlower.stage
    });

    // Start audio recording
    startAudioCapture();

    /* -------------------------- AudioCapture Function ------------------------- */

    async function startAudioCapture() {
        // We used try and catch to handle the permission request from the browser
        try {
            console.log('Requesting microphone access...');

            // Request microphone permission from the browser
            // Claude recommended to use Web Audio API, the documentation for this is found on https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            console.log('Microphone access granted!');

            // Set up Web Audio API context and analyser
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();

            // Configure analyser
            // How many data points (smaller = faster) / FFT (fast fourier transform) is frequency data. We found this on https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/fftSize
            analyser.fftSize = 256;
            const bufferLength = analyser.frequencyBinCount;
            dataArray = new Uint8Array(bufferLength);

            // Connect microphone to analyser
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);

            // Set recording flag
            isRecording = true;

            /* ----------------- RANDOM POSITION FOR THE LIMERENT OBJECT ---------------- */

            // Set up the limerent object position (random offscreen location)
            // Randomly choose which side: 0=top, 1=right, 2=bottom, 3=left
            let side = floor(random(4));
            let offset = 200;  // Distance beyond screen edge

            if (side === 0) {
                // Top
                limerentObject.x = random(width * 0.2, width * 0.8);
                limerentObject.y = -offset;
            } else if (side === 1) {
                // Right
                limerentObject.x = width + offset;
                limerentObject.y = random(height * 0.2, height * 0.8);
            } else if (side === 2) {
                // Bottom
                limerentObject.x = random(width * 0.2, width * 0.8);
                limerentObject.y = height + offset;
            } else {
                // Left
                limerentObject.x = -offset;
                limerentObject.y = random(height * 0.2, height * 0.8);
            }

            console.log('Limerent object positioned offscreen at:', limerentObject.x, limerentObject.y);

            // Store line data in myFlower for broadcasting
            myFlower.hasLine = true;
            myFlower.lineTarget = {
                x: limerentObject.x,
                y: limerentObject.y
            };

            // Store original flower position
            originalFlowerPos.x = myFlower.x;
            originalFlowerPos.y = myFlower.y;

            console.log('Audio capture started!');

        } catch (error) {
            console.error('Microphone access denied or error:', error);
            alert('Please allow microphone access to use this feature!');
        }
    }
}

    /* ----------------------- Broadcast audio activity ----------------------- */

    function broadcastAudioActivity() {
        if (!isRecording || !myFlower) {
            return;
        }

        let level = getAudioLevel();

        // Send audio level and line target to other users
        socket.emit('audioActivity', {
            id: socket.id,
            level: level,
            lineTarget: {
                x: limerentObject.x,
                y: limerentObject.y
            }
        });
    }

/* -------------------------------------------------------------------------- */
/*                              GARDEN VARIABLES                              */
/* -------------------------------------------------------------------------- */
// Trees are permanent fixtures in the garden (emotional outlets)
let trees = [];

// Flowers represent users
let flowers = [];

// My flower (this user's representation)
let myFlower;

// Garden background color (placeholder - will be replaced with image later)
let gardenBgColor;

/* -------------------------------------------------------------------------- */
/*                              AUDIO VARIABLES                               */
/* -------------------------------------------------------------------------- */
let mic;
// Web Audio API variables
let audioContext;
let analyser;
let dataArray;
let isRecording = false;

// Limerent object (the invisible point the flower is attracted to)
let limerentObject = {
    x: null,
    y: null
};

// Store original flower position (to return to later)
let originalFlowerPos = {
    x: null,
    y: null
};

/* -------------------------------------------------------------------------- */
/*                            p5.js SETUP FUNCTION                            */
/* -------------------------------------------------------------------------- */
function setup() {
    // Create the canvas
    createCanvas(windowWidth, windowHeight);
    // Set garden background color (soft sage green)
    gardenBgColor = color(200, 220, 200);
    // Initialize the garden
    setupGarden();
};

//* ----------------------------- Garden function ---------------------------- */

function setupGarden() {
    // Create 4 trees. Each tree is an object: {x, y, emoji}
    // Distance from edges
    let margin = 150;

    // Array of tree emojis for variety
    let treeEmojis = ['🌳', '🌲', '🌴', '🎄'];

    // Top-left tree
    trees.push({
        x: margin,
        y: margin,
        emoji: random(treeEmojis)
    });

    // Top-right tree
    trees.push({
        x: width - margin,
        y: margin,
        emoji: random(treeEmojis)
    });

    // Bottom-left tree
    trees.push({
        x: margin,
        y: height - margin,
        emoji: random(treeEmojis)
    });

    // Bottom-right tree
    trees.push({
        x: width - margin,
        y: height - margin,
        emoji: random(treeEmojis)
    });
}

/* ----------------------------- Create Flower ------------------------------ */

function createFlower(x, y) {
    // Array of different flower emojis
    let flowerEmojis = ['🌸', '🌺', '🌻', '🌷', '🌹', '💐', '🏵️', '🌼'];

    return {
        x: x,
        y: y,
        emoji: random(flowerEmojis),
        stage: 'infatuation',
    };
}

/* -------------------------------------------------------------------------- */
/*                                DRAW LOOP                                  */
/* -------------------------------------------------------------------------- */
function draw() {
    // Draw background
    background(gardenBgColor);

    // Draw all trees
    drawTrees();

    // Draw other users' lines first (behind everything)
    drawOtherUsersLines();

    // Draw audio line if recording
    if (isRecording && myFlower) {
        drawAudioLine();
    }

    // Draw all flowers (users)
    drawFlowers();

    // Broadcast audio activity every frame (will be throttled by network)
    if (frameCount % 3 === 0) {  // Every 3 frames to reduce network load
        broadcastAudioActivity();
    }
}

/* -------------------------------------------------------------------------- */
/*                            DRAWING FUNCTIONS                               */
/* -------------------------------------------------------------------------- */

function drawTrees() {
    // Loop through all trees and draw each one
    for (let i = 0; i < trees.length; i++) {
        let tree = trees[i];

        // Draw tree emoji
        textSize(80);  // Trees are bigger than flowers
        textAlign(CENTER, CENTER);
        text(tree.emoji, tree.x, tree.y);
    }
}

function drawFlowers() {
    // Loop through all flowers and draw each one
    for (let i = 0; i < flowers.length; i++) {
        let flower = flowers[i];

        // Draw emoji at flower position
        textSize(60);
        textAlign(CENTER, CENTER);
        text(flower.emoji, flower.x, flower.y);
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

/* -------------------------------------------------------------------------- */
/*                               AUDIO FUNCTIONS                              */
/* -------------------------------------------------------------------------- */

function getAudioLevel() {
    if (!analyser || !isRecording) {
        return 0;
    }

    // Get the current audio data
    analyser.getByteTimeDomainData(dataArray);

    // Calculate average amplitude (volume)
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
        // dataArray values are 0-255, centered at 128
        let value = dataArray[i] - 128;
        sum += value * value;  // Square to get power
    }

    let average = Math.sqrt(sum / dataArray.length);

    // Normalize to 0-1 range and amplify
    return (average / 128) * 10;
}


/* ----------------------- Line visualization function ----------------------- */

function drawAudioLine() {
    // Get current audio level for overall intensity
    let level = getAudioLevel();

    // Get waveform data for the wavy effect
    analyser.getByteTimeDomainData(dataArray);

    push();

    // Line color - starts soft, gets more intense with volume
    let intensity = map(level, 0, 1, 100, 255);
    stroke(255, intensity * 0.4, intensity * 0.6, 200);  // Pink-ish color
    noFill();

    // Line thickness varies with audio
    let thickness = map(level, 0, 1, 2, 6);
    strokeWeight(thickness);

    // Draw wavy line using points from audio data
    beginShape();

    // Calculate number of points to draw along the line
    let numPoints = 50;  // More points = smoother wave

    // Claude recommended we used this loop that gets the audio data using the getByteFrequencyData() and the getByteTimeDomainData() functions. https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/getByteFrequencyData
    for (let i = 0; i < numPoints; i++) {
        // Calculate position along the line (0 to 1)
        let t = i / (numPoints - 1);

        // Interpolate between flower and limerent object. LERP is linear interpolation and is used to find a point between two points.
        let x = lerp(myFlower.x, limerentObject.x, t);
        let y = lerp(myFlower.y, limerentObject.y, t);

        // Get audio data for this point
        // Map i to dataArray index
        let dataIndex = floor(map(i, 0, numPoints, 0, dataArray.length));
        let audioValue = dataArray[dataIndex];

        // Convert audio value to offset (centered around 128)
        // audioValue is 0-255, we want it to oscillate around 0
        let waveOffset = map(audioValue, 0, 255, -20, 20);

        // Apply wave offset perpendicular to the line direction
        // Calculate perpendicular direction
        let dx = limerentObject.x - myFlower.x;
        let dy = limerentObject.y - myFlower.y;
        let lineLength = sqrt(dx * dx + dy * dy);

        // Perpendicular vector (rotated 90 degrees)
        let perpX = -dy / lineLength;
        let perpY = dx / lineLength;

        // Apply offset
        x += perpX * waveOffset * (level + 0.2);
        y += perpY * waveOffset * (level + 0.2);

        vertex(x, y);
    }

    endShape();
    pop();

    // Draw a subtle glow at the flower
    if (level > 0.1) {
        push();
        noStroke();
        fill(255, 100, 150, level * 50);
        circle(myFlower.x, myFlower.y, 80 + level * 40);
        pop();
    }
}

/* ----------------------- Draw other users' lines ----------------------- */

function drawOtherUsersLines() {
    for (let i = 0; i < flowers.length; i++) {
        let flower = flowers[i];

        // Skip if this is my flower or flower has no line
        if (flower === myFlower || !flower.hasLine) {
            continue;
        }

        // Draw their line (simplified - no waveform, just thickness)
        push();

        let level = flower.audioLevel || 0;
        let intensity = map(level, 0, 1, 100, 200);
        stroke(200, intensity * 0.4, intensity * 0.6, 150);  // Slightly transparent

        let thickness = map(level, 0, 1, 1, 4);
        strokeWeight(thickness);

        line(flower.x, flower.y, flower.lineTarget.x, flower.lineTarget.y);

        pop();
    }
}

/* -------------------------------------------------------------------------- */
/*                           MOUSE INTERACTION                                */
/* -------------------------------------------------------------------------- */

function mousePressed() {
    // Only allow tree clicking if user is recording
    if (!isRecording || !myFlower) {
        return;
    }

    // Check if user clicked on a tree
    for (let i = 0; i < trees.length; i++) {
        let secondsTime = 1000;
        let tree = trees[i];
        let distance = dist(mouseX, mouseY, tree.x, tree.y);

        // If click is within tree's area (40px radius)
        if (distance < 40) {
            console.log('Tree clicked! Redirecting line...');

            // Change limerent object position to this tree
            limerentObject.x = tree.x;
            limerentObject.y = tree.y;

            // Stop recording after a brief moment
            setTimeout(() => {
                stopRecording();
            }, secondsTime * 15);  // 15 seconds to see the transition

            break;
        }
    }
}

function stopRecording() {
    console.log('Stopping recording...');
    isRecording = false;

    // Optional: Close audio context to save resources
    if (audioContext) {
        audioContext.close();
    }

    console.log('Recording stopped. Line will fade away.');
}