import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, User, FileText, Loader2, BookOpen, MessageSquare, FileIcon, Download, ChevronLeft, ChevronRight, BrainCircuit, Clock, Sparkles, Bookmark } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { api } from "@/server/api";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface LessonContent {
  id: string;
  title: string;
  content: string;
  summary?: string;
  sections?: Array<{
    heading: string;
    content: string | string[];
  }>;
  qaPairs?: Array<{
    question: string;
    answer: string;
  }>;
  fileType?: string;
  fileName?: string;
}

interface Message {
  id: string;
  content: string | {
    type: 'structured_summary' | 'qa_response' | 'general_response' | 'error';
    title?: string;
    sections?: Array<{
      heading: string;
      content: string | string[];
    }>;
    question?: string;
    answer?: string;
    examples?: string[];
    references?: string[];
    errorMessage?: string;
  };
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
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: `❤️⚫️ Welcome to AlbaAI ${user?.username ? user.username : ''} – your intelligent assistant from Albania! We empower the government to work more efficiently, optimize resources, and provide better services to citizens. Let's shape a more connected and tech-driven future for our beautiful country together! 🚀 ❤️⚫️`,
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
    const tryConnect = () => {
      console.log('Connecting to WebSocket server...');
      
      const ws = new WebSocket('ws://localhost:8080');
      
      ws.onopen = () => {
        console.log('Connected to WebSocket server');
        socketRef.current = ws;
      };
      
      ws.onmessage = (event) => {
        console.log('Message from server:', event.data);
        try {
          const jsonData = JSON.parse(event.data);
          
          if (jsonData.error) {
            console.error('Server error:', jsonData.error);
            toast({
              title: "Error",
              description: jsonData.error,
              variant: "destructive",
            });
            setIsLoading(false);
            return;
          }

          if (jsonData.response && !jsonData.response.includes("Connected to")) {
            const aiMessage: Message = {
              id: Date.now().toString(),
              content: jsonData.response,
              sender: 'ai',
              timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMessage]);
          }
        } catch (e) {
          console.error('Error parsing server response:', e);
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
        console.error('WebSocket error:', error);
        toast({
          title: "Connection Error",
          description: "WebSocket connection error. Please ensure the server is running and refresh the page.",
          variant: "destructive",
        });
        setIsLoading(false);
      };
      
      ws.onclose = () => {
        console.log('WebSocket connection closed');
        socketRef.current = null;
        setTimeout(() => {
          toast({
            title: "Reconnecting",
            description: "Attempting to reconnect to the server...",
          });
          tryConnect();
        }, 3000);
      };

      return ws;
    };
    
    const ws = tryConnect();
    
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
        const response = await api.getLessonContent(lessonId);
        const responseData = response as { id?: string; title?: string; content?: string };
        setLessonContent({
          id: responseData.id || lessonId,
          title: responseData.title || lessonTitle,
          content: responseData.content || 'Error loading lesson content.'
        });
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
      content: input.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(input.trim());
      } else {
        throw new Error('WebSocket connection not available');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
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

  // Helper function to format message content by removing special characters
  const formatTextContent = (text: string) => {
    if (!text) return "";
    
    // Remove markdown asterisks for bold/italic
    let formattedText = text.replace(/\*\*(.*?)\*\*/g, '$1');
    formattedText = formattedText.replace(/\*(.*?)\*/g, '$1');
    
    return formattedText;
  };

  const renderStructuredMessage = (message: Message) => {
    const content = message.content;
    const isUserMessage = message.sender === 'user';
    
    if (typeof content === 'string') {
      // Check if content has structure (like bullet points or numbers)
      if (content.includes('\n- ') || 
          content.includes('\n• ') || 
          content.includes('\n* ') || 
          /\n\d+\.\s/.test(content)) {
        
        // Split by newlines
        const lines = content.split('\n');
        let currentSection: { heading?: string; content: string[] } = { content: [] };
        const sections: { heading?: string; content: string[] }[] = [];
        
        lines.forEach(line => {
          // Clean the line
          const cleanLine = formatTextContent(line.trim());
          
          if (!cleanLine) return;
          
          // Check if line looks like a heading (ends with : or is all caps)
          if ((cleanLine.endsWith(':') && cleanLine.length < 50) || 
              (cleanLine === cleanLine.toUpperCase() && cleanLine.length > 3 && cleanLine.length < 30)) {
            // Save previous section if it has content
            if (currentSection.content.length > 0) {
              sections.push(currentSection);
            }
            
            // Start new section
            currentSection = {
              heading: cleanLine.endsWith(':') ? cleanLine.slice(0, -1) : cleanLine,
              content: []
            };
          } 
          // Check if line is a bullet point or numbered item
          else if (cleanLine.startsWith('- ') || cleanLine.startsWith('• ') || 
                   cleanLine.startsWith('* ') || /^\d+\.\s/.test(cleanLine)) {
            // Get the text after the bullet or number
            const itemText = cleanLine.replace(/^-\s|^•\s|^\*\s|^\d+\.\s/, '');
            currentSection.content.push(itemText);
          } 
          // Regular line
          else {
            currentSection.content.push(cleanLine);
          }
        });
        
        // Add final section if it has content
        if (currentSection.content.length > 0) {
          sections.push(currentSection);
        }
        
        // Render structured content
        return (
          <div className="space-y-3">
            {sections.map((section, index) => (
              <div key={index} className={section.heading ? "mb-4" : ""}>
                {section.heading && (
                  <h4 className={`font-bold mb-2 ${isUserMessage ? 'text-primary-foreground' : 'text-primary'} flex items-center`}>
                    {section.heading.includes('Summary') && <BookOpen className="h-4 w-4 mr-2" />}
                    {section.heading.includes('Key Point') && <Sparkles className="h-4 w-4 mr-2" />}
                    {section.heading.includes('Question') && <MessageSquare className="h-4 w-4 mr-2" />}
                    {section.heading}
                  </h4>
                )}
                <div className="space-y-1">
                  {section.content.map((item, i) => (
                    <p key={i} className={`text-sm ${isUserMessage ? 'text-primary-foreground' : 'text-gray-700'} leading-relaxed mb-1`}>
                      {item}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      }
      
      // For simple text, just format and render normally
      return (
        <p className={`text-sm ${isUserMessage ? 'text-primary-foreground' : 'text-gray-700'} whitespace-pre-line leading-relaxed`}>
          {formatTextContent(content)}
        </p>
      );
    }

    // For structured content types
    switch (content.type) {
      case 'structured_summary':
        return (
          <div className="space-y-4">
            {content.title && (
              <h3 className="text-lg font-bold text-primary border-b pb-2 mb-3">{formatTextContent(content.title)}</h3>
            )}
            {content.sections?.map((section, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4 border-l-4 border-primary shadow-sm">
                <h4 className="font-bold text-primary mb-3 flex items-center">
                  {section.heading === 'Summary' && <BookOpen className="h-4 w-4 mr-2" />}
                  {section.heading === 'Key Points' && <Sparkles className="h-4 w-4 mr-2" />}
                  {section.heading === 'Related Topics' && <BrainCircuit className="h-4 w-4 mr-2" />}
                  {section.heading}
                </h4>
                <div className="text-sm text-gray-700 leading-relaxed">
                  {Array.isArray(section.content) ? (
                    <ul className="space-y-2">
                      {section.content.map((item, i) => (
                        <li key={i} className="pl-2 border-l-2 border-gray-300 ml-2">{formatTextContent(item)}</li>
                      ))}
                    </ul>
                  ) : (
                    section.content.split('\n').map((line, i) => (
                      line.trim() ? <p key={i} className="mb-2">{formatTextContent(line)}</p> : null
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        );

      case 'qa_response':
        return (
          <div className="space-y-4">
            <div className="bg-primary/10 rounded-lg p-4 border-l-4 border-primary shadow-sm">
              <h4 className="font-bold text-primary mb-2 flex items-center">
                <MessageSquare className="h-4 w-4 mr-2" />
                Question
              </h4>
              <p className="text-sm text-gray-700 font-medium">{formatTextContent(content.question || '')}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-green-500 shadow-sm">
              <h4 className="font-bold text-green-600 mb-2 flex items-center">
                <Sparkles className="h-4 w-4 mr-2" />
                Answer
              </h4>
              <div className="text-sm text-gray-700 leading-relaxed">
                {content.answer?.split('\n').map((line, i) => (
                  line.trim() ? (
                    <p key={i} className="mb-2">{formatTextContent(line)}</p>
                  ) : null
                ))}
              </div>
            </div>
            {content.examples && content.examples.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-400 shadow-sm">
                <h4 className="font-bold text-blue-500 mb-2 flex items-center">
                  <FileIcon className="h-4 w-4 mr-2" />
                  Examples
                </h4>
                <ul className="space-y-2">
                  {content.examples.map((example, i) => (
                    <li key={i} className="text-sm text-gray-700 leading-relaxed pl-2 border-l-2 border-blue-200 ml-2">
                      {formatTextContent(example)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {content.references && content.references.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-amber-400 shadow-sm">
                <h4 className="font-bold text-amber-500 mb-2 flex items-center">
                  <Bookmark className="h-4 w-4 mr-2" />
                  References
                </h4>
                <ul className="space-y-2">
                  {content.references.map((reference, i) => (
                    <li key={i} className="text-sm text-gray-700 leading-relaxed pl-2 border-l-2 border-amber-200 ml-2">
                      {formatTextContent(reference)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );

      case 'general_response':
        return (
          <div className="space-y-4">
            {content.title && (
              <h3 className="text-lg font-bold text-primary border-b pb-2 mb-3">{formatTextContent(content.title)}</h3>
            )}
            {content.sections?.map((section, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4 border-l-4 border-primary shadow-sm mb-3">
                <h4 className="font-medium text-primary mb-2 flex items-center">
                  {section.heading === 'Response' && <MessageSquare className="h-4 w-4 mr-2" />}
                  {section.heading === 'Summary' && <BookOpen className="h-4 w-4 mr-2" />}
                  {section.heading === 'Key Points' && <Sparkles className="h-4 w-4 mr-2" />}
                  {formatTextContent(section.heading)}
                </h4>
                {Array.isArray(section.content) ? (
                  <ul className="space-y-2">
                    {section.content.map((item, i) => (
                      <li key={i} className="text-sm text-gray-700 leading-relaxed pl-2 border-l-2 border-gray-300 ml-2">
                        {formatTextContent(item)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-gray-700 leading-relaxed">
                    {/* Split text by line breaks and render each line separately */}
                    {section.content.split('\n').map((line, i) => (
                      line.trim() ? (
                        <p key={i} className="mb-2">{formatTextContent(line)}</p>
                      ) : null
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        );

      case 'error':
        return (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-600">{formatTextContent(content.errorMessage || 'An error occurred')}</p>
          </div>
        );

      default:
        return <p className="text-sm text-gray-700">{formatTextContent(JSON.stringify(content))}</p>;
    }
  };

  return (
    <div className="flex h-screen gap-4 bg-slate-100 p-4">
      {/* PDF Viewer Section - 50% width */}
      <div className="w-1/2 h-[calc(100vh-2rem)] bg-white rounded-xl shadow-lg overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 bg-gradient-to-r from-slate-50 to-white border-b">
          <h2 className="text-xl font-bold flex items-center text-slate-800">
            <FileText className="mr-3 h-5 w-5 text-primary" />
            {lessonTitle}
          </h2>
          <Button 
            variant="outline" 
            className="flex items-center gap-2 hover:bg-slate-50 transition-all duration-200"
            onClick={() => window.open(api.downloadLessonFile(lessonId), '_blank')}
          >
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
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
      <div className="w-1/2 h-[calc(100vh-2rem)] flex flex-col bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Chat header */}
        <div className="px-6 py-5 border-b bg-gradient-to-r from-primary/5 via-primary/10 to-transparent backdrop-blur-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shadow-inner border border-primary/5">
              <BrainCircuit className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-lg">Alba</h3>
              <p className="text-xs text-slate-500">Smarter Conversations, Smarter Solutions</p>
            </div>
          </div>
        </div>
        
        {/* Messages area */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 px-6 py-6 bg-gradient-to-b from-slate-50/50 to-white/30">
          <div className="space-y-8 max-w-[95%] mx-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start gap-4 ${
                  message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                {message.sender === 'user' ? (
                  <Avatar className="h-9 w-9 border-2 border-primary/10 shadow-sm">
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-xs">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/5 flex items-center justify-center shadow-sm">
                    <BrainCircuit className="h-5 w-5 text-primary" />
                  </div>
                )}
                
                <div className={`space-y-1.5 max-w-[85%] ${message.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`rounded-2xl px-5 py-3 shadow-sm transition-all duration-200 ${
                      message.sender === 'user'
                        ? 'bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-tr-none'
                        : 'bg-white border border-slate-200 rounded-tl-none hover:shadow-md'
                    }`}
                  >
                    {renderStructuredMessage(message)}
                  </div>
                  <p className="text-xs text-slate-400 px-2 flex items-center">
                    <Clock className="h-3 w-3 mr-1 opacity-70" />
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            ))}
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="flex items-start gap-4">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/5 flex items-center justify-center shadow-sm">
                  <BrainCircuit className="h-5 w-5 text-primary" />
                </div>
                
                <div className="space-y-1.5 max-w-[85%]">
                  <div className="rounded-2xl rounded-tl-none px-5 py-4 bg-white border border-slate-200 shadow-sm">
                    <div className="flex items-center">
                      <div className="flex space-x-2">
                        <div className="w-2 h-2 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: '300ms' }}></div>
                        <div className="w-2 h-2 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: '600ms' }}></div>
                      </div>
                      <span className="ml-3 text-sm text-slate-400">Processing your request...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input area */}
        <div className="p-4 border-t bg-gradient-to-b from-white to-slate-50/80 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="flex gap-3 items-center">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about this lesson..."
              disabled={isLoading}
              className="flex-1 border-slate-200 focus-visible:ring-primary/70 bg-white/80 py-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
            />
            <Button 
              type="submit" 
              disabled={isLoading}
              className="bg-gradient-to-r from-primary to-primary/90 hover:opacity-90 transition-all duration-200 rounded-xl h-12 w-12 p-0 flex items-center justify-center shadow-lg hover:shadow-xl"
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