import os
import json
import fitz  # PyMuPDF
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
import requests
import pymysql
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from openai import OpenAI
import string
import re
from config import Config
from pathlib import Path

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

def chat_with_grok(user_input):
    """Send a request to the Grok API and return the response"""
    try:
        # Get X.AI API key
        api_key = os.getenv("XAI_API_KEY")
        if not api_key:
            return "Error: X.AI API key not found. Please check your configuration."

        # API endpoint and headers
        url = "https://api.x.ai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        # Request payload
        data = {
            "model": "grok-beta",
            "messages": [{"role": "user", "content": user_input}],
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
                return response_data["choices"][0]["message"]["content"]
        
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
                
                # Process the message directly
                user_input = data.strip()
                
                if not user_input:
                    await manager.send_message(
                        json.dumps({"error": "Please send a non-empty message"}),
                        websocket
                    )
                    continue
                
                # Get response from API
                response = chat_with_grok(user_input)
                
                # Send response back
                await manager.send_message(
                    json.dumps({"response": response}),
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