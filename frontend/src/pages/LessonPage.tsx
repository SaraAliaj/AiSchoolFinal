import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { api } from '@/server/api';
import LessonChatbot from '@/components/LessonChatbot';

interface LessonData {
  id: string;
  title: string;
  content?: string;
}

export default function LessonPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const [lessonData, setLessonData] = useState<LessonData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLessonData = async () => {
      if (!lessonId) {
        navigate('/');
        return;
      }

      try {
        setIsLoading(true);
        console.log(`Attempting to fetch content for lesson ID: ${lessonId}`);
        
        const response = await api.getLessonContent(lessonId);
        console.log(`Successfully loaded lesson: ${lessonId}`, response);
        
        setLessonData({
          id: lessonId,
          title: response.title,
          content: response.content
        });
      } catch (err) {
        console.error(`Error fetching lesson ${lessonId}:`, err);
        
        if (err.response && err.response.status === 404) {
          console.log(`Lesson ID ${lessonId} not found on the server`);
          setError(`Lesson ${lessonId} not found. Please select a valid lesson from the sidebar.`);
        } else {
          setError('Failed to load lesson content. Please try again later.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchLessonData();
  }, [lessonId, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading lesson...</span>
      </div>
    );
  }

  if (error || !lessonData) {
    return (
      <Card className="m-4 p-6">
        <div className="text-center text-red-500">
          <p>{error || 'Lesson not found'}</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="h-screen">
      <div className="h-full">
        <LessonChatbot 
          lessonId={lessonId || ''} 
          lessonTitle={lessonData.title}
        />
      </div>
    </div>
  );
} 