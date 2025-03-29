import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';
import config from '@/config';

interface User {
    userId: string;
    username: string;
    surname: string;
    role: string;
    active: boolean;
}

interface WebSocketContextType {
    startLesson: (lessonId: string, userName: string, lessonName: string) => void;
    endLesson: (lessonId: string, userName: string, lessonName: string) => void;
    isConnected: boolean;
    showStartNotification: boolean;
    showEndNotification: boolean;
    notificationData: { lessonName: string; duration?: number };
    setShowStartNotification: (show: boolean) => void;
    setShowEndNotification: (show: boolean) => void;
    onlineUsers: User[];
}

// Create a default context value to avoid the "must be used within a provider" error
const defaultContextValue: WebSocketContextType = {
    startLesson: () => console.warn('WebSocket not connected'),
    endLesson: () => console.warn('WebSocket not connected'),
    isConnected: false,
    showStartNotification: false,
    showEndNotification: false,
    notificationData: { lessonName: '' },
    setShowStartNotification: () => {},
    setShowEndNotification: () => {},
    onlineUsers: []
};

const WebSocketContext = createContext<WebSocketContextType>(defaultContextValue);

export const useWebSocket = () => {
    const context = useContext(WebSocketContext);
    return context;
};

interface WebSocketProviderProps {
    children: React.ReactNode;
    userId?: string;
    username?: string;
    role?: string;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children, userId, username, role }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [showStartNotification, setShowStartNotification] = useState(false);
    const [showEndNotification, setShowEndNotification] = useState(false);
    const [notificationData, setNotificationData] = useState<{ lessonName: string; duration?: number }>({
        lessonName: ''
    });
    const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
    const { toast } = useToast();
    const socketRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const MAX_RECONNECT_ATTEMPTS = 5;

    // Handle reconnection
    const reconnect = () => {
        if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
            console.error('WebSocket reconnection failed after all attempts');
            toast({
                title: "Connection Failed",
                description: "Could not reconnect to the notification service",
                variant: "destructive",
                duration: 5000
            });
            return;
        }

        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }

        reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            console.log(`Attempting to reconnect (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);
            connectToWebSocket();
        }, 1000 * Math.min(30, Math.pow(2, reconnectAttemptsRef.current)));
    };

    // Connect to WebSocket
    const connectToWebSocket = () => {
        if (!userId) return;

        // Clean up existing connection if any
        if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
        }

        try {
            const socketUrl = config.getWebSocketUrl();
            console.log('Connecting to WebSocket server:', socketUrl);
            
            const ws = new WebSocket(socketUrl);

            ws.onopen = () => {
                console.log('Connected to WebSocket server');
                setIsConnected(true);
                reconnectAttemptsRef.current = 0;
                
                // Authenticate with userId
                if (userId) {
                    console.log('Authenticating with userId:', userId);
                    ws.send(JSON.stringify({ 
                        type: 'authenticate', 
                        userId: userId 
                    }));
                }
                
                toast({
                    title: "Connected",
                    description: "Connected to the notification service",
                    duration: 3000
                });
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('Received WebSocket message:', data);

                    if (data.type === 'notification') {
                        const notification = data.data;
                        const lessonName = notification.lessonName || 'Unknown Lesson';
                        const userName = notification.userName || 'Unknown User';
                        
                        setNotificationData({
                            lessonName: `${lessonName} - ${notification.type === 'lesson_started' ? 'Started' : 'Ended'} by ${userName}`
                        });

                        if (notification.type === 'lesson_started') {
                            setShowStartNotification(true);
                            toast({
                                title: "Lesson Started",
                                description: `${lessonName} has been started by ${userName}`,
                                duration: 5000
                            });
                        } else if (notification.type === 'lesson_ended') {
                            setShowEndNotification(true);
                            toast({
                                title: "Lesson Ended",
                                description: `${lessonName} has been ended by ${userName}`,
                                duration: 5000
                            });
                        }
                    } 
                    else if (data.type === 'online_users') {
                        console.log('Received initial online users list:', data.users);
                        const activeUsers = data.users.filter((user: User) => user.active);
                        console.log('Filtered active users:', activeUsers);
                        setOnlineUsers(activeUsers);
                    }
                    else if (data.type === 'user_status_change') {
                        console.log('User status change received:', data.userInfo);
                        const userInfo = data.userInfo;
                        
                        setOnlineUsers(prev => {
                            let updatedUsers;
                            if (userInfo.active) {
                                // Add or update user
                                updatedUsers = [
                                    ...prev.filter(u => u.userId !== userInfo.userId),
                                    userInfo
                                ].sort((a, b) => {
                                    // Sort by role (lead_student first) then by username
                                    if (a.role === 'lead_student' && b.role !== 'lead_student') return -1;
                                    if (a.role !== 'lead_student' && b.role === 'lead_student') return 1;
                                    return a.username.localeCompare(b.username);
                                });
                            } else {
                                // Remove user
                                updatedUsers = prev.filter(u => u.userId !== userInfo.userId);
                            }
                            
                            console.log('Updated online users list:', updatedUsers);
                            return updatedUsers;
                        });
                    }
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            ws.onclose = (event) => {
                console.log('WebSocket connection closed:', event.code, event.reason);
                setIsConnected(false);
                reconnect();
            };

            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                toast({
                    title: "Connection Error",
                    description: "Error in notification service connection",
                    variant: "destructive",
                    duration: 5000
                });
            };

            socketRef.current = ws;
        } catch (error) {
            console.error('Error setting up WebSocket connection:', error);
            toast({
                title: "Connection Error",
                description: "Could not set up notification service",
                variant: "destructive",
                duration: 5000
            });
            reconnect();
        }
    };

    useEffect(() => {
        if (!userId) {
            console.log('WebSocketProvider: No userId provided, skipping connection');
            return;
        }

        connectToWebSocket();

        // Cleanup function
        return () => {
            console.log('Cleaning up WebSocket connection');
            if (socketRef.current) {
                socketRef.current.close();
                socketRef.current = null;
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
        };
    }, [userId, toast]);

    const startLesson = (lessonId: string, userName: string, lessonName: string) => {
        if (socketRef.current && isConnected) {
            socketRef.current.send(JSON.stringify({
                type: 'startLesson',
                data: { lessonId, userName, lessonName }
            }));
        } else {
            console.error('WebSocket not connected');
            toast({
                title: "Not Connected",
                description: "Cannot start lesson - not connected to server",
                variant: "destructive",
                duration: 3000
            });
        }
    };

    const endLesson = (lessonId: string, userName: string, lessonName: string) => {
        if (socketRef.current && isConnected) {
            socketRef.current.send(JSON.stringify({
                type: 'endLesson',
                data: { lessonId, userName, lessonName }
            }));
        } else {
            console.error('WebSocket not connected');
            toast({
                title: "Not Connected",
                description: "Cannot end lesson - not connected to server",
                variant: "destructive",
                duration: 3000
            });
        }
    };

    return (
        <WebSocketContext.Provider
            value={{
                startLesson,
                endLesson,
                isConnected,
                showStartNotification,
                showEndNotification,
                notificationData,
                setShowStartNotification,
                setShowEndNotification,
                onlineUsers
            }}
        >
            {children}
        </WebSocketContext.Provider>
    );
}; 