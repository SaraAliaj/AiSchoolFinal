import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, Loader2, BrainCircuit, Clock, MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

export default function Chat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: `👋 Hi ${user?.username || 'there'}! I'm your AI assistant, ready to help you learn and grow. How can I assist you today?`,
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
    <div className="h-screen w-full">
      <div className="h-full bg-white flex flex-col">
        {/* Chat header */}
        <div className="px-6 py-4 border-b bg-white flex items-center">
          <div className="flex items-center gap-4">
            <div className="h-11 w-11 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shadow-inner border border-primary/5">
              <BrainCircuit className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-lg">General AI Assistant</h3>
              <p className="text-xs text-slate-500">Powered by advanced AI technology</p>
            </div>
          </div>
        </div>

        {/* Messages area */}
        <ScrollArea className="flex-1">
          <div className="space-y-6 w-full px-6 py-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start gap-3 sm:gap-4 ${
                  message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                {message.sender === 'user' ? (
                  <Avatar className="h-8 w-8 sm:h-9 sm:w-9 border-2 border-primary/10 shadow-sm rounded-full">
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-xs rounded-full">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/5 flex items-center justify-center shadow-sm">
                    <BrainCircuit className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                )}
                
                <div className="max-w-[85%] sm:max-w-[90%]">
                  <div
                    className={`rounded-2xl px-4 sm:px-5 py-2.5 sm:py-3 shadow-sm transition-all duration-200 ${
                      message.sender === 'user'
                        ? 'bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-tr-none'
                        : 'bg-white border border-slate-200 rounded-tl-none hover:shadow-md'
                    }`}
                  >
                    <p className={`text-sm whitespace-pre-line leading-relaxed ${message.sender === 'ai' ? 'text-gray-700 font-semibold' : ''}`}>
                      {message.content}
                    </p>
                  </div>
                  <p className="text-[10px] sm:text-xs text-slate-400 mt-1 px-2 flex items-center">
                    <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1 opacity-70" />
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            ))}
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/5 flex items-center justify-center shadow-sm">
                  <BrainCircuit className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <div className="rounded-2xl px-4 sm:px-5 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-tl-none shadow-sm">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm text-slate-500 font-medium">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input area */}
        <div className="px-6 py-4 border-t bg-white">
          <form onSubmit={handleSubmit} className="flex gap-3 items-center">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              disabled={isLoading}
              className="flex-1 border-slate-200 focus-visible:ring-primary/70 bg-white h-12 px-4 rounded-full shadow-sm hover:shadow-md transition-all duration-200"
            />
            <Button 
              type="submit" 
              disabled={isLoading}
              className="bg-gradient-to-r from-primary to-primary/90 hover:opacity-90 transition-all duration-200 rounded-full h-12 w-12 p-0 flex items-center justify-center shadow-lg hover:shadow-xl"
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
