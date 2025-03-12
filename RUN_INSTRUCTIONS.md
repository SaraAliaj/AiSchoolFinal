# Running the Quiz Challenge Portal Locally

This guide explains how to run the project locally on a Windows machine with PowerShell.

## Prerequisites

- Node.js (v14 or higher)
- MySQL database
- Modern web browser

## Step 1: Install Dependencies

### Backend Dependencies

Open PowerShell and navigate to the backend directory:

```powershell
cd backend/node
npm install
```

### Frontend Dependencies

Open another PowerShell window and navigate to the frontend directory:

```powershell
cd frontend
npm install
```

## Step 2: Set Up the Database

1. Make sure your MySQL server is running
2. Update the database connection settings in `backend/node/.env` if needed:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=Sara
DB_PASSWORD=Sara0330!!
DB_NAME=aischool
```

## Step 3: Run the PDF Sample Generator

This will create sample PDF files for testing:

```powershell
cd backend/node
node create-sample-pdf.js
```

## Step 4: Update the Lesson DB Entry

Run the script to update the lesson entry in the database with the PDF file path:

```powershell
cd backend/node
node update-lesson-pdf.js
```

## Step 5: Start the Backend Server

In one PowerShell window:

```powershell
cd backend/node
npm start
```

## Step 6: Start the Frontend Development Server

In another PowerShell window:

```powershell
cd frontend
npm run dev
```

## Step 7: Access the Application

1. Open your browser and navigate to [http://localhost:5173](http://localhost:5173)
2. Log in with the provided credentials:
   - Email: admin@example.com
   - Password: admin123
3. Navigate to the Curriculum section in the sidebar
4. Click on "Deep Learning" > "Week 1" > "Introduction to Neural Networks"
5. The PDF viewer will load the content, and you can interact with the AI chatbot on the right side

## Troubleshooting

If you encounter any issues:

1. **Backend connection errors**: Make sure your MySQL server is running and the connection details are correct
2. **PDF not displaying**: Check that the PDF files were created correctly in `backend/node/samples` and `backend/node/uploads`
3. **"&&" errors in PowerShell**: Use semicolons (`;`) instead of double ampersands (`&&`) to chain commands in PowerShell

## Deployed Version

The application is also deployed at: https://quiz-frontend-vvan.onrender.com/chat

You can use the same login credentials to access the deployed version. 