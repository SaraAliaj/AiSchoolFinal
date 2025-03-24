import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get database connection details from environment variables or use defaults
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 3306;
const DB_USER = process.env.DB_USER || 'Sara';
const DB_PASSWORD = process.env.DB_PASSWORD || 'Sara0330!!';
const DB_NAME = process.env.DB_NAME || 'aischool';

async function checkTables() {
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
    
    // Get list of tables
    const [tables] = await pool.query('SHOW TABLES');
    console.log('Tables in database:', tables.map(t => Object.values(t)[0]));
    
    // Check each table's structure
    const tablesToCheck = ['courses', 'weeks', 'days', 'lessons'];
    
    for (const table of tablesToCheck) {
      try {
        const [columns] = await pool.query(`SHOW COLUMNS FROM ${table}`);
        console.log(`\n${table} table structure:`);
        columns.forEach(col => {
          console.log(`- ${col.Field} (${col.Type}${col.Key === 'PRI' ? ', Primary Key' : ''})`);
        });
        
        // Show a few rows
        const [rows] = await pool.query(`SELECT * FROM ${table} LIMIT 3`);
        console.log(`\nSample data from ${table}:`);
        console.log(rows);
      } catch (error) {
        console.error(`Error checking table ${table}:`, error.message);
      }
    }
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    // Close the connection pool
    await pool.end();
  }
}

// Run the function
checkTables().catch(console.error); 