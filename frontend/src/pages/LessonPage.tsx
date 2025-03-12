import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { api } from '@/server/api';
import CurriculumPDFViewer from '@/components/curriculum/CurriculumPDFViewer';
import { useAuth } from '@/contexts/AuthContext';
import LessonLayout from '@/components/layout/LessonLayout';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function LessonPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lessonData, setLessonData] = useState<{
    id: string;
    title: string;
    fileType?: string;
    fileName?: string;
  } | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isAiResponding, setIsAiResponding] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const fetchLessonData = async () => {
      if (!lessonId) {
        setError('No lesson ID provided');
        setIsLoading(false);
        return;
      }

      try {
        const data = await api.getLessonContent(lessonId);
        setLessonData(data);
        
        // Add initial AI message
        setMessages([
          {
            role: 'assistant',
            content: `Hello! I'm your AI assistant for the "${data.title}" lesson. How can I help you?`,
            timestamp: new Date()
          }
        ]);
      } catch (err: any) {
        console.error('Error fetching lesson:', err);
        setError(err.message || 'Failed to load lesson');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLessonData();
  }, [lessonId]);

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
      // Call API to get AI response
      // This is a simplified implementation - you'll need to implement the actual API
      const response = await fetch(`/api/lessons/${lessonId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: inputMessage }),
      });
      
      const data = await response.json();
      
      // Add AI response
      const aiMessage: ChatMessage = {
        role: 'assistant',
        content: data.response || "I'm sorry, I couldn't process your question.",
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading lesson...</p>
      </div>
    );
  }

  if (error || !lessonData) {
    return (
      <div className="p-6">
        <Card className="p-4">
          <div className="text-center text-red-500">
            <p>Error: {error || 'Failed to load lesson'}</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => navigate(-1)}
            >
              Go Back
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <LessonLayout title={lessonData.title}>
      <div className="flex h-[calc(100vh-8rem)]">
        {/* PDF Viewer - Left side */}
        <div className="w-1/2 border-r overflow-y-auto p-4">
          <CurriculumPDFViewer 
            lessonId={lessonId || ''} 
            title={lessonData.title} 
          />
        </div>

        {/* Chat with AI - Right side */}
        <div className="w-1/2 flex flex-col overflow-hidden">
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
        </div>
      </div>
    </LessonLayout>
  );
} 