import promisePool from './database.js';

// Immediately invoked async function
(async () => {
  try {
    console.log('Testing database connection...');
    
    // Try a simple query
    const [result] = await promisePool.query('SELECT 1 + 1 AS result');
    console.log('Database query successful:', result);
    
    console.log('Database module working correctly!');
    process.exit(0);
  } catch (error) {
    console.error('Database test failed:', error);
    process.exit(1);
  }
})(); 