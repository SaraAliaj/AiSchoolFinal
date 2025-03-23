import React, { createContext, useContext, useEffect, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Socket, io as socketIO } from 'socket.io-client';

interface WebSocketContextType {
    startLesson: (lessonId: string, userName: string, lessonName: string) => void;
    endLesson: (lessonId: string, userName: string, lessonName: string) => void;
    isConnected: boolean;
    showStartNotification: boolean;
    showEndNotification: boolean;
    notificationData: { lessonName: string; duration?: number };
    setShowStartNotification: (show: boolean) => void;
    setShowEndNotification: (show: boolean) => void;
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
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [showStartNotification, setShowStartNotification] = useState(false);
    const [showEndNotification, setShowEndNotification] = useState(false);
    const [notificationData, setNotificationData] = useState<{ lessonName: string; duration?: number }>({
        lessonName: ''
    });

    useEffect(() => {
        // Connect to the Socket.IO server
        const socketUrl = process.env.NODE_ENV === 'production' 
            ? window.location.origin 
            : 'http://localhost:3000';

        console.log('Connecting to Socket.IO server:', socketUrl);
        const newSocket = socketIO(socketUrl);

        // Handle connection events
        newSocket.on('connect', () => {
            console.log('Connected to Socket.IO server');
            setIsConnected(true);
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
            } else {
                setShowEndNotification(true);
            }
        });

        newSocket.on('disconnect', () => {
            console.log('Disconnected from Socket.IO server');
            setIsConnected(false);
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, []);

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
            setShowEndNotification
        }}>
            {children}
        </WebSocketContext.Provider>
    );
}; 