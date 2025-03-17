import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import LessonNotification from '../components/LessonNotification';

interface WebSocketContextType {
    sendMessage: (message: string) => void;
    startLesson: (lessonId: string) => void;
    endLesson: (lessonId: string) => void;
    socket: WebSocket | null;
    isConnected: boolean;
}

interface NotificationData {
    message: string;
    type: 'start' | 'end' | 'info';
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
    const [notification, setNotification] = useState<NotificationData | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [reconnectAttempts, setReconnectAttempts] = useState(0);
    const maxReconnectAttempts = 5;

    // Create a function to establish websocket connection
    const connectWebSocket = useCallback(() => {
        console.log('Attempting to connect to WebSocket...');
        let wsUrl = 'ws://localhost:8080';
        
        // Check if we're running on a development server
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            // Use the default wsUrl for local development
            console.log(`Using WebSocket URL: ${wsUrl}`);
        } else {
            // For production, derive from the current window location
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.host;
            wsUrl = `${protocol}//${host}/ws`;
            console.log(`Using production WebSocket URL: ${wsUrl}`);
        }
        
        try {
            const socket = new WebSocket(wsUrl);

            socket.onopen = () => {
                console.log('WebSocket Connected Successfully!');
                setIsConnected(true);
                setReconnectAttempts(0);
                
                // Send user information on connection
                socket.send(JSON.stringify({
                    type: 'user_connect',
                    userId,
                    username,
                    role
                }));
            };

            socket.onmessage = (event) => {
                // Add logging to debug WebSocket messages
                console.log('WebSocket message received:', event.data);
                
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'lesson_start_notification') {
                        setNotification({
                            message: data.message,
                            type: 'start'
                        });
                    } else if (data.type === 'lesson_started') {
                        setNotification({
                            message: `Lesson started by ${data.user_name || 'a lead student'}`,
                            type: 'start'
                        });
                    } else if (data.type === 'lesson_ended') {
                        setNotification({
                            message: `Lesson ended by ${data.user_name || 'a lead student'}`,
                            type: 'end'
                        });
                    } else if (data.type === 'error') {
                        console.error('WebSocket error:', data.message);
                        setNotification({
                            message: `Error: ${data.message}`,
                            type: 'info'
                        });
                    } else if (data.type === 'confirmation') {
                        console.log('WebSocket confirmation:', data.message);
                    }
                } catch (error) {
                    // Handle regular chat messages
                    console.log('Received non-JSON message:', event.data);
                }
            };

            socket.onclose = (event) => {
                console.log(`WebSocket Disconnected: ${event.code} - ${event.reason}`);
                setIsConnected(false);
                setWs(null);
                
                // Attempt to reconnect if the connection was lost unexpectedly
                if (reconnectAttempts < maxReconnectAttempts) {
                    console.log(`Attempting to reconnect (${reconnectAttempts + 1}/${maxReconnectAttempts})...`);
                    const timeoutId = setTimeout(() => {
                        setReconnectAttempts(prev => prev + 1);
                        connectWebSocket();
                    }, 3000); // Wait 3 seconds before reconnecting
                    
                    return () => clearTimeout(timeoutId);
                } else {
                    console.log('Maximum reconnection attempts reached.');
                    setNotification({
                        message: 'Connection lost. Please refresh the page.',
                        type: 'info'
                    });
                }
            };

            socket.onerror = (error) => {
                console.error('WebSocket Error:', error);
                // Display user-friendly error notification
                setNotification({
                    message: 'Connection error occurred. The server might be unavailable.',
                    type: 'info'
                });
            };

            setWs(socket);
            
            // Return a cleanup function
            return () => {
                if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
                    socket.close();
                }
            };
        } catch (error) {
            console.error('Error creating WebSocket connection:', error);
            setNotification({
                message: 'Failed to establish WebSocket connection. Please refresh.',
                type: 'info'
            });
            return () => {}; // Empty cleanup function
        }
    }, [userId, username, role, reconnectAttempts, maxReconnectAttempts]);

    // Set up the WebSocket connection when the component mounts
    useEffect(() => {
        const cleanup = connectWebSocket();
        return cleanup;
    }, [connectWebSocket]);

    const sendMessage = (message: string) => {
        if (ws?.readyState === WebSocket.OPEN) {
            ws.send(message);
        } else {
            console.error('Cannot send message, WebSocket is not connected');
            setNotification({
                message: 'Cannot send message, connection lost. Please refresh.',
                type: 'info'
            });
        }
    };

    const startLesson = (lessonId: string) => {
        if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'start_lesson',
                lessonId
            }));
        } else {
            console.error('Cannot start lesson, WebSocket is not connected');
            setNotification({
                message: 'Cannot start lesson, connection lost. Please refresh.',
                type: 'info'
            });
        }
    };

    const endLesson = (lessonId: string) => {
        if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'end_lesson',
                lessonId
            }));
        } else {
            console.error('Cannot end lesson, WebSocket is not connected');
            setNotification({
                message: 'Cannot end lesson, connection lost. Please refresh.',
                type: 'info'
            });
        }
    };

    return (
        <WebSocketContext.Provider value={{ 
            sendMessage, 
            startLesson, 
            endLesson, 
            socket: ws,
            isConnected 
        }}>
            {children}
            {notification && (
                <LessonNotification
                    message={notification.message}
                    type={notification.type}
                    onClose={() => setNotification(null)}
                />
            )}
        </WebSocketContext.Provider>
    );
}; 