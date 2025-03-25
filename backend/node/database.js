import mysql from 'mysql2/promise';
import 'dotenv/config';

// Enhanced connection settings
const isProduction = process.env.NODE_ENV === 'production';

// Connection configurations
const DB_HOST = isProduction ? 'quiz-database-8ags' : 'localhost';
const DB_PORT = process.env.DB_PORT || 3306;
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'aischool';

// Print connection info (without sensitive data)
console.log('Database environment:', {
  environment: process.env.NODE_ENV || 'development',
  isProduction,
  host: DB_HOST,
  port: DB_PORT,
  database: DB_NAME,
  hasPassword: !!DB_PASSWORD
});

// Function to create a connection to MySQL with robust error handling
export async function createConnection() {
  console.log('Creating MySQL connection...');
  
  const connectionConfig = {
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    multipleStatements: true,
    ssl: isProduction ? { rejectUnauthorized: false } : undefined
  };
  
  try {
    console.log(`Connecting to MySQL at ${connectionConfig.host}:${connectionConfig.port}...`);
    const connection = await mysql.createConnection(connectionConfig);
    console.log('MySQL connection successful!');
    return connection;
  } catch (error) {
    console.error('MySQL connection failed:', error.message);
    throw error;
  }
}

// Create and export a connection pool with enhanced settings
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
    ssl: isProduction ? { rejectUnauthorized: false } : undefined
  };
  
  console.log('Pool configuration:', {
    host: poolConfig.host,
    port: poolConfig.port,
    database: poolConfig.database,
    isProduction,
    hasConnectionLimit: !!poolConfig.connectionLimit
  });
  
  return mysql.createPool(poolConfig);
};

// Default export is the pool
const pool = createPool();
export default pool; 