import React, { createContext, useContext, useEffect, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Socket, io as socketIO } from 'socket.io-client';

interface WebSocketContextType {
    startLesson: (lessonId: string, userName: string) => void;
    endLesson: (lessonId: string, userName: string) => void;
    isConnected: boolean;
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
    const { toast } = useToast();

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
            toast({
                title: data.type === 'lesson_started' ? 'Lesson Started' : 'Lesson Ended',
                description: data.message,
                variant: "default",
            });
        });

        newSocket.on('disconnect', () => {
            console.log('Disconnected from Socket.IO server');
            setIsConnected(false);
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [toast]);

    const startLesson = (lessonId: string, userName: string) => {
        if (socket?.connected) {
            socket.emit('startLesson', { lessonId, userName });
        } else {
            console.error('Socket not connected');
        }
    };

    const endLesson = (lessonId: string, userName: string) => {
        if (socket?.connected) {
            socket.emit('endLesson', { lessonId, userName });
        } else {
            console.error('Socket not connected');
        }
    };

    return (
        <WebSocketContext.Provider value={{
            startLesson,
            endLesson,
            isConnected
        }}>
            {children}
        </WebSocketContext.Provider>
    );
}; 