import { useState } from 'react';
import axios from 'axios';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import config from '@/config';

interface UseLesson {
  startLesson: (lessonId: string) => Promise<void>;
  endLesson: (lessonId: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export const useLesson = (): UseLesson => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { socket } = useWebSocket();
  const { user } = useAuth();

  // Helper function to check WebSocket connection
  const checkSocketConnection = (): boolean => {
    if (!socket) {
      const errorMsg = "WebSocket connection not available";
      setError(errorMsg);
      toast({
        title: "Connection Error",
        description: errorMsg,
        variant: "destructive",
      });
      return false;
    }
    
    if (socket.readyState !== WebSocket.OPEN) {
      const errorMsg = "WebSocket connection is not open";
      setError(errorMsg);
      toast({
        title: "Connection Error",
        description: errorMsg,
        variant: "destructive",
      });
      return false;
    }
    
    return true;
  };

  const startLesson = async (lessonId: string) => {
    if (!user || user.role !== 'lead_student') {
      toast({
        title: "Permission Denied",
        description: "Only lead students can start lessons.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Convert lessonId to number and ensure user.id is a number
      const requestData = {
        lesson_id: parseInt(lessonId, 10),
        user_id: parseInt(user.id.toString(), 10)
      };

      try {
        // Try to call the API, but continue even if it fails
        await axios.post(`${config.pythonApiUrl}/api/lesson/start`, requestData, {
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: true,
          timeout: 2000 // Add a timeout to avoid long waiting
        });
      } catch (apiError) {
        console.warn('API call failed, continuing with WebSocket only:', apiError);
        // Don't throw here, just continue with WebSocket notifications
      }

      // Check WebSocket connection before sending message
      if (checkSocketConnection()) {
        console.log("Sending lesson_started WebSocket message");
        socket.send(JSON.stringify({
          type: 'lesson_started',
          lesson_id: parseInt(lessonId, 10),
          user_name: user.username || 'A lead student',
          user_id: user.id,
          timestamp: new Date().toISOString()
        }));

        // Show success toast - we succeeded in sending the WebSocket notification
        toast({
          title: "Success",
          description: "Lesson started successfully.",
          variant: "default",
        });
        
        return; // Return successfully since we managed to send the WebSocket notification
      }

      // Only reach here if WebSocket also failed
      throw new Error("Failed to connect to both API and WebSocket");
    } catch (err) {
      console.error('Lesson start error:', err);
      let errorMessage = 'Failed to start lesson';
      
      if (axios.isAxiosError(err)) {
        const response = err.response?.data;
        if (response?.detail) {
          errorMessage = response.detail;
        } else if (err.response?.status === 404) {
          errorMessage = 'Lesson or user not found';
        } else if (err.response?.status === 403) {
          errorMessage = 'You do not have permission to start lessons';
        } else if (err.response?.status === 500) {
          errorMessage = 'Server error occurred while starting the lesson';
        } else if (err.code === 'ECONNREFUSED' || err.message.includes('Network Error')) {
          errorMessage = 'Could not connect to the server. Please try again.';
        }
      }
      
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const endLesson = async (lessonId: string) => {
    if (!user || user.role !== 'lead_student') {
      toast({
        title: "Permission Denied",
        description: "Only lead students can end lessons.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Convert lessonId to number and ensure user.id is a number
      const requestData = {
        lesson_id: parseInt(lessonId, 10),
        user_id: parseInt(user.id.toString(), 10)
      };

      try {
        // Try to call the API, but continue even if it fails
        await axios.post(`${config.pythonApiUrl}/api/lesson/end`, requestData, {
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: true,
          timeout: 2000 // Add a timeout to avoid long waiting
        });
      } catch (apiError) {
        console.warn('API call failed, continuing with WebSocket only:', apiError);
        // Don't throw here, just continue with WebSocket notifications
      }

      // Check WebSocket connection before sending message
      if (checkSocketConnection()) {
        console.log("Sending lesson_ended WebSocket message");
        socket.send(JSON.stringify({
          type: 'lesson_ended',
          lesson_id: parseInt(lessonId, 10),
          user_name: user.username || 'A lead student',
          user_id: user.id,
          timestamp: new Date().toISOString()
        }));

        // Show success toast - we succeeded in sending the WebSocket notification
        toast({
          title: "Success",
          description: "Lesson ended successfully.",
          variant: "default",
        });
        
        return; // Return successfully since we managed to send the WebSocket notification
      }

      // Only reach here if WebSocket also failed
      throw new Error("Failed to connect to both API and WebSocket");
    } catch (err) {
      console.error('Lesson end error:', err);
      let errorMessage = 'Failed to end lesson';
      
      if (axios.isAxiosError(err)) {
        const response = err.response?.data;
        if (response?.detail) {
          errorMessage = response.detail;
        } else if (err.response?.status === 404) {
          errorMessage = 'Lesson or user not found';
        } else if (err.response?.status === 403) {
          errorMessage = 'You do not have permission to end lessons';
        } else if (err.response?.status === 500) {
          errorMessage = 'Server error occurred while ending the lesson';
        } else if (err.code === 'ECONNREFUSED' || err.message.includes('Network Error')) {
          errorMessage = 'Could not connect to the server. Please try again.';
        }
      }
      
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    startLesson,
    endLesson,
    loading,
    error
  };
}; 