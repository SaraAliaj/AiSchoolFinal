import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import axios from 'axios';
import { useLesson } from '@/hooks/useLesson';

interface LessonStatus {
  started: boolean;
  startedBy: number | null;
  startedByName?: string;
}

const LessonPopup: React.FC = () => {
  const { user } = useAuth();
  const { startLesson, endLesson, loading } = useLesson();
  const [lessonStatus, setLessonStatus] = useState<LessonStatus>({ started: false, startedBy: null });
  const [lessonLoading, setLessonLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const checkLessonStatus = async () => {
    try {
      setLessonLoading(true);
      const response = await axios.get('/api/lessons/status');
      setLessonStatus(response.data);
    } catch (err) {
      setError('Failed to check lesson status');
      console.error(err);
    } finally {
      setLessonLoading(false);
    }
  };
  
  const handleStartLesson = async () => {
    try {
      // Get the current active lesson ID
      const activeLessonId = '1'; // Replace with actual lesson ID from your app state
      await startLesson(activeLessonId);
      checkLessonStatus(); // Refresh status after starting
    } catch (err) {
      setError('Failed to start lesson');
      console.error(err);
    }
  };
  
  const handleEndLesson = async () => {
    try {
      // Get the current active lesson ID
      const activeLessonId = '1'; // Replace with actual lesson ID from your app state
      await endLesson(activeLessonId);
      checkLessonStatus(); // Refresh status after ending
    } catch (err) {
      setError('Failed to end lesson');
      console.error(err);
    }
  };
  
  useEffect(() => {
    // Check lesson status when component mounts
    checkLessonStatus();
    
    // Poll for updates every 30 seconds
    const intervalId = setInterval(checkLessonStatus, 30000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  if (lessonLoading) {
    return <div>Loading lesson status...</div>;
  }
  
  if (error) {
    return <div className="error-message">{error}</div>;
  }
  
  // For lead students (checking both user?.lead_student === 1 and user?.role === 'lead_student' for compatibility)
  if ((user?.lead_student === 1) || (user?.role === 'lead_student')) {
    // Show lead student popup
    if (lessonStatus.started) {
      return (
        <div className="popup success">
          <h2>Lesson In Progress</h2>
          <p>You have successfully started the lesson.</p>
          <button 
            onClick={handleEndLesson} 
            className="btn btn-danger"
            disabled={loading}
          >
            End Lesson
          </button>
        </div>
      );
    } else {
      return (
        <div className="popup action">
          <h2>Start Lesson</h2>
          <p>As the lead student, you can start the lesson for all students.</p>
          <button 
            onClick={handleStartLesson} 
            className="btn btn-primary"
            disabled={loading}
          >
            Start Lesson
          </button>
        </div>
      );
    }
  } else {
    // Show regular student popup
    if (lessonStatus.started) {
      return (
        <div className="popup info">
          <h2>Lesson In Progress</h2>
          <p>
            {lessonStatus.startedByName 
              ? `${lessonStatus.startedByName} has started the lesson.` 
              : 'The lead student has started the lesson.'} 
            You can now participate.
          </p>
        </div>
      );
    } else {
      return (
        <div className="popup waiting">
          <h2>Waiting for Lesson</h2>
          <p>The lead student hasn't started the lesson yet. Please wait.</p>
        </div>
      );
    }
  }
};

export default LessonPopup; 