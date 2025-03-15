import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/components/ui/use-toast"

interface Message {
    role: 'user' | 'bot';
    content: string;
}

interface ChatbotProps {
    lessonId?: string;
}

export function Chatbot({ lessonId }: ChatbotProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'bot',
            content: "Hi there! 👋 I'm your AI assistant. Feel free to ask me anything!"
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const socketRef = useRef<WebSocket | null>(null);
    const { toast } = useToast();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        // Try to connect to multiple possible ports
        const tryConnect = (ports = [8080, 8081, 8082]) => {
            const port = ports[0];
            const ws = new WebSocket(`ws://localhost:${port}/grok`);

            ws.onopen = () => {
                console.log(`Connected to WebSocket on port ${port}`);
                socketRef.current = ws;
            };

            ws.onerror = () => {
                if (ports.length > 1) {
                    console.log(`Failed to connect on port ${port}, trying next port...`);
                    tryConnect(ports.slice(1));
                } else {
                    console.error('Failed to connect to WebSocket on all ports');
                    toast({
                        title: "Connection Error",
                        description: "Failed to connect to chat server. Please try again later.",
                        variant: "destructive",
                    });
                }
            };

            ws.onmessage = (event) => {
                console.log('Message from server:', event.data);
                try {
                    const jsonData = JSON.parse(event.data);
                    if (jsonData.error) {
                        toast({
                            title: "Error",
                            description: jsonData.error,
                            variant: "destructive",
                        });
                        setIsLoading(false);
                        return;
                    }

                    if (jsonData.response && !jsonData.response.includes("Connected to")) {
                        setMessages(prev => [...prev, { role: 'bot', content: jsonData.response }]);
                    }
                } catch (e) {
                    if (!event.data.includes("Connected to")) {
                        setMessages(prev => [...prev, { role: 'bot', content: event.data }]);
                    }
                }
                setIsLoading(false);
            };

            ws.onclose = () => {
                console.log('WebSocket connection closed');
                socketRef.current = null;
            };

            return ws;
        };

        const ws = tryConnect();

        return () => {
            if (ws) {
                ws.close();
            }
        };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                // Send just the message without lesson context
                socketRef.current.send(userMessage);
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

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Chat with AI Assistant</CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-4">
                        {messages.map((message, index) => (
                            <div
                                key={index}
                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-lg p-3 ${
                                        message.role === 'user'
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted'
                                    }`}
                                >
                                    {message.content}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="max-w-[80%] rounded-lg p-3 bg-muted">
                                    Thinking...
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </ScrollArea>
                <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask me anything..."
                        disabled={isLoading}
                    />
                    <Button type="submit" disabled={isLoading}>
                        Send
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
} 