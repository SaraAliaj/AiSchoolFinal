-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id            int auto_increment primary key,
    username      varchar(50)                         not null,
    surname       varchar(255)                        not null,
    active        tinyint(1)                          null,
    role          varchar(255)                        not null,
    email         varchar(100)                        not null,
    password      varchar(255)                        not null,
    created_at    datetime  default CURRENT_TIMESTAMP null,
    last_activity timestamp default CURRENT_TIMESTAMP null on update CURRENT_TIMESTAMP,
    constraint email
        unique (email),
    constraint username
        unique (username)
);

-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create weeks table
CREATE TABLE IF NOT EXISTS weeks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    week_number INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id)
);

-- Create days table
CREATE TABLE IF NOT EXISTS days (
    id INT AUTO_INCREMENT PRIMARY KEY,
    week_id INT NOT NULL,
    day_number INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (week_id) REFERENCES weeks(id)
);

-- Create lessons table
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

-- Insert default admin user with hashed password (admin123)
INSERT INTO users (email, password, username, surname, role) 
VALUES ('admin@example.com', '$2b$10$SCbwOI/y7mY08p2Ko0mozujOzQZ4klZjrM3J1ZiwE4F9iZlD3Myz6', 'Admin', 'User', 'admin')
ON DUPLICATE KEY UPDATE role = 'admin'; 