import { useState } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';

interface LessonInfo {
  userName: string;
  lessonName: string;
}

interface UseLesson {
  startLesson: (lessonId: string, info: LessonInfo) => void;
  endLesson: (lessonId: string, info: LessonInfo) => void;
  loading: boolean;
}

export const useLesson = (): UseLesson => {
  const [loading, setLoading] = useState(false);
  const { startLesson: wsStartLesson, endLesson: wsEndLesson, isConnected } = useWebSocket();
  const { user } = useAuth();

  const startLesson = (lessonId: string, info: LessonInfo) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in",
        variant: "destructive",
      });
      return;
    }

    if (!isConnected) {
      toast({
        title: "Error",
        description: "Not connected to server",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      wsStartLesson(lessonId, info.userName, info.lessonName);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start lesson",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const endLesson = (lessonId: string, info: LessonInfo) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in",
        variant: "destructive",
      });
      return;
    }

    if (!isConnected) {
      toast({
        title: "Error",
        description: "Not connected to server",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      wsEndLesson(lessonId, info.userName, info.lessonName);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to end lesson",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    startLesson,
    endLesson,
    loading
  };
}; 