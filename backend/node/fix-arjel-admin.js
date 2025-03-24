import 'dotenv/config';
import mysql from 'mysql2/promise';

async function fixArjelAdminRole() {
  console.log('Fix Arjel Admin Role Script');
  console.log('==========================');
  
  // Log database configuration
  console.log('Database configuration:', {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'Sara',
    database: process.env.DB_NAME || 'aischool',
    hasPassword: !!process.env.DB_PASSWORD
  });
  
  let connection;
  
  try {
    // Connect to the database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'Sara',
      password: process.env.DB_PASSWORD || 'Sara0330!!',
      database: process.env.DB_NAME || 'aischool'
    });
    
    console.log('Successfully connected to MySQL');
    
    // Check if arjel@admin.com exists
    const [arjelUser] = await connection.query(
      "SELECT id, username, surname, email, role FROM users WHERE email = 'arjel@admin.com'"
    );
    
    if (arjelUser.length > 0) {
      console.log('Found arjel@admin.com user:');
      console.table(arjelUser);
      
      // Update the role to "admin" regardless of current value
      const [result] = await connection.query(
        "UPDATE users SET role = 'admin' WHERE email = 'arjel@admin.com'"
      );
      
      console.log(`Updated ${result.affectedRows} user(s) to have role 'admin'`);
      
      // Verify the update
      const [updatedUser] = await connection.query(
        "SELECT id, username, surname, email, role FROM users WHERE email = 'arjel@admin.com'"
      );
      console.log('Updated user:');
      console.table(updatedUser);
    } else {
      console.log('User arjel@admin.com not found in database');
    }
    
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
fixArjelAdminRole().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 