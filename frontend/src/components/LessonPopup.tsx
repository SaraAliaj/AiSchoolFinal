import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

interface LessonStatus {
  started: boolean;
  startedBy: number | null;
}

const LessonPopup: React.FC = () => {
  const { user } = useAuth();
  const [lessonStatus, setLessonStatus] = useState<LessonStatus>({ started: false, startedBy: null });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const checkLessonStatus = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/lessons/status');
      setLessonStatus(response.data);
    } catch (err) {
      setError('Failed to check lesson status');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const startLesson = async () => {
    try {
      await axios.post('/api/lessons/start');
      checkLessonStatus(); // Refresh status after starting
    } catch (err) {
      setError('Failed to start lesson');
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
  
  if (loading) {
    return <div>Loading lesson status...</div>;
  }
  
  if (error) {
    return <div className="error-message">{error}</div>;
  }
  
  // This is correct - lead_student === 1 means they are a lead student
  if (user?.lead_student === 1) {
    // Show lead student popup
    if (lessonStatus.started) {
      return (
        <div className="popup success">
          <h2>Lesson Started</h2>
          <p>You have successfully started the lesson.</p>
        </div>
      );
    } else {
      return (
        <div className="popup action">
          <h2>Start Lesson</h2>
          <p>As the lead student, you can start the lesson for all students.</p>
          <button onClick={startLesson} className="btn btn-primary">
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
          <p>The lead student has started the lesson. You can now participate.</p>
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