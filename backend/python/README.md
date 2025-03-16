# Quiz Challenge Portal - Python Backend

The Python backend for the Quiz Challenge Portal, providing AI integration and PDF processing capabilities.

## Technologies

- FastAPI
- PyMuPDF (PDF processing)
- OpenAI/Grok API integration
- WebSockets
- MySQL Connector

## Getting Started

1. Set up a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Set up environment variables:
   Create a `.env` file with the following variables:
   ```
   DB_HOST=localhost
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_NAME=aischool
   OPENAI_API_KEY=your_openai_api_key
   XAI_API_KEY=your_grok_api_key
   ```

4. Start the server:
   ```bash
   python main.py
   ```

## Shared Resources

This backend uses the `shared/uploads` directory for accessing uploaded PDF files and storing processed results. Make sure this directory is accessible when deploying.

## API Endpoints

- **AI Chat**
  - WebSocket `/ws/chat`: AI chat assistance
  - POST `/api/chat`: Send a message to the AI

- **PDF Processing**
  - POST `/api/pdf/extract`: Extract text from a PDF
  - GET `/api/pdf/content/{pdf_id}`: Get processed PDF content

## Features

- AI-powered chat assistance using OpenAI or Grok
- PDF text extraction and processing
- Real-time communication with WebSockets
- Integration with the MySQL database

## New Feature: Lesson-Specific Chatbot

The application now supports lesson-specific chatbots that are aware of the content in the corresponding lesson PDFs. When a user asks a question in the context of a specific lesson, the chatbot will reference the PDF content associated with that lesson to provide more accurate and contextual answers.

### How it Works

1. PDF files are stored in the `downloads` directory
2. When a user asks a question in a lesson chat, the lesson ID is sent to the backend
3. The backend finds the corresponding PDF for that lesson
4. The PDF content is extracted and included in the prompt sent to the Grok API
5. The Grok API uses this context to provide lesson-specific responses

### Implementation Details

- The `pdf_processor.py` module handles PDF content extraction using PyMuPDF
- The WebSocket endpoint in `main.py` accepts both the lesson ID and user message
- Each lesson's chatbot has access to the content of the corresponding lesson PDF

## Setup and Installation

1. Clone the repository
2. Install the required dependencies:
```
pip install -r requirements.txt
```
3. Set up environment variables in a `.env` file:
```
PORT=8081
ENV=development
XAI_API_KEY=your_grok_api_key
```
4. Run the server:
```
python main.py
```

## API Endpoints

- WebSocket: `ws://localhost:8081/grok` - For chat functionality
- HTTP: `/health` - Health check endpoint

## WebSocket Message Format

To use the lesson-specific chatbot, send messages in the following JSON format:

```json
{
  "message": "Your question here",
  "lessonId": "lesson_id_here"
}
```

The response will be in this format:

```json
{
  "response": "AI response here",
  "lessonId": "lesson_id_here"
}
``` 