
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load environment variables
dotenv.config();

// Get database connection details from environment variables or use defaults
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 3306;
const DB_USER = process.env.DB_USER || 'Sara';
const DB_PASSWORD = process.env.DB_PASSWORD || 'Sara0330!!';
const DB_NAME = process.env.DB_NAME || 'aischool';

async function updateLessonPDF() {
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
    
    // Check the courses table structure
    const [coursesColumns] = await pool.query('SHOW COLUMNS FROM courses');
    console.log('Courses table structure:', coursesColumns.map(col => col.Field));

    // Check the lessons table structure
    const [lessonsColumns] = await pool.query('SHOW COLUMNS FROM lessons');
    console.log('Lessons table structure:', lessonsColumns.map(col => col.Field));
    
    // First check if we have the lesson in the database
    const lessonNameField = lessonsColumns.find(col => 
      col.Field === 'lesson_name' || col.Field === 'name'
    )?.Field || 'lesson_name';
    
    const [rows] = await pool.query(
      `SELECT id FROM lessons WHERE ${lessonNameField} LIKE ?`,
      ['%Neural Networks%']
    );
    
    if (rows.length === 0) {
      console.log('No matching lesson found. Running seed function...');
      
      // Insert Deep Learning course
      const courseInsertFields = ['name'];
      const courseInsertValues = ['Deep Learning'];
      
      if (coursesColumns.some(col => col.Field === 'description')) {
        courseInsertFields.push('description');
        courseInsertValues.push('Introduction to Deep Learning concepts and implementations');
      }
      
      const [courseResult] = await pool.query(
        `INSERT INTO courses (${courseInsertFields.join(', ')}) VALUES (${courseInsertFields.map(() => '?').join(', ')})`,
        courseInsertValues
      );
      
      const courseId = courseResult.insertId;
      console.log(`Created Deep Learning course with ID: ${courseId}`);
      
      // Insert Week 1
      const weekInsertFields = ['course_id', 'name', 'position'];
      const weekInsertValues = [courseId, 'Week 1', 1];
      
      if (coursesColumns.some(col => col.Field === 'description')) {
        weekInsertFields.push('description');
        weekInsertValues.push('Fundamentals of Neural Networks');
      }
      
      const [weekResult] = await pool.query(
        `INSERT INTO weeks (${weekInsertFields.join(', ')}) VALUES (${weekInsertFields.map(() => '?').join(', ')})`,
        weekInsertValues
      );
      
      const weekId = weekResult.insertId;
      console.log(`Created Week 1 with ID: ${weekId}`);
      
      // Check days table structure
      const [daysColumns] = await pool.query('SHOW COLUMNS FROM days');
      console.log('Days table structure:', daysColumns.map(col => col.Field));
      
      // Insert Day 1
      const dayNameField = daysColumns.find(col => 
        col.Field === 'day_name' || col.Field === 'name'
      )?.Field || 'name';
      
      const [dayResult] = await pool.query(
        `INSERT INTO days (week_id, ${dayNameField}, position) VALUES (?, ?, ?)`,
        [weekId, 'Day 1', 1]
      );
      
      const dayId = dayResult.insertId;
      console.log(`Created Day 1 with ID: ${dayId}`);
      
      // Insert Lesson 1
      const lessonInsertFields = ['day_id', 'course_id', 'week_id', lessonNameField, 'position'];
      const lessonInsertValues = [dayId, courseId, weekId, 'Introduction to Neural Networks', 1];
      
      if (lessonsColumns.some(col => col.Field === 'content_type')) {
        lessonInsertFields.push('content_type');
        lessonInsertValues.push('pdf');
      }
      
      const [lessonResult] = await pool.query(
        `INSERT INTO lessons (${lessonInsertFields.join(', ')}) VALUES (${lessonInsertFields.map(() => '?').join(', ')})`,
        lessonInsertValues
      );
      
      var lessonId = lessonResult.insertId;
      console.log(`Created Lesson 1 with ID: ${lessonId}`);
    } else {
      var lessonId = rows[0].id;
      console.log(`Found existing lesson with ID: ${lessonId}`);
    }

    // Update the lesson with the PDF file path
    const filePathField = lessonsColumns.find(col => 
      col.Field === 'file_path' || col.Field === 'content_path'
    )?.Field || 'file_path';
    
    const updateFields = [filePathField];
    const updateValues = ['uploads/neural-networks-intro.pdf'];
    
    if (lessonsColumns.some(col => col.Field === 'content_type')) {
      updateFields.push('content_type');
      updateValues.push('pdf');
    }
    
    if (lessonsColumns.some(col => col.Field === 'file_name')) {
      updateFields.push('file_name');
      updateValues.push('Neural Networks Introduction.pdf');
    }
    
    updateValues.push(lessonId);
    
    const [updateResult] = await pool.query(
      `UPDATE lessons SET ${updateFields.map(field => `${field} = ?`).join(', ')} WHERE id = ?`,
      updateValues
    );

    console.log(`Updated lesson ${lessonId} with PDF file path. Affected rows: ${updateResult.affectedRows}`);
    
    console.log('Done! You can now view the lesson PDF in the curriculum section.');
  } catch (error) {
    console.error('Error updating lesson PDF:', error);
  } finally {
    // Close the connection pool
    await pool.end();
  }
}

// Run the function
updateLessonPDF().catch(console.error); 