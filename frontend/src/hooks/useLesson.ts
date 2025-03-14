import { useState } from 'react';
import axios from 'axios';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import config from '@/config';

interface UseLesson {
  startLesson: (lessonId: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export const useLesson = (): UseLesson => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { socket } = useWebSocket();
  const { user } = useAuth();

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

      // Call the API to start the lesson with the correct URL
      await axios.post(`${config.pythonApiUrl}/api/lesson/start`, requestData, {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true
      });

      // Send WebSocket notification if socket is connected
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'lesson_started',
          lesson_id: parseInt(lessonId, 10),
          user_name: user.username || 'A lead student'
        }));
      }

      // Show success toast
      toast({
        title: "Success",
        description: "Lesson started successfully.",
        variant: "default",
      });
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
    loading,
    error
  };
}; 