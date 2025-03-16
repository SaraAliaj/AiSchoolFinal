import mysql from 'mysql2/promise';
import 'dotenv/config';

// Get environment variables with fallbacks
const DB_HOST = process.env.DB_HOST || 'quiz-database-8ags.onrender.com';
const DB_PORT = process.env.DB_PORT || 3306;
const DB_USER = process.env.DB_USER || 'Sara';
const DB_PASSWORD = process.env.DB_PASSWORD || 'Sara0330!!';
const DB_NAME = process.env.DB_NAME || 'aischool';
const RENDER_MYSQL_URL = process.env.RENDER_MYSQL_URL;

// Function to create a connection to MySQL with robust error handling
export async function createConnection() {
  console.log('Creating MySQL connection...');
  
  // Try different connection methods
  let connection;
  let lastError;
  
  // Method 1: Try using RENDER_MYSQL_URL if available
  if (RENDER_MYSQL_URL) {
    try {
      console.log('Trying to connect using RENDER_MYSQL_URL...');
      connection = await mysql.createConnection(RENDER_MYSQL_URL);
      console.log('Successfully connected using RENDER_MYSQL_URL');
      return connection;
    } catch (error) {
      console.error('Failed to connect using RENDER_MYSQL_URL:', error.message);
      lastError = error;
    }
  }
  
  // Method 2: Try connecting to external Render URL
  try {
    console.log('Trying to connect to external Render URL...');
    connection = await mysql.createConnection({
      host: 'quiz-database-8ags.onrender.com',
      port: 3306,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      ssl: {
        rejectUnauthorized: false
      }
    });
    console.log('Successfully connected to external Render URL');
    return connection;
  } catch (error) {
    console.error('Failed to connect to external Render URL:', error.message);
    lastError = error;
  }
  
  // Method 3: Try connecting with regular environment variables
  try {
    console.log('Trying to connect with environment variables...');
    connection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
      } : undefined
    });
    console.log('Successfully connected using environment variables');
    return connection;
  } catch (error) {
    console.error('Failed to connect with environment variables:', error.message);
    lastError = error;
  }
  
  // If all methods failed, throw the last error
  throw lastError || new Error('Failed to connect to MySQL database');
}

// Create and export a connection pool
export const createPool = () => {
  console.log('Creating MySQL connection pool...');
  
  const poolConfig = {
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false
    } : undefined
  };
  
  console.log('Pool configuration:', { 
    host: poolConfig.host,
    port: poolConfig.port,
    user: poolConfig.user,
    database: poolConfig.database,
    hasPassword: !!poolConfig.password,
    connectionLimit: poolConfig.connectionLimit
  });
  
  return mysql.createPool(poolConfig);
};

// Default export is the pool
const pool = createPool();
export default pool.promise(); 