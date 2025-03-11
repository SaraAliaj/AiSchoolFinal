const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password'
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    process.exit(1);
  }

  // Create database if it doesn't exist
  connection.query('CREATE DATABASE IF NOT EXISTS aischool', (err) => {
    if (err) {
      console.error('Error creating database:', err);
      process.exit(1);
    }
    console.log('Database created or already exists');

    // Use the database
    connection.query('USE aischool', (err) => {
      if (err) {
        console.error('Error using database:', err);
        process.exit(1);
      }

      // Create users table if it doesn't exist
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(255) NOT NULL,
          surname VARCHAR(255),
          email VARCHAR(255) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL
        )
      `;

      connection.query(createTableQuery, (err) => {
        if (err) {
          console.error('Error creating table:', err);
          process.exit(1);
        }
        console.log('Table created or already exists');
        connection.end();
      });
    });
  });
}); 