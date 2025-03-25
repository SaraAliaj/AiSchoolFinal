import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { api } from '@/server/api';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import config from '@/config';

// Get the WebSocket URL based on the current environment
const getWebSocketUrl = () => {
  // For local development
  if (!import.meta.env.PROD) {
    return 'ws://localhost:8080/grok';
  }
  // For production deployment (using config)
  return `${config.wsUrl}/grok`;
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
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    console.log('Initializing chat...');
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

  const connectWebSocket = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }
    
    try {
      setConnectionStatus('connecting');
      const wsUrl = getWebSocketUrl();
      console.log('Attempting to connect to WebSocket at', wsUrl);
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('WebSocket connection established');
        setConnectionStatus('connected');
        
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };
      
      ws.onmessage = (event) => {
        console.log('WebSocket message received:', event.data);
        try {
          const jsonData = JSON.parse(event.data);
          
          if (jsonData.error) {
            console.error('Server error:', jsonData.error);
            setError(jsonData.error);
            setIsLoading(false);
            return;
          }

          // Add response to chat
          const botMessage = {
            id: Date.now().toString(),
            text: jsonData.response || jsonData.error || event.data,
            sender: 'bot',
            timestamp: new Date(),
            error: !!jsonData.error
          };
          
          setMessages(prev => [...prev, botMessage]);
          setIsLoading(false);
        } catch (e) {
          console.error('Error parsing server response:', e);
          setError('Error parsing server response');
          setIsLoading(false);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
        setError('WebSocket connection error');
      };
      
      ws.onclose = () => {
        console.log('WebSocket connection closed');
        setConnectionStatus('error');
        
        // Try to reconnect after a delay
        if (!reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            console.log('Attempting to reconnect...');
            connectWebSocket();
          }, 3000);
        }
      };
      
      socketRef.current = ws;
    } catch (error) {
      console.error('Failed to establish WebSocket connection:', error);
      setConnectionStatus('error');
      setError('Failed to establish WebSocket connection');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      text: inputValue.trim(),
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        const messageData = {
          lessonId: lessonId || '1',
          message: userMessage.text
        };
        
        console.log('Sending WebSocket message:', messageData);
        socketRef.current.send(JSON.stringify(messageData));
      } else {
        console.error('WebSocket not connected. State:', socketRef.current?.readyState);
        throw new Error('WebSocket connection not available');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setError('Failed to send message. Please try again.');
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  return (
    <div className="flex flex-col h-full">
      {connectionStatus === 'error' && (
        <div className="bg-red-100 text-red-600 px-4 py-2 mb-4">
          Connection error. Attempting to reconnect...
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-4" ref={chatContainerRef}>
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.sender === 'user' ? 'justify-end' : 'justify-start'
            } mb-4`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                message.sender === 'user'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100'
              }`}
            >
              <p>{message.text}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="bg-gray-100 rounded-lg p-3">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          </div>
        )}
        {error && (
          <div className="flex justify-center mb-4">
            <div className="bg-red-100 text-red-600 rounded-lg p-3">
              {error}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder="Type your message..."
            className="flex-1 p-2 border rounded-lg"
            disabled={isLoading || connectionStatus === 'error'}
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim() || connectionStatus === 'error'}
            className="bg-primary text-white px-4 py-2 rounded-lg disabled:opacity-50"
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