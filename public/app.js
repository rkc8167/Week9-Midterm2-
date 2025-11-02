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
    // Get the button element
    let recordBtn = document.getElementById('recordBtn');

    // When button is clicked
    recordBtn.addEventListener('click', startRecording);
});

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

    // TODO: Later we'll start audio recording here
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

    // Draw all flowers (users)
    drawFlowers();
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