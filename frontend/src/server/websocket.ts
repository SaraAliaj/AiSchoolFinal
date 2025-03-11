const { Server } = require('socket.io');
const { createServer } = require('http');

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'],
    methods: ["GET", "POST"],
    credentials: true
  }
});

io.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('startLesson', (data) => {
    // Emit to all clients including sender
    io.emit('lessonStarted', data);
    console.log('Lesson started:', data);
  });

  socket.on('endLesson', (data) => {
    // Broadcast to all clients except sender
    socket.broadcast.emit('lessonEnded', data);
    console.log('Lesson ended:', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.WEBSOCKET_PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});