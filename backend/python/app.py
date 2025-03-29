import json
import asyncio
import websockets
import os
import sys
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
import threading
from datetime import datetime
import logging
from config import Config
from database import db

# Load environment variables
load_dotenv()

# Import the PDF integration
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
import pdf_processor

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app, origins=Config.CORS_ORIGINS)

# Health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    db_status = "connected" if db.test_connection() else "disconnected"
    return jsonify({
        'status': 'ok',
        'timestamp': datetime.now().isoformat(),
        'database': db_status,
        'environment': Config.ENV
    })

# Today's lesson endpoint
@app.route('/api/today-lesson', methods=['GET'])
def get_today_lesson():
    """Get today's lesson with database connection error handling"""
    # Get current day
    weekday = datetime.now().strftime('%A').lower()
    
    # Check database connection
    if not db.test_connection():
        logger.warning("Database connection unavailable for today-lesson endpoint")
        return jsonify({
            'day': weekday,
            'title': 'Temporary Content',
            'content': 'The database is currently unavailable. Please try again later.',
            'status': 'db_unavailable'
        }), 200  # Return 200 OK with fallback content
    
    # Query for today's lesson
    try:
        lesson = db.execute(
            "SELECT * FROM lessons WHERE day = %s ORDER BY created_at DESC LIMIT 1", 
            (weekday,)
        )
        
        if lesson and len(lesson) > 0:
            return jsonify(lesson[0]), 200
            
        # No lesson found for today, get any lesson as fallback
        fallback_lesson = db.execute(
            "SELECT * FROM lessons ORDER BY created_at DESC LIMIT 1"
        )
        
        if fallback_lesson and len(fallback_lesson) > 0:
            fallback_data = fallback_lesson[0]
            fallback_data['note'] = f"No lesson for {weekday} found. Showing the most recent lesson instead."
            return jsonify(fallback_data), 200
            
        # No lessons at all
        return jsonify({
            'day': weekday,
            'title': 'No Content Available',
            'content': 'No lessons have been added to the database yet.',
            'status': 'no_content'
        }), 200
            
    except Exception as e:
        logger.error(f"Error retrieving lesson: {e}")
        return jsonify({
            'error': 'Error retrieving lesson',
            'message': str(e)
        }), 500

# Get quiz endpoint
@app.route('/api/quiz/<day>', methods=['GET'])
def get_quiz(day):
    """Get quiz for a specific day with database connection error handling"""
    # Check database connection
    if not db.test_connection():
        logger.warning(f"Database connection unavailable for quiz endpoint (day: {day})")
        return jsonify({
            'day': day,
            'questions': [],
            'message': 'The database is currently unavailable. Please try again later.',
            'status': 'db_unavailable'
        }), 200  # Return 200 OK with fallback content
    
    try:
        quiz_data = db.execute(
            "SELECT * FROM quizzes WHERE day = %s ORDER BY created_at DESC LIMIT 1", 
            (day,)
        )
        
        if quiz_data and len(quiz_data) > 0:
            return jsonify(quiz_data[0]), 200
            
        # No quiz found for the specified day
        return jsonify({
            'day': day,
            'questions': [],
            'message': f'No quiz found for {day}.',
            'status': 'no_content'
        }), 404
            
    except Exception as e:
        logger.error(f"Error retrieving quiz: {e}")
        return jsonify({
            'error': 'Error retrieving quiz',
            'message': str(e)
        }), 500

# WebSocket functionality
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
        
        try:
            lesson_data = await asyncio.to_thread(pdf_processor.getLessonContent, lesson_id)
            
            # Handle summary requests
            if any(keyword in user_message.lower() for keyword in ['summary', 'summarize', 'overview']):
                title = lesson_data.get('title', 'Unknown Lesson')
                summary = lesson_data.get('summary', '')
                key_points = lesson_data.get('key_points', [])
                
                # Format the summary text to remove any hash symbols and ensure proper line breaks
                if summary:
                    summary = summary.replace('#', '').strip()
                
                structured_response = {
                    'message': {
                        'type': 'structured_summary',
                        'title': title,
                        'sections': [
                            {
                                'heading': 'Summary',
                                'content': summary
                            }
                        ]
                    },
                    'sender': 'bot',
                    'lesson_title': title
                }
                
                # Add key points if available
                if key_points:
                    # Clean up key points to remove hash symbols
                    cleaned_key_points = [point.replace('#', '').strip() for point in key_points]
                    structured_response['message']['sections'].append({
                        'heading': 'Key Points',
                        'content': cleaned_key_points
                    })
                
                # Add related topics if available
                if lesson_data.get('related_topics'):
                    # Clean up related topics to remove hash symbols
                    cleaned_topics = [topic.replace('#', '').strip() for topic in lesson_data['related_topics']]
                    structured_response['message']['sections'].append({
                        'heading': 'Related Topics',
                        'content': cleaned_topics
                    })
                
                return structured_response
            
            # Handle QA pairs with structured responses
            if lesson_data.get('qaPairs') and len(lesson_data['qaPairs']) > 0:
                for qa_pair in lesson_data['qaPairs']:
                    if user_message.lower() in qa_pair['question'].lower():
                        # Clean up answer to remove hash symbols and ensure proper line breaks
                        cleaned_answer = qa_pair['answer'].replace('#', '').strip()
                        
                        # Split answer by line breaks and clean each line
                        if '\n' in cleaned_answer:
                            answer_lines = cleaned_answer.split('\n')
                            cleaned_answer = '\n'.join([line.strip() for line in answer_lines if line.strip()])
                        
                        return {
                            'message': {
                                'type': 'qa_response',
                                'question': qa_pair['question'],
                                'answer': cleaned_answer,
                                'examples': qa_pair.get('examples', []),
                                'references': qa_pair.get('references', [])
                            },
                            'sender': 'bot',
                            'matched': True
                        }
            
            # Default structured response for general questions
            title = lesson_data.get('title', 'Unknown Lesson')
            content = lesson_data.get('content', '')
            summary = lesson_data.get('summary', '')
            
            # Clean up content to remove hash symbols and ensure proper line breaks
            if content:
                content = content.replace('#', '').strip()
                # Split content by line breaks and clean each line
                if '\n' in content:
                    content_lines = content.split('\n')
                    content = '\n'.join([line.strip() for line in content_lines if line.strip()])
            
            # Clean up summary to remove hash symbols
            if summary:
                summary = summary.replace('#', '').strip()
            
            # Create a more structured response for general questions
            response_sections = []
            
            # Add a direct response section
            response_sections.append({
                'heading': 'Response',
                'content': f"Based on your question: {user_message}\n\n{content}"
            })
            
            # Add a summary section if available
            if summary:
                response_sections.append({
                    'heading': 'Summary',
                    'content': summary
                })
            
            # Add key points if available
            if lesson_data.get('key_points'):
                # Clean up key points to remove hash symbols
                cleaned_key_points = [point.replace('#', '').strip() for point in lesson_data['key_points']]
                response_sections.append({
                    'heading': 'Key Points',
                    'content': cleaned_key_points
                })
            
            return {
                'message': {
                    'type': 'general_response',
                    'title': title,
                    'sections': response_sections
                },
                'sender': 'bot',
                'lesson_title': title
            }
            
        except Exception as e:
            print(f"Error getting lesson content: {str(e)}")
            return {
                'message': {
                    'type': 'error',
                    'content': f"I'm sorry, I couldn't retrieve information for this lesson. Error: {str(e)}"
                },
                'sender': 'bot',
                'error': True
            }
        
    except Exception as e:
        print(f"Error processing message: {str(e)}")
        return {
            'message': {
                'type': 'error',
                'content': f"I'm sorry, I encountered an error processing your question: {str(e)}"
            },
            'sender': 'bot',
            'error': True
        }

async def websocket_server():
    """Start the WebSocket server"""
    ws_port = int(os.environ.get('WS_PORT', 8082))
    logger.info(f"Starting WebSocket server on port {ws_port}")
    
    try:
        async with websockets.serve(handle_client, "0.0.0.0", ws_port):
            logger.info(f"✅ WebSocket server running at ws://0.0.0.0:{ws_port}")
            await asyncio.Future()  # Run forever
    except Exception as e:
        logger.error(f"WebSocket server error: {e}")

def start_websocket_server():
    """Start the WebSocket server in a separate thread"""
    asyncio.run(websocket_server())

# Main application entry point
if __name__ == "__main__":
    port = int(os.environ.get('PORT', Config.PORT))
    
    # Log startup information
    logger.info(f"Starting server on port {port}")
    logger.info(f"Environment: {Config.ENV} (Production: {Config.is_production()})")
    logger.info(f"Database: {Config.DB_HOST}:{Config.DB_NAME}")
    
    # Test database connection
    if db.test_connection():
        logger.info("✅ Database connection successful")
        # Create tables if they don't exist
        if db.create_tables():
            logger.info("✅ Database tables verified/created")
        else:
            logger.warning("⚠️ Failed to verify/create database tables, but continuing startup")
    else:
        logger.warning("⚠️ Could not connect to database, starting with limited functionality")
    
    # Start WebSocket server in a separate thread
    websocket_thread = threading.Thread(target=start_websocket_server, daemon=True)
    websocket_thread.start()
    
    # Start the Flask server
    app.run(host='0.0.0.0', port=port, debug=Config.ENV.lower() == 'development') 