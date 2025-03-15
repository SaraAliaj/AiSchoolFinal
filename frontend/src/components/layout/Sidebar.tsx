import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Book,
  GraduationCap,
  Layout,
  MessageCircle,
  Trophy,
  Award,
  ChevronDown,
  Check,
  ChevronLeft,
} from "lucide-react";
import { useState } from "react";

const courses = [
  {
    id: 1,
    title: "Deep Learning Fundamentals",
    weeks: [
      {
        id: 1,
        title: "Week 1",
        lessons: [
          { id: 1, title: "Neural Networks Basics", time: "10:00", completed: true },
          { id: 2, title: "Activation Functions", time: "11:30", completed: false },
        ],
      },
      {
        id: 2,
        title: "Week 2",
        lessons: [
          { id: 3, title: "Backpropagation", time: "14:00", completed: false },
          { id: 4, title: "Optimization Techniques", time: "15:30", completed: false },
        ],
      },
    ],
  },
  {
    id: 2,
    title: "Machine Learning Applications",
    weeks: [
      {
        id: 1,
        title: "Week 1",
        lessons: [
          { id: 1, title: "Introduction to ML", time: "09:00", completed: false },
          { id: 2, title: "Linear Regression", time: "10:30", completed: false },
        ],
      },
    ],
  },
];

export default function Sidebar() {
  const [expandedCourse, setExpandedCourse] = useState<number | null>(null);
  const [expandedWeek, setExpandedWeek] = useState<{courseId: number, weekId: number} | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const toggleCourse = (courseId: number) => {
    setExpandedCourse(expandedCourse === courseId ? null : courseId);
    setExpandedWeek(null);
  };

  const toggleWeek = (courseId: number, weekId: number) => {
    setExpandedWeek(
      expandedWeek?.courseId === courseId && expandedWeek?.weekId === weekId
        ? null
        : { courseId, weekId }
    );
  };

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  return (
    <div className={`h-screen ${collapsed ? 'w-16' : 'w-64'} bg-white border-r flex flex-col transition-all duration-300 ease-in-out relative`}>
      <div className="p-4 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <GraduationCap className={`h-6 w-6 ${collapsed ? 'mx-auto' : ''}`} />
          <span className={`font-bold text-xl transition-opacity duration-300 ${collapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
            AI Academia
          </span>
        </Link>
        <button 
          onClick={toggleSidebar}
          className={`absolute -right-3 top-6 bg-white border rounded-full p-1.5 hover:bg-gray-100 transition-all duration-300 ${collapsed ? 'rotate-180' : ''}`}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>
      
      <nav className="flex-1 overflow-y-auto px-2">
        <div className="space-y-2">
          <div className={`font-semibold text-sm text-gray-500 uppercase tracking-wider px-2 ${collapsed ? 'text-center' : ''}`}>
            {!collapsed && "Curriculum"}
          </div>
          {courses.map((course) => (
            <div key={course.id} className="space-y-1">
              <Button
                variant="ghost"
                className={`w-full ${collapsed ? 'justify-center' : 'justify-between'}`}
                onClick={() => toggleCourse(course.id)}
              >
                <div className="flex items-center">
                  <Book className={`h-4 w-4 ${collapsed ? '' : 'mr-2'}`} />
                  <span className={`transition-opacity duration-300 ${collapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
                    {course.title}
                  </span>
                </div>
                {!collapsed && (
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      expandedCourse === course.id ? "transform rotate-180" : ""
                    }`}
                  />
                )}
              </Button>
              {expandedCourse === course.id && (
                <div className="ml-4 space-y-1">
                  {course.weeks.map((week) => (
                    <div key={week.id}>
                      <Button
                        variant="ghost"
                        className="w-full justify-between pl-6"
                        onClick={() => toggleWeek(course.id, week.id)}
                      >
                        <span>{week.title}</span>
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${
                            expandedWeek?.courseId === course.id &&
                            expandedWeek?.weekId === week.id
                              ? "transform rotate-180"
                              : ""
                          }`}
                        />
                      </Button>
                      {expandedWeek?.courseId === course.id &&
                        expandedWeek?.weekId === week.id && (
                          <div className="ml-4 space-y-1">
                            {week.lessons.map((lesson) => (
                              <Link
                                key={lesson.id}
                                to={`/lessons/${course.id}/${week.id}/${lesson.id}`}
                                className={`flex items-center justify-between px-6 py-2 text-sm rounded-lg hover:bg-gray-100 ${
                                  lesson.completed ? "text-gray-500" : ""
                                }`}
                              >
                                <div className="flex items-center space-x-2">
                                  {lesson.completed && (
                                    <Check className="h-4 w-4 text-green-500" />
                                  )}
                                  <span
                                    className={`${
                                      lesson.completed ? "line-through" : ""
                                    }`}
                                  >
                                    {lesson.title}
                                  </span>
                                </div>
                                <span className="text-xs text-gray-500">
                                  {lesson.time}
                                </span>
                              </Link>
                            ))}
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="pt-4 space-y-2">
          <Link to="/challenges">
            <Button variant="ghost" className={`w-full ${collapsed ? 'justify-center' : 'justify-start'}`}>
              <Award className={`h-4 w-4 ${collapsed ? '' : 'mr-2'}`} />
              <span className={`transition-opacity duration-300 ${collapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
                Challenges
              </span>
            </Button>
          </Link>
          <Link to="/quizzes">
            <Button variant="ghost" className={`w-full ${collapsed ? 'justify-center' : 'justify-start'}`}>
              <Trophy className={`h-4 w-4 ${collapsed ? '' : 'mr-2'}`} />
              <span className={`transition-opacity duration-300 ${collapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
                Weekly Quizzes
              </span>
            </Button>
          </Link>
          <Link to="/chat">
            <Button variant="ghost" className={`w-full ${collapsed ? 'justify-center' : 'justify-start'}`}>
              <MessageCircle className={`h-4 w-4 ${collapsed ? '' : 'mr-2'}`} />
              <span className={`transition-opacity duration-300 ${collapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
                AI Chat
              </span>
            </Button>
          </Link>
        </div>
      </nav>
    </div>
  );
}
