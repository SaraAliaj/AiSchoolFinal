import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, Loader2, BrainCircuit, Clock, MessageSquare, Sparkles, BookOpen, Flag } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

export default function Chat() {
  const { user, isAuthenticated } = useAuth();
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<WebSocket | null>(null);

  // Track loading state changes
  useEffect(() => {
    console.log("Loading state changed:", isLoading);
  }, [isLoading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]); // Also scroll when loading state changes

  // Initialize WebSocket connection
  useEffect(() => {
    const connectWebSocket = () => {
      try {
        // Connect to the general chat endpoint without lesson restrictions
        const ws = new WebSocket('ws://localhost:8081/grok');
        
        ws.onopen = () => {
          console.log('Connected to Grok AI WebSocket server');
          socketRef.current = ws;
        };
        
        ws.onmessage = (event) => {
          console.log('Message from server:', event.data);
          try {
            // Handle both JSON and plain text responses
            let messageContent;
            try {
              const parsed = JSON.parse(event.data);
              messageContent = parsed.message || parsed.response || parsed.content || parsed;
              if (typeof messageContent === 'object') {
                messageContent = JSON.stringify(messageContent);
              }
            } catch (e) {
              messageContent = event.data;
            }

            // Add a slight delay before showing the AI response to ensure the loading animation is visible
            setTimeout(() => {
              const aiMessage: Message = {
                id: Date.now().toString(),
                content: messageContent,
                sender: 'ai',
                timestamp: new Date()
              };
              setMessages(prev => [...prev, aiMessage]);
              setIsLoading(false);
            }, 500);
          } catch (e) {
            console.error('Error processing message:', e);
            const errorMessage: Message = {
              id: Date.now().toString(),
              content: "I encountered an error processing that response. Could you try asking again?",
              sender: 'ai',
              timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
          }
        };
        
        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setIsLoading(false);
        };
        
        ws.onclose = () => {
          console.log('WebSocket connection closed');
          setTimeout(connectWebSocket, 3000);
        };
      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
        setTimeout(connectWebSocket, 3000);
      }
    };

    connectWebSocket();
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Set loading state immediately
    setIsLoading(true);
    console.log("Setting loading state to true on form submit");

    if (!isAuthenticated) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: 'You need to be logged in to use the chat. Please log in and try again.',
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsLoading(false);
      return;
    }

    const newMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    setInput('');

    try {
      const token = localStorage.getItem('authToken');
      
      // Check if the message is asking about a person
      const messageLC = input.toLowerCase();
      const isPersonQuery = messageLC.includes('about') || messageLC.includes('info') || messageLC.includes('who is');
      
      if (isPersonQuery) {
        // Use the HTTP endpoint for personal information lookup
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            message: input,
            type: 'personal_info_lookup'
          })
        });

        if (!response.ok) {
          if (response.status === 401) {
            const errorMessage: Message = {
              id: Date.now().toString(),
              content: 'Your session has expired. Please refresh the page or log in again.',
              sender: 'ai',
              timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
            return;
          }
          throw new Error('Failed to get response');
        }

        const data = await response.json();
        
        const aiMessage: Message = {
          id: Date.now().toString(),
          content: data.response || 'Sorry, I could not find the requested information.',
          sender: 'ai',
          timestamp: new Date()
        };

        setMessages(prev => [...prev, aiMessage]);
      } else {
        // Use WebSocket for general chat
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({
            message: input,
            token: token
          }));
        } else {
          throw new Error('WebSocket connection not available');
        }
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  // Helper function to format time to hours and minutes only
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Helper function to format message content
  const formatMessageContent = (content: string) => {
    if (!content) return "";
    
    // Remove markdown asterisks for bold/italic
    let formattedContent = content.replace(/\*\*(.*?)\*\*/g, '$1');
    formattedContent = formattedContent.replace(/\*(.*?)\*/g, '$1');
    
    return formattedContent;
  };
  
  // Helper function to check if content has structural patterns (like bullet points)
  const hasStructure = (content: string) => {
    return content.includes("\n-") || 
           content.includes("\n•") || 
           content.includes("\n1.") ||
           /\n\d+\.\s/.test(content);
  };
  
  // Helper function to render structured content
  const renderStructuredContent = (content: string, isAiMessage: boolean) => {
    // Check if content contains bullet points or numbered lists
    if (hasStructure(content)) {
      // Split by newlines first
      const lines = content.split('\n');
      
      // Process lines into sections
      let currentSection: { heading?: string; content: string[] } = { content: [] };
      const sections: { heading?: string; content: string[] }[] = [];
      
      lines.forEach(line => {
        // Clean up the line
        const cleanLine = formatMessageContent(line.trim());
        
        if (!cleanLine) return;
        
        // Check if this looks like a heading (ends with : or is all caps)
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
        else if (cleanLine.startsWith('- ') || cleanLine.startsWith('• ') || /^\d+\.\s/.test(cleanLine)) {
          // Get the text after the bullet or number
          const itemText = cleanLine.replace(/^-\s|^•\s|^\d+\.\s/, '');
          currentSection.content.push(itemText);
        } 
        // Regular line
        else {
          // If it's not empty, add to current section
          currentSection.content.push(cleanLine);
        }
      });
      
      // Add final section if it has content
      if (currentSection.content.length > 0) {
        sections.push(currentSection);
      }
      
      // Render structured content with modern styling
      return (
        <div className="space-y-4">
          {sections.map((section, index) => (
            <div key={index} className={`${section.heading ? "mb-4" : ""}`}>
              {section.heading && (
                <h4 className={`font-bold mb-2 ${isAiMessage ? 'text-primary/90' : 'text-primary-foreground'} flex items-center text-base`}>
                  {section.heading.includes('Key Point') && <Sparkles className="h-4 w-4 mr-2" />}
                  {section.heading.includes('Summary') && <BookOpen className="h-4 w-4 mr-2" />}
                  {section.heading.includes('Question') && <MessageSquare className="h-4 w-4 mr-2" />}
                  {section.heading}
                </h4>
              )}
              <div className="space-y-1.5">
                {section.content.map((item, i) => (
                  <p key={i} className="leading-relaxed mb-1.5">{item}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }
    
    // For simple content, just format and display
    return (
      <p className="whitespace-pre-line leading-relaxed">
        {formatMessageContent(content)}
      </p>
    );
  };

  return (
    <div className="h-screen w-full bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="h-full max-w-5xl mx-auto flex flex-col bg-white/80 backdrop-blur-sm shadow-xl rounded-xl overflow-hidden">
        {/* Chat header - modernized */}
        <div className="px-8 py-5 border-b bg-gradient-to-r from-primary/5 via-primary/10 to-transparent backdrop-blur-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shadow-lg border border-primary/5">
              <BrainCircuit className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800 text-xl">Alba</h3>
                <div className="flex gap-0.5 items-center">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-black"></div>
                </div>
              </div>
              <p className="text-xs text-slate-500 font-medium">Smarter Conversations, Smarter Solutions</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium text-slate-600">Albania AI Initiative</span>
          </div>
        </div>

        {/* Messages area - modernized */}
        <ScrollArea className="flex-1 px-4 sm:px-8 py-6 bg-gradient-to-b from-white to-slate-50/80">
          <div className="space-y-8 max-w-3xl mx-auto">
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex items-start gap-4 ${
                    message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  {message.sender === 'user' ? (
                    <Avatar className="h-10 w-10 border-2 border-primary/10 shadow-lg rounded-full">
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-sm rounded-full">
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/5 flex items-center justify-center shadow-md">
                      <BrainCircuit className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  
                  <div className={`max-w-[80%] space-y-1.5 ${message.sender === 'user' ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`rounded-2xl px-6 py-3.5 shadow-md transition-all duration-200 ${
                        message.sender === 'user'
                          ? 'bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-tr-none'
                          : 'bg-white border border-slate-200 rounded-tl-none hover:shadow-lg'
                      }`}
                    >
                      <div className={`text-sm leading-relaxed ${message.sender === 'ai' ? 'text-black' : ''}`}>
                        {renderStructuredContent(message.content, message.sender === 'ai')}
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 px-2 flex items-center">
                      <Clock className="h-3 w-3 mr-1 opacity-70" />
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {/* Loading indicator - improved visibility */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-4 ml-4 mt-6"
                data-testid="loading-indicator"
              >
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/30 to-primary/20 border border-primary/10 flex items-center justify-center shadow-md">
                  <BrainCircuit className="h-5 w-5 text-primary animate-pulse" />
                </div>
                <div className="rounded-2xl px-6 py-4 bg-gradient-to-r from-slate-50 via-white to-slate-50 border border-slate-200 rounded-tl-none shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="flex space-x-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }}></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }}></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }}></div>
                    </div>
                    <span className="text-sm text-slate-600 font-medium">Thinking...</span>
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input area - modernized */}
        <div className="px-8 py-5 border-t bg-white shadow-inner">
          <form onSubmit={handleSubmit} className="flex gap-3 items-center">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              disabled={isLoading}
              className="flex-1 border-slate-200 focus-visible:ring-primary/70 bg-white/90 py-6 rounded-xl text-base shadow-sm hover:shadow-md transition-all duration-200"
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