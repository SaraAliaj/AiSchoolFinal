const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 }); // Porti mund të ndryshohet sipas nevojës

wss.on('connection', (ws) => {
    console.log('A new client connected!');

    ws.on('message', (message) => {
        console.log(`Received: ${message}`);
        ws.send(`Server: You sent -> ${message}`);
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

console.log('WebSocket server is running on ws://localhost:8080'); 