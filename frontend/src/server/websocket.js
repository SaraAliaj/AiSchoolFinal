import { Server } from 'socket.io';
import { createServer } from 'http';

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Keep track of active lessons and their timers
const activeLessons = new Map();

io.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('startLesson', (data) => {
    const { lessonId, lessonName, duration, teacherName } = data;
    
    // Store lesson info
    activeLessons.set(lessonId, {
      name: lessonName,
      duration,
      teacherName,
      startTime: new Date(),
      timer: setTimeout(() => {
        // Automatically end lesson when time is up
        io.emit('lessonEnded', { lessonId, lessonName });
        activeLessons.delete(lessonId);
      }, duration * 60 * 1000)
    });

    // Emit to all clients including sender
    io.emit('lessonStarted', {
      lessonId,
      lessonName,
      duration,
      teacherName,
      timestamp: new Date()
    });
    console.log('Lesson started:', data);
  });

  socket.on('endLesson', (data) => {
    const { lessonId } = data;
    
    // Clear the timer if exists
    const lessonData = activeLessons.get(lessonId);
    if (lessonData) {
      clearTimeout(lessonData.timer);
      activeLessons.delete(lessonId);
    }

    // Emit to all clients
    io.emit('lessonEnded', {
      lessonId,
      lessonName: lessonData?.name || data.lessonName
    });
    console.log('Lesson ended:', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Clean up on server shutdown
process.on('SIGINT', () => {
  // Clear all active timers
  for (const [lessonId, lesson] of activeLessons) {
    clearTimeout(lesson.timer);
  }
  activeLessons.clear();
  process.exit(0);
});

const PORT = process.env.WEBSOCKET_PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
}); 