# Quiz Challenge Portal - Node.js Backend

The Node.js backend for the Quiz Challenge Portal, providing API endpoints, database access, and WebSocket communication.

## Technologies

- Node.js
- Express.js
- MySQL
- Socket.io
- JSON Web Tokens (JWT)
- Multer (file uploads)
- bcrypt (password hashing)

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   Create a `.env` file with the following variables:
   ```
   PORT=3001
   DB_HOST=localhost
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_NAME=aischool
   ```

3. Initialize the database:
   ```bash
   npm run init-db
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Start the production server:
   ```bash
   npm start
   ```

## Shared Resources

This backend uses the `shared/uploads` directory for storing and accessing uploaded files. Make sure this directory is accessible when deploying.

## API Endpoints

- **Authentication**
  - POST `/api/auth/register`: Register a new user
  - POST `/api/auth/login`: Login a user
  - GET `/api/auth/profile`: Get user profile

- **Quizzes**
  - GET `/api/quizzes`: Get all quizzes
  - GET `/api/quizzes/:id`: Get a specific quiz
  - POST `/api/quizzes`: Create a new quiz
  - PUT `/api/quizzes/:id`: Update a quiz
  - DELETE `/api/quizzes/:id`: Delete a quiz

- **Challenges**
  - GET `/api/challenges`: Get all challenges
  - GET `/api/challenges/:id`: Get a specific challenge

- **PDF Processing**
  - POST `/api/upload/pdf`: Upload a PDF file
  - GET `/api/pdf/:id`: Get PDF content

## WebSocket Events

- `connection`: Client connected
- `disconnect`: Client disconnected
- `join_room`: Join a chat room
- `leave_room`: Leave a chat room
- `chat_message`: Send a chat message
- `typing`: User is typing 