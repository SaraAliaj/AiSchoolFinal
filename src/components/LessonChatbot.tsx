import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, FileText, Loader2, BookOpen, MessageSquare, FileIcon, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { api } from "@/server/api";
import { useToast } from "@/components/ui/use-toast";

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface Section {
  title: string;
  content: string;
}

interface QAPair {
  question: string;
  answer: string;
}

interface LessonContent {
  id: string;
  title: string;
  content: string;
  summary?: string;
  sections?: Section[];
  qaPairs?: QAPair[];
  fileType?: string;
  fileName?: string;
}

interface LessonChatbotProps {
  lessonId: string;
  lessonTitle: string;
}

interface TableOfContentsItem {
  title: string;
  page?: number;
  level: number;
  children?: TableOfContentsItem[];
}

export default function LessonChatbot({ 
  lessonId,
  lessonTitle
}: LessonChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: `Hello! I'm your AI assistant for the "${lessonTitle}" lesson. How can I help you?`,
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lessonContent, setLessonContent] = useState<LessonContent | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [activeTab, setActiveTab] = useState("content");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();

  // Initialize WebSocket connection
  useEffect(() => {
    // Create WebSocket connection
    const ws = new WebSocket('ws://localhost:3007/ws');
    
    ws.onopen = () => {
      console.log('Connected to WebSocket server');
    };
    
    ws.onmessage = (event) => {
      console.log('Message from server:', event.data);
      try {
        // Try to parse the response as JSON
        const jsonData = JSON.parse(event.data);
        
        // Check if there's an error
        if (jsonData.error) {
          toast({
            title: "Error",
            description: jsonData.error,
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        
        // Add AI response to messages
        const aiMessage: Message = {
          id: Date.now().toString(),
          content: jsonData.response || event.data,
          sender: 'ai',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
      } catch (e) {
        // If not JSON, treat as plain text
        const aiMessage: Message = {
          id: Date.now().toString(),
          content: event.data,
          sender: 'ai',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
      }
      setIsLoading(false);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to lesson server. Please refresh the page.",
        variant: "destructive",
      });
      setIsLoading(false);
    };
    
    ws.onclose = () => {
      console.log('WebSocket connection closed');
      // Try to reconnect after 3 seconds
      setTimeout(() => {
        toast({
          title: "Reconnecting",
          description: "Attempting to reconnect to the server...",
        });
        // The component will re-render and the useEffect will run again
      }, 3000);
    };
    
    socketRef.current = ws;
    
    // Clean up on unmount
    return () => {
      ws.close();
    };
  }, []);

  // Fetch lesson content
  useEffect(() => {
    const fetchLessonContent = async () => {
      setIsLoadingContent(true);
      try {
        const data = await api.getLessonContent(lessonId);
        setLessonContent(data);
      } catch (error) {
        console.error('Failed to fetch lesson content:', error);
        setLessonContent({
          id: lessonId,
          title: lessonTitle,
          content: 'Error loading lesson content. Please try again later.'
        });
      } finally {
        setIsLoadingContent(false);
      }
    };

    fetchLessonContent();
  }, [lessonId, lessonTitle]);

  useEffect(() => {
    // Prevent scrolling to bottom on initial load
    if (initialLoad) {
      setInitialLoad(false);
      return;
    }

    // Only scroll when new messages are added
    if (messagesEndRef.current && scrollAreaRef.current) {
      const scrollArea = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollArea) {
        scrollArea.scrollTop = scrollArea.scrollHeight;
      }
    }
  }, [messages]);

  // Reset window scroll position when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Send message to WebSocket server
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        // Format: lessonId|question
        socketRef.current.send(`${lessonId}|${input}`);
      } else {
        throw new Error('WebSocket connection not available');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsLoading(false);
      
      // Fallback to simulated response if WebSocket fails
      setTimeout(() => {
        const aiMessage: Message = {
          id: Date.now().toString(),
          content: "I'm sorry, I'm having trouble connecting to the server. Please try again later.",
          sender: 'ai',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
      }, 1000);
    }
  };

  // Helper function to determine if content is AI-enhanced
  const isAIEnhanced = () => {
    return !!(lessonContent?.summary || lessonContent?.sections || lessonContent?.qaPairs);
  };

  // Helper function to detect and format PDF content
  const formatContent = (content: string) => {
    if (!content) return "No content available";
    
    // Check if content is PDF binary data (starts with %PDF)
    if (content.startsWith('%PDF')) {
      return "This is a PDF document. The content cannot be displayed directly in this view.";
    }
    
    return content;
  };

  // Render content based on file type
  const renderContent = () => {
    if (!lessonContent) {
      return <p className="text-gray-500 italic">No content available for this lesson.</p>;
    }

    const pdfUrl = api.downloadLessonFile(lessonId);

    return (
      <div className="flex flex-col h-full">
        {/* PDF Viewer Container with fallback */}
        <div className="w-full flex-1 min-h-[600px] bg-white rounded-lg overflow-hidden border">
          <object
            data={`${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1`}
            type="application/pdf"
            className="w-full h-full"
          >
            <iframe
              src={`${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1`}
              className="w-full h-full"
              style={{ border: 'none' }}
            >
              <p>
                Your browser doesn't support embedded PDFs.
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                  Click here to view the PDF
                </a>
              </p>
            </iframe>
          </object>
        </div>
        
        <div className="flex justify-end mt-4">
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => window.open(pdfUrl, '_blank')}
          >
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-[calc(100vh-2rem)]">
      {/* PDF Viewer Section - 50% width */}
      <div className="w-1/2 h-full p-4 border-r">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold flex items-center">
            <FileText className="mr-2 h-5 w-5 text-primary" />
            {lessonTitle}
          </h2>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex items-center gap-2"
              onClick={() => window.open(api.downloadLessonFile(lessonId), '_blank')}
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </div>
        
        {/* PDF Viewer Container */}
        <div className="w-full h-[calc(100vh-8rem)] bg-white rounded-lg overflow-hidden border">
          <embed
            src={`${api.downloadLessonFile(lessonId)}#toolbar=0&navpanes=0&scrollbar=1&zoom=page-fit`}
            type="application/pdf"
            className="w-full h-full"
          />
        </div>
      </div>

      {/* Chat Section - 50% width */}
      <div className="w-1/2 h-full flex flex-col">
        <ScrollArea ref={scrollAreaRef} className="flex-grow p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start gap-3 ${
                  message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <Avatar className={`h-8 w-8 ${message.sender === 'user' ? 'bg-primary' : 'bg-slate-200'}`}>
                  <AvatarFallback className="text-xs">
                    {message.sender === 'user' ? 
                      <User className="h-4 w-4" /> : 
                      <Bot className="h-4 w-4" />
                    }
                  </AvatarFallback>
                </Avatar>
                
                <div className="space-y-1 max-w-[75%]">
                  <div
                    className={`rounded-lg px-4 py-2 ${
                      message.sender === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                  </div>
                  <p className="text-xs text-slate-500 px-2">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="p-4 border-t bg-slate-50">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}