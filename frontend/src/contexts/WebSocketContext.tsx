import React, { createContext, useContext, useEffect, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Manager } from 'socket.io-client';

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

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const useWebSocket = () => {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error('useWebSocket must be used within a WebSocketProvider');
    }
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

    useEffect(() => {
        // Connect to the Socket.IO server
        const socketUrl = process.env.NODE_ENV === 'production' 
            ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`
            : 'ws://localhost:3000';

        console.log('Connecting to Socket.IO server:', socketUrl);
        const manager = new Manager(socketUrl);
        const newSocket = manager.socket('/');

        // Handle connection events
        newSocket.on('connect', () => {
            console.log('Connected to Socket.IO server');
            setIsConnected(true);
            if (userId) {
                console.log('Authenticating with userId:', userId);
                newSocket.emit('authenticate', userId);
            }
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
            } else if (data.type === 'lesson_ended') {
                setShowEndNotification(true);
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

        // Handle reconnection
        newSocket.on('reconnect', () => {
            console.log('Reconnected to Socket.IO server');
            if (userId) {
                console.log('Re-authenticating after reconnection');
                newSocket.emit('authenticate', userId);
            }
        });

        setSocket(newSocket);

        // Cleanup function
        return () => {
            console.log('Cleaning up WebSocket connection');
            if (socket?.connected) {
                socket.disconnect();
            }
        };
    }, [userId]);

    const startLesson = (lessonId: string, userName: string, lessonName: string) => {
        if (socket?.connected) {
            socket.emit('startLesson', { lessonId, userName, lessonName });
        } else {
            console.error('Socket not connected');
        }
    };

    const endLesson = (lessonId: string, userName: string, lessonName: string) => {
        if (socket?.connected) {
            socket.emit('endLesson', { lessonId, userName, lessonName });
        } else {
            console.error('Socket not connected');
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