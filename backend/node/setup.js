import 'dotenv/config';
import { createConnection } from './database.js';
import bcrypt from 'bcrypt';

async function setupDatabase() {
  console.log('Starting database setup...');
  let connection;
  
  try {
    // Establish database connection
    connection = await createConnection();
    console.log('Database connection established');
    
    // Step 1: Ensure database exists
    try {
      await connection.query('CREATE DATABASE IF NOT EXISTS aischool');
      console.log('Database exists or was created');
    } catch (err) {
      console.log('Note: Database may already be selected:', err.message);
    }
    
    // Step 2: Use the database
    await connection.query('USE aischool');
    console.log('Using database: aischool');
    
    // Step 3: Create tables
    console.log('Creating tables...');
    
    // Create basic tables with minimal SQL
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        surname VARCHAR(255),
        active BOOLEAN DEFAULT TRUE,
        role VARCHAR(50) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Step 4: Insert admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    
    await connection.query(`
      INSERT INTO users (username, surname, active, role, email, password)
      VALUES ('admin', 'User', 1, 'admin', 'admin@test.com', ?)
      ON DUPLICATE KEY UPDATE role = 'admin'
    `, [adminPassword]);
    
    await connection.query(`
      INSERT INTO users (username, surname, active, role, email, password)
      VALUES ('arjel', 'admin', 1, 'admin', 'arjel@admin.com', ?)
      ON DUPLICATE KEY UPDATE role = 'admin'
    `, [adminPassword]);
    
    // Insert some sample data
    await connection.query(`
      INSERT INTO courses (name) VALUES ('react')
      ON DUPLICATE KEY UPDATE name = name
    `);
    
    // Verify tables were created
    const [tables] = await connection.query('SHOW TABLES');
    console.log('Tables in database:', tables.map(t => Object.values(t)[0]).join(', '));
    
    console.log('Database setup completed successfully!');
    
  } catch (error) {
    console.error('Database setup error:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Run setup with proper error handling
setupDatabase()
  .then(() => {
    console.log('✅ Database successfully configured');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Database setup failed:', err);
    process.exit(1);
  }); 