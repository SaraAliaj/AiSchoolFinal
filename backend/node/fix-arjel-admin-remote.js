import 'dotenv/config';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';

async function fixArjelAdminRoleRemote() {
  console.log('Fix Arjel Admin Role Script (REMOTE DB)');
  console.log('======================================');
  
  // Log database configuration
  console.log('Remote database configuration:', {
    host: process.env.RENDER_MYSQL_HOST || 'quiz-database-8ags.onrender.com',
    port: process.env.RENDER_MYSQL_PORT || 3306,
    user: process.env.RENDER_MYSQL_USER || 'Sara ',
    database: process.env.RENDER_MYSQL_DATABASE || 'aischool',
    hasPassword: !!process.env.RENDER_MYSQL_PASSWORD
  });
  
  let connection;
  
  try {
    // Connect to the remote database
    connection = await mysql.createConnection({
      host: process.env.RENDER_MYSQL_HOST || 'quiz-database-8ags.onrender.com',
      port: process.env.RENDER_MYSQL_PORT || 3306,
      user: process.env.RENDER_MYSQL_USER || 'Sara',
      password: process.env.RENDER_MYSQL_PASSWORD || 'Sara0330!!',
      database: process.env.RENDER_MYSQL_DATABASE || 'aischool',
      ssl: {
        rejectUnauthorized: false // For SSL connection to Render MySQL
      }
    });
    
    console.log('Successfully connected to Remote MySQL');
    
    // Check if arjel@admin.com exists
    const [arjelUser] = await connection.query(
      "SELECT id, username, surname, email, role FROM users WHERE email = 'arjel@admin.com'"
    );
    
    if (arjelUser.length > 0) {
      console.log('Found arjel@admin.com user on remote DB:');
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
      console.log('User arjel@admin.com not found in remote database');
      
      // Create the user if it doesn't exist
      console.log('Creating arjel@admin.com with admin role...');
      const hashPassword = await bcrypt.hash('password123', 10); // Use a secure password
      
      const [insertResult] = await connection.query(
        `INSERT INTO users (username, surname, active, role, email, password) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['arjel', 'admin', 1, 'admin', 'arjel@admin.com', hashPassword]
      );
      
      console.log(`User created with ID: ${insertResult.insertId}`);
      
      // Verify the creation
      const [newUser] = await connection.query(
        "SELECT id, username, surname, email, role FROM users WHERE email = 'arjel@admin.com'"
      );
      console.log('New user:');
      console.table(newUser);
    }
    
    console.log('Remote admin role fix completed successfully');
  } catch (error) {
    console.error('Remote database operation error:', {
      message: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
      stack: error.stack
    });
  } finally {
    if (connection) {
      await connection.end();
      console.log('Remote database connection closed');
    }
  }
}

// Run the fix
fixArjelAdminRoleRemote().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 