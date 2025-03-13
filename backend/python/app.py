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

async def main():
    # Use 0.0.0.0 to bind to all interfaces, allowing external connections
    server = await websockets.serve(handle_client, "0.0.0.0", 8765)
    print("WebSocket server started on ws://0.0.0.0:8765")
    await server.wait_closed()

if __name__ == "__main__":
    asyncio.run(main()) 