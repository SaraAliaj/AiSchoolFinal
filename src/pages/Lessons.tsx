import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Circle, Loader2 } from "lucide-react";
import { api } from "@/server/api";
import { LessonLayout } from "@/components/LessonLayout";

interface Module {
  title: string;
  completed: boolean;
}

interface Lesson {
  title: string;
  modules: Module[];
  content?: string;
}

export default function Lessons() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLessons = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const courseStructure = await api.getCourseStructure();
        
        const transformedLessons = courseStructure.flatMap(course => {
          return course.weeks.map(week => {
            return {
              title: `${course.name} - ${week.name}`,
              modules: week.lessons.map(lesson => ({
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
    const isLesson1 = selectedLesson.title.toLowerCase().includes('deep learning') && 
                      (selectedLesson.title.toLowerCase().includes('lesson 1') || 
                       selectedLesson.modules.some(m => 
                         m.title.toLowerCase().includes('lesson 1') && 
                         m.title.toLowerCase().includes('deep learning')));

    return (
      <LessonLayout isLesson1={isLesson1}>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{selectedLesson.title}</CardTitle>
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
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
