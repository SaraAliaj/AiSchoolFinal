import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the database.js file
const databaseFilePath = path.join(__dirname, 'database.js');

try {
  console.log(`Checking database.js file at: ${databaseFilePath}`);
  
  // Read the current content
  const content = fs.readFileSync(databaseFilePath, 'utf8');
  console.log('File read successfully');
  
  // Check if the file contains the issue
  if (content.includes('pool.promise()')) {
    console.log('Found issue: pool.promise() call detected');
    
    // Fix the issue by replacing pool.promise() with just pool
    const fixedContent = content.replace('export default pool.promise();', 'export default pool;');
    
    // Write the fixed content back to the file
    fs.writeFileSync(databaseFilePath, fixedContent, 'utf8');
    console.log('Fixed database.js file successfully');
    
    // Verify the fix
    const verifiedContent = fs.readFileSync(databaseFilePath, 'utf8');
    const isFixed = !verifiedContent.includes('pool.promise()');
    
    if (isFixed) {
      console.log('Verification successful: pool.promise() removed');
    } else {
      console.error('ERROR: Verification failed, pool.promise() still present');
      process.exit(1);
    }
  } else {
    console.log('No issue found: pool.promise() not detected in file');
  }
  
  // Test importing the module
  console.log('Testing database.js module import...');
  
  import('./database.js')
    .then(db => {
      console.log('Database module imported successfully!');
      console.log('Fix completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Failed to import database module:', error);
      process.exit(1);
    });
  
} catch (error) {
  console.error('Error fixing database.js file:', error);
  process.exit(1);
} 