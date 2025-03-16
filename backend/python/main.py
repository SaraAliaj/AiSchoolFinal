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

def chat_with_grok(user_input, lesson_id=None):
    """Send a request to the Grok API and return the response"""
    try:
        # Get X.AI API key
        api_key = os.getenv("XAI_API_KEY")
        if not api_key:
            return "Error: X.AI API key not found. Please check your configuration."

        # Get lesson content if lesson_id is provided
        lesson_context = ""
        lesson_title = ""
        lesson_pdf_path = ""
        
        if lesson_id:
            try:
                print(f"Getting content for lesson ID: {lesson_id}")
                lesson_data = pdf_processor.getLessonContent(lesson_id)
                
                if lesson_data and lesson_data.get('has_pdf', False) and lesson_data.get('content'):
                    # Get the lesson title and PDF path for better context
                    lesson_title = lesson_data.get('title', f'Lesson {lesson_id}')
                    lesson_pdf_path = lesson_data.get('pdf_path', '')
                    
                    # Log first 100 chars of the content to help with debugging
                    content_preview = lesson_data.get('content', '')[:100].replace('\n', ' ').strip()
                    print(f"PDF content preview: {content_preview}...")
                    
                    # Look for an objective in the content - this will help provide better context
                    objective = ""
                    raw_content = lesson_data.get('content', '')
                    objective_match = re.search(r"OBJECTIVE:\s*(.+?)(?:\n\n|\nKEY)", raw_content, re.DOTALL)
                    if objective_match:
                        objective = objective_match.group(1).strip()
                        print(f"Found lesson objective: {objective[:100]}...")
                    
                    # Format the lesson content as context for the AI, but allow more flexibility for general questions
                    lesson_context = f"""
You are a helpful teaching assistant that can answer both lesson-specific questions and general knowledge questions.

LESSON INFORMATION:
You are discussing "{lesson_title}".
"""
                    
                    # Add objective if found
                    if objective:
                        lesson_context += f"""
The main objective of this lesson is:
{objective}
"""
                    
                    lesson_context += f"""
When asked about this specific lesson or topics covered in it, use ONLY the information provided in the lesson content below.

LESSON CONTENT:
--------------------------
{lesson_data.get('content', 'No content available')}
--------------------------

For questions about this lesson (like "What's this lesson about?", "What are the key concepts?", etc.), provide detailed answers using ONLY 
the information in the lesson content above.

For general questions or questions about topics mentioned in the lesson but not fully covered, you can use your general knowledge 
while making it clear what information comes directly from the lesson versus your broader knowledge.

USER QUESTION: {user_input}

Remember to be helpful and informative. Answer the question accurately based on the lesson content when possible, but provide helpful
general information when appropriate.
"""
                    print(f"✅ Added lesson content from PDF for lesson ID: {lesson_id}")
                else:
                    print(f"⚠️ No PDF content found for lesson ID: {lesson_id}")
                    return f"I don't have access to the content for Lesson {lesson_id}. Please ensure a PDF has been uploaded for this lesson."
            except Exception as e:
                print(f"❌ Error getting lesson content: {str(e)}")
                return f"I encountered an error retrieving content for Lesson {lesson_id}: {str(e)}"
                
        # Use lesson context if available, otherwise just use the user input
        final_prompt = lesson_context if lesson_context else user_input
            
        # API endpoint and headers
        url = "https://api.x.ai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        # Request payload
        data = {
            "model": "grok-beta",
            "messages": [{"role": "user", "content": final_prompt}],
            "max_tokens": 1000
        }
        
        print("✅ Making request to Grok API...")
        
        # Make the API call using requests
        response = requests.post(url, headers=headers, json=data)
        
        # Check if request was successful
        if response.status_code == 200:
            print("✅ Received response from Grok API")
            response_data = response.json()
            if response_data and "choices" in response_data and response_data["choices"]:
                # Get the AI response
                ai_response = response_data["choices"][0]["message"]["content"]
                
                # Add the lesson title prefix if we have one
                if lesson_title:
                    # Include PDF filename in the response for debugging
                    pdf_name = os.path.basename(lesson_pdf_path) if lesson_pdf_path else "Unknown PDF"
                    
                    # Extract a cleaner lesson title without the filename
                    clean_title = lesson_title
                    if ': ' in lesson_title:
                        # Extract just the lesson name part (after "Lesson X: ")
                        parts = lesson_title.split(': ', 1)
                        if len(parts) > 1 and parts[1]:
                            clean_title = parts[0] + ': ' + parts[1].split('.pdf')[0]
                    
                    return f"[{clean_title}] {ai_response}"
                return ai_response
        
        # Handle error cases
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

# WebSocket endpoint for chat
@app.websocket("/grok")
async def chat_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            try:
                # Receive message
                data = await websocket.receive_text()
                
                # Check if the received data is JSON with lessonId and message
                try:
                    json_data = json.loads(data)
                    lesson_id = json_data.get('lessonId')
                    user_input = json_data.get('message')
                    
                    if not user_input:
                        await manager.send_message(
                            json.dumps({"error": "Please send a non-empty message"}),
                            websocket
                        )
                        continue
                except json.JSONDecodeError:
                    # If not valid JSON, treat the entire message as user input
                    user_input = data.strip()
                    lesson_id = None
                
                if not user_input:
                    await manager.send_message(
                        json.dumps({"error": "Please send a non-empty message"}),
                        websocket
                    )
                    continue
                
                print(f"Received chat request. Lesson ID: {lesson_id}, Message: {user_input}")
                
                # Get response from API with lesson context if available
                response = chat_with_grok(user_input, lesson_id)
                
                # Send response back
                await manager.send_message(
                    json.dumps({"response": response, "lessonId": lesson_id}),
                    websocket
                )
                
            except json.JSONDecodeError:
                await manager.send_message(
                    json.dumps({"error": "Invalid message format"}),
                    websocket
                )
            except Exception as e:
                print(f"Error in chat: {str(e)}")
                await manager.send_message(
                    json.dumps({"error": "An error occurred processing your request"}),
                    websocket
                )
    except WebSocketDisconnect:
        manager.disconnect()
    except Exception as e:
        print(f"WebSocket error: {str(e)}")
        try:
            await manager.send_message(
                json.dumps({"error": "Connection error"}),
                websocket
            )
        except:
            pass

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