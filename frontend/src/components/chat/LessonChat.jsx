import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ChatBot from './ChatBot';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Loader2, Sparkles } from 'lucide-react';
import SimplePDFViewer from '../curriculum/SimplePDFViewer';
import { api } from '@/server/api';

const LessonChat = () => {
  const { lessonId } = useParams();
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLesson = async () => {
      if (!lessonId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await api.getLessonContent(lessonId);
        setLesson(response);
        setError(null);
      } catch (err) {
        console.error('Error fetching lesson:', err);
        setError('Failed to load lesson information. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchLesson();
  }, [lessonId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading lesson chat...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-5rem)]">
      {/* PDF Viewer */}
      <div className="w-1/2 border-r p-4 h-full overflow-auto">
        <SimplePDFViewer 
          lessonId={lessonId}
          title={lesson?.title || 'Lesson'} 
        />
      </div>

      {/* Chat Interface */}
      <div className="w-1/2 h-full">
        <Card className="h-full border-0 rounded-none">
          <CardHeader className="border-b bg-muted/40">
            <CardTitle className="flex items-center">
              <Sparkles className="h-5 w-5 mr-2 text-primary" />
              AI Learning Assistant
              {lesson && <span className="text-sm text-muted-foreground ml-2">
                - {lesson.title || `Week ${lesson.weekNumber}, ${lesson.dayOfWeek}`}
              </span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 h-[calc(100%-4rem)]">
            <ChatBot lessonId={lessonId} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LessonChat; 