/* -------------------------------------------------------------------------- */
/*                            SET UP EXPRESS SERVER                           */
/* -------------------------------------------------------------------------- */
let express = require('express');
let app = express();
let PORT = 3000;
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
    
    // Listen for new flower creation from clients
    socket.on('newFlower', (flowerData) => {
        console.log('Received flower from', socket.id);
        console.log('Flower data:', flowerData);
        
        // Broadcast this flower to ALL clients (including sender)
        io.emit('flowerBroadcast', flowerData);
    });
    
    // Listen for disconnect event
    socket.on('disconnect', () => {
        console.log('Client disconnected: ' + socket.id);
        
        // Notify all clients that this user disconnected
        io.emit('userDisconnected', socket.id);
        
        // Listen for audio activity updates
    socket.on('audioActivity', (audioData) => {
        // Broadcast to all other clients (not sender)
        socket.broadcast.emit('audioActivityBroadcast', audioData);
    });
    });
});
// Start the HTTP server (not app.listen anymore!)
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});