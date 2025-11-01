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
    // listen for a disconnect event
    socket.on('disconnect', () => {
        console.log('Client disconnected: ' + socket.id);
    });
});
// Start the HTTP server (not app.listen anymore!)
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});