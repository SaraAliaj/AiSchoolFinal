import 'dotenv/config';
import mysql from 'mysql2/promise';

async function checkUsers() {
  console.log('Database Users Check Script');
  console.log('==========================');
  
  // Log database configuration
  console.log('Database configuration:', {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'Sara',
    database: process.env.DB_NAME || 'Sara0330!!',
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
    
    // Check users table
    const [users] = await connection.query('SELECT id, username, surname, email, role FROM users');
    console.log(`Total users in database: ${users.length}`);
    
    if (users.length > 0) {
      console.log('Users data:');
      console.table(users);
      
      // Check for admin users specifically
      const adminUsers = users.filter(user => user.role && user.role.toLowerCase() === 'admin');
      console.log(`Found ${adminUsers.length} admin users:`);
      console.table(adminUsers);
      
      // Check for users with incorrect capitalization in admin role
      const potentialIncorrectAdmins = users.filter(user => 
        user.role && 
        user.role.toLowerCase() === 'admin' && 
        user.role !== 'admin'
      );
      
      if (potentialIncorrectAdmins.length > 0) {
        console.log('Found users with incorrect admin role capitalization:');
        console.table(potentialIncorrectAdmins);
        
        // Fix these users by updating their roles to lowercase
        console.log('Updating admin roles to lowercase...');
        for (const user of potentialIncorrectAdmins) {
          await connection.query(
            'UPDATE users SET role = ? WHERE id = ?',
            ['admin', user.id]
          );
          console.log(`Updated user ${user.id} role from "${user.role}" to "admin"`);
        }
        
        // Verify the updates
        const [updatedUsers] = await connection.query(
          'SELECT id, username, email, role FROM users WHERE id IN (?)',
          [potentialIncorrectAdmins.map(u => u.id)]
        );
        console.log('Updated users:');
        console.table(updatedUsers);
      } else {
        console.log('No users found with incorrect admin role capitalization');
      }
    } else {
      console.log('No users found in the database');
    }
    
    console.log('User check completed successfully');
  } catch (error) {
    console.error('Database check error:', {
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

// Run the check
checkUsers().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 