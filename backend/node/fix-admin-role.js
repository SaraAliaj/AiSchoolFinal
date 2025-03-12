import 'dotenv/config';
import mysql from 'mysql2/promise';

async function fixAdminRole() {
  console.log('Fix Admin Role Script');
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
    
    // Find users with "adminastrator" role
    const [incorrectAdmins] = await connection.query(
      "SELECT id, username, surname, email, role FROM users WHERE role = 'adminastrator'"
    );
    
    console.log(`Found ${incorrectAdmins.length} users with incorrect admin role:`);
    console.table(incorrectAdmins);
    
    if (incorrectAdmins.length > 0) {
      // Update the role to "admin"
      const [result] = await connection.query(
        "UPDATE users SET role = 'admin' WHERE role = 'adminastrator'"
      );
      
      console.log(`Updated ${result.affectedRows} user(s) to have role 'admin'`);
      
      // Verify the updates
      const [updatedUsers] = await connection.query(
        'SELECT id, username, surname, email, role FROM users WHERE id IN (?)',
        [incorrectAdmins.map(u => u.id)]
      );
      console.log('Updated users:');
      console.table(updatedUsers);
    }
    
    // Also check if any users with "Admin" (capitalized) exist
    const [capitalizationIssues] = await connection.query(
      "SELECT id, username, surname, email, role FROM users WHERE role LIKE 'Admin%' AND role != 'admin'"
    );
    
    console.log(`Found ${capitalizationIssues.length} users with capitalization issues in admin role:`);
    console.table(capitalizationIssues);
    
    if (capitalizationIssues.length > 0) {
      // Update these roles to lowercase "admin"
      const [capResult] = await connection.query(
        "UPDATE users SET role = 'admin' WHERE role LIKE 'Admin%' AND role != 'admin'"
      );
      
      console.log(`Updated ${capResult.affectedRows} user(s) with capitalization issues`);
      
      // Verify the updates
      const [capUpdatedUsers] = await connection.query(
        'SELECT id, username, surname, email, role FROM users WHERE id IN (?)',
        [capitalizationIssues.map(u => u.id)]
      );
      console.log('Updated users with capitalization issues:');
      console.table(capUpdatedUsers);
    }
    
    // Final check
    const [finalAdmins] = await connection.query(
      "SELECT id, username, surname, email, role FROM users WHERE role = 'admin'"
    );
    
    console.log(`After fixes, found ${finalAdmins.length} users with correct admin role:`);
    console.table(finalAdmins);
    
    console.log('Admin role fix completed successfully');
  } catch (error) {
    console.error('Database operation error:', {
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

// Run the fix
fixAdminRole().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 