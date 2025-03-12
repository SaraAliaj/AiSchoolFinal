import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, User, FileText, Loader2, BookOpen, MessageSquare, FileIcon, Download, ChevronLeft, ChevronRight, BrainCircuit, Clock, Sparkles } from "lucide-react";
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
      content: `Hi there! 🤖 Ready to chat?`,
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
    // Try to connect to multiple possible ports
    const tryConnect = (ports = [8080, 8081, 8082]) => {
      if (ports.length === 0) {
        toast({
          title: "Connection Error",
          description: "Failed to connect to any WebSocket server. Please ensure the server is running.",
          variant: "destructive",
        });
        return;
      }
      
      const port = ports[0];
      console.log(`Trying to connect to WebSocket server on port ${port}...`);
      
      // Create WebSocket connection
      const ws = new WebSocket(`ws://localhost:${port}`);
      
      let connected = false;
      
      ws.onopen = () => {
        if (!connected) {
          connected = true;
          console.log(`Connected to WebSocket server on port ${port}`);
          socketRef.current = ws;
          // Don't send any initial message here
        }
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
          
          // Only add AI response if it's not a connection message
          if (!jsonData.response?.includes("Connected to")) {
            const aiMessage: Message = {
              id: Date.now().toString(),
              content: jsonData.response || event.data,
              sender: 'ai',
              timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMessage]);
          }
        } catch (e) {
          // If not JSON and not a connection message, treat as plain text
          if (!event.data.includes("Connected to")) {
            const aiMessage: Message = {
              id: Date.now().toString(),
              content: event.data,
              sender: 'ai',
              timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMessage]);
          }
        }
        setIsLoading(false);
      };
      
      ws.onerror = (error) => {
        console.error(`WebSocket error on port ${port}:`, error);
        if (!connected) {
          // If we couldn't connect, try the next port
          tryConnect(ports.slice(1));
        } else {
          toast({
            title: "Connection Error",
            description: "WebSocket connection error. Please refresh the page.",
            variant: "destructive",
          });
          setIsLoading(false);
        }
      };
      
      ws.onclose = () => {
        console.log('WebSocket connection closed');
        if (connected) {
          // Only try to reconnect if we were previously connected
          setTimeout(() => {
            toast({
              title: "Reconnecting",
              description: "Attempting to reconnect to the server...",
            });
            tryConnect([8080, 8081, 8082]);
          }, 3000);
        }
      };
    };
    
    // Start connection attempts with all potential ports
    tryConnect([8080, 8081, 8082]);
    
    // Clean up on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
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

  // Helper function to format time to hours and minutes only
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex h-screen gap-2 bg-slate-100 p-2">
      {/* PDF Viewer Section - 50% width */}
      <div className="w-1/2 h-[calc(100vh-1rem)] bg-white rounded-lg shadow-lg overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-4">
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
        <div className="flex-1 w-full bg-slate-50">
          <embed
            src={`${api.downloadLessonFile(lessonId)}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
            type="application/pdf"
            className="w-full h-full"
            style={{ display: 'block' }}
          />
        </div>
      </div>

      {/* Chat Section - 50% width */}
      <div className="w-1/2 h-[calc(100vh-1rem)] flex flex-col bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Chat header */}
        <div className="px-6 py-4 border-b bg-gradient-to-r from-primary/10 to-primary/5 flex items-center">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center shadow-inner">
              <BrainCircuit className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-lg">AI Learning Assistant</h3>
            </div>
          </div>
        </div>
        
        {/* Messages area - Adjust height to account for header and input area */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 px-6 py-6 bg-slate-50/50">
          <div className="space-y-6 max-w-[95%] mx-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start gap-3 ${
                  message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                {message.sender === 'user' ? (
                  <Avatar className="h-8 w-8 border border-primary/20">
                    <AvatarFallback className="bg-secondary text-primary text-xs">
                      {/* You can use initials or a custom icon here */}
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <BrainCircuit className="h-4 w-4 text-primary" />
                  </div>
                )}
                
                <div className={`space-y-1 max-w-[80%] ${message.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`rounded-2xl px-4 py-2.5 shadow-sm ${
                      message.sender === 'user'
                        ? 'bg-primary text-primary-foreground rounded-tr-none'
                        : 'bg-white border border-slate-200 rounded-tl-none'
                    }`}
                  >
                    <p className={`text-sm ${message.sender === 'ai' ? 'text-slate-800' : ''}`}>{message.content}</p>
                  </div>
                  <p className="text-xs text-slate-500 px-2 flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            ))}
            
            {/* Loading indicator when AI is preparing a response */}
            {isLoading && (
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <BrainCircuit className="h-4 w-4 text-primary" />
                </div>
                
                <div className="space-y-1 max-w-[80%]">
                  <div className="rounded-2xl rounded-tl-none px-4 py-3 bg-white border border-slate-200 shadow-sm">
                    <div className="flex items-center">
                      <div className="flex space-x-1.5">
                        <div className="w-2 h-2 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: '300ms' }}></div>
                        <div className="w-2 h-2 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: '600ms' }}></div>
                      </div>
                      <span className="ml-3 text-sm text-slate-500">Thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input area */}
        <div className="p-4 border-t bg-white shadow-lg">
          <form onSubmit={handleSubmit} className="flex gap-3 items-center">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about this lesson..."
              disabled={isLoading}
              className="flex-1 border-slate-200 focus-visible:ring-primary/70 bg-slate-50 py-6 rounded-xl shadow-inner"
            />
            <Button 
              type="submit" 
              disabled={isLoading}
              className="bg-primary hover:bg-primary/90 transition-colors rounded-full h-12 w-12 p-0 flex items-center justify-center shadow-lg"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}