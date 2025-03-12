import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { api } from '@/server/api';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// Get the WebSocket URL based on the current environment
const getWebSocketUrl = () => {
  const host = window.location.hostname;
  // Use appropriate ports based on environment
  // For local development
  if (host === 'localhost' || host === '127.0.0.1') {
    return `ws://${host}:8765/ws`;  // Updated port to match Python server
  }
  // For production deployment (assuming secure WebSocket)
  return `wss://${window.location.host}/ws`;
};

const ChatBot = ({ lessonId }) => {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      text: `Hi there! 🤖 Ready to chat?`,
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting'); // Changed to start in connecting state
  const [useWebSocket, setUseWebSocket] = useState(true);  // Default to attempt using WebSocket
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Function to connect to WebSocket with reconnection logic
  const connectWebSocket = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }
    
    try {
      setConnectionStatus('connecting');
      console.log('Attempting to connect to WebSocket at', getWebSocketUrl());
      const ws = new WebSocket(getWebSocketUrl());
      
      ws.onopen = () => {
        console.log('WebSocket connection established');
        setUseWebSocket(true);
        setConnectionStatus('connected');
        
        // Clear any pending reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };
      
      ws.onmessage = (event) => {
        console.log('WebSocket message received:', event.data);
        try {
          // Try to parse as JSON
          const jsonData = JSON.parse(event.data);
          
          // Add response to chat
          const botMessage = {
            id: Date.now().toString(),
            text: jsonData.message || jsonData.error || event.data,
            sender: 'bot',
            timestamp: new Date(),
            error: !!jsonData.error
          };
          
          setMessages(prev => [...prev, botMessage]);
          setIsLoading(false);
        } catch (e) {
          // If not JSON, use raw text
          const botMessage = {
            id: Date.now().toString(),
            text: event.data,
            sender: 'bot',
            timestamp: new Date()
          };
          
          setMessages(prev => [...prev, botMessage]);
          setIsLoading(false);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
        // Will trigger reconnect via the onclose handler
      };
      
      ws.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
        setConnectionStatus('error');
        
        // Try to reconnect after a delay
        if (!reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            console.log('Attempting to reconnect WebSocket...');
            connectWebSocket();
          }, 3000); // 3 second delay before trying to reconnect
        }
      };
      
      socketRef.current = ws;
    } catch (error) {
      console.error('Failed to establish WebSocket connection:', error);
      setConnectionStatus('error');
      
      // Try to reconnect after a delay
      if (!reconnectTimeoutRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = null;
          console.log('Attempting to reconnect WebSocket after error...');
          connectWebSocket();
        }, 3000);
      }
    }
  };

  // Initialize WebSocket
  useEffect(() => {
    connectWebSocket();
    
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Monitor connection status and try to reconnect if needed
  useEffect(() => {
    const checkConnection = async () => {
      try {
        setConnectionStatus('connecting');
        await api.checkHealth();
        setConnectionStatus('connected');
      } catch (error) {
        console.error('Connection error:', error);
        setConnectionStatus('error');
        // Try to reconnect after 5 seconds
        setTimeout(checkConnection, 5000);
      }
    };

    if (connectionStatus === 'error') {
      checkConnection();
    }

    // Initial connection check
    if (connectionStatus !== 'connected') {
      checkConnection();
    }
  }, [connectionStatus]);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!inputValue.trim()) return;

    // Add user message to chat
    const userMessage = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      // Try WebSocket first if available
      if (useWebSocket && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        // Format message as JSON for WebSocket - using the correct format expected by the server
        const messageData = {
          lessonId: lessonId || '1',  // Default to lesson 1 if not specified
          message: userMessage.text
        };
        
        socketRef.current.send(JSON.stringify(messageData));
        console.log('Message sent via WebSocket:', messageData);
        // The response will be handled by the onmessage event
        return;
      }
      
      // Fall back to HTTP API if WebSocket is not available
      console.log('Using HTTP API fallback - WebSocket not available');
      let response;
      
      // Use the appropriate API method based on whether we have a lessonId
      if (lessonId) {
        response = await api.sendLessonChatMessage(lessonId, userMessage.text);
      } else {
        response = await api.sendChatMessage(userMessage.text);
      }

      // Add bot response to chat
      const botMessage = {
        id: (Date.now() + 1).toString(), // Ensure unique ID
        text: response.response,
        sender: 'bot',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botMessage]);
      setConnectionStatus('connected');
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message to chat
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        text: "I'm sorry, I'm having trouble connecting to the server. Please try again later.",
        sender: 'bot',
        error: true,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      setError(error.message);
      setConnectionStatus('error');
      
      // Try to reconnect WebSocket if it's the source of the error
      if (useWebSocket) {
        connectWebSocket();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Render each message
  const renderMessage = (message) => {
    const { id, text, sender, error: isError, timestamp } = message;
    const isBot = sender === 'bot';
    const time = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(timestamp);

    return (
      <div
        key={id}
        className={`flex mb-4 ${isBot ? 'justify-start' : 'justify-end'}`}
      >
        <div
          className={`flex max-w-[80%] rounded-lg p-4 ${
            isBot
              ? 'bg-gray-100 text-gray-800'
              : 'bg-primary text-white'
          } ${isError ? 'bg-red-100 border border-red-300 text-red-500' : ''}`}
        >
          <div className="flex-shrink-0 mr-3">
            {isBot ? (
              <Sparkles className="h-5 w-5 text-primary" />
            ) : (
              <User className="h-5 w-5 text-white" />
            )}
          </div>
          <div className="flex flex-col">
            <div className="whitespace-pre-wrap">{text}</div>
            <div className={`text-xs mt-1 ${isBot ? 'text-gray-500' : 'text-primary-foreground/80'}`}>
              {time}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Connection status */}
      {connectionStatus === 'error' && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-md mb-4">
          Connection error. Trying to reconnect...
        </div>
      )}
      
      {/* Chat messages container */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto mb-4 px-4 py-2"
      >
        <div className="space-y-4">
          {messages.map(renderMessage)}
          
          {/* Loading indicator */}
          {isLoading && (
            <div className="flex items-center text-gray-500 mb-4">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              <span>AI is thinking...</span>
            </div>
          )}
          
          {/* Error message */}
          {error && (
            <div className="text-red-500 mb-4">
              Error: {error}
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* Message input */}
      <form 
        onSubmit={handleSubmit}
        className="border-t border-gray-200 p-4"
      >
        <div className="flex items-center">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder="Type your message..."
            className="flex-1 border border-gray-300 rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={isLoading || connectionStatus === 'error'}
          />
          <button
            type="submit"
            className="bg-primary text-white rounded-r-lg px-4 py-2 ml-0 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-300 disabled:cursor-not-allowed"
            disabled={isLoading || !inputValue.trim() || connectionStatus === 'error'}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatBot; 