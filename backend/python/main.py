import os
import json
import fitz  # PyMuPDF
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request
import requests
import pymysql
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from openai import OpenAI
import string
import re
import glob
from fastapi.responses import JSONResponse
from config import Config
from pathlib import Path
import pdf_processor  # Import the pdf_processor module
import mysql.connector
from mysql.connector import Error

# Ensure we're loading from the correct .env file
env_path = Path(__file__).parent / '.env'
if env_path.exists():
    load_dotenv(env_path)
    print(f"✅ Loaded environment variables from {env_path}")
else:
    print(f"❌ Error: .env file not found at {env_path}")

# Initialize FastAPI app
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=Config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add a route to check PDF files in the downloads directory
@app.get("/pdfs")
async def list_pdfs():
    """List all PDF files in the downloads directory"""
    downloads_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'downloads')
    pdf_files = glob.glob(os.path.join(downloads_dir, '*.pdf'))
    
    # Return info about each PDF
    result = []
    for i, pdf_path in enumerate(pdf_files):
        file_name = os.path.basename(pdf_path)
        file_size = os.path.getsize(pdf_path)
        mod_time = os.path.getmtime(pdf_path)
        
        # Try to extract first few characters of content
        try:
            with fitz.open(pdf_path) as doc:
                if doc.page_count > 0:
                    text = doc[0].get_text(sort=True)
                    preview = text[:100] + "..." if len(text) > 100 else text
                else:
                    preview = "Empty document"
        except Exception as e:
            preview = f"Error: {str(e)}"
            
        result.append({
            "index": i,
            "file_name": file_name,
            "file_path": pdf_path,
            "file_size": file_size,
            "mod_time": mod_time,
            "preview": preview
        })
    
    return {"pdf_count": len(pdf_files), "pdfs": result}

def get_chat_history():
    """Get the most recent chat history without user ID"""
    connection = get_db_connection()
    if connection is None:
        return []
    
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT message, timestamp 
            FROM chat_history 
            ORDER BY timestamp DESC
            LIMIT 10
            """
        )
        history = cursor.fetchall()
        history.reverse()  # Reverse to get chronological order
        print(f"Retrieved {len(history)} messages from chat history")
        return history
    except Error as e:
        print(f"Error retrieving chat history: {e}")
        return []
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

def format_chat_history(chat_history):
    formatted_history = []
    for msg in chat_history:
        # Split into user/AI messages based on prefix
        if msg['message'].startswith('AI: '):
            formatted_history.append({
                'role': 'assistant',
                'content': msg['message'][4:]  # Remove 'AI: ' prefix
            })
        else:
            formatted_history.append({
                'role': 'user',
                'content': msg['message']
            })
    return formatted_history

def chat_with_grok(user_input, lesson_id=None, chat_history=None):
    """Send a request to the Grok API and return the response"""
    try:
        # Get X.AI API key
        api_key = os.getenv("XAI_API_KEY")
        if not api_key:
            return "Error: X.AI API key not found. Please check your configuration."

        # Format the messages including chat history
        messages = []
        
        # Add chat history if available
        if chat_history:
            formatted_history = format_chat_history(chat_history)
            messages.extend(formatted_history)
        
        # Add the current user input
        messages.append({
            "role": "user",
            "content": user_input
        })

        # Get lesson content if lesson_id is provided
        lesson_context = ""
        if lesson_id:
            try:
                print(f"Getting content for lesson ID: {lesson_id}")
                lesson_data = pdf_processor.getLessonContent(lesson_id)
                if lesson_data and lesson_data.get('content'):
                    lesson_context = f"""
You are discussing lesson content about: {lesson_data.get('title', f'Lesson {lesson_id}')}

LESSON CONTENT:
{lesson_data.get('content')}

Please answer based on this lesson content.
"""
                    # Add lesson context as a system message
                    messages.insert(0, {
                        "role": "system",
                        "content": lesson_context
                    })
            except Exception as e:
                print(f"Error getting lesson content: {str(e)}")
                
        # API endpoint and headers
        url = "https://api.x.ai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        # Request payload with chat history
        data = {
            "model": "grok-beta",
            "messages": messages,
            "max_tokens": 1000
        }
        
        print("✅ Making request to Grok API...")
        print(f"Messages being sent: {json.dumps(messages, indent=2)}")
        
        # Make the API call
        response = requests.post(url, headers=headers, json=data)
        
        if response.status_code == 200:
            print("✅ Received response from Grok API")
            response_data = response.json()
            if response_data and "choices" in response_data and response_data["choices"]:
                return response_data["choices"][0]["message"]["content"]
        
        error_msg = f"API Error: {response.status_code}"
        if response.text:
            try:
                error_data = response.json()
                if "error" in error_data:
                    error_msg = f"API Error: {error_data['error'].get('message', 'Unknown error')}"
            except:
                error_msg = f"API Error: {response.text[:100]}"
        
        print(f"❌ {error_msg}")
        return f"I apologize, but I encountered an error: {error_msg}"
            
    except Exception as e:
        print(f"❌ Error in chat: {str(e)}")
        return f"I apologize, but I encountered an error: {str(e)}"

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections = {}

    async def connect(self, websocket: WebSocket, client_id: str = None):
        await websocket.accept()
        if client_id:
            self.active_connections[client_id] = websocket

    def disconnect(self, client_id: str = None):
        if client_id and client_id in self.active_connections:
            del self.active_connections[client_id]

    async def send_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

manager = ConnectionManager()

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'database': 'aischool',
    'user': 'root',
    'password': 'password',
    'port': 3306
}

def get_db_connection():
    try:
        print("Attempting to connect to MySQL database with config:", {
            **DB_CONFIG,
            'password': '***'  # Hide password in logs
        })
        
        connection = mysql.connector.connect(**DB_CONFIG)
        
        if connection.is_connected():
            db_info = connection.get_server_info()
            print(f"Successfully connected to MySQL Server version {db_info}")
            
            # Test the connection by executing a simple query
            cursor = connection.cursor()
            cursor.execute("SELECT DATABASE()")
            database_name = cursor.fetchone()[0]
            print(f"Connected to database: {database_name}")
            
            # Test the chat_history table
            try:
                cursor.execute("SHOW TABLES LIKE 'chat_history'")
                if cursor.fetchone():
                    print("chat_history table exists")
                    cursor.execute("DESCRIBE chat_history")
                    columns = cursor.fetchall()
                    print("chat_history table structure:")
                    for column in columns:
                        print(f"- {column[0]}: {column[1]}")
                else:
                    print("chat_history table does not exist!")
                    # Create the table if it doesn't exist
                    cursor.execute("""
                        CREATE TABLE IF NOT EXISTS chat_history (
                            id INT AUTO_INCREMENT PRIMARY KEY,
                            message TEXT NOT NULL,
                            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        )
                    """)
                    connection.commit()
                    print("Created chat_history table")
            except Error as e:
                print(f"Error checking chat_history table: {e}")
            
            cursor.close()
            return connection
        else:
            print("Failed to establish database connection")
            return None
            
    except Error as e:
        print(f"Error connecting to MySQL database: {e}")
        if 'connection' in locals() and connection.is_connected():
            connection.close()
        return None

def save_chat_message(message):
    """Save a chat message without user ID"""
    if not message or not message.strip():
        print("Empty message provided, cannot save")
        return False
    
    print(f"Attempting to save message")
    print(f"Message content (first 100 chars): {message[:100]}")
    
    connection = get_db_connection()
    if connection is None:
        print("Failed to establish database connection in save_chat_message")
        return False
    
    cursor = None
    try:
        cursor = connection.cursor()
            
        # Insert the message
        print(f"Inserting message into chat_history")
        cursor.execute(
            """
            INSERT INTO chat_history (message) 
            VALUES (%s)
            """,
            (message,)
        )
        connection.commit()
        
        # Verify the insertion
        last_id = cursor.lastrowid
        print(f"Message saved successfully. Message ID: {last_id}, Affected rows: {cursor.rowcount}")
        
        # Double check the insertion
        cursor.execute("""
            SELECT * FROM chat_history
            WHERE id = %s
        """, (last_id,))
        saved_message = cursor.fetchone()
        if saved_message:
            print("Message verified in database")
            return True
        else:
            print("Warning: Message not found after insertion")
            return False
            
    except Error as e:
        print(f"Error saving chat message: {e}")
        if connection.is_connected():
            print("Rolling back transaction")
            connection.rollback()
        return False
    except Exception as e:
        print(f"Unexpected error in save_chat_message: {e}")
        if connection.is_connected():
            print("Rolling back transaction")
            connection.rollback()
        return False
    finally:
        if cursor:
            cursor.close()
        if connection.is_connected():
            connection.close()
            print("Database connection closed in save_chat_message")

# WebSocket endpoint for chat
@app.websocket("/grok")
async def chat_endpoint(websocket: WebSocket):
    print("\n=== New WebSocket connection attempt ===")
    await manager.connect(websocket)
    print("WebSocket connection established")
    
    try:
        while True:
            try:
                # Receive message
                data = await websocket.receive_text()
                print("\n=== New message received ===")
                print(f"Raw WebSocket data received: {data}")
                
                # Parse the JSON data
                try:
                    json_data = json.loads(data)
                    lesson_id = json_data.get('lessonId')
                    user_input = json_data.get('message')
                    
                    print("\nParsed message data:")
                    print(f"- Lesson ID: {lesson_id}")
                    print(f"- Message: {user_input}")
                    
                    if not user_input:
                        error_msg = "Please send a non-empty message"
                        print(f"Error: {error_msg}")
                        await manager.send_message(
                            json.dumps({"error": error_msg}),
                            websocket
                        )
                        continue
                        
                except json.JSONDecodeError as e:
                    print(f"JSON decode error: {str(e)}")
                    print(f"Raw data causing error: {data}")
                    await manager.send_message(
                        json.dumps({"error": "Invalid message format. Please send a properly formatted JSON message."}),
                        websocket
                    )
                    continue
                
                # Save user message and get chat history
                print("\n=== Processing message ===")
                
                print("Saving user message...")
                save_success = save_chat_message(user_input)
                if not save_success:
                    print("Warning: Failed to save user message")
                
                print("Retrieving chat history...")
                chat_history = get_chat_history()
                history_count = len(chat_history) if chat_history else 0
                print(f"Retrieved {history_count} messages from chat history")
                
                print("\n=== Getting AI response ===")
                print("Calling Grok API...")
                response = chat_with_grok(user_input, lesson_id, chat_history)
                print(f"Grok API response received (first 100 chars): {response[:100]}...")
                
                # Save AI response
                print("\n=== Saving AI response ===")
                ai_save_success = save_chat_message(f"AI: {response}")
                if not ai_save_success:
                    print("Warning: Failed to save AI response")
                
                # Send response back to client
                print("\n=== Sending response to client ===")
                await manager.send_message(
                    json.dumps({
                        "response": response,
                        "lessonId": lesson_id,
                        "savedToHistory": ai_save_success
                    }),
                    websocket
                )
                print("Response sent successfully")
                
            except json.JSONDecodeError as e:
                print(f"\n=== JSON Error ===")
                print(f"JSON decode error in main loop: {str(e)}")
                await manager.send_message(
                    json.dumps({"error": "Invalid message format"}),
                    websocket
                )
            except Exception as e:
                print(f"\n=== Unexpected Error ===")
                print(f"Error in chat: {str(e)}")
                await manager.send_message(
                    json.dumps({"error": "An error occurred processing your request"}),
                    websocket
                )
                
    except WebSocketDisconnect:
        print("\n=== WebSocket Disconnected ===")
        manager.disconnect()
    except Exception as e:
        print(f"\n=== WebSocket Error ===")
        print(f"WebSocket error: {str(e)}")
        try:
            await manager.send_message(
                json.dumps({"error": "Connection error"}),
                websocket
            )
        except:
            print("Failed to send error message to client")

# Add a health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

@app.get("/lesson-check/{lesson_id}")
async def check_lesson_pdf(lesson_id: str):
    """
    Diagnostic endpoint to check if a specific lesson has a valid PDF in the database
    """
    try:
        import pdf_processor
        import pymysql
        from config import Config
        
        # First, get the database record
        db_info = {}
        try:
            connection = pymysql.connect(
                host=Config.DB_HOST,
                user=Config.DB_USER,
                password=Config.DB_PASSWORD,
                database=Config.DB_NAME,
                cursorclass=pymysql.cursors.DictCursor
            )
            
            with connection.cursor() as cursor:
                # Get the lesson record
                sql = "SELECT * FROM lessons WHERE id = %s"
                cursor.execute(sql, (lesson_id,))
                lesson = cursor.fetchone()
                if lesson:
                    # Convert to dict for JSON serialization
                    db_info = dict(lesson)
                    # Convert timestamp to string if present
                    if 'created_at' in db_info and db_info['created_at']:
                        db_info['created_at'] = str(db_info['created_at'])
            
            connection.close()
        except Exception as e:
            db_info = {"error": str(e)}
        
        # Then try to get the PDF path
        pdf_path = pdf_processor.get_lesson_pdf_path(lesson_id)
        
        # If we found a path, check file details
        file_details = {}
        if pdf_path:
            try:
                import os
                file_details = {
                    "exists": os.path.exists(pdf_path),
                    "size": os.path.getsize(pdf_path) if os.path.exists(pdf_path) else 0,
                    "last_modified": os.path.getmtime(pdf_path) if os.path.exists(pdf_path) else 0,
                    "absolute_path": os.path.abspath(pdf_path) if pdf_path else "",
                    "basename": os.path.basename(pdf_path) if pdf_path else ""
                }
            except Exception as e:
                file_details = {"error": str(e)}
        
        # Check downloads directory for all PDFs
        downloads_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'downloads')
        all_pdfs = []
        try:
            pdf_files = glob.glob(os.path.join(downloads_dir, '*.pdf'))
            for pdf in pdf_files:
                all_pdfs.append({
                    "filename": os.path.basename(pdf),
                    "size": os.path.getsize(pdf),
                    "path": pdf
                })
        except Exception as e:
            all_pdfs = [{"error": str(e)}]
        
        return {
            "lesson_id": lesson_id,
            "database_record": db_info,
            "pdf_path": pdf_path,
            "file_details": file_details,
            "pdfs_in_downloads": all_pdfs,
            "downloads_dir": downloads_dir
        }
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    
    # Validate configuration before starting the server
    if not Config.validate_config():
        print("Error: Invalid configuration. Please check your environment variables.")
        exit(1)
    
    port = Config.PORT
    print(f"Starting server on port {port}")
    print(f"Environment: {Config.ENV}")
    print(f"CORS Origins: {Config.CORS_ORIGINS}")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        log_level="info"
    ) 