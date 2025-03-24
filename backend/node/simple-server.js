import 'dotenv/config';
import express from 'express';
import cors from 'cors';

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Essential hardcoded endpoints BEFORE middleware
app.get('/api/today-lesson', (req, res) => {
  console.log('[NO AUTH] Serving today\'s lesson from hard-coded endpoint');
  res.json({ 
    title: "Database Connectivity and Error Handling", 
    lesson_name: "Web Development"
  });
});

app.get('/api/personal-info', (req, res) => {
  console.log('[NO AUTH] Serving personal info from hard-coded endpoint');
  res.json({ 
    studentInfo: {
      name: "Sara Aliaj",
      email: "saraaaliaj@test.com",
      age: 25,
      interests: ["Programming", "AI", "Web Development"]
    }
  });
});

app.get('/api/lead-student', (req, res) => {
  console.log('[NO AUTH] Serving lead student from hard-coded endpoint');
  res.json({
    username: "Sara",
    surname: "Aliaj",
    email: "saraaaliaj@test.com"
  });
});

app.get('/api/users/online', (req, res) => {
  console.log('[NO AUTH] Serving online users from hard-coded endpoint');
  res.json([
    {
      id: 1,
      username: "Sara",
      surname: "Aliaj",
      role: "lead_student",
      active: true
    },
    {
      id: 2,
      username: "Test",
      surname: "User",
      role: "student",
      active: true
    }
  ]);
});

// Basic login endpoint with hardcoded credentials
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  console.log('Login attempt:', email, password);
  
  // Check for Sara's credentials
  if (email === 'sara@example.com' && password === 'Sara0330!!') {
    res.json({
      token: 'demo-token-for-sara',
      user: {
        id: 1,
        username: 'Sara',
        surname: 'Aliaj',
        email: 'sara@example.com',
        role: 'lead_student',
        active: true
      }
    });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

// Simple token verification
app.get('/api/auth/verify', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (token === 'demo-token-for-sara') {
    res.json({
      valid: true,
      user: {
        id: 1,
        username: 'Sara',
        surname: 'Aliaj',
        email: 'sara@example.com',
        role: 'lead_student'
      }
    });
  } else {
    res.status(401).json({ valid: false, message: 'Invalid token' });
  }
});

// THEN configure CORS - AFTER the hardcoded endpoints
app.use(cors({
  origin: '*',
  credentials: true
}));

// Parse JSON bodies
app.use(express.json());

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Simple server is running' });
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Simple server running on port ${PORT}`);
}); 