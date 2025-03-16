import 'dotenv/config';
import fs from 'fs';
import { createConnection } from './database.js';
import bcrypt from 'bcrypt';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const initializeDatabase = async () => {
    console.log('Starting database initialization...');
    
    let connection;

    try {
        // Use our robust connection method from database.js
        connection = await createConnection();    
        console.log('Database connection established');
        
        console.log('Reading SQL initialization file...');
        
        const sqlPath = path.join(__dirname, 'init.sql');
        console.log('SQL file path:', sqlPath);
        
        const sqlContent = await fs.promises.readFile(sqlPath, 'utf8');
        console.log('SQL file read successfully');

        // Replace the placeholder password with a properly hashed one
        const hashedPassword = await bcrypt.hash('admin123', 10);
        const sqlWithHashedPassword = sqlContent.replace('$2b$10$YourHashedPasswordHere', hashedPassword);

        console.log('Executing SQL statements...');
        await connection.query(sqlWithHashedPassword);
        console.log('Database initialization completed successfully!');

        // Verify tables were created
        const [tables] = await connection.query('SHOW TABLES');
        console.log('Created tables:', tables.map(t => Object.values(t)[0]));

    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    } finally {
        await connection.end();
    }
};

// Run the initialization
console.log('Starting database initialization script...');
initializeDatabase()
    .then(() => {
        console.log('Database initialization completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Database initialization failed:', error);
        process.exit(1);
    }); 