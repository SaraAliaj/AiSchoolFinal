import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, Loader2, BrainCircuit, Clock, MessageSquare, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hello! I'm your AI assistant powered by Grok. I'm here to help you with anything - from coding and science to creative writing and general knowledge. Ask me anything! 🚀",
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<WebSocket | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

            const aiMessage: Message = {
              id: Date.now().toString(),
              content: messageContent,
              sender: 'ai',
              timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMessage]);
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
          setIsLoading(false);
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
      // Send message without lesson context
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'chat',
          message: input
        }));
      } else {
        throw new Error('WebSocket connection not available');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsLoading(false);
      
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: "I'm sorry, I'm having trouble connecting to the server. Please try again later.",
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

  return (
    <div className="h-screen max-w-[90rem] mx-auto p-8">
      <div className="h-full bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col">
        {/* Chat header */}
        <div className="px-10 py-8 border-b bg-gradient-to-r from-primary/5 via-primary/10 to-transparent backdrop-blur-sm flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shadow-inner border border-primary/5">
              <Sparkles className="h-9 w-9 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-2xl">Grok AI Assistant</h3>
              <p className="text-sm text-slate-500">Powered by advanced AI technology</p>
            </div>
          </div>
        </div>

        {/* Messages area */}
        <ScrollArea className="flex-1 px-10 py-10 bg-gradient-to-b from-slate-50/50 to-white/30">
          <div className="space-y-10 max-w-[90%] mx-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start gap-4 ${
                  message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                {message.sender === 'user' ? (
                  <Avatar className="h-12 w-12 border-2 border-primary/10 shadow-sm">
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-sm">
                      <User className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/5 flex items-center justify-center shadow-sm">
                    <Sparkles className="h-7 w-7 text-primary" />
                  </div>
                )}
                
                <div className={`space-y-2 max-w-[85%] ${message.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`rounded-2xl px-8 py-4 shadow-sm transition-all duration-200 ${
                      message.sender === 'user'
                        ? 'bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-tr-none'
                        : 'bg-white border border-slate-200 rounded-tl-none hover:shadow-md'
                    }`}
                  >
                    <p className={`text-lg whitespace-pre-line leading-relaxed ${message.sender === 'ai' ? 'text-gray-700 font-semibold' : ''}`}>
                      {message.content}
                    </p>
                  </div>
                  <p className="text-sm text-slate-400 px-2 flex items-center">
                    <Clock className="h-4 w-4 mr-1.5 opacity-70" />
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            ))}
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/5 flex items-center justify-center shadow-sm">
                  <Sparkles className="h-7 w-7 text-primary" />
                </div>
                
                <div className="space-y-2 max-w-[85%]">
                  <div className="rounded-2xl rounded-tl-none px-8 py-5 bg-white border border-slate-200 shadow-sm">
                    <div className="flex items-center">
                      <div className="flex space-x-2">
                        <div className="w-3 h-3 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-3 h-3 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: '300ms' }}></div>
                        <div className="w-3 h-3 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: '600ms' }}></div>
                      </div>
                      <span className="ml-4 text-base text-slate-400">Thinking about your request...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input area */}
        <div className="p-8 border-t bg-gradient-to-b from-white to-slate-50/80 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="flex gap-4 items-center max-w-[90%] mx-auto">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              disabled={isLoading}
              className="flex-1 border-slate-200 focus-visible:ring-primary/70 bg-white/80 py-8 px-8 text-lg rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
            />
            <Button 
              type="submit" 
              disabled={isLoading}
              className="bg-gradient-to-r from-primary to-primary/90 hover:opacity-90 transition-all duration-200 rounded-xl h-16 w-16 p-0 flex items-center justify-center shadow-lg hover:shadow-xl"
            >
              {isLoading ? (
                <Loader2 className="h-7 w-7 animate-spin" />
              ) : (
                <Send className="h-7 w-7" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
