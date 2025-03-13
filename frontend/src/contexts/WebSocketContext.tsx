import React, { createContext, useContext, useEffect, useState } from 'react';
import LessonNotification from '../components/LessonNotification';

interface WebSocketContextType {
    sendMessage: (message: string) => void;
    startLesson: (lessonId: string) => void;
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
    userId: string;
    username: string;
    role: string;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ 
    children, 
    userId, 
    username, 
    role 
}) => {
    const [ws, setWs] = useState<WebSocket | null>(null);
    const [notification, setNotification] = useState<string | null>(null);

    useEffect(() => {
        const socket = new WebSocket('ws://localhost:8080');

        socket.onopen = () => {
            console.log('WebSocket Connected');
            // Send user information on connection
            socket.send(JSON.stringify({
                type: 'user_connect',
                userId,
                username,
                role
            }));
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'lesson_start_notification') {
                    setNotification(data.message);
                }
            } catch (error) {
                // Handle regular chat messages
                console.log('Received message:', event.data);
            }
        };

        socket.onclose = () => {
            console.log('WebSocket Disconnected');
        };

        setWs(socket);

        return () => {
            socket.close();
        };
    }, [userId, username, role]);

    const sendMessage = (message: string) => {
        if (ws?.readyState === WebSocket.OPEN) {
            ws.send(message);
        }
    };

    const startLesson = (lessonId: string) => {
        if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'start_lesson',
                lessonId
            }));
        }
    };

    return (
        <WebSocketContext.Provider value={{ sendMessage, startLesson }}>
            {children}
            {notification && (
                <LessonNotification
                    message={notification}
                    onClose={() => setNotification(null)}
                />
            )}
        </WebSocketContext.Provider>
    );
}; 