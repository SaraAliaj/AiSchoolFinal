import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Check, Circle, MessageSquare } from "lucide-react";
import { api } from "@/server/api";
import LessonLayout from "@/components/layout/LessonLayout";
import { Button } from "@/components/ui/button";

interface Module {
  title: string;
  completed: boolean;
}

interface Lesson {
  id?: string;
  title: string;
  modules: Module[];
  content?: string;
}

export default function Lessons() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLessons = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const courseStructure = await api.getCourseStructure();
        
        // Check if courseStructure is an array
        if (!Array.isArray(courseStructure)) {
          console.error('Expected array of courses but received:', typeof courseStructure);
          setLessons([]);
          setError('Failed to load course data. Please try again later.');
          setIsLoading(false);
          return;
        }
        
        const transformedLessons = courseStructure.flatMap(course => {
          return course.weeks.map(week => {
            return {
              title: `${course.name} - ${week.name}`,
              modules: week.lessons.map(lesson => ({
                id: lesson.id,
                title: lesson.name,
                completed: false
              }))
            };
          });
        });
        
        setLessons(transformedLessons);
      } catch (err) {
        console.error("Failed to fetch lessons:", err);
        setError("Failed to load lessons. Please try again later.");
        setLessons([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLessons();
  }, []);

  const handleLessonClick = (lesson: Lesson) => {
    setSelectedLesson(lesson);
  };

  const handleChatClick = (lessonId: string) => {
    navigate(`/lessons/${lessonId}/chat`);
  };

  const isDeepLearningLesson = (title: string) => {
    return (
      title.toLowerCase().includes('deep learning') || 
      (title.toLowerCase().includes('week 1') && title.toLowerCase().includes('thursday'))
    );
  };

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[300px]">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-gray-500">Loading lessons...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-500">{error}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selectedLesson) {
    const isDeepLearning = isDeepLearningLesson(selectedLesson.title);

    return (
      <LessonLayout>
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{selectedLesson.title}</CardTitle>
              {isDeepLearning && (
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2"
                  onClick={() => {
                    // Find the deep learning module to get its ID
                    const deepLearningModule = selectedLesson.modules.find(
                      module => isDeepLearningLesson(module.title)
                    );
                    
                    if (deepLearningModule && deepLearningModule.id) {
                      handleChatClick(deepLearningModule.id);
                    } else {
                      console.error("Could not find Deep Learning lesson ID");
                    }
                  }}
                >
                  <MessageSquare className="h-4 w-4" />
                  Chat with AI Assistant
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                {selectedLesson.content || (
                  <div className="space-y-4">
                    {selectedLesson.modules.map((module, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center space-x-2">
                          {module.completed ? (
                            <Check className="h-5 w-5 text-green-500" />
                          ) : (
                            <Circle className="h-5 w-5 text-gray-300" />
                          )}
                          <span>{module.title}</span>
                        </div>
                        {isDeepLearningLesson(module.title) && module.id && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="flex items-center gap-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleChatClick(module.id);
                            }}
                          >
                            <MessageSquare className="h-3 w-3" />
                            AI Chat
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </LessonLayout>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {lessons.map((lesson, index) => (
        <Card 
          key={index}
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleLessonClick(lesson)}
        >
          <CardHeader>
            <CardTitle>{lesson.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lesson.modules.map((module, moduleIndex) => (
                <div
                  key={moduleIndex}
                  className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-2">
                    {module.completed ? (
                      <Check className="h-5 w-5 text-green-500" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-300" />
                    )}
                    <span>{module.title}</span>
                  </div>
                  {isDeepLearningLesson(module.title) && module.id && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex items-center gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleChatClick(module.id);
                      }}
                    >
                      <MessageSquare className="h-3 w-3" />
                      AI Chat
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
