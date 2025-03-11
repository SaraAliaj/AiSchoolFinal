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