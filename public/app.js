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

    // TO DO: Later we'll emit this to Socket.io so other users can see it
    // TO DO: Later we'll start audio recording here
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

/* ----------------------------- Garden function ---------------------------- */

function setupGarden() {

    // Create 4 trees. Each tree is an object: {x, y, size, color}
    // Distance from edges
    let margin = 150;
    // Top-left tree
    trees.push({
        x: margin,
        y: margin,
        size: 80,
        color: color(101, 67, 33) // Brown
    });
    // Top-right tree
    trees.push({
        x: width - margin,
        y: margin,
        size: 80,
        color: color(101, 67, 33)
    });
    // Bottom-left tree
    trees.push({
        x: margin,
        y: height - margin,
        size: 80,
        color: color(101, 67, 33)
    });
    // Bottom-right tree
    trees.push({
        x: width - margin,
        y: height - margin,
        size: 80,
        color: color(101, 67, 33)
    });
}

/* ----------------------------- Create Flower ------------------------------ */

function createFlower(x, y) {
    // Create a flower object at position (x, y) and returns an object with all the flower properties

    return {
        x: x,
        y: y,
        size: 55,
        color: color(
            random(200, 255),  // Red channel (soft pinks/reds)
            random(100, 200),  // Green channel
            random(150, 255)   // Blue channel (pastels)
        ),
        // Stage of limerence: 'infatuation', 'crystallization', 'deterioration'
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
        let tree = trees[i];  // Get the tree at index i
        fill(tree.color);
        noStroke();
        circle(tree.x, tree.y, tree.size);
    }
}

function drawFlowers() {
    // Loop through all flowers and draw each one
    for (let i = 0; i < flowers.length; i++) {
        let flower = flowers[i];  // Get the flower at index i
        fill(flower.color);
        noStroke();
        circle(flower.x, flower.y, flower.size);
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}