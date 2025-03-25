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

// Print detailed connection info (without sensitive data)
console.log('Database Configuration:', {
  environment: process.env.NODE_ENV || 'development',
  isProduction,
  host: DB_HOST,
  port: DB_PORT,
  database: DB_NAME,
  user: DB_USER,
  hasPassword: !!DB_PASSWORD,
  allEnvVars: {
    NODE_ENV: process.env.NODE_ENV,
    DB_HOST: process.env.DB_HOST,
    DB_PORT: process.env.DB_PORT,
    DB_USER: process.env.DB_USER,
    DB_NAME: process.env.DB_NAME,
    DB_PASSWORD: process.env.DB_PASSWORD ? '***' : undefined
  }
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
    console.log(`Attempting to connect to MySQL at ${connectionConfig.host}:${connectionConfig.port}...`);
    const connection = await mysql.createConnection(connectionConfig);
    
    // Test the connection with a simple query
    const [result] = await connection.query('SELECT 1 + 1 AS result');
    console.log('Connection test successful:', result);
    
    console.log('MySQL connection established successfully!');
    return connection;
  } catch (error) {
    console.error('MySQL connection failed:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });
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
    user: poolConfig.user,
    isProduction,
    hasConnectionLimit: !!poolConfig.connectionLimit,
    hasSSL: !!poolConfig.ssl
  });
  
  const pool = mysql.createPool(poolConfig);
  
  // Test the pool connection
  pool.getConnection()
    .then(connection => {
      console.log('Pool connection test successful');
      connection.release();
    })
    .catch(error => {
      console.error('Pool connection test failed:', {
        message: error.message,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage
      });
    });
  
  return pool;
};

// Default export is the pool
const pool = createPool();
export default pool; 