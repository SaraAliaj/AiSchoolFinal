import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

console.log('WebSocket server is running on port 8080');

wss.on('connection', (ws) => {
  console.log('Client connected');

  // Send a welcome message
  ws.send(JSON.stringify({
    response: "Connected to AI Learning Assistant"
  }));

  ws.on('message', async (message) => {
    try {
      const messageStr = message.toString();
      console.log('Received:', messageStr);

      // Parse the message (expected format: "lessonId|question")
      const [lessonId, question] = messageStr.split('|');

      if (!lessonId || !question) {
        ws.send(JSON.stringify({
          error: "Invalid message format. Expected 'lessonId|question'"
        }));
        return;
      }

      // For now, send a simple response
      ws.send(JSON.stringify({
        response: `I received your question about lesson ${lessonId}: ${question}`
      }));

    } catch (error) {
      console.error('Error processing message:', error);
      ws.send(JSON.stringify({
        error: "Internal server error"
      }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
}); 