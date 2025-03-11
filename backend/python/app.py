import json
import asyncio
import websockets
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import the PDF integration
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
import pdf_processor

async def handle_client(websocket):
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                response = await process_message(data)
                await websocket.send(json.dumps(response))
            except json.JSONDecodeError:
                error_response = {
                    'error': 'Invalid JSON received'
                }
                await websocket.send(json.dumps(error_response))
    except websockets.exceptions.ConnectionClosed:
        pass

async def process_message(data):
    try:
        lesson_id = data.get('lessonId')
        user_message = data.get('message')
        
        if not lesson_id or not user_message:
            return {
                'error': 'Missing lessonId or message',
                'sender': 'bot'
            }
        
        print(f"Processing message for lesson {lesson_id}: {user_message}")
        
        # Get lesson content using the PDF integration
        try:
            lesson_data = await asyncio.to_thread(pdf_processor.getLessonContent, lesson_id)
            
            # Check if we have QA pairs to match against
            if lesson_data.get('qaPairs') and len(lesson_data['qaPairs']) > 0:
                # Try to find a direct match in QA pairs
                for qa_pair in lesson_data['qaPairs']:
                    if user_message.lower() in qa_pair['question'].lower():
                        return {
                            'message': qa_pair['answer'],
                            'sender': 'bot',
                            'matched': True
                        }
            
            # If no direct match, construct a response based on lesson content
            title = lesson_data.get('title', 'Unknown Lesson')
            content = lesson_data.get('content', '')
            summary = lesson_data.get('summary', '')
            
            response = f"Based on the lesson '{title}', I can tell you that {summary}\n\nRegarding your question: {user_message}\n\nThe lesson covers this topic in detail."
            
            return {
                'message': response,
                'sender': 'bot',
                'lesson_title': title
            }
            
        except Exception as e:
            print(f"Error getting lesson content: {str(e)}")
            return {
                'message': f"I'm sorry, I couldn't retrieve information for this lesson. Error: {str(e)}",
                'sender': 'bot',
                'error': True
            }
        
    except Exception as e:
        print(f"Error processing message: {str(e)}")
        return {
            'message': f"I'm sorry, I encountered an error processing your question: {str(e)}",
            'sender': 'bot',
            'error': True
        }

async def main():
    server = await websockets.serve(handle_client, "localhost", 8765)
    print("WebSocket server started on ws://localhost:8765")
    await server.wait_closed()

if __name__ == "__main__":
    asyncio.run(main()) 