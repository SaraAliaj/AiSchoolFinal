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

# Load environment variables from .env file
load_dotenv()

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

# Initialize OpenAI client if API key is available
try:
    if Config.XAI_API_KEY:
        client = OpenAI(
            api_key=Config.XAI_API_KEY,
            base_url="https://api.x.ai/v1",
        )
        print("Grok API client initialized successfully")
    else:
        client = None
        print("Grok API client not initialized - using mock responses")
except Exception as e:
    print(f"Error initializing API client: {e}")
    client = None

# Keep track of connected WebSockets
active_connections = {}

# List of stop words to remove
STOP_WORDS = {'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', "you're", "you've", "you'll", 
              "you'd", 'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', "she's", 
              'her', 'hers', 'herself', 'it', "it's", 'its', 'itself', 'they', 'them', 'their', 'theirs', 
              'themselves', 'what', 'which', 'who', 'whom', 'this', 'that', "that'll", 'these', 'those', 'am', 
              'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 
              'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while', 
              'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during', 
              'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 
              'under', 'again', 'further', 'then', 'once'}

def clean_text(text):
    """Remove punctuation and stop words from text"""
    # Convert to lowercase
    text = text.lower()
    
    # Remove punctuation
    text = text.translate(str.maketrans('', '', string.punctuation))
    
    # Remove numbers
    text = re.sub(r'\d+', '', text)
    
    # Split into words
    words = text.split()
    
    # Remove stop words
    words = [word for word in words if word not in STOP_WORDS]
    
    # Join words back together
    return ' '.join(words)

def get_db_connection():
    """Create and return a database connection"""
    try:
        connection = pymysql.connect(
            host=Config.DB_HOST,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD,
            database=Config.DB_NAME,
            cursorclass=pymysql.cursors.DictCursor
        )
        return connection
    except Exception as e:
        print(f"Database connection error: {e}")
        raise HTTPException(status_code=500, detail="Database connection error")

def get_lesson_info(lesson_id):
    """Get lesson information from the database"""
    # For testing purposes, return detailed mock data for specific lesson IDs
    if lesson_id == "1":
        return """
        # Introduction to Deep Learning
        
        Deep learning is a subset of machine learning that uses neural networks with multiple layers.
        These neural networks are designed to mimic the human brain's structure and function.
        
        ## Key Concepts
        
        - Neural Networks: Computational models inspired by the human brain
        - Layers: Building blocks of neural networks that transform input data
        - Activation Functions: Functions that determine the output of a neural network node
        - Backpropagation: Algorithm for training neural networks by adjusting weights
        
        ## Applications
        
        Deep learning is used in various fields including:
        - Computer Vision: Image recognition, object detection, and image generation
        - Natural Language Processing: Language translation, sentiment analysis, and text generation
        - Speech Recognition: Converting spoken language to text
        - Autonomous Vehicles: Self-driving cars and drones
        - Healthcare: Disease diagnosis and drug discovery
        - Finance: Fraud detection and algorithmic trading
        
        ## Training Process
        
        Neural networks learn through a process called backpropagation:
        1. Forward pass: Data flows through the network to produce an output
        2. Error calculation: The difference between the output and expected result is measured
        3. Backward pass: The error is propagated back through the network
        4. Weight adjustment: Connection weights are updated to minimize the error
        5. Iteration: The process repeats with new training examples
        
        ## Types of Neural Networks
        
        - Feedforward Neural Networks: Basic architecture where data flows in one direction
        - Convolutional Neural Networks (CNNs): Specialized for processing grid-like data (images)
        - Recurrent Neural Networks (RNNs): Process sequential data with memory of previous inputs
        - Long Short-Term Memory (LSTM): Advanced RNN that can learn long-term dependencies
        - Generative Adversarial Networks (GANs): Two networks compete to generate realistic data
        """
    
    # Try to get data from database
    connection = get_db_connection()
    if not connection:
        print("Database connection failed, using mock data")
        return get_mock_lesson_content(lesson_id)
    
    try:
        with connection.cursor() as cursor:
            # Fetch the file path for the lesson
            sql = "SELECT file_path FROM lessons WHERE id = %s"
            cursor.execute(sql, (lesson_id,))
            result = cursor.fetchone()
            
            if result and result['file_path']:
                file_path = result['file_path']
                print(f"Found file path in database: {file_path}")
                
                # Check if file exists
                if not os.path.exists(file_path):
                    # Try with a relative path
                    base_dir = os.path.dirname(os.path.abspath(__file__))
                    relative_path = os.path.join(base_dir, file_path)
                    print(f"Trying relative path: {relative_path}")
                    
                    if not os.path.exists(relative_path):
                        print(f"File not found at {relative_path}, using mock data")
                        return get_mock_lesson_content(lesson_id)
                    
                    file_path = relative_path
                
                # Extract text from PDF
                pdf_text = extract_text_from_pdf(file_path)
                if "Error" in pdf_text:
                    print(f"PDF extraction error: {pdf_text}")
                    return get_mock_lesson_content(lesson_id)
                
                print(f"Successfully extracted text from PDF: {file_path}")
                return pdf_text
            else:
                # If no lesson found, return mock data
                print(f"No lesson found with ID {lesson_id}, using mock data")
                return get_mock_lesson_content(lesson_id)
    except Exception as e:
        print(f"Database query error: {e}")
        return get_mock_lesson_content(lesson_id)
    finally:
        connection.close()

def get_mock_lesson_content(lesson_id):
    """Return detailed mock content for a lesson"""
    return f"""
    # Deep Learning Lesson {lesson_id}
    
    Deep learning is an advanced subset of machine learning that uses neural networks with multiple layers to analyze and learn from data.
    
    ## Core Concepts
    
    - Neural Networks: Computational models inspired by the human brain's structure
    - Deep Neural Networks: Networks with multiple hidden layers that can learn complex patterns
    - Activation Functions: Mathematical functions that determine the output of a neural network node
    - Backpropagation: Algorithm for training neural networks by adjusting weights based on error
    - Gradient Descent: Optimization algorithm used to minimize the error by adjusting weights
    
    ## Applications
    
    Deep learning has revolutionized many fields:
    - Computer Vision: Image classification, object detection, facial recognition
    - Natural Language Processing: Translation, summarization, sentiment analysis
    - Speech Recognition: Voice assistants, transcription services
    - Autonomous Systems: Self-driving vehicles, robotics
    - Healthcare: Medical image analysis, disease prediction
    - Finance: Fraud detection, risk assessment, algorithmic trading
    
    ## Advanced Topics
    
    - Transfer Learning: Using pre-trained models for new tasks
    - Reinforcement Learning: Training agents to make decisions through rewards
    - Generative Models: Creating new content like images, text, or music
    - Attention Mechanisms: Focusing on relevant parts of input data
    - Transformers: Architecture that revolutionized NLP tasks
    """

def extract_text_from_pdf(file_path):
    """Extract text from a PDF file"""
    try:
        # Check if file exists
        if not os.path.exists(file_path):
            return f"Error: PDF file not found at {file_path}"
        
        # Open the PDF file
        document = fitz.open(file_path)
        text = ""
        
        # Extract text from each page
        for page in document:
            text += page.get_text()
        
        return text
    except Exception as e:
        print(f"PDF extraction error: {e}")
        return f"Error extracting text from PDF: {str(e)}"

def chat_with_grok(user_input, lesson_info):
    """Send a request to the Grok API and return the response"""
    # If client is not initialized, return mock response
    if client is None:
        # Extract relevant information from the lesson content based on the question
        lower_input = user_input.lower()
        lower_lesson = lesson_info.lower()
        
        # Try to find relevant sections in the lesson content
        if "neural network" in lower_input:
            if "type" in lower_input or "different" in lower_input:
                if "cnn" in lower_lesson or "convolutional" in lower_lesson:
                    return clean_text("convolutional neural networks specialized processing grid data images extract features patterns through filters pooling layers")
                elif "rnn" in lower_lesson or "recurrent" in lower_lesson:
                    return clean_text("recurrent neural networks process sequential data maintain internal memory previous inputs useful text time series data")
                else:
                    return clean_text("neural networks types include feedforward networks basic architecture convolutional networks image processing recurrent networks sequential data processing generative adversarial networks create realistic data")
            else:
                return clean_text("neural networks computational models inspired brain consist layers interconnected nodes process transform data")
        
        elif "activation" in lower_input:
            if "function" in lower_input and ("type" in lower_input or "different" in lower_input):
                return clean_text("activation functions include relu returns maximum zero input value sigmoid squashes values between zero one tanh similar sigmoid outputs range negative one positive one softmax used output layer multiclass classification")
            else:
                return clean_text("activation functions determine output neural network node introduce nonlinearity allow networks learn complex patterns")
        
        elif "application" in lower_input or "used for" in lower_input:
            applications = []
            if "vision" in lower_lesson or "image" in lower_lesson:
                applications.append("computer vision image recognition object detection image generation")
            if "language" in lower_lesson or "nlp" in lower_lesson:
                applications.append("natural language processing translation sentiment analysis text generation")
            if "speech" in lower_lesson:
                applications.append("speech recognition convert spoken language text")
            if "autonomous" in lower_lesson or "vehicle" in lower_lesson:
                applications.append("autonomous vehicles self driving cars drones")
            if "health" in lower_lesson or "medical" in lower_lesson:
                applications.append("healthcare disease diagnosis drug discovery medical imaging")
            
            if applications:
                return clean_text(" ".join(applications))
            else:
                return clean_text("deep learning applications include computer vision natural language processing speech recognition autonomous vehicles healthcare finance")
        
        elif "train" in lower_input or "learning" in lower_input:
            if "backpropagation" in lower_lesson:
                return clean_text("neural networks trained using backpropagation algorithm forward pass data flows through network produce output error calculation difference output expected result backward pass error propagated back network weight adjustment connection weights updated minimize error iteration process repeats new training examples")
            else:
                return clean_text("neural networks trained using supervised learning algorithm adjusts weights connections minimize prediction errors based labeled data")
        
        elif "deep learning" in lower_input:
            return clean_text("deep learning subset machine learning uses neural networks multiple layers analyze data make predictions models learn representations data multiple levels abstraction")
        
        else:
            # Extract most relevant sentence from lesson content
            sentences = re.split(r'[.!?]', lesson_info)
            sentences = [s.strip() for s in sentences if s.strip()]
            
            # Find most relevant sentence based on keyword matching
            keywords = [word for word in lower_input.split() if word not in STOP_WORDS and len(word) > 3]
            best_sentence = ""
            best_score = 0
            
            for sentence in sentences:
                score = sum(1 for keyword in keywords if keyword in sentence.lower())
                if score > best_score:
                    best_score = score
                    best_sentence = sentence
            
            if best_score > 0:
                return clean_text(best_sentence)
            else:
                return clean_text("deep learning uses neural networks multiple layers learn complex patterns data refer lesson content specific information")
    
    try:
        # Create system message includes lesson content
        system_message = f"""
        You are an AI assistant for a deep learning course.
        Base your responses ONLY on the following lesson content:
        
        {lesson_info}
        
        Guidelines:
        1. Provide detailed answers for complex topics, keep simple definitions concise
        2. Focus ONLY on information from the lesson content above
        3. Use simple language, avoid technical jargon unless necessary
        4. If a question is not related to this lesson content, politely inform the user
        5. Do not make up information that is not in the lesson content
        6. Do not use markdown formatting or special characters
        """
        
        # Call Grok API
        response = client.chat.completions.create(
            model="grok-beta",
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_input},
            ],
            temperature=0.3,
            max_tokens=250,
        )
        
        # Clean response remove symbols make concise
        raw_response = response.choices[0].message.content
        # Remove markdown symbols newlines whitespace
        cleaned_response = raw_response.replace('*', '').replace('#', '').replace('`', '').replace('**', '')
        # Remove multiple spaces newlines
        cleaned_response = ' '.join(cleaned_response.split())
        # Remove punctuation and stop words
        cleaned_response = clean_text(cleaned_response)
        return cleaned_response
    except Exception as e:
        print(f"Grok API error: {e}")
        return clean_text("cannot answer right now ask specific question deep learning concepts lesson")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for chat communication"""
    await websocket.accept()
    print("WebSocket connection established")
    
    try:
        # Send welcome message
        welcome_msg = {"response": "IM ai assistant for your lesson"}
        await websocket.send_text(json.dumps(welcome_msg))
        
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            print(f"Received message: {data}")
            
            try:
                # Parse message
                if '|' not in data:
                    error_msg = {"error": "Invalid message format. Expected 'lessonId|question'"}
                    await websocket.send_text(json.dumps(error_msg))
                    continue
                
                lesson_id, question = data.split('|', 1)  # Split only on first '|'
                
                # Get lesson info
                lesson_info = get_lesson_info(lesson_id)
                
                # Check if there was an error getting lesson info
                if lesson_info.startswith("Error:"):
                    error_msg = {"error": lesson_info}
                    await websocket.send_text(json.dumps(error_msg))
                    continue
                
                # Get response from Grok
                response = chat_with_grok(question, lesson_info)
                
                # Send response back to client
                response_data = {"response": response}
                await websocket.send_text(json.dumps(response_data))
                print(f"Sent response for lesson {lesson_id}")
                
            except Exception as e:
                print(f"Error processing message: {e}")
                error_msg = {"error": str(e)}
                await websocket.send_text(json.dumps(error_msg))
    except WebSocketDisconnect:
        print("WebSocket connection closed")

# Add a health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    port = Config.PORT
    print(f"Starting server on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port) 