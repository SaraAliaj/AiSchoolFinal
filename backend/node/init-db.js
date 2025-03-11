import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import bcrypt from 'bcrypt';
import 'dotenv/config';

const initializeDatabase = async () => {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'Sara',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'aischool',
        multipleStatements: true
    });

    try {
        console.log('Reading SQL initialization file...');
        const sqlContent = await fs.readFile('./init.sql', 'utf8');

        // Replace the placeholder password with a properly hashed one
        const hashedPassword = await bcrypt.hash('admin123', 10);
        const sqlWithHashedPassword = sqlContent.replace('$2b$10$YourHashedPasswordHere', hashedPassword);

        console.log('Executing SQL statements...');
        await connection.query(sqlWithHashedPassword);
        console.log('Database initialization completed successfully!');

    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    } finally {
        await connection.end();
    }
};

// Run the initialization
initializeDatabase().catch(console.error); 