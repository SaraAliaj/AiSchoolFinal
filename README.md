# Quiz Challenge Portal

A comprehensive learning platform with quizzes, challenges, and AI-powered chat assistance.

## Project Structure

The project is organized into the following directories:

- **frontend/**: React frontend application
  - Built with React, TypeScript, and Vite
  - Uses Tailwind CSS for styling
  - Includes components, pages, and contexts

- **backend/node/**: Node.js backend
  - Express.js server
  - MySQL database integration
  - Authentication with JWT
  - WebSocket support with Socket.io
  - PDF processing

- **backend/python/**: Python backend
  - FastAPI server
  - AI integration with OpenAI/Grok
  - PDF text extraction
  - WebSocket support

- **shared/**: Shared resources
  - uploads/: Uploaded files (PDFs, etc.) used by both backends
    - pdfs/: Original PDF files
    - processed/: Processed PDF files and extracted text

## Getting Started

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Node.js Backend

```bash
cd backend/node
npm install
npm run dev
```

### Python Backend

```bash
cd backend/python
pip install -r requirements.txt
python main.py
```

## Environment Variables

Each part of the application has its own `.env` file with the necessary configuration.

## Database Setup

```bash
cd backend/node
npm run init-db
```

## Shared Resources

The `shared/uploads` directory contains files that are accessed by both the Node.js and Python backends. Make sure this directory is accessible to both services when deploying.

## Features

- User authentication and authorization
- Interactive quizzes and challenges
- AI-powered chat assistance
- PDF document processing
- Real-time communication with WebSockets

# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/d059e4be-f9f6-43b3-affb-6a07e9340349

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/d059e4be-f9f6-43b3-affb-6a07e9340349) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with .

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/d059e4be-f9f6-43b3-affb-6a07e9340349) and click on Share -> Publish.

## I want to use a custom domain - is that possible?

We don't support custom domains (yet). If you want to deploy your project under your own domain then we recommend using Netlify. Visit our docs for more details: [Custom domains](https://docs.lovable.dev/tips-tricks/custom-domain/)
