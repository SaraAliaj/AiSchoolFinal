import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Get database connection details from environment variables or use defaults
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 3306;
const DB_USER = process.env.DB_USER || 'Sara';
const DB_PASSWORD = process.env.DB_PASSWORD || 'Sara0330!!';
const DB_NAME = process.env.DB_NAME || 'aischool';

async function addPdfLesson() {
  // Create connection pool
  const pool = mysql.createPool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    console.log('Connecting to database...');
    
    // Make sure uploads directory exists
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Make sure we have our sample PDF
    const pdfPath = path.join(uploadsDir, 'neural-networks-intro.pdf');
    const samplePdfPath = path.join(__dirname, 'samples', 'sample.pdf');
    
    if (fs.existsSync(samplePdfPath) && !fs.existsSync(pdfPath)) {
      fs.copyFileSync(samplePdfPath, pdfPath);
      console.log(`Copied sample PDF to ${pdfPath}`);
    } else if (!fs.existsSync(pdfPath)) {
      // If no sample PDF exists, create a simple one
      const simplePdf = `%PDF-1.5
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Resources<<>>/Contents 4 0 R/Parent 2 0 R>>endobj
4 0 obj<</Length 51>>stream
BT /F1 24 Tf 100 700 Td (Deep Learning Intro) Tj ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000010 00000 n
0000000053 00000 n
0000000102 00000 n
0000000191 00000 n
trailer <</Size 5/Root 1 0 R>>
startxref
290
%%EOF`;
      
      fs.writeFileSync(pdfPath, simplePdf);
      console.log(`Created simple PDF at ${pdfPath}`);
    }
    
    // Check if we already have a Deep Learning course
    const [courseRows] = await pool.query(
      'SELECT id FROM courses WHERE name = ?',
      ['Deep Learning']
    );
    
    let courseId;
    if (courseRows.length > 0) {
      courseId = courseRows[0].id;
      console.log(`Using existing Deep Learning course with ID: ${courseId}`);
    } else {
      const [courseResult] = await pool.query(
        'INSERT INTO courses (name) VALUES (?)',
        ['Deep Learning']
      );
      
      courseId = courseResult.insertId;
      console.log(`Created Deep Learning course with ID: ${courseId}`);
    }
    
    // Check if we have Week 1
    const [weekRows] = await pool.query(
      'SELECT id FROM weeks WHERE name = ?',
      ['Week 1']
    );
    
    let weekId;
    if (weekRows.length > 0) {
      weekId = weekRows[0].id;
      console.log(`Using existing Week 1 with ID: ${weekId}`);
    } else {
      const [weekResult] = await pool.query(
        'INSERT INTO weeks (name, description) VALUES (?, ?)',
        ['Week 1', 'Introduction to Deep Learning']
      );
      
      weekId = weekResult.insertId;
      console.log(`Created Week 1 with ID: ${weekId}`);
    }
    
    // Check if we have Day 1
    const [dayRows] = await pool.query(
      'SELECT id FROM days WHERE day_name = ?',
      ['Monday']
    );
    
    let dayId;
    if (dayRows.length > 0) {
      dayId = dayRows[0].id;
      console.log(`Using existing Monday with ID: ${dayId}`);
    } else {
      const [dayResult] = await pool.query(
        'INSERT INTO days (day_name) VALUES (?)',
        ['Monday']
      );
      
      dayId = dayResult.insertId;
      console.log(`Created Monday with ID: ${dayId}`);
    }
    
    // Check if we already have a Neural Networks lesson
    const [lessonRows] = await pool.query(
      'SELECT id FROM lessons WHERE lesson_name LIKE ?',
      ['%Neural Networks%']
    );
    
    if (lessonRows.length > 0) {
      const lessonId = lessonRows[0].id;
      
      // Update the existing lesson with the PDF file path
      await pool.query(
        'UPDATE lessons SET file_path = ?, title = ? WHERE id = ?',
        ['/uploads/neural-networks-intro.pdf', 'Introduction to Neural Networks', lessonId]
      );
      
      console.log(`Updated existing lesson with ID: ${lessonId}`);
    } else {
      // Create a new Neural Networks lesson
      const [lessonResult] = await pool.query(
        'INSERT INTO lessons (course_id, week_id, day_id, lesson_name, file_path, title, content, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          courseId,
          weekId,
          dayId,
          'neural-networks-intro',
          '/uploads/neural-networks-intro.pdf',
          'Introduction to Neural Networks',
          'This lesson covers the fundamental concepts of neural networks in deep learning.',
          1
        ]
      );
      
      console.log(`Created new Neural Networks lesson with ID: ${lessonResult.insertId}`);
    }
    
    console.log('Done! You can now access the Neural Networks lesson in the curriculum.');
    console.log('Navigate to the Deep Learning course, Week 1, and click on the lesson to view the PDF.');
  } catch (error) {
    console.error('Error adding PDF lesson:', error);
  } finally {
    // Close the connection pool
    await pool.end();
  }
}

// Run the function
addPdfLesson().catch(console.error); 