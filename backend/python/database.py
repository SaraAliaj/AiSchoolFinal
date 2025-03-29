import mysql.connector
from mysql.connector import Error
import time
from config import Config
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database connection class with retry mechanism
class Database:
    def __init__(self):
        self.connection = None
        self.is_connected = False
        self.max_retries = 5 if Config.is_production() else 3
        self.retry_delay = 5  # seconds

    def connect(self, retry_count=0):
        """Establish a connection to the database with retry mechanism"""
        if self.connection and self.is_connected:
            return True

        if retry_count >= self.max_retries:
            logger.error(f"Failed to connect to database after {retry_count} attempts")
            return False

        try:
            logger.info(f"Connecting to database: {Config.DB_HOST}/{Config.DB_NAME}")
            self.connection = mysql.connector.connect(**Config.get_db_config())
            self.is_connected = True
            logger.info("✅ Connected to database successfully")
            return True
        except Error as e:
            logger.error(f"Database connection error: {e}")
            logger.error(f"Connection details: host={Config.DB_HOST}, user={Config.DB_USER}, db={Config.DB_NAME}")
            
            # If in production and this isn't the last retry, attempt to retry
            if retry_count < self.max_retries - 1:
                retry_delay = self.retry_delay * (retry_count + 1)
                logger.info(f"Retrying database connection in {retry_delay} seconds (attempt {retry_count + 1}/{self.max_retries})")
                time.sleep(retry_delay)
                return self.connect(retry_count + 1)
            
            self.is_connected = False
            return False

    def disconnect(self):
        """Close the database connection if active"""
        if self.connection and self.is_connected:
            try:
                self.connection.close()
                logger.info("Database connection closed")
            except Error as e:
                logger.error(f"Error closing database connection: {e}")
            finally:
                self.is_connected = False
                self.connection = None

    def execute(self, query, params=None, fetch=True):
        """Execute a query with appropriate error handling"""
        if not self.is_connected and not self.connect():
            logger.error("Cannot execute query - no database connection")
            return None

        try:
            cursor = self.connection.cursor(dictionary=True)
            cursor.execute(query, params or ())
            
            if fetch:
                results = cursor.fetchall()
                cursor.close()
                return results
            else:
                self.connection.commit()
                affected_rows = cursor.rowcount
                cursor.close()
                return affected_rows
        except Error as e:
            logger.error(f"Error executing query: {e}")
            logger.error(f"Query: {query}")
            if params:
                logger.error(f"Params: {params}")
            
            # Try to reconnect once if the connection was lost
            if "MySQL Connection not available" in str(e) and self.connect():
                logger.info("Reconnected to database, retrying query")
                return self.execute(query, params, fetch)
            
            return None
        except Exception as e:
            logger.error(f"Unexpected error executing query: {e}")
            return None

    def test_connection(self):
        """Test database connection with a simple query"""
        try:
            if not self.is_connected and not self.connect():
                return False
                
            cursor = self.connection.cursor()
            cursor.execute("SELECT 1")
            cursor.fetchone()
            cursor.close()
            return True
        except Error as e:
            logger.error(f"Database test connection failed: {e}")
            return False

    def create_tables(self):
        """Create necessary tables if they don't exist"""
        if not self.is_connected and not self.connect():
            logger.error("Cannot create tables - no database connection")
            return False
            
        try:
            logger.info("Creating tables if they don't exist...")
            
            # Create lessons table with title field
            self.execute("""
                CREATE TABLE IF NOT EXISTS lessons (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    day VARCHAR(255) NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    content TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            """, fetch=False)
            
            # Create quizzes table
            self.execute("""
                CREATE TABLE IF NOT EXISTS quizzes (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    day VARCHAR(255) NOT NULL,
                    questions JSON NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            """, fetch=False)
            
            # Create users table
            self.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    username VARCHAR(255) NOT NULL UNIQUE,
                    email VARCHAR(255) NOT NULL UNIQUE,
                    password VARCHAR(255) NOT NULL,
                    role ENUM('student', 'teacher', 'admin') DEFAULT 'student',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            """, fetch=False)
            
            # Create user_progress table
            self.execute("""
                CREATE TABLE IF NOT EXISTS user_progress (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    day VARCHAR(255) NOT NULL,
                    quiz_score FLOAT DEFAULT 0,
                    completed BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """, fetch=False)
            
            logger.info("✅ Tables created/verified successfully")
            return True
        except Error as e:
            logger.error(f"Error creating tables: {e}")
            return False

# Create a singleton database instance
db = Database()

# Initialize connection on module import
if not Config.is_production():
    # In development, try to connect immediately
    db.connect()
else:
    # In production, connection will be established on first query
    logger.info("Production mode: Database connection will be established on first query") 