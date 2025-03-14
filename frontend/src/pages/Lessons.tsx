import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Check, Circle } from "lucide-react";
import { api } from "@/server/api";

interface Module {
  id: string;
  title: string;
  completed: boolean;
}

interface Lesson {
  id?: string;
  title: string;
  modules: Module[];
}

export default function Lessons() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLessons = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const courseStructure = await api.getCourseStructure();
        
        if (!Array.isArray(courseStructure)) {
          console.error('Expected array of courses but received:', typeof courseStructure);
          setLessons([]);
          setError('Failed to load course data. Please try again later.');
          return;
        }
        
        if (courseStructure.length === 0) {
          console.warn('Received empty array of courses');
          setLessons([]);
          setError('No courses available. Please check back later.');
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

  const handleLessonClick = (moduleId: string) => {
    navigate(`/lessons/${moduleId}`);
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

  return (
    <div className="p-6 space-y-6">
      {lessons.map((lesson, index) => (
        <Card 
          key={index}
          className="hover:shadow-md transition-shadow"
        >
          <CardHeader>
            <CardTitle>{lesson.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lesson.modules.map((module, moduleIndex) => (
                <div
                  key={moduleIndex}
                  className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                  onClick={() => module.id && handleLessonClick(module.id)}
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
