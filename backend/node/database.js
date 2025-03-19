import mysql from 'mysql2/promise';
import 'dotenv/config';

// Enhanced connection settings
const isProduction = process.env.NODE_ENV === 'production';

// Connection configurations
const DIRECT_MYSQL_URL = process.env.RENDER_MYSQL_URL || 'mysql://Sara:Sara0330!!@quiz-database-8ags.onrender.com:3306/aischool';

// Print connection info (without sensitive data)
console.log('Database environment:', {
  environment: process.env.NODE_ENV || 'development',
  isProduction,
  host: process.env.DB_HOST || 'quiz-database-8ags.onrender.com',
  port: process.env.DB_PORT || 3306,
  database: process.env.DB_NAME || 'aischool',
  hasPassword: !!(process.env.DB_PASSWORD || 'password')
});

// Function to create a connection to MySQL with robust error handling
export async function createConnection() {
  console.log('Creating MySQL connection...');
  
  // Try different connection methods
  let connection;
  let lastError;
  
  // Method 1: Try direct URL connection string (most reliable)
  try {
    console.log('Trying direct connection URL...');
    const connectionOptions = {
      uri: DIRECT_MYSQL_URL,
      multipleStatements: true, // Allow multiple SQL statements
      ssl: isProduction ? { rejectUnauthorized: false } : undefined
    };
    
    connection = await mysql.createConnection(DIRECT_MYSQL_URL);
    console.log('Successfully connected using direct URL');
    return connection;
  } catch (error) {
    console.error('Failed to connect using direct URL:', error.message);
    lastError = error;
  }
  
  // Method 2: Try with explicit parameters - external URL
  try {
    console.log('Trying external Render URL with explicit parameters...');
    connection = await mysql.createConnection({
      host: 'quiz-database-8ags.onrender.com',
      port: 3306,
      user: 'root',
      password: 'password',
      database: 'aischool',
      multipleStatements: true, // Allow multiple SQL statements
      ssl: {
        rejectUnauthorized: false
      }
    });
    console.log('Successfully connected to external Render URL');
    return connection;
  } catch (error) {
    console.error('Failed to connect with external URL:', error.message);
    lastError = error;
  }
  
  // Method 3: Try local development connection
  if (!isProduction) {
    try {
      console.log('Trying local development connection...');
      connection = await mysql.createConnection({
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: 'password',
        database: 'aischool',
        multipleStatements: true // Allow multiple SQL statements
      });
      console.log('Successfully connected to local database');
      return connection;
    } catch (error) {
      console.error('Failed to connect to local database:', error.message);
      lastError = error;
    }
  }
  
  // If all methods failed, throw the last error
  throw lastError || new Error('Failed to connect to MySQL database - all connection methods failed');
}

// Create and export a connection pool with enhanced settings
export const createPool = () => {
  console.log('Creating MySQL connection pool...');
  
  const poolConfig = isProduction ? {
    // Production pool config
    uri: DIRECT_MYSQL_URL,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000, // 10 seconds
    ssl: { rejectUnauthorized: false }
  } : {
    // Development pool config
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'password',
    database: 'aischool',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };
  
  console.log('Pool configuration:', {
    host: poolConfig.host || 'Using connection string',
    port: poolConfig.port,
    database: poolConfig.database || 'From connection string',
    isProduction,
    hasConnectionLimit: !!poolConfig.connectionLimit
  });
  
  return mysql.createPool(poolConfig);
};

// Default export is the pool
const pool = createPool();
export default pool; 