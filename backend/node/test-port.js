import express from 'express';
import http from 'http';

// Create a simple Express app
const app = express();
const server = http.createServer(app);

// Add a health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Test server is running' });
});

// Add a root endpoint
app.get('/', (req, res) => {
  res.send('Port binding test successful');
});

// Get PORT from environment variable
const PORT = process.env.PORT || 3000;

// Start the server - binding to 0.0.0.0 is critical for Render deployment
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Test server started with process ID: ${process.pid}`);
  console.log(`PORT environment variable: ${process.env.PORT}`);
  console.log(`Using PORT: ${PORT}`);
  console.log(`Server is listening on http://0.0.0.0:${PORT}`);
}); 