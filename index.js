/* -------------------------------------------------------------------------- */
/*                            SET UP EXPRESS SERVER                           */
/* -------------------------------------------------------------------------- */
let express = require('express');
let app = express();
let PORT = process.env.PORT || 3000;
// use the files on the public folder - my index.html is there
app.use(express.static('public'));
// the http thing needs to be a server for socket.io (not sure what this means)
let http = require('http');
let server = http.createServer(app);
// this starts the server for socket.io
const { Server } = require('socket.io');
const io = new Server(server);

// start the server and listens for new connections and disconnections
io.on('connection', (socket) => {
    console.log('We have a new client: ' + socket.id);
    
    // Assign user a random color when they connect
    const userColorPalette = [
        [90, 124, 101],   // Deep sage green
        [139, 169, 137],  // Soft leaf green
        [186, 142, 113],  // Warm terracotta
        [210, 180, 140],  // Tan/sand
        [255, 182, 193],  // Soft pink
        [255, 140, 180],  // Bright pink
        [230, 190, 138],  // Golden yellow
        [255, 218, 185],  // Peach
        [180, 140, 200],  // Soft purple
        [200, 162, 200],  // Light lavender
        [120, 180, 150],  // Mint green
        [255, 160, 122],  // Light coral
    ];
    
    const userColor = userColorPalette[Math.floor(Math.random() * userColorPalette.length)];
    
    // Send the user their assigned color
    socket.emit('assignColor', { color: userColor, userId: socket.id });
    
    console.log('Assigned color to', socket.id, ':', userColor);
    
    // Listen for new pixels from this user
    socket.on('newPixel', (pixelData) => {
        // Broadcast this pixel to ALL other clients (not sender)
        socket.broadcast.emit('pixelBroadcast', {
            ...pixelData,
            userId: socket.id
        });
    });
    
    // Listen for disconnect event
    socket.on('disconnect', () => {
        console.log('Client disconnected: ' + socket.id);
    });
});

// Start the HTTP server (not app.listen anymore!)
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});