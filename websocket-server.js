const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
// Load environment variables from .env file
require('dotenv').config();
// Add required database modules
const mysql = require('mysql2/promise');
// PDF extraction library
const pdf = require('pdf-parse');

// Database connection configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'Sara',
    password: process.env.DB_PASSWORD || 'Sara0330!!',
    database: process.env.DB_NAME || 'aischool',
};

// Create a database connection pool
let dbPool;
async function initializeDbConnection() {
    try {
        dbPool = mysql.createPool(dbConfig);
        console.log('Database connection pool initialized');
    } catch (error) {
        console.error('Failed to initialize database connection:', error);
    }
}

// Try to create a server on ports 8080, 8081, 8082 in sequence
function createServer(port, maxRetries = 3, attempt = 0) {
    try {
        if (attempt >= maxRetries) {
            console.log(`Failed to start server after ${maxRetries} attempts`);
            return null;
        }

        const server = http.createServer();
        const wss = new WebSocket.Server({ server });

        // Set up connection handler
        wss.on('connection', (ws) => {
            console.log('A new client connected!');

            ws.on('message', async (message) => {
                console.log(`Received: ${message}`);
                
                // Generate an intelligent response
                const response = await generateResponse(message);
                
                // Send the response
                ws.send(response);
            });

            ws.on('close', () => {
                console.log('Client disconnected');
            });
        });

        // Start server
        server.listen(port, () => {
            console.log(`WebSocket server is running on ws://localhost:${port}`);
            
            // If we're using a different port than the default, let's warn the user
            if (port !== 8080) {
                console.log(`\n⚠️ IMPORTANT: The server is running on port ${port} instead of the default 8080.`);
                console.log(`⚠️ You need to update your client code to use port ${port} instead of 8080.\n`);
            }
        });

        server.on('error', (e) => {
            if (e.code === 'EADDRINUSE') {
                console.log(`Port ${port} is already in use, trying port ${port + 1}...`);
                createServer(port + 1, maxRetries, attempt + 1);
            } else {
                console.error('Server error:', e);
            }
        });

        return wss;
    } catch (err) {
        console.error('Failed to create WebSocket server:', err);
        if (attempt < maxRetries) {
            console.log(`Trying port ${port + 1}...`);
            return createServer(port + 1, maxRetries, attempt + 1);
        }
        return null;
    }
}

// Cache for storing lesson content to avoid repeated fetching
const lessonContentCache = new Map();

// Function to fetch lesson content from the database
async function fetchLessonContent(lessonId) {
    // Check if we have this content in cache
    if (lessonContentCache.has(lessonId)) {
        console.log(`Using cached content for lesson ${lessonId}`);
        return lessonContentCache.get(lessonId);
    }

    try {
        if (!dbPool) {
            await initializeDbConnection();
        }

        console.log(`Fetching lesson ${lessonId} content from database...`);
        
        // Query the database for the lesson - removed 'description' column which doesn't exist
        const [lessons] = await dbPool.execute(
            'SELECT id, title, pdf_path FROM lessons WHERE id = ? OR title LIKE ?',
            [lessonId, `%${lessonId}%`]
        );

        if (lessons.length === 0) {
            console.log(`No lesson found with ID or title containing: ${lessonId}`);
            return null;
        }

        const lesson = lessons[0];
        console.log(`Found lesson: ${lesson.title}`);

        // Get the PDF path from the database
        const pdfPath = lesson.pdf_path;
        if (!pdfPath) {
            console.log(`No PDF path found for lesson ${lessonId}`);
            return null;
        }

        // Resolve the full path to the PDF file
        const fullPdfPath = path.resolve(process.env.PDF_STORAGE_PATH || './public/lessons', pdfPath);
        console.log(`Looking for PDF at: ${fullPdfPath}`);
        
        let pdfContent = "";
        
        // Check if the file exists and read it
        if (fs.existsSync(fullPdfPath)) {
            console.log(`PDF file found at ${fullPdfPath}`);
            const dataBuffer = fs.readFileSync(fullPdfPath);
            
            // Parse the PDF content
            const pdfData = await pdf(dataBuffer);
            pdfContent = pdfData.text;
            console.log(`Extracted ${pdfContent.length} characters from PDF`);
        } else {
            console.log(`PDF file not found at ${fullPdfPath}`);
            // If no PDF file found, try to get content from alternative sources
            // like associated lesson materials in the database
            
            const [materials] = await dbPool.execute(
                'SELECT content FROM lesson_materials WHERE lesson_id = ?',
                [lesson.id]
            );
            
            if (materials.length > 0) {
                pdfContent = materials.map(m => m.content).join('\n\n');
                console.log(`Using ${materials.length} lesson materials as alternative to PDF`);
            } else {
                console.log(`No alternative materials found for lesson ${lessonId}`);
                // Fallback to default content for testing when no PDF or materials are found
                return getFallbackContent(lessonId);
            }
        }
        
        // Parse the PDF content into structured sections
        const content = parseContentIntoStructure(lesson, pdfContent);
        
        // Cache the content for future use
        lessonContentCache.set(lessonId, content);
        return content;
    } catch (error) {
        console.error('Error fetching lesson content from database:', error);
        console.log('Falling back to default content');
        return getFallbackContent(lessonId);
    }
}

// Function to parse raw PDF content into a structured format
function parseContentIntoStructure(lesson, pdfContent) {
    console.log('Parsing PDF content into structured format...');
    
    // Simple parsing - split by common section indicators
    const lines = pdfContent.split('\n');
    const sections = [];
    const topics = [];
    let currentSection = null;
    let codeBlocks = [];
    let inCodeBlock = false;
    let currentCodeBlock = { language: 'python', title: '', code: '' };
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip empty lines
        if (!line) continue;
        
        // Check for section headings (e.g., capitalized words followed by a colon or all caps)
        if (/^[A-Z][A-Za-z\s]+:/.test(line) || /^[A-Z\s]{5,}$/.test(line)) {
            if (currentSection) {
                sections.push(currentSection);
            }
            
            currentSection = {
                title: line.replace(':', '').trim(),
                content: ''
            };
            
            // Add to topics list if it seems like a topic
            if (line.length < 50) {
                topics.push(line.replace(':', '').trim());
            }
            
            continue;
        }
        
        // Check for code block markers
        if (line.includes('```python') || line.includes('```tf') || line.includes('# Code example')) {
            inCodeBlock = true;
            currentCodeBlock = {
                language: 'python',
                title: 'Code Example',
                code: ''
            };
            continue;
        }
        
        if (inCodeBlock && (line.includes('```') || (line.length === 0 && currentCodeBlock.code.length > 0))) {
            inCodeBlock = false;
            codeBlocks.push({...currentCodeBlock});
            continue;
        }
        
        // Add content to current section or code block
        if (inCodeBlock) {
            currentCodeBlock.code += line + '\n';
        } else if (currentSection) {
            currentSection.content += line + ' ';
        }
    }
    
    // Add the last section if exists
    if (currentSection) {
        sections.push(currentSection);
    }
    
    // Try to detect common deep learning topics
    const dlTopics = [
        "Neural Networks", "Deep Learning", "Activation Functions", 
        "Supervised Learning", "Unsupervised Learning", "TensorFlow",
        "PyTorch", "Backpropagation", "Gradient Descent", "Convolutional Neural Networks",
        "Recurrent Neural Networks", "LSTM", "Transfer Learning"
    ];
    
    // Add detected topics to our list
    dlTopics.forEach(topic => {
        if (pdfContent.toLowerCase().includes(topic.toLowerCase()) && 
            !topics.some(t => t.toLowerCase() === topic.toLowerCase())) {
            topics.push(topic);
        }
    });
    
    // Create the structured content
    return {
        id: lesson.id,
        title: lesson.title,
        content: `This lesson covers ${lesson.title}.`,
        topics: topics.length > 0 ? topics : ["Deep Learning", "Neural Networks", "Machine Learning"],
        sections: sections.length > 0 ? sections : [
            { 
                title: lesson.title, 
                content: pdfContent.slice(0, 500) + '...' // First 500 chars as a fallback
            }
        ],
        codeExamples: codeBlocks.length > 0 ? codeBlocks : []
    };
}

// Fallback content when no database content is found
function getFallbackContent(lessonId) {
    console.log(`Using fallback content for lesson ${lessonId}`);
    
    // Default content for deep learning lessons
    if (lessonId.includes('1') || lessonId.toLowerCase().includes('deep') || 
        lessonId.toLowerCase().includes('neural') || lessonId.toLowerCase().includes('learn')) {
        return {
            id: lessonId || 'lesson1',
            title: "Introduction to Deep Learning",
            content: "This lesson covers the fundamentals of deep learning, neural networks, and their applications.",
            topics: [
                "What is Deep Learning",
                "Neural Networks and their structure",
                "Activation Functions",
                "Supervised vs Unsupervised Learning",
                "Building a Neural Network in TensorFlow",
                "Neural Network Layers",
                "Training a Model with backpropagation"
            ],
            sections: [
                {
                    title: "What is Deep Learning?",
                    content: "Deep learning is a subfield of machine learning that deals with algorithms inspired by the structure and function of the human brain, known as artificial neural networks. It is widely used for tasks such as image recognition, speech processing, and natural language understanding."
                },
                {
                    title: "Key Concepts",
                    content: "Neural Networks: Computational models inspired by biological neural networks that are used to approximate complex functions.\nActivation Functions: Mathematical functions applied to the outputs of neurons to introduce non-linearity, enabling the network to learn complex patterns.\nSupervised Learning: The model is trained on labeled data.\nUnsupervised Learning: The model works with data that has no labels, often finding hidden structures or patterns."
                },
                {
                    title: "Neural Network Layers",
                    content: "Neural networks consist of input layers, hidden layers, and output layers. Each layer contains nodes (neurons) that process information. Understanding the structure of a neural network is important for building effective deep learning models."
                },
                {
                    title: "Training a Model",
                    content: "Training involves feeding data to the model, adjusting the weights during training using backpropagation, and using an optimizer for better performance. This process allows the neural network to learn from examples and improve its predictions."
                }
            ],
            codeExamples: [
                {
                    language: "python",
                    title: "Building a Simple Neural Network in TensorFlow",
                    code: `import tensorflow as tf
from tensorflow import keras

# Define a simple sequential model
model = keras.Sequential([
    keras.layers.Dense(10, activation='relu', input_shape=(5,)), # 5 input features, 10 neurons in hidden layer
    keras.layers.Dense(1, activation='sigmoid') # Output layer with 1 neuron (binary classification)
])

# Compile the model
model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])

# Summary of the model
model.summary()`
                }
            ]
        };
    }
    
    // Generic fallback for other lesson types
    return {
        id: lessonId,
        title: `Lesson ${lessonId}`,
        content: `This lesson covers important educational content.`,
        topics: ["Learning", "Education", "Knowledge"],
        sections: [
            {
                title: "Introduction",
                content: "Welcome to this lesson. Unfortunately, detailed content for this lesson could not be retrieved from the database."
            }
        ],
        codeExamples: []
    };
}

// Function to find relevant information from lesson content
function findRelevantLessonContent(query, lessonContent) {
    if (!lessonContent) return null;
    
    query = query.toLowerCase();
    let relevant = [];
    
    // Check if any topics match the query
    if (lessonContent.topics) {
        const matchingTopics = lessonContent.topics.filter(topic => 
            query.includes(topic.toLowerCase()) || 
            topic.toLowerCase().includes(query)
        );
        
        if (matchingTopics.length > 0) {
            relevant.push(`From the lesson topics: ${matchingTopics.join(', ')}`);
        }
    }
    
    // Check if any sections match the query
    if (lessonContent.sections) {
        for (const section of lessonContent.sections) {
            if (query.includes(section.title.toLowerCase()) || 
                section.title.toLowerCase().includes(query) ||
                query.includes(section.content.toLowerCase()) || 
                section.content.toLowerCase().includes(query)) {
                relevant.push(`${section.title}: ${section.content}`);
            }
        }
    }
    
    // Check if any code examples match the query
    if (lessonContent.codeExamples && 
        (query.includes('code') || query.includes('example') || 
         query.includes('implementation') || query.includes('how to'))) {
        for (const example of lessonContent.codeExamples) {
            relevant.push(`Here's a code example for ${example.title}:\n\`\`\`${example.language}\n${example.code}\n\`\`\``);
        }
    }
    
    return relevant.length > 0 ? relevant.join('\n\n') : null;
}

// Function to generate responses based on the message content
async function generateResponse(message) {
    try {
        // Extract the actual question (format is often "lessonId|question")
        const parts = message.toString().split('|');
        const lessonId = parts.length > 1 ? parts[0] : '';
        const question = parts.length > 1 ? parts[1].toLowerCase() : message.toString().toLowerCase();
        
        console.log(`Processing question: "${question}" for lesson: "${lessonId}"`);
        
        // Fetch the lesson content if available
        const lessonContent = await fetchLessonContent(lessonId);
        
        if (!lessonContent) {
            return "I don't have any information about this lesson. Please check the lesson ID or try asking about a different topic.";
        }
        
        // Prepare the context from lesson content to send to Grok API
        let lessonContext = "";
        
        // Add title and overview
        lessonContext += `LESSON TITLE: ${lessonContent.title}\n\n`;
        lessonContext += `OVERVIEW: ${lessonContent.content}\n\n`;
        
        // Add topics
        if (lessonContent.topics && lessonContent.topics.length > 0) {
            lessonContext += "TOPICS:\n";
            lessonContent.topics.forEach(topic => {
                lessonContext += `- ${topic}\n`;
            });
            lessonContext += "\n";
        }
        
        // Add sections with content
        if (lessonContent.sections && lessonContent.sections.length > 0) {
            lessonContext += "DETAILED CONTENT:\n\n";
            lessonContent.sections.forEach(section => {
                lessonContext += `## ${section.title}\n${section.content}\n\n`;
            });
        }
        
        // Add code examples
        if (lessonContent.codeExamples && lessonContent.codeExamples.length > 0) {
            lessonContext += "CODE EXAMPLES:\n\n";
            lessonContent.codeExamples.forEach(example => {
                lessonContext += `### ${example.title}\n\`\`\`${example.language}\n${example.code}\n\`\`\`\n\n`;
            });
        }
        
        console.log("Prepared lesson context for Grok API");
        
        // Call the Grok API with the question and lesson context
        try {
            const grokResponse = await queryGrokAPI(question, lessonContext);
            return grokResponse;
        } catch (error) {
            console.error("Error calling Grok API:", error);
            
            // Fallback: If Grok API fails, use our simple matching system as a backup
            console.log("Using fallback response system");
            
            // First, try to find relevant content from the lesson itself
            const relevantContent = findRelevantLessonContent(question, lessonContent);
            if (relevantContent) {
                return removeMarkdownFormatting(`Based on the lesson materials:\n\n${relevantContent}`);
            }
            
            // Default response if no specific match is found and Grok API failed
            return removeMarkdownFormatting("I'm your AI assistant for this lesson. I encountered an issue processing your question with our AI service. Could you please try again with a more specific question about the lesson content?");
        }
    } catch (error) {
        console.error("Error in generateResponse:", error);
        return removeMarkdownFormatting("Sorry, I encountered an error while processing your question. Please try again.");
    }
}

// Function to call the Grok API
async function queryGrokAPI(question, lessonContext) {
    try {
        console.log("Preparing to send request to Grok API...");
        
        // Check if we should use the fallback system instead of the API
        if (process.env.USE_FALLBACK_SYSTEM === 'true') {
            console.log("Fallback system enabled. Skipping API call and using local content matching.");
            throw new Error("Fallback system enabled");
        }
        
        // Get the API key and endpoint from environment variables or use defaults for testing
        const apiKey = process.env.GROK_API_KEY || process.env.XITTER_API_KEY;
        // Use the correct X.AI API endpoint as provided
        const baseUrl = process.env.GROK_API_BASE_URL || "https://api.x.ai/v1";
        const apiEndpoint = `${baseUrl}/chat/completions`;
        
        if (!apiKey || apiKey === 'your_actual_api_key_here') {
            console.log("No valid API key provided. Using fallback response system.");
            throw new Error("Missing or invalid Grok API key");
        }
        
        console.log(`Using API endpoint: ${apiEndpoint}`);
        
        // Set NODE_TLS_REJECT_UNAUTHORIZED to handle SSL issues in development
        if (process.env.NODE_ENV === 'development') {
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
            console.log("Warning: SSL verification disabled for development");
        }
        
        // Configure Axios with proper timeout and SSL settings
        const axiosConfig = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            timeout: 30000, // 30 second timeout
            validateStatus: function (status) {
                return status >= 200 && status < 500; // Only reject if server error
            }
        };
        
        // Prepare the request payload with the correct model name
        const payload = {
            model: "grok-beta", // Confirmed grok-beta model as specified
            messages: [
                {
                    role: "system",
                    content: `You are an intelligent educational assistant focusing on the following lesson content. 
Answer questions based strictly on this lesson material. If the information isn't in the lesson content, 
acknowledge this and suggest focusing on the available material. Use a friendly, educational tone 
and format your responses with markdown when appropriate for better readability.

LESSON CONTENT:
${lessonContext}`
                },
                {
                    role: "user",
                    content: question
                }
            ],
            temperature: 0.3, // Lower temperature for more focused responses
            max_tokens: 1000 // Adjust as needed
        };
        
        console.log("Sending request to X.AI Grok API...");
        
        try {
            // Send the request to the Grok API
            const response = await axios.post(apiEndpoint, payload, axiosConfig);
            
            // Handle different response formats
            if (response.status !== 200) {
                console.log(`API returned status ${response.status}`);
                throw new Error(`API returned status ${response.status}: ${JSON.stringify(response.data)}`);
            }
            
            if (!response.data) {
                throw new Error("Empty response from API");
            }
            
            // Extract the response based on API response format
            let grokAnswer;
            
            if (response.data.choices && response.data.choices.length > 0) {
                // Standard OpenAI-compatible format
                grokAnswer = response.data.choices[0].message.content;
            } else if (response.data.content) {
                // Alternative format
                grokAnswer = response.data.content;
            } else if (response.data.result) {
                // Another alternative format
                grokAnswer = response.data.result;
            } else {
                console.error("Unexpected API response format:", JSON.stringify(response.data));
                throw new Error("Unexpected response format from API");
            }
            
            console.log("Received response from X.AI Grok API");
            return removeMarkdownFormatting(grokAnswer);
        } catch (apiError) {
            console.error("API request failed:", apiError.message);
            
            // Try fallback API if primary fails (OpenAI compatible API)
            if (process.env.FALLBACK_API_ENDPOINT && process.env.FALLBACK_API_KEY) {
                console.log("Trying fallback API...");
                try {
                    const fallbackEndpoint = process.env.FALLBACK_API_ENDPOINT;
                    const fallbackKey = process.env.FALLBACK_API_KEY;
                    
                    const fallbackResponse = await axios.post(fallbackEndpoint, payload, {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${fallbackKey}`
                        }
                    });
                    
                    if (fallbackResponse.data && fallbackResponse.data.choices && fallbackResponse.data.choices.length > 0) {
                        return removeMarkdownFormatting(fallbackResponse.data.choices[0].message.content);
                    }
                } catch (fallbackError) {
                    console.error("Fallback API also failed:", fallbackError.message);
                }
            }
            
            // If we get here, all API attempts failed
            throw new Error(`API call failed: ${apiError.message}`);
        }
    } catch (error) {
        console.error("Error in Grok API call:", error.message);
        throw error; // Re-throw to be handled by the calling function
    }
}

// Function to remove markdown formatting (like * for bold/italic)
function removeMarkdownFormatting(text) {
    if (!text) return text;
    
    // Remove asterisks used for bold and italic formatting
    text = text.replace(/\*\*(.*?)\*\*/g, '$1'); // Remove ** (bold)
    text = text.replace(/\*(.*?)\*/g, '$1');     // Remove * (italic)
    
    // Remove other markdown formatting if needed
    // text = text.replace(/__(.*?)__/g, '$1');     // Remove __ (bold)
    // text = text.replace(/_(.*?)_/g, '$1');       // Remove _ (italic)
    // text = text.replace(/~~(.*?)~~/g, '$1');     // Remove ~~ (strikethrough)
    
    console.log("Removed markdown formatting from response");
    return text;
}

// Initialize the database connection and start the server
(async function() {
    try {
        // Initialize database connection
        await initializeDbConnection();
        console.log('Database connection established');
        
        // Start the websocket server
        createServer(8080);
    } catch (error) {
        console.error('Failed to start application:', error);
    }
})(); 