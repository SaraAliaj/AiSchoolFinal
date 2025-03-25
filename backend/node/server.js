import 'dotenv/config';
import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import pdfIntegration from './pdf_integration.js';
import { Server } from 'socket.io';
import { createServer } from 'http';
import ensureAdminRoles from './ensure-admin-roles.js';
import { createPool } from './database.js';

const app = express();
const httpServer = createServer(app);

// Get the frontend URL from environment variable or use a default
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://quiz-frontend.onrender.com';
console.log('Frontend URL:', FRONTEND_URL);

const io = new Server(httpServer, {
  cors: {
    origin: [
      FRONTEND_URL,
      'https://aiacademia.tech',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174'
    ],
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  transports: ['polling', 'websocket']
});

// Configure CORS
app.use(cors({
  origin: [
    'https://aiacademia.tech',
    'https://quiz-frontend.onrender.com',
    'http://localhost:5173',
    'http://localhost:5174'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600 // Cache preflight requests for 10 minutes
}));

// Handle preflight requests explicitly
app.options('*', cors());

// Parse JSON bodies
app.use(express.json());

// Simple health check endpoint for Render
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

console.log('Database configuration loaded from database.js module');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Create a promise pool for database connections
const promisePool = createPool();

// Test database connection on startup
const testDatabaseConnection = async () => {
  try {
    const connection = await promisePool.getConnection();
    console.log('Successfully connected to MySQL database');
    connection.release();
    return true;
  } catch (error) {
    console.error('Failed to connect to MySQL database:', error);
    return false;
  }
};

// Ensure database tables exist
const ensureTablesExist = async () => {
  try {
    const connection = await promisePool.getConnection();
    
    // Create users table if it doesn't exist
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        surname VARCHAR(255),
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('student', 'lead_student', 'admin') DEFAULT 'student',
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    // Create personal_information table if it doesn't exist
    await connection.query(`
      CREATE TABLE IF NOT EXISTS personal_information (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        section_name VARCHAR(50) NOT NULL,
        section_data JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_section (user_id, section_name),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    
    connection.release();
    console.log('Database tables verified/created successfully');
    return true;
  } catch (error) {
    console.error('Error ensuring tables exist:', error);
    return false;
  }
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Database check endpoint
app.get('/api/db-check', async (req, res) => {
  try {
    console.log('Running database check...');
    
    // Check database connection
    const [connectionTest] = await promisePool.query('SELECT 1 + 1 AS result');
    console.log('Database connection test:', connectionTest);
    
    // Check if lessons table exists
    const [tablesCheck] = await promisePool.query('SHOW TABLES');
    const tables = tablesCheck.map(row => Object.values(row)[0]);
    console.log('Tables in database:', tables);
    
    // Use the utility function to ensure tables exist
    await ensureTablesExist();
    
    // Get the current structure of the lessons table
    const [lessonsStructure] = await promisePool.query('DESCRIBE lessons');
    
    // Check related tables
    const relatedTables = ['courses', 'weeks', 'days'];
    const relatedTablesStatus = {};
    
    for (const table of relatedTables) {
      const exists = tables.includes(table);
      relatedTablesStatus[table] = { exists };
      
      if (exists) {
        const [count] = await promisePool.query(`SELECT COUNT(*) as count FROM ${table}`);
        relatedTablesStatus[table].count = count[0].count;
      }
    }
    
    res.json({
      status: 'ok',
      databaseConnection: true,
      tables,
      lessons: {
        exists: tables.includes('lessons'),
        structure: lessonsStructure
      },
      relatedTables: relatedTablesStatus
    });
  } catch (error) {
    console.error('Database check error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Database check failed',
      error: {
        message: error.message,
        code: error.code,
        sqlMessage: error.sqlMessage
      }
    });
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  console.log('Received login request for email:', email);

  // Validate input
  if (!email || !password) {
    console.log('Missing required fields:', {
      email: !email,
      password: !password
    });
    return res.status(400).json({ 
      message: 'Please provide both email and password',
      missing: {
        email: !email,
        password: !password
      }
    });
  }

  try {
    // Test database connection first
    const connection = await promisePool.getConnection();
    console.log('Database connection established');
    
    try {
      // Get user by email
      const [users] = await connection.query(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );

      if (users.length === 0) {
        console.log('No user found with email:', email);
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      const user = users[0];
      console.log('User found:', { id: user.id, email: user.email, role: user.role });

      // Check if user is active
      if (!user.active) {
        console.log('Inactive user attempted login:', email);
        return res.status(401).json({ message: 'Account is deactivated' });
      }

      // Verify password
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        console.log('Invalid password for user:', email);
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      console.log('Password verified successfully for user:', email);

      // Generate token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      console.log('Login successful for user:', email);

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          surname: user.surname,
          email: user.email,
          role: user.role,
          active: user.active
        }
      });
    } catch (error) {
      console.error('Database error during login:', error);
      res.status(500).json({ 
        message: 'Server error during login',
        error: error.message,
        sqlMessage: error.sqlMessage
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Server error during login',
      error: error.message
    });
  }
});

// Register endpoint
app.post('/api/auth/register', async (req, res) => {
  const { username, surname, email, password } = req.body;

  console.log('Received registration request:', {
    username,
    surname,
    email,
    hasPassword: !!password
  });

  // Validate input
  if (!username || !email || !password) {
    console.log('Missing required fields:', {
      username: !username,
      email: !email,
      password: !password
    });
    return res.status(400).json({ 
      message: 'Please provide all required fields',
      missing: {
        username: !username,
        email: !email,
        password: !password
      }
    });
  }

  try {
    // Test database connection first
    const connection = await promisePool.getConnection();
    console.log('Database connection established');
    
    try {
      // Check if email already exists
      const [existing] = await connection.query(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (existing.length > 0) {
        console.log('Email already exists:', email);
        return res.status(400).json({ message: 'Email already registered' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      console.log('Password hashed successfully');

      // Determine role based on username and surname
      const role = (username.toLowerCase() === 'admin' && surname.toLowerCase() === 'admin') ? 'admin' : 'student';
      console.log(`Assigning role: ${role} for user: ${username} ${surname}`);

      // Insert new user with determined role
      const [result] = await connection.query(
        'INSERT INTO users (username, surname, email, password, role, active) VALUES (?, ?, ?, ?, ?, ?)',
        [username, surname, email, hashedPassword, role, true]
      );

      console.log('User registered successfully:', { id: result.insertId, role });

      const token = jwt.sign(
        { userId: result.insertId, email },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.status(201).json({
        token,
        user: {
          id: result.insertId,
          username,
          surname,
          email,
          role,
          active: true
        }
      });
    } catch (error) {
      console.error('Database error during registration:', error);
      res.status(500).json({ 
        message: 'Server error during registration',
        error: error.message,
        sqlMessage: error.sqlMessage
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      message: 'Server error during registration',
      error: error.message
    });
  }
});

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('No token provided or invalid token format');
    return res.status(401).json({ message: 'No token provided' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Set both userId and user for compatibility
    req.user = decoded;
    req.userId = decoded.userId;
    console.log('Token verified successfully:', { userId: decoded.userId });
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const [user] = await promisePool.query(
      'SELECT role FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (user.length === 0) {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    // Check for 'admin' role case-insensitively
    const userRole = user[0].role.toLowerCase();
    if (userRole !== 'admin' && userRole !== 'administrator' && userRole !== 'adminastrator') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    // If we got here, update the role to standardized 'admin' if needed
    if (user[0].role !== 'admin') {
      console.log(`Standardizing user ${req.user.userId} role from '${user[0].role}' to 'admin'`);
      await promisePool.query('UPDATE users SET role = ? WHERE id = ?', ['admin', req.user.userId]);
    }

    next();
  } catch (error) {
    console.error('Admin check error:', error);
    return res.status(500).json({ message: 'Server error during admin check' });
  }
};

// Token verification endpoint
app.get('/api/auth/verify', verifyToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// Middleware for handling file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Change the upload directory to the Python backend's downloads directory
    const uploadDir = path.join(process.cwd(), '..', 'python', 'downloads');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      console.log(`Creating upload directory: ${uploadDir}`);
      fs.mkdirSync(uploadDir, { recursive: true });
    } else {
      console.log(`Upload directory exists: ${uploadDir}`);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Create unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = file.fieldname + '-' + uniqueSuffix + ext;
    console.log(`Generated filename for upload: ${filename}`);
    cb(null, filename);
  }
});

// Configure multer with more detailed logging
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: function (req, file, cb) {
    console.log(`Received file in multer:`, {
      originalname: file.originalname,
      mimetype: file.mimetype,
      fieldname: file.fieldname,
      size: file.size
    });
    // Accept all file types for now to debug the issue
    cb(null, true);
  }
});

// API endpoints for course management
// Get all courses
app.get('/api/courses', async (req, res) => {
  try {
    const [rows] = await promisePool.query('SELECT id, name FROM courses ORDER BY name');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ message: 'Failed to fetch courses' });
  }
});

// Create a new course
app.post('/api/courses', verifyToken, isAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Course name is required' });
    }

    const [result] = await promisePool.query(
      'INSERT INTO courses (name) VALUES (?)',
      [name]
    );

    res.status(201).json({
      id: result.insertId,
      name,
      message: 'Course created successfully'
    });
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ message: 'Failed to create course' });
  }
});

app.get('/api/weeks', async (req, res) => {
  try {
    const [rows] = await promisePool.query(
      'SELECT id, name FROM weeks'
    );
    res.json(rows); // Send all weeks to the client
  } catch (error) {
    console.error('Error fetching weeks:', error);
    res.status(500).json({ message: 'Failed to fetch weeks' });
  }
});

// Get all days
app.get('/api/days', async (req, res) => {
  try {
    const [rows] = await promisePool.query('SELECT * FROM days');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching days:', error);
    res.status(500).json({ error: 'Failed to fetch days' });
  }
});

// New endpoint to fetch lessons
app.get('/api/lessons', async (req, res) => {
  try {
    // Modified query to include proper aliases for all fields and explicitly include the ID
    const [rows] = await promisePool.query(`
      SELECT 
        l.id, 
        l.lesson_name as title, 
        l.course_id, 
        l.week_id, 
        l.day_id, 
        l.file_path,
        c.name as course_name, 
        w.name as week_name, 
        d.day_name as day_name
      FROM lessons l
      JOIN courses c ON l.course_id = c.id
      JOIN weeks w ON l.week_id = w.id
      JOIN days d ON l.day_id = d.id
      ORDER BY l.id ASC
    `);
    
    // Ensure we always return an array, even if the query returns null or undefined
    const lessons = Array.isArray(rows) ? rows : [];
    
    // Log each lesson ID for debugging
    console.log(`Returning ${lessons.length} lessons with IDs:`, lessons.map(l => l.id).join(', '));
    
    // Set the content type explicitly and stringify the JSON
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(lessons));
  } catch (error) {
    console.error('Error fetching lessons:', error);
    // Return an empty array instead of an error object
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(JSON.stringify([]));
  }
});

// New endpoint to fetch lesson content by ID
app.get('/api/lessons/:id/content', async (req, res) => {
  try {
    const lessonId = req.params.id;
    console.log(`Fetching content for lesson ID: ${lessonId}`);
    
    // Get the lesson details including file path
    const [lessons] = await promisePool.query(
      'SELECT * FROM lessons WHERE id = ?',
      [lessonId]
    );
    
    console.log(`Query result for lesson ${lessonId}:`, lessons.length > 0 ? 'Found' : 'Not found');
    
    if (lessons.length === 0) {
      console.log(`Lesson ${lessonId} not found in database`);
      return res.status(404).json({ error: 'Lesson not found' });
    }
    
    const lesson = lessons[0];
    console.log(`Found lesson in database:`, {
      id: lesson.id,
      name: lesson.lesson_name,
      file_path: lesson.file_path
    });
    
    const relativePath = lesson.file_path;
    
    // Resolve the relative path - check all possible locations
    let resolvedPath;
    let fileExists = false;
    
    // Try different path resolutions
    const possiblePaths = [
      // Option 1: Direct path as stored
      relativePath,
      // Option 2: Path relative to python downloads directory
      path.join(process.cwd(), '..', 'python', relativePath),
      // Option 3: Path relative to current directory
      path.join(process.cwd(), relativePath),
      // Option 4: Path relative to node directory
      path.join(process.cwd(), '..', 'node', relativePath),
    ];
    
    console.log('Trying to resolve file path...');
    for (const testPath of possiblePaths) {
      console.log(`Checking path: ${testPath}`);
      if (fs.existsSync(testPath)) {
        console.log(`✅ Found file at: ${testPath}`);
        resolvedPath = testPath;
        fileExists = true;
        break;
      }
    }
    
    if (!fileExists) {
      console.error(`❌ File not found for lesson ${lessonId}. Tried paths:`, possiblePaths);
      return res.status(404).json({ error: 'Lesson file not found' });
    }
    
    // For PDF files, return file info but not the content
    if (resolvedPath.toLowerCase().endsWith('.pdf')) {
      console.log(`Returning PDF file info for: ${resolvedPath}`);
      return res.json({
        id: lesson.id,
        title: lesson.lesson_name,
        fileType: 'pdf',
        fileName: path.basename(resolvedPath)
      });
    }
    
    // For non-PDF files, return the content as before
    const fileContent = fs.readFileSync(resolvedPath, 'utf8');
    res.json({
      id: lesson.id,
      title: lesson.lesson_name,
      content: fileContent,
      fileType: path.extname(resolvedPath).substring(1) || 'txt',
      fileName: path.basename(resolvedPath)
    });
  } catch (error) {
    console.error('Error fetching lesson content:', error);
    res.status(500).json({ error: 'Failed to fetch lesson content' });
  }
});

// Upload lesson with materials - Simplified approach
app.post('/api/lessons', (req, res) => {
  console.log('Received lesson upload request');
  console.log('Request headers:', req.headers);
  
  // Use single middleware function for file upload
  upload.array('files', 10)(req, res, async function(err) {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({ message: 'File upload error', error: err.message });
    }
    
    console.log('Files received:', req.files?.length || 0);
    if (req.files && req.files.length > 0) {
      req.files.forEach((file, index) => {
        console.log(`File ${index + 1}:`, {
          originalname: file.originalname,
          filename: file.filename,
          path: file.path,
          mimetype: file.mimetype,
          size: file.size
        });
      });
    } else {
      console.error('No files were received by multer');
      // Check if files field exists in the request
      console.log('Request body keys:', Object.keys(req.body));
      console.log('Request files field:', req.body.files);
      console.log('Request content-type:', req.headers['content-type']);
      
      // Check if the request is multipart/form-data
      if (!req.headers['content-type'] || !req.headers['content-type'].includes('multipart/form-data')) {
        return res.status(400).json({
          message: 'Invalid content type',
          expected: 'multipart/form-data',
          received: req.headers['content-type']
        });
      }
    }
    
    console.log('Body fields:', req.body);
    
    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      console.error('No files were uploaded');
      return res.status(400).json({ 
        message: 'Missing required fields', 
        missingFields: ['files'] 
      });
    }
    
    const { courseId, weekId, dayId, title } = req.body;
    
    // Validate other required fields
    const missingFields = [];
    if (!courseId) missingFields.push('courseId');
    if (!weekId) missingFields.push('weekId');
    if (!dayId) missingFields.push('dayId');
    if (!title) missingFields.push('title');
    
    if (missingFields.length > 0) {
      console.log('Missing required fields:', missingFields);
      return res.status(400).json({ 
        message: 'Missing required fields', 
        missingFields 
      });
    }
    
    // Convert IDs to integers
    const courseIdInt = parseInt(courseId, 10);
    const weekIdInt = parseInt(weekId, 10);
    const dayIdInt = parseInt(dayId, 10);
    
    if (isNaN(courseIdInt) || isNaN(weekIdInt) || isNaN(dayIdInt)) {
      return res.status(400).json({ 
        message: 'Invalid ID values', 
        details: {
          courseId: isNaN(courseIdInt) ? 'Invalid' : 'Valid',
          weekId: isNaN(weekIdInt) ? 'Invalid' : 'Valid',
          dayId: isNaN(dayIdInt) ? 'Invalid' : 'Valid'
        }
      });
    }
    
    let connection;
    try {
      // Ensure required tables exist
      await ensureTablesExist();
      
      // Check if the related tables exist and have data
      try {
        const relatedTables = ['courses', 'weeks', 'days'];
        for (const table of relatedTables) {
          const [tableCheck] = await promisePool.query(`SHOW TABLES LIKE '${table}'`);
          if (tableCheck.length === 0) {
            console.error(`ERROR: ${table} table does not exist!`);
            return res.status(500).json({
              message: 'Database error',
              error: `${table} table does not exist`
            });
          }
          
          // Check if the ID exists in the related table
          let idToCheck;
          let columnName;
          
          if (table === 'courses') {
            idToCheck = courseIdInt;
            columnName = 'id';
          } else if (table === 'weeks') {
            idToCheck = weekIdInt;
            columnName = 'id';
          } else if (table === 'days') {
            idToCheck = dayIdInt;
            columnName = 'id';
          }
          
          const [idCheck] = await promisePool.query(
            `SELECT * FROM ${table} WHERE ${columnName} = ?`,
            [idToCheck]
          );
          
          if (idCheck.length === 0) {
            console.error(`ERROR: ${table} with ID ${idToCheck} does not exist!`);
            return res.status(500).json({
              message: 'Database error',
              error: `${table} with ID ${idToCheck} does not exist`
            });
          }
        }
      } catch (relatedTableError) {
        console.error('Error checking related tables:', relatedTableError);
        return res.status(500).json({
          message: 'Database error',
          error: 'Failed to check related tables',
          details: relatedTableError.message
        });
      }
      
      // Get a connection from the pool for transaction
      connection = await promisePool.getConnection();
      
      // Start transaction
      await connection.beginTransaction();
      
      // Process each file as a separate lesson
      for (const file of req.files) {
        console.log(`Processing file for database insertion:`, {
          originalname: file.originalname,
          path: file.path
        });
        
        try {
          // Create a relative path for database storage
          // Extract just the filename from the full path
          const filename = path.basename(file.path);
          // Create a relative path that will work after deployment
          const relativePath = `downloads/${filename}`;
          console.log(`Relative file path for database: ${relativePath}`);
          
          // Insert lesson with the new table structure
          const [result] = await connection.query(
            'INSERT INTO lessons (course_id, week_id, day_id, lesson_name, file_path) VALUES (?, ?, ?, ?, ?)',
            [
              courseIdInt,
              weekIdInt,
              dayIdInt,
              title,
              relativePath // Save the relative file path in the database
            ]
          );
          
          console.log(`Lesson record inserted for file: ${file.originalname}`, {
            insertId: result.insertId,
            affectedRows: result.affectedRows
          });
        } catch (insertError) {
          console.error(`Error inserting lesson for file ${file.originalname}:`, {
            error: insertError.message,
            code: insertError.code,
            sqlMessage: insertError.sqlMessage,
            sql: insertError.sql
          });
          throw insertError; // Re-throw to trigger rollback
        }
      }
      
      await connection.commit();
      console.log('Transaction committed successfully');
      
      res.status(201).json({ 
        message: 'Lesson uploaded successfully',
        fileCount: req.files.length
      });
    } catch (error) {
      console.error('Database error:', {
        message: error.message,
        code: error.code,
        sqlMessage: error.sqlMessage,
        sql: error.sql,
        stack: error.stack
      });
      
      if (connection) {
        try {
          await connection.rollback();
          console.log('Transaction rolled back due to error');
        } catch (rollbackError) {
          console.error('Error during rollback:', rollbackError);
        } finally {
          connection.release(); // Release the connection back to the pool
        }
      }
      
      res.status(500).json({ 
        message: 'Failed to upload lesson',
        error: error.message,
        sqlError: error.sqlMessage
      });
    }
  });
});

// New endpoint for uploading and processing PDF lessons
app.post('/api/lessons/pdf', (req, res) => {
  console.log('Received PDF lesson upload request');
  
  // Use single middleware function for file upload
  upload.single('pdfFile')(req, res, async function(err) {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({ message: 'File upload error', error: err.message });
    }
    
    console.log('File received:', req.file);
    if (!req.file) {
      console.error('No file was uploaded');
      return res.status(400).json({ 
        message: 'Missing required file', 
        missingFields: ['pdfFile'] 
      });
    }
    
    const { courseId, weekId, dayId, title } = req.body;
    
    // Validate other required fields
    const missingFields = [];
    if (!courseId) missingFields.push('courseId');
    if (!weekId) missingFields.push('weekId');
    if (!dayId) missingFields.push('dayId');
    if (!title) missingFields.push('title');
    
    if (missingFields.length > 0) {
      console.log('Missing required fields:', missingFields);
      return res.status(400).json({ 
        message: 'Missing required fields', 
        missingFields 
      });
    }
    
    // Convert IDs to integers
    const courseIdInt = parseInt(courseId, 10);
    const weekIdInt = parseInt(weekId, 10);
    const dayIdInt = parseInt(dayId, 10);
    
    if (isNaN(courseIdInt) || isNaN(weekIdInt) || isNaN(dayIdInt)) {
      return res.status(400).json({ 
        message: 'Invalid ID values', 
        details: {
          courseId: isNaN(courseIdInt) ? 'Invalid' : 'Valid',
          weekId: isNaN(weekIdInt) ? 'Invalid' : 'Valid',
          dayId: isNaN(dayIdInt) ? 'Invalid' : 'Valid'
        }
      });
    }
    
    try {
      // Process the PDF file
      const result = await pdfIntegration.processAndAddLesson(req.file.path, {
        courseId: courseIdInt,
        weekId: weekIdInt,
        dayId: dayIdInt,
        title
      });
      
      if (result.success) {
        res.status(201).json({ 
          message: 'PDF lesson processed and uploaded successfully',
          lessonId: result.lessonId
        });
      } else {
        res.status(500).json({ 
          message: 'Failed to process PDF lesson',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error processing PDF lesson:', error);
      res.status(500).json({ 
        message: 'Failed to process PDF lesson',
        error: error.message
      });
    }
  });
});

// Endpoint to download lesson file
app.get('/api/lessons/:id/download', async (req, res) => {
  try {
    const lessonId = req.params.id;
    console.log(`Attempting to download file for lesson ID: ${lessonId}`);
    
    const [lessons] = await promisePool.query(
      'SELECT * FROM lessons WHERE id = ?',
      [lessonId]
    );
    
    if (lessons.length === 0) {
      console.log(`Lesson ${lessonId} not found in database for download`);
      return res.status(404).json({ error: 'Lesson not found' });
    }
    
    const lesson = lessons[0];
    const relativePath = lesson.file_path;
    console.log(`Found lesson for download: ${lesson.lesson_name}, path: ${relativePath}`);
    
    // Resolve the relative path - check all possible locations
    let resolvedPath;
    let fileExists = false;
    
    // Try different path resolutions
    const possiblePaths = [
      // Option 1: Direct path as stored
      relativePath,
      // Option 2: Path relative to python downloads directory
      path.join(process.cwd(), '..', 'python', relativePath),
      // Option 3: Path relative to current directory
      path.join(process.cwd(), relativePath),
      // Option 4: Path relative to node directory
      path.join(process.cwd(), '..', 'node', relativePath),
    ];
    
    console.log('Trying to resolve file path for download...');
    for (const testPath of possiblePaths) {
      console.log(`Checking path: ${testPath}`);
      if (fs.existsSync(testPath)) {
        console.log(`✅ Found file for download at: ${testPath}`);
        resolvedPath = testPath;
        fileExists = true;
        break;
      }
    }
    
    if (!fileExists) {
      console.error(`❌ File not found for download - lesson ${lessonId}. Tried paths:`, possiblePaths);
      return res.status(404).json({ error: 'Lesson file not found for download' });
    }

    // Important: Set these headers to display PDF inline
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');  // This is crucial - 'inline' instead of 'attachment'
    
    // Stream the file to the response
    console.log(`Streaming file for download: ${resolvedPath}`);
    const fileStream = fs.createReadStream(resolvedPath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error serving PDF for download:', error);
    res.status(500).json({ error: 'Failed to serve PDF' });
  }
});

// Socket.io connection handler
const userSockets = new Map(); // Map to track user's socket connections
const onlineUsers = new Map(); // Map to track online users' info

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  // Store the user ID when they authenticate
  socket.on('authenticate', async (userId) => {
    if (!userId) {
      console.log('Authentication failed: No userId provided');
      return;
    }
    
    socket.userId = userId;
    console.log(`Socket ${socket.id} authenticated as user ${userId}`);
    
    try {
      // Add this socket to the user's connections
      if (!userSockets.has(userId)) {
        userSockets.set(userId, new Set());
      }
      userSockets.get(userId).add(socket.id);
      
      // Get user info from database
      const [userRows] = await promisePool.query(
        'SELECT username, surname, role, active FROM users WHERE id = ?',
        [userId]
      );
      
      if (userRows.length === 0) {
        console.log(`User ${userId} not found in database`);
        return;
      }
      
      const userInfo = {
        userId,
        username: userRows[0].username,
        surname: userRows[0].surname,
        role: userRows[0].role,
        active: true
      };
      
      // Update user's active status in database
      await promisePool.query(
        'UPDATE users SET active = TRUE, last_activity = NOW() WHERE id = ?',
        [userId]
      );
      
      // Store user info in onlineUsers map
      onlineUsers.set(userId, userInfo);
      
      console.log('User authenticated and status updated:', {
        ...userInfo,
        socketId: socket.id,
        totalSockets: userSockets.get(userId).size
      });
      
      // Get all currently online users
      const currentOnlineUsers = Array.from(onlineUsers.values());
      
      // Send current online users list to the newly connected user
      socket.emit('online_users', currentOnlineUsers);
      
      // Broadcast user's online status to all other clients
      socket.broadcast.emit('user_status_change', userInfo);
      
    } catch (error) {
      console.error('Error in socket authentication:', error);
    }
  });

  // Handle disconnection
  socket.on('disconnect', async () => {
    const userId = socket.userId;
    if (!userId) return;
    
    console.log(`Socket ${socket.id} disconnected for user ${userId}`);
    
    try {
      const userSocketSet = userSockets.get(userId);
      if (userSocketSet) {
        userSocketSet.delete(socket.id);
        console.log(`Remaining sockets for user ${userId}:`, userSocketSet.size);
        
        // If this was the user's last socket connection, mark them as offline
        if (userSocketSet.size === 0) {
          userSockets.delete(userId);
          onlineUsers.delete(userId);
          
          // Update database
          await promisePool.query(
            'UPDATE users SET active = FALSE, last_activity = NOW() WHERE id = ?',
            [userId]
          );
          
          // Get user info for the broadcast
          const [userRows] = await promisePool.query(
            'SELECT username, surname, role FROM users WHERE id = ?',
            [userId]
          );
          
          if (userRows.length > 0) {
            const offlineStatus = {
              userId,
              username: userRows[0].username,
              surname: userRows[0].surname,
              role: userRows[0].role,
              active: false
            };
            
            console.log('Broadcasting offline status:', offlineStatus);
            io.emit('user_status_change', offlineStatus);
          }
        }
      }
    } catch (error) {
      console.error('Error handling socket disconnect:', error);
    }
  });

  // Handle group chat messages
  socket.on('group_message', async (data) => {
    try {
      const { content } = data;
      const userId = socket.userId;

      if (!userId || !content) {
        return;
      }

      // Get user info
      const [userRows] = await promisePool.query(
        'SELECT username, surname, role FROM users WHERE id = ?',
        [userId]
      );

      if (userRows.length > 0) {
        const user = userRows[0];
        // Broadcast the message to all connected clients
        io.emit('group_message', {
          id: Date.now().toString(),
          content,
          sender: {
            id: userId,
            name: user.username,
            surname: user.surname,
            role: user.role
          },
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('Error handling group message:', error);
    }
  });

  // Handle lesson start
  socket.on('startLesson', (data) => {
    console.log('Lesson started:', data);
    // Broadcast to ALL connected clients
    io.emit('notification', {
      type: 'lesson_started',
      lessonName: data.lessonName,
      userName: data.userName,
      message: `${data.lessonName} - Started by ${data.userName}`
    });
  });

  // Handle lesson end
  socket.on('endLesson', (data) => {
    console.log('Lesson ended:', data);
    // Broadcast to ALL connected clients
    io.emit('notification', {
      type: 'lesson_ended',
      lessonName: data.lessonName,
      userName: data.userName,
      message: `${data.lessonName} - Ended by ${data.userName}`
    });
  });
});

// Add a more frequent cleanup interval for stale connections
setInterval(async () => {
  console.log('Running connection cleanup...');
  
  for (const [userId, sockets] of userSockets.entries()) {
    // Check if any sockets are still connected
    const connectedSockets = Array.from(sockets).filter(socketId => {
      const socket = io.sockets.sockets.get(socketId);
      return socket && socket.connected;
    });
    
    console.log(`User ${userId} has ${connectedSockets.length} active connections`);
    
    // If no sockets are connected, mark user as offline
    if (connectedSockets.length === 0) {
      try {
        console.log(`Marking user ${userId} as offline due to no active connections`);
        
        // Update user's active status to false
        await promisePool.query(
          'UPDATE users SET active = FALSE, last_activity = NOW() WHERE id = ?',
          [userId]
        );
        
        // Get user info for the socket event
        const [userRows] = await promisePool.query(
          'SELECT username, surname, role FROM users WHERE id = ?',
          [userId]
        );
        
        if (userRows.length > 0) {
          const offlineStatus = {
            userId,
            username: userRows[0].username,
            surname: userRows[0].surname,
            role: userRows[0].role,
            active: false
          };
          
          console.log('Broadcasting offline status from cleanup:', offlineStatus);
          io.emit('user_status_change', offlineStatus);
        }
        
        // Clean up the tracking maps
        userSockets.delete(userId);
        onlineUsers.delete(userId);
      } catch (error) {
        console.error('Error updating user status during cleanup:', error);
      }
    }
  }
}, 15000); // Run every 15 seconds instead of 30

// Update the startServer function
const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      throw new Error('Failed to connect to database');
    }
    
    // Ensure tables exist
    const tablesCreated = await ensureTablesExist();
    if (!tablesCreated) {
      throw new Error('Failed to create/verify database tables');
    }
    
    // Get PORT from environment variable
    const PORT = process.env.PORT || 3000;
    console.log(`Starting server with PORT=${PORT}`);
    
    // Start the HTTP server
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Frontend URL: ${FRONTEND_URL}`);
      console.log(`Server is listening on http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Promise Rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Admin routes
app.get('/api/admin/users', verifyToken, isAdmin, async (req, res) => {
  try {
    const [users] = await promisePool.query(
      'SELECT id, username, email, role, created_at FROM users'
    );
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Get all users
app.get('/api/admin/students', verifyToken, isAdmin, async (req, res) => {
  try {
    console.log('Fetching all users...');
    
    // First check if users table exists and has data
    const [tableCheck] = await promisePool.query('SHOW TABLES LIKE "users"');
    if (tableCheck.length === 0) {
      console.error('Users table does not exist!');
      return res.status(500).json({ message: 'Users table does not exist' });
    }

    // Check total number of users
    const [countResult] = await promisePool.query('SELECT COUNT(*) as count FROM users');
    console.log(`Total users in database: ${countResult[0].count}`);

    // Log the table structure
    const [tableStructure] = await promisePool.query('DESCRIBE users');
    console.log('Users table structure:', tableStructure);

    // Get all users with detailed logging
    const [users] = await promisePool.query(`
      SELECT 
        id,
        username,
        surname,
        email,
        role
      FROM users 
      ORDER BY username
    `);

    console.log('Raw users data:', users);
    console.log(`Found ${users.length} users`);
    
    // Log each user's data
    users.forEach(user => {
      console.log('User:', {
        id: user.id,
        username: user.username,
        surname: user.surname,
        email: user.email,
        role: user.role
      });
    });

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ 
      message: 'Failed to fetch users',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Update user role to lead_student
app.put('/api/admin/students/:id/role', verifyToken, isAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // First check if the user exists and get their current role
    const [userCheck] = await promisePool.query(
      'SELECT role FROM users WHERE id = ?',
      [userId]
    );

    if (userCheck.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const currentRole = userCheck[0].role;
    console.log(`Current role for user ${userId}: ${currentRole}`);

    // Update the role to lead_student
    const [result] = await promisePool.query(
      'UPDATE users SET role = "lead_student" WHERE id = ?',
      [userId]
    );

    if (result.affectedRows === 0) {
      return res.status(500).json({ message: 'Failed to update user role' });
    }

    console.log(`Successfully updated role for user ${userId} from ${currentRole} to lead_student`);
    res.json({ message: 'User role updated successfully' });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ 
      message: 'Failed to update user role',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Test endpoint to create a test user
app.post('/api/test/create-user', async (req, res) => {
  try {
    // Check if users table exists
    const [tableCheck] = await promisePool.query('SHOW TABLES LIKE "users"');
    if (tableCheck.length === 0) {
      console.error('Users table does not exist!');
      return res.status(500).json({ message: 'Users table does not exist' });
    }

    // Create test user
    const [result] = await promisePool.query(
      'INSERT INTO users (username, surname, email, password, role) VALUES (?, ?, ?, ?, ?)',
      ['Test', 'User', 'test@example.com', await bcrypt.hash('password123', 10), 'user']
    );

    console.log('Test user created successfully:', result.insertId);
    res.json({ message: 'Test user created successfully', userId: result.insertId });
  } catch (error) {
    console.error('Error creating test user:', error);
    res.status(500).json({ 
      message: 'Failed to create test user',
      error: error.message
    });
  }
});

// Add a logout endpoint to update active status
app.post('/api/auth/logout', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    console.log('Logging out user:', userId);
    
    // Update user's active status to false
    await promisePool.query(
      'UPDATE users SET active = FALSE WHERE id = ?',
      [userId]
    );

    // Get user info for the socket event
    const [userRows] = await promisePool.query(
      'SELECT username, surname FROM users WHERE id = ?',
      [userId]
    );

    if (userRows.length > 0) {
      // Emit socket event for online status update
      console.log('Emitting user_status_change event for user:', userId, 'to inactive');
      io.emit('user_status_change', { 
        userId, 
        username: userRows[0].username,
        surname: userRows[0].surname,
        active: false 
      });
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Modify the online users endpoint
app.get('/api/users/online', async (req, res) => {
  try {
    console.log('Fetching online users');
    
    // Get all users where active = true
    const [rows] = await promisePool.query(
      `SELECT id, username, surname, role, active 
       FROM users 
       WHERE active = TRUE
       ORDER BY 
         CASE WHEN role = 'lead_student' THEN 0 ELSE 1 END,
         username`
    );
    
    console.log('Online users found:', rows.length);
    console.log('Online users:', rows);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching online users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add this near the top of the file, after database connection setup
const cleanupOnlineStatus = async () => {
  try {
    // Reset all users to inactive on server start
    await promisePool.query('UPDATE users SET active = FALSE');
    console.log('Reset all users to inactive status on server start');
  } catch (error) {
    console.error('Failed to cleanup online status:', error);
  }
};

// Add chat endpoints
app.post('/api/chat', verifyToken, async (req, res) => {
  try {
    const { message, type } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const messageLC = message.toLowerCase();

    // Check for skill-based queries first
    if (messageLC.includes('who') || messageLC.includes('student') || messageLC.includes('anyone')) {
      // Programming language query
      if (messageLC.includes('java') || messageLC.includes('python') || messageLC.includes('javascript') || messageLC.includes('programming')) {
        let language = '';
        if (messageLC.includes('java') && !messageLC.includes('javascript')) language = 'java';
        else if (messageLC.includes('python')) language = 'python';
        else if (messageLC.includes('javascript')) language = 'javascript';

        if (language) {
          const [users] = await promisePool.query(`
            SELECT DISTINCT u.username, u.surname, u.email, p.section_data
            FROM users u
            JOIN personal_information p ON u.id = p.user_id
            WHERE p.section_name = 'programming'
            AND JSON_EXTRACT(p.section_data, '$.languages.${language}') IS NOT NULL
            AND JSON_EXTRACT(p.section_data, '$.languages.${language}') != ''
          `);

          if (users.length > 0) {
            const response = `💻 Found ${users.length} student(s) with ${language.charAt(0).toUpperCase() + language.slice(1)} experience:

${users.map(user => {
  const progData = JSON.parse(user.section_data);
  return `• ${user.username} ${user.surname || ''}
  📧 ${user.email}
  📊 Level: ${progData.languages[language].toUpperCase()}`
}).join('\n\n')}`;
            return res.json({ response });
          } else {
            return res.json({ 
              response: `I couldn't find any students with ${language.charAt(0).toUpperCase() + language.slice(1)} experience in the database.`
            });
          }
        }
      }

      // Python skill query
      if (messageLC.includes('python') || messageLC.includes('advanced python') || messageLC.includes('experienced in python')) {
        const [users] = await promisePool.query(`
          SELECT DISTINCT u.username, u.surname, u.email, p.section_data
          FROM users u
          JOIN personal_information p ON u.id = p.user_id
          WHERE p.section_name = 'programming'
          AND JSON_EXTRACT(p.section_data, '$.languages.python') = 'advanced'
        `);

        if (users.length > 0) {
          const response = `📊 Found ${users.length} student(s) advanced in Python:

${users.map(user => `• ${user.username} ${user.surname || ''}
  📧 ${user.email}`).join('\n\n')}`;
          return res.json({ response });
        }
      }

      // AI experience query
      if (messageLC.includes('ai') || messageLC.includes('artificial intelligence') || messageLC.includes('machine learning')) {
        const [users] = await promisePool.query(`
          SELECT DISTINCT u.username, u.surname, u.email, 
                 p_ai.section_data as ai_data,
                 p_prog.section_data as prog_data
          FROM users u
          JOIN personal_information p_ai ON u.id = p_ai.user_id
          LEFT JOIN personal_information p_prog ON u.id = p_prog.user_id AND p_prog.section_name = 'programming'
          WHERE p_ai.section_name = 'ai'
          AND (
            JSON_EXTRACT(p_ai.section_data, '$.aiExperience') IN ('advanced', 'practical')
            OR JSON_EXTRACT(p_ai.section_data, '$.hasML') = true
            OR JSON_EXTRACT(p_ai.section_data, '$.hasAIModels') = true
          )
        `);

        if (users.length > 0) {
          const response = `🤖 Found ${users.length} student(s) with AI experience:

${users.map(user => {
  const aiData = JSON.parse(user.ai_data);
  return `• ${user.username} ${user.surname || ''}
  📧 ${user.email}
  🎯 AI Experience: ${aiData.aiExperience || 'Not specified'}
  🧠 Machine Learning: ${aiData.hasML ? '✓' : '×'}
  🔬 AI Model Development: ${aiData.hasAIModels ? '✓' : '×'}
  ${aiData.tools ? `🛠️ Tools: ${aiData.tools.join(', ')}` : ''}`
}).join('\n\n')}`;
          return res.json({ response });
        }
      }

      // Database experience query
      if (messageLC.includes('database') || messageLC.includes('sql') || messageLC.includes('mysql')) {
        const [users] = await promisePool.query(`
          SELECT DISTINCT u.username, u.surname, u.email, p.section_data
          FROM users u
          JOIN personal_information p ON u.id = p.user_id
          WHERE p.section_name = 'database'
          AND JSON_EXTRACT(p.section_data, '$.databaseSystems') IS NOT NULL
        `);

        if (users.length > 0) {
          const response = `💾 Found ${users.length} student(s) with database experience:

${users.map(user => {
  const dbData = JSON.parse(user.section_data);
  return `• ${user.username} ${user.surname || ''}
  📧 ${user.email}
  🗄️ Database Systems: ${dbData.databaseSystems.join(', ')}`
}).join('\n\n')}`;
          return res.json({ response });
        }
      }

      // Cloud experience query
      if (messageLC.includes('cloud') || messageLC.includes('aws') || messageLC.includes('azure')) {
        const [users] = await promisePool.query(`
          SELECT DISTINCT u.username, u.surname, u.email, p.section_data
          FROM users u
          JOIN personal_information p ON u.id = p.user_id
          WHERE p.section_name = 'technical'
          AND JSON_EXTRACT(p.section_data, '$.cloudExperience') = true
        `);

        if (users.length > 0) {
          const response = `☁️ Found ${users.length} student(s) with cloud experience:

${users.map(user => `• ${user.username} ${user.surname || ''}
  📧 ${user.email}`).join('\n\n')}`;
          return res.json({ response });
        }
      }

      // If no specific skill matches were found but it was a skill query
      if (messageLC.includes('experience') || messageLC.includes('skilled') || messageLC.includes('advanced')) {
        return res.json({
          response: `I can help you find students with specific skills! Try asking about:
• Python expertise
• AI/Machine Learning experience
• Database knowledge
• Cloud computing experience

For example:
"Who is advanced in Python?"
"Are there any students with AI experience?"
"Show me students who know databases"
"Who has cloud computing experience?"`
        });
      }
    }

    // If not a skill query, proceed with the existing name search logic
    let searchTerm = '';
    if (messageLC.includes('about')) {
      searchTerm = messageLC.split('about')[1].trim();
    } else if (messageLC.includes('info')) {
      searchTerm = messageLC.split('info')[1].trim();
    } else {
      searchTerm = messageLC.trim();
    }
    
    // Clean up the search term - remove special characters and extra spaces
    searchTerm = searchTerm
      .replace(/[\]\[\(\)]/g, '') // Remove brackets
      .replace(/user|student|information|give|me|tell|who|is/gi, '')
      .trim();
    
    if (!searchTerm) {
      return res.json({
        response: 'Please provide a name to search for. You can ask about someone by saying "Tell me about [name]" or "Info about [name]".'
      });
    }

    console.log('Searching for user with term:', searchTerm);

    // Improved search query with better name matching
    const [users] = await promisePool.query(
      `SELECT id, username, surname, email 
       FROM users 
       WHERE LOWER(username) LIKE LOWER(?) 
          OR LOWER(surname) LIKE LOWER(?)
          OR LOWER(CONCAT(username, ' ', COALESCE(surname, ''))) LIKE LOWER(?)
          OR LOWER(email) LIKE LOWER(?)`,
      [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`]
    );

    if (!users || users.length === 0) {
      return res.json({
        response: `I couldn't find anyone matching "${searchTerm}" in our database. Please check the spelling and try again.`
      });
    }

    if (users.length > 1) {
      const userList = users.map(u => `${u.username} ${u.surname || ''}`).join('\n- ');
      return res.json({
        response: `I found multiple people matching "${searchTerm}":\n- ${userList}\n\nPlease be more specific with the name.`
      });
    }

    // Get the user's personal information
    const user = users[0];
    console.log('Found user:', user);

    // First verify the user exists in the users table
    if (!user.username || !user.email) {
      return res.json({
        response: `I found a user but their information appears to be incomplete.`
      });
    }

    // Get personal information with explicit JSON handling
    const [personalInfo] = await promisePool.query(
      'SELECT section_name, JSON_EXTRACT(section_data, "$") as section_data FROM personal_information WHERE user_id = ?',
      [user.id]
    );

    console.log('Found personal info:', personalInfo);

    if (personalInfo.length === 0) {
      return res.json({
        response: `📋 Student Information for ${user.username} ${user.surname || ''}\n📧 Email: ${user.email || 'Not provided'}\n\nNo additional personal information available for this user.`
      });
    }

    let response = `
👤 STUDENT PROFILE


🔹 Name: ${user.username.toUpperCase()} ${user.surname ? user.surname.toUpperCase() : ''}
🔹 Email: ${user.email || 'Not provided'}
🔹 Phone: ${personalInfo.find(s => s.section_name === 'profile')?.section_data?.phone || 'Not provided'}
🔹 Age: ${personalInfo.find(s => s.section_name === 'profile')?.section_data?.age || 'Not provided'}

🧠 TECHNICAL SKILLS
----------------------

💻 Programming Languages:
${Object.entries(personalInfo.find(s => s.section_name === 'programming')?.section_data?.languages || {})
  .filter(([_, level]) => level)
  .map(([lang, level]) => `  • ${lang} (${level.toUpperCase()})`)
  .join('\n') || '  • No programming languages specified'}

🧱 Development Stack:
${personalInfo.find(s => s.section_name === 'programming')?.section_data?.frameworks?.map(framework => 
  `  • ${framework}`).join('\n') || '  • No frameworks specified'}

📊 Technical Level: ${personalInfo.find(s => s.section_name === 'technical')?.section_data?.technicalProficiency?.toUpperCase() || 'Not specified'}

🤖 AI & DATA ENGINEERING
----------------------

🎯 AI Experience: ${personalInfo.find(s => s.section_name === 'ai')?.section_data?.aiExperience?.toUpperCase() || 'None'}
🔎 Machine Learning: ${personalInfo.find(s => s.section_name === 'ai')?.section_data?.hasML ? '✅' : '❌'}
🧪 Model Development: ${personalInfo.find(s => s.section_name === 'ai')?.section_data?.hasAIModels ? '✅' : '❌'}

🛠️ AI Tools:
${personalInfo.find(s => s.section_name === 'ai')?.section_data?.tools?.map(tool => 
  `  • ${tool}`).join('\n') || '  • No AI tools specified'}

🗃️ Databases:
${personalInfo.find(s => s.section_name === 'database')?.section_data?.databaseSystems?.map(db => 
  `  • ${db}`).join('\n') || '  • No database systems specified'}

💼 PROFESSIONAL EXPERIENCE
----------------------

🤝 Team Role: ${personalInfo.find(s => s.section_name === 'collaboration')?.section_data?.collaborationRole?.toUpperCase() || 'Not specified'}
🏆 Competitions: ${personalInfo.find(s => s.section_name === 'collaboration')?.section_data?.hasCompetitions ? '✅' : '❌'}

☁️ Cloud Computing: ${personalInfo.find(s => s.section_name === 'technical')?.section_data?.cloudExperience ? '✅' : '❌'}
📦 VM/Container Usage: ${personalInfo.find(s => s.section_name === 'technical')?.section_data?.vmExperience ? '✅' : '❌'}
🌐 Open Source Contributions: ${personalInfo.find(s => s.section_name === 'programming')?.section_data?.hasOpenSource ? '✅' : '❌'}
`;

return res.json({ response: response.trim() });

  } catch (error) {
    console.error('Error in chat endpoint:', error);
    return res.status(500).json({ error: 'An error occurred processing your request' });
  }
});

// Lesson-specific chat endpoint
app.post('/api/lessons/:id/chat', verifyToken, async (req, res) => {
  try {
    const lessonId = req.params.id;
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log(`Received lesson-specific chat message for lesson ${lessonId}: ${message}`);
    
    // Retrieve the lesson to get its content
    const [lessonRows] = await promisePool.query(
      `SELECT lessons.*, 
              courses.name as course_name, 
              weeks.name as week_name, 
              days.name as day_name
       FROM lessons
       JOIN courses ON lessons.course_id = courses.id
       JOIN weeks ON lessons.week_id = weeks.id
       JOIN days ON lessons.day_id = days.id
       WHERE lessons.id = ?`,
      [lessonId]
    );

    if (lessonRows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }
    
    const lesson = lessonRows[0];
    
    // Only answer questions for the Deep Learning lesson
    const isDeepLearningLesson = 
      (lesson.title && lesson.title.toLowerCase().includes('deep')) ||
      (lesson.course_name && lesson.week_name && 
       lesson.week_name.toLowerCase().includes('week 1') && 
       lesson.day_name.toLowerCase().includes('thursday'));
    
    if (!isDeepLearningLesson) {
      return res.json({ 
        response: "I'm sorry, but I'm only trained to answer questions about the Deep Learning lesson." 
      });
    }

    // Get the lesson content
    let content = null;
    try {
      // Try to use pdfIntegration if available
      if (typeof pdfIntegration !== 'undefined' && pdfIntegration.getLessonContent) {
        content = await pdfIntegration.getLessonContent(lessonId);
      }
    } catch (error) {
      console.error(`Error getting lesson content with pdfIntegration: ${error.message}`);
    }

    // Fall back to reading the file directly if pdfIntegration failed or isn't available
    if (!content) {
      try {
        const [fileRows] = await promisePool.query(
          'SELECT file_path FROM lesson_files WHERE lesson_id = ?',
          [lessonId]
        );
        
        if (fileRows.length > 0) {
          const filePath = fileRows[0].file_path;
          if (fs.existsSync(filePath)) {
            if (filePath.endsWith('.pdf')) {
              content = "This is a PDF lesson about Deep Learning. I can answer questions about neural networks, training methods, activation functions, and other deep learning concepts.";
            } else {
              content = fs.readFileSync(filePath, 'utf8');
            }
          }
        }
      } catch (error) {
        console.error(`Error reading lesson file: ${error.message}`);
      }
    }

    if (!content) {
      content = "Deep Learning lesson content is not available, but I can still try to answer general questions about deep learning.";
    }

    // Check if the question is related to deep learning
    const deepLearningKeywords = [
      'neural', 'network', 'deep learning', 'machine learning', 'ai', 'artificial intelligence', 
      'training', 'model', 'weights', 'bias', 'activation', 'function', 'backpropagation',
      'gradient', 'loss', 'epoch', 'batch', 'tensor', 'keras', 'tensorflow', 'pytorch',
      'convolutional', 'cnn', 'rnn', 'lstm', 'gan', 'transformer', 'supervised', 'unsupervised'
    ];
    
    const isRelatedToDeepLearning = deepLearningKeywords.some(keyword => 
      message.toLowerCase().includes(keyword.toLowerCase())
    );
    
    let response;
    
    if (isRelatedToDeepLearning) {
      // Generate a response based on the message and content
      // This is a simple implementation - in a real app, you'd use an AI model
      
      // Sample responses for specific types of questions
      if (message.toLowerCase().includes('what is deep learning')) {
        response = "Deep learning is a subfield of machine learning that deals with algorithms inspired by the structure and function of the human brain, known as artificial neural networks. It is widely used for tasks such as image recognition, speech processing, and natural language understanding.";
      } else if (message.toLowerCase().includes('neural network')) {
        response = "Neural networks are computational models inspired by biological neural networks in the human brain. They consist of layers of interconnected nodes (neurons) that process information. Each connection has a weight that adjusts during learning. Neural networks form the foundation of deep learning.";
      } else if (message.toLowerCase().includes('activation function')) {
        response = "Activation functions are mathematical functions applied to the outputs of neurons to introduce non-linearity, enabling the network to learn complex patterns. Common activation functions include ReLU (Rectified Linear Unit), Sigmoid, and Tanh.";
      } else if (message.toLowerCase().includes('training')) {
        response = "Training a deep learning model involves feeding it data, comparing its outputs to expected results, and adjusting the model's weights through backpropagation to minimize the difference between predicted and actual outputs. This process typically requires large amounts of data and computational resources.";
      } else {
        // Generic response about deep learning
        response = `Based on my understanding of deep learning, ${message} relates to concepts covered in neural network architecture and training. Deep learning models learn hierarchical representations of data through multiple layers of processing. Would you like more specific information on a particular aspect of deep learning?`;
      }
    } else {
      // Not related to deep learning
      response = "I'm specifically designed to help with questions about deep learning. Could you please ask a question related to deep learning concepts, neural networks, or machine learning?";
    }
    
    // Log the request for analytics
    console.log(`Lesson chat request from user ${req.user.userId} for lesson ${lessonId}: ${message}`);
    
    // Return the response
    return res.json({ response });
  } catch (error) {
    console.error('Error in lesson chat endpoint:', error);
    return res.status(500).json({ error: 'Failed to process chat message' });
  }
});

// Get lead student endpoint
app.get('/api/lead-student', verifyToken, async (req, res) => {
  try {
    const [rows] = await promisePool.query(
      'SELECT id, username, surname FROM users WHERE role = "lead_student" LIMIT 1'
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'No lead student found' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching lead student:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get today's lesson endpoint
app.get('/api/today-lesson', verifyToken, async (req, res) => {
  try {
    // Get current day of week (0 = Sunday, 1 = Monday, etc.)
    const today = new Date().getDay();
    // Convert to our day_id format (1 = Monday, 2 = Tuesday, etc.)
    const dayId = today === 0 ? 7 : today;
    
    console.log('Fetching lesson for day:', dayId);
    
    // Simplified query to get any lesson for this day
    const query = `
      SELECT l.title, l.lesson_name
      FROM lessons l
      WHERE l.day_id = ?
      ORDER BY l.week_id ASC, l.order_index ASC
      LIMIT 1
    `;
    
    const [rows] = await promisePool.query(query, [dayId]);
    console.log('Query result:', rows);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'No lesson found for today' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching today\'s lesson:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Add the personal information endpoint
app.post('/api/personal-info', verifyToken, async (req, res) => {
  try {
    const { section, data } = req.body;
    const userId = req.userId; // Get userId directly

    // Log the request for debugging
    console.log('Saving personal info:', {
      userId,
      section,
      data,
      headers: req.headers
    });

    if (!userId) {
      console.error('No user ID found in request');
      return res.status(401).json({ 
        error: 'User ID not found',
        details: 'Authentication token may be invalid or expired'
      });
    }

    // Check if section exists for user
    const [existingRecord] = await promisePool.query(
      'SELECT id FROM personal_information WHERE user_id = ? AND section_name = ?',
      [userId, section]
    );

    if (existingRecord.length > 0) {
      // Update existing record
      await promisePool.query(
        'UPDATE personal_information SET section_data = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND section_name = ?',
        [JSON.stringify(data), userId, section]
      );
      console.log('Updated existing record for user:', userId);
    } else {
      // Insert new record
      await promisePool.query(
        'INSERT INTO personal_information (user_id, section_name, section_data) VALUES (?, ?, ?)',
        [userId, section, JSON.stringify(data)]
      );
      console.log('Inserted new record for user:', userId);
    }

    res.json({ message: 'Personal information saved successfully' });
  } catch (error) {
    console.error('Error saving personal information:', error);
    res.status(500).json({ 
      error: 'Failed to save personal information',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}); 