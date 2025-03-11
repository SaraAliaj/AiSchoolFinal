-- Check if users table exists and create if it doesn't
CREATE TABLE IF NOT EXISTS users (
    id            int auto_increment primary key,
    name          varchar(255)                        not null,
    active        tinyint(1)                          null,
    role          varchar(255)                        not null,
    email         varchar(100)                        not null,
    password      varchar(255)                        not null,
    created_at    datetime  default CURRENT_TIMESTAMP null,
    last_activity timestamp default CURRENT_TIMESTAMP null on update CURRENT_TIMESTAMP,
    constraint email
        unique (email)
);

-- Add username and surname columns if they don't exist
SET @dbname = DATABASE();
SET @tablename = "users";
SET @columnname = "username";
SET @columnname2 = "surname";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  "ALTER TABLE users ADD COLUMN username VARCHAR(50), ADD COLUMN surname VARCHAR(255)"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Update existing records to split name into username and surname if needed
UPDATE users 
SET 
    username = SUBSTRING_INDEX(name, ' ', 1),
    surname = SUBSTRING_INDEX(name, ' ', -1)
WHERE 
    username IS NULL 
    AND surname IS NULL 
    AND name IS NOT NULL;

-- Add unique constraint for username if it doesn't exist
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND CONSTRAINT_NAME = 'username'
  ) > 0,
  "SELECT 1",
  "ALTER TABLE users ADD CONSTRAINT username UNIQUE (username)"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Create other tables
CREATE TABLE IF NOT EXISTS courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS weeks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    week_number INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id)
);

CREATE TABLE IF NOT EXISTS days (
    id INT AUTO_INCREMENT PRIMARY KEY,
    week_id INT NOT NULL,
    day_number INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (week_id) REFERENCES weeks(id)
);

CREATE TABLE IF NOT EXISTS lessons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    week_id INT NOT NULL,
    day_id INT NOT NULL,
    lesson_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id),
    FOREIGN KEY (week_id) REFERENCES weeks(id),
    FOREIGN KEY (day_id) REFERENCES days(id)
);

-- Insert or update admin user
INSERT INTO users (email, password, name, role, username, surname) 
VALUES (
    'admin@example.com', 
    '$2b$10$SCbwOI/y7mY08p2Ko0mozujOzQZ4klZjrM3J1ZiwE4F9iZlD3Myz6', 
    'Admin User',
    'admin',
    'Admin',
    'User'
)
ON DUPLICATE KEY UPDATE 
    role = 'admin',
    username = 'Admin',
    surname = 'User'; 