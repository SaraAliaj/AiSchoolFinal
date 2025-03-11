// Database check script
import 'dotenv/config';
import mysql from 'mysql2/promise';
import fs from 'fs';

async function checkDatabase() {
  console.log('Database Check Script');
  console.log('=====================');
  
  // Log database configuration
  console.log('Database configuration:', {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    database: process.env.DB_NAME || 'aischool',
    hasPassword: !!process.env.DB_PASSWORD
  });
  
  let connection;
  
  try {
    // Connect to the database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'aischool'
    });
    
    console.log('Successfully connected to MySQL');
    
    // Test the connection with a simple query
    const [testResult] = await connection.query('SELECT 1 + 1 AS result');
    console.log('Database test query successful:', testResult);
    
    // Get all tables
    const [tablesResult] = await connection.query('SHOW TABLES');
    const tables = tablesResult.map(row => Object.values(row)[0]);
    console.log('Tables in database:', tables);
    
    // Check if lessons table exists
    const lessonsTableExists = tables.includes('lessons');
    console.log('Lessons table exists:', lessonsTableExists);
    
    if (!lessonsTableExists) {
      console.log('Creating lessons table...');
      
      // Create lessons table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS lessons (
          id INT AUTO_INCREMENT PRIMARY KEY,
          course_id INT NOT NULL,
          week_id INT NOT NULL,
          day_id INT NOT NULL,
          lesson_name VARCHAR(255) NOT NULL,
          file_path VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      console.log('Lessons table created successfully');
    }
    
    // Check lessons table structure
    const [lessonsStructure] = await connection.query('DESCRIBE lessons');
    console.log('Lessons table structure:');
    console.table(lessonsStructure);
    
    // Check if required columns exist
    const columns = lessonsStructure.map(col => col.Field);
    const requiredColumns = ['course_id', 'week_id', 'day_id', 'lesson_name', 'file_path'];
    const missingColumns = requiredColumns.filter(col => !columns.includes(col));
    
    if (missingColumns.length > 0) {
      console.log('Missing columns in lessons table:', missingColumns);
      
      // Add missing columns
      for (const column of missingColumns) {
        let columnType = '';
        if (['course_id', 'week_id', 'day_id'].includes(column)) {
          columnType = 'INT NOT NULL';
        } else {
          columnType = 'VARCHAR(255) NOT NULL';
        }
        
        await connection.query(`ALTER TABLE lessons ADD COLUMN ${column} ${columnType}`);
        console.log(`Added column ${column} to lessons table`);
      }
      
      // Check the updated structure
      const [updatedStructure] = await connection.query('DESCRIBE lessons');
      console.log('Updated lessons table structure:');
      console.table(updatedStructure);
    }
    
    // Check uploads directory
    const uploadDir = './uploads';
    if (!fs.existsSync(uploadDir)) {
      console.log(`Creating upload directory: ${uploadDir}`);
      fs.mkdirSync(uploadDir, { recursive: true });
    } else {
      console.log(`Upload directory exists: ${uploadDir}`);
      
      // Check if directory is writable
      try {
        const testFile = `${uploadDir}/test-${Date.now()}.txt`;
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        console.log('Upload directory is writable');
      } catch (error) {
        console.error('Upload directory is not writable:', error.message);
      }
    }
    
    // Count records in lessons table
    const [lessonsCount] = await connection.query('SELECT COUNT(*) as count FROM lessons');
    console.log(`Total lessons in database: ${lessonsCount[0].count}`);
    
    // Check related tables
    const relatedTables = ['courses', 'weeks', 'days'];
    for (const table of relatedTables) {
      if (tables.includes(table)) {
        const [count] = await connection.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`Total ${table} in database: ${count[0].count}`);
        
        // Show sample data
        const [sample] = await connection.query(`SELECT * FROM ${table} LIMIT 5`);
        console.log(`Sample ${table} data:`);
        console.table(sample);
      } else {
        console.error(`${table} table does not exist!`);
      }
    }
    
    console.log('Database check completed successfully');
  } catch (error) {
    console.error('Database check error:', {
      message: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
      stack: error.stack
    });
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Run the check
checkDatabase().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 