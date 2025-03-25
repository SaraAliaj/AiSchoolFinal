import 'dotenv/config';
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
        
        // Create tables one by one
        console.log('Creating tables...');
        
        // Create courses table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS courses (
                id int NOT NULL AUTO_INCREMENT,
                name varchar(100) NOT NULL,
                created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
        `);
        
        // Create weeks table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS weeks (
                id int NOT NULL AUTO_INCREMENT,
                name varchar(10) NOT NULL,
                created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
        `);
        
        // Create days table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS days (
                id int NOT NULL AUTO_INCREMENT,
                day_name varchar(50) NOT NULL,
                created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
        `);
        
        // Create users table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id int NOT NULL AUTO_INCREMENT,
                username varchar(50) NOT NULL,
                surname varchar(255) NOT NULL,
                active tinyint(1) NULL DEFAULT 1,
                role varchar(255) NOT NULL,
                email varchar(100) NOT NULL,
                password varchar(255) NOT NULL,
                created_at datetime NULL DEFAULT CURRENT_TIMESTAMP,
                last_activity timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY username (username),
                UNIQUE KEY email (email)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
        `);
        
        // Create lessons table after other tables
        await connection.query(`
            CREATE TABLE IF NOT EXISTS lessons (
                id int NOT NULL AUTO_INCREMENT,
                course_id int NOT NULL,
                week_id int NOT NULL,
                day_id int NOT NULL,
                lesson_name varchar(255) NOT NULL,
                file_path varchar(255) NOT NULL,
                created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
                lesson_time datetime NULL,
                PRIMARY KEY (id),
                KEY course_id (course_id),
                KEY week_id (week_id),
                KEY day_id (day_id),
                CONSTRAINT lessons_ibfk_1 FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE,
                CONSTRAINT lessons_ibfk_2 FOREIGN KEY (week_id) REFERENCES weeks (id) ON DELETE CASCADE,
                CONSTRAINT lessons_ibfk_3 FOREIGN KEY (day_id) REFERENCES days (id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
        `);
        
        console.log('All tables created successfully');
        
        // Insert initial data
        try {
            // Insert test course
            await connection.query(`
                INSERT INTO courses (name) VALUES ('react')
                ON DUPLICATE KEY UPDATE name = name
            `);
            
            // Insert weeks
            await connection.query(`
                INSERT INTO weeks (name) VALUES 
                ('Week 1'),
                ('Week 2'),
                ('Week 3'),
                ('Week 4')
                ON DUPLICATE KEY UPDATE name = VALUES(name)
            `);
            
            // Insert days
            await connection.query(`
                INSERT INTO days (day_name) VALUES 
                ('Monday'),
                ('Tuesday'),
                ('Wednesday'),
                ('Thursday'),
                ('Friday')
                ON DUPLICATE KEY UPDATE day_name = VALUES(day_name)
            `);
            
            console.log('Initial data inserted successfully');
        } catch (error) {
            console.warn('Warning: Could not insert initial data:', error.message);
        }
        
        // Create admin user
        try {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            
            await connection.query(`
                INSERT INTO users (username, surname, active, role, email, password) 
                VALUES ('admin', 'admin', 1, 'admin', 'admin@test.com', ?)
                ON DUPLICATE KEY UPDATE role = 'admin'
            `, [hashedPassword]);
            
            console.log('Admin user created or updated successfully');
        } catch (error) {
            console.warn('Warning: Could not create/update admin user:', error.message);
        }
        
        // Add arjel user
        try {
            const arjelHashedPassword = await bcrypt.hash('password123', 10);
            
            await connection.query(`
                INSERT INTO users (username, surname, active, role, email, password) 
                VALUES ('arjel', 'arjel', 1, 'admin', 'arjel@admin.com', ?)
                ON DUPLICATE KEY UPDATE role = 'admin'
            `, [arjelHashedPassword]);
            
            console.log('Arjel user created or updated successfully');
        } catch (error) {
            console.warn('Warning: Could not create/update arjel user:', error.message);
        }
        
        // Verify tables were created
        const [tables] = await connection.query('SHOW TABLES');
        console.log('Created tables:', tables.map(t => Object.values(t)[0]));
        
        console.log('Database initialization completed successfully!');
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    } finally {
        if (connection) {
            try {
                await connection.end();
                console.log('Database connection closed');
            } catch (error) {
                console.error('Error closing database connection:', error);
            }
        }
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