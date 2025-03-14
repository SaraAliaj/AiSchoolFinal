import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, MessageSquare } from 'lucide-react';
import { api } from '@/server/api';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface LessonChatProps {
  lessonId: string;
  lessonTitle: string;
}

export default function LessonChat({ lessonId, lessonTitle }: LessonChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `Hello! I'm your AI assistant for the "${lessonTitle}" lesson. How can I help you?`,
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isAiResponding, setIsAiResponding] = useState(false);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !lessonId) return;

    // Add user message
    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsAiResponding(true);

    try {
      const response = await api.sendLessonChat(lessonId, inputMessage);
      
      // Add AI response
      const aiMessage: ChatMessage = {
        role: 'assistant',
        content: response.response || "I'm sorry, I couldn't process your question.",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      console.error('Error getting AI response:', err);
      
      // Add error message from AI
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: "I'm sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsAiResponding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Card className="h-full border-0 rounded-none">
      <CardHeader className="border-b bg-muted/40">
        <CardTitle className="flex items-center">
          <MessageSquare className="h-5 w-5 mr-2 text-primary" />
          AI Learning Assistant
          <span className="text-sm text-muted-foreground ml-2">
            - {lessonTitle}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 h-[calc(100%-4rem)] flex flex-col">
        {/* Messages area */}
        <div className="flex-1 p-4 overflow-y-auto">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`mb-4 ${
                msg.role === 'user' ? 'ml-auto max-w-[80%]' : 'mr-auto max-w-[80%]'
              }`}
            >
              <div
                className={`p-3 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-primary text-white rounded-br-none'
                    : 'bg-gray-100 text-gray-800 rounded-bl-none'
                }`}
              >
                {msg.content}
              </div>
              <div
                className={`text-xs mt-1 text-gray-500 ${
                  msg.role === 'user' ? 'text-right' : 'text-left'
                }`}
              >
                {msg.timestamp.toLocaleTimeString()}
              </div>
            </div>
          ))}
          {isAiResponding && (
            <div className="flex items-center text-gray-500 mb-4">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span>AI is typing...</span>
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="border-t p-4 bg-white">
          <div className="flex items-center">
            <textarea
              className="flex-1 border rounded-l-md p-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Ask a question about this lesson..."
              value={inputMessage}
              onChange={e => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
            />
            <Button
              className="rounded-l-none"
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isAiResponding}
            >
              Send
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 