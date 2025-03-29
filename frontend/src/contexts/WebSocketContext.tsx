import React, { createContext, useContext, useEffect, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Manager } from 'socket.io-client';
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
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [showStartNotification, setShowStartNotification] = useState(false);
    const [showEndNotification, setShowEndNotification] = useState(false);
    const [notificationData, setNotificationData] = useState<{ lessonName: string; duration?: number }>({
        lessonName: ''
    });
    const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
    const { toast } = useToast();

    useEffect(() => {
        if (!userId) {
            console.log('WebSocketProvider: No userId provided, skipping connection');
            return;
        }

        // Connect to the Socket.IO server using the dynamic config
        const socketUrl = config.getWebSocketUrl();
        console.log('Connecting to Socket.IO server:', socketUrl);

        try {
            const manager = new Manager(socketUrl, {
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
                timeout: 10000
            });
            
            const newSocket = manager.socket('/');

            // Handle connection events
            newSocket.on('connect', () => {
                console.log('Connected to Socket.IO server');
                setIsConnected(true);
                
                if (userId) {
                    console.log('Authenticating with userId:', userId);
                    newSocket.emit('authenticate', userId);
                }
                
                toast({
                    title: "Connected",
                    description: "Connected to the notification service",
                    duration: 3000
                });
            });

            // Handle notifications
            newSocket.on('notification', (data) => {
                console.log('Received notification:', data);
                const lessonName = data.lessonName || 'Unknown Lesson';
                const userName = data.userName || 'Unknown User';
                
                setNotificationData({
                    lessonName: `${lessonName} - ${data.type === 'lesson_started' ? 'Started' : 'Ended'} by ${userName}`
                });

                if (data.type === 'lesson_started') {
                    setShowStartNotification(true);
                    toast({
                        title: "Lesson Started",
                        description: `${lessonName} has been started by ${userName}`,
                        duration: 5000
                    });
                } else if (data.type === 'lesson_ended') {
                    setShowEndNotification(true);
                    toast({
                        title: "Lesson Ended",
                        description: `${lessonName} has been ended by ${userName}`,
                        duration: 5000
                    });
                }
            });

            // Handle initial online users list
            newSocket.on('online_users', (users: User[]) => {
                console.log('Received initial online users list:', users);
                const activeUsers = users.filter(user => user.active);
                console.log('Filtered active users:', activeUsers);
                setOnlineUsers(activeUsers);
            });

            // Handle user status changes
            newSocket.on('user_status_change', (userInfo: User) => {
                console.log('User status change received:', userInfo);
                
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
            });

            newSocket.on('disconnect', () => {
                console.log('Disconnected from Socket.IO server');
                setIsConnected(false);
            });

            // Handle connection errors
            newSocket.on('connect_error', (error) => {
                console.error('Socket.IO connection error:', error);
                toast({
                    title: "Connection Error",
                    description: "Failed to connect to notification service",
                    variant: "destructive",
                    duration: 5000
                });
            });

            // Handle reconnection
            newSocket.on('reconnect', (attemptNumber) => {
                console.log(`Reconnected to Socket.IO server after ${attemptNumber} attempts`);
                if (userId) {
                    console.log('Re-authenticating after reconnection');
                    newSocket.emit('authenticate', userId);
                }
                
                toast({
                    title: "Reconnected",
                    description: "Reconnected to the notification service",
                    duration: 3000
                });
            });

            // Handle reconnection errors
            newSocket.on('reconnect_error', (error) => {
                console.error('Socket.IO reconnection error:', error);
            });

            // Handle reconnection failure
            newSocket.on('reconnect_failed', () => {
                console.error('Socket.IO reconnection failed after all attempts');
                toast({
                    title: "Connection Failed",
                    description: "Could not reconnect to the notification service",
                    variant: "destructive",
                    duration: 5000
                });
            });

            setSocket(newSocket);

            // Cleanup function
            return () => {
                console.log('Cleaning up WebSocket connection');
                if (newSocket?.connected) {
                    newSocket.disconnect();
                }
            };
        } catch (error) {
            console.error('Error setting up Socket.IO connection:', error);
            toast({
                title: "Connection Error",
                description: "Could not set up notification service",
                variant: "destructive",
                duration: 5000
            });
        }
    }, [userId, toast]);

    const startLesson = (lessonId: string, userName: string, lessonName: string) => {
        if (socket?.connected) {
            socket.emit('startLesson', { lessonId, userName, lessonName });
        } else {
            console.error('Socket not connected');
            toast({
                title: "Not Connected",
                description: "Cannot start lesson - not connected to server",
                variant: "destructive",
                duration: 3000
            });
        }
    };

    const endLesson = (lessonId: string, userName: string, lessonName: string) => {
        if (socket?.connected) {
            socket.emit('endLesson', { lessonId, userName, lessonName });
        } else {
            console.error('Socket not connected');
            toast({
                title: "Not Connected",
                description: "Cannot end lesson - not connected to server",
                variant: "destructive",
                duration: 3000
            });
        }
    };

    return (
        <WebSocketContext.Provider value={{ 
            startLesson, 
            endLesson, 
            isConnected,
            showStartNotification,
            showEndNotification,
            notificationData,
            setShowStartNotification,
            setShowEndNotification,
            onlineUsers
        }}>
            {children}
        </WebSocketContext.Provider>
    );
}; 