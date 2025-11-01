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
/*                            p5.js setup function                            */
/* -------------------------------------------------------------------------- */
function setup() {
    // Create the canvas
    createCanvas(windowWidth, windowHeight);
};
/* -------------------------------------------------------------------------- */
/*                                DRAW LOOP                                  */
/* -------------------------------------------------------------------------- */
function draw() {
    background(220);
}
function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}