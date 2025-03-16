import 'dotenv/config';
import promisePool from './database.js';
import { fileURLToPath } from 'url';

/**
 * This script ensures that admin roles in the database are correctly set to 'admin' (lowercase).
 * It can be run periodically or included in the server startup process.
 */
async function ensureAdminRoles() {
  console.log('Ensuring admin roles are correctly set...');
  
  try {
    // Fix any variations of 'admin' roles (Admin, ADMIN, adminastrator, etc.) to be lowercase 'admin'
    const [result] = await promisePool.query(
      `UPDATE users 
       SET role = 'admin' 
       WHERE LOWER(role) LIKE '%admin%' 
       AND role != 'admin'`
    );
    
    if (result.affectedRows > 0) {
      console.log(`Fixed ${result.affectedRows} user(s) with incorrect admin role format.`);
    } else {
      console.log('All admin roles are already correctly set.');
    }
    
    console.log('Admin role check completed.');
  } catch (error) {
    console.error('Error checking admin roles:', error.message);
  }
}

// Check if this is the main module being run directly
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  ensureAdminRoles().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

// Can also be imported and used in server.js
export default ensureAdminRoles; 