import { useState, useEffect, useRef } from "react";
import { Outlet, useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  Home,
  BookOpen,
  ChevronDown,
  Brain,
  Users,
  Settings,
  ChevronLeft,
  Play,
  Square,
  Clock,
  Crown,
  MessageSquare,
  Bot,
  Calendar,
  GraduationCap,
  BookOpenCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import LessonChatbot from "@/components/LessonChatbot";
import { api } from "@/server/api";
import { Manager } from "socket.io-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Define types for our data structure
interface Lesson {
  id: string;
  name: string;
  time: string;
  isActive?: boolean;
  startTime?: Date;
  duration?: number;
}

interface Week {
  id: string;
  name: string;
  lessons: Lesson[];
}

interface Course {
  id: string;
  name: string;
  weeks: Week[];
}

interface NotificationDialogProps {
  type: 'start' | 'end';
  data: {
    lessonName: string;
    duration?: number;
  };
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

const NotificationDialog = ({ type, data, onOpenChange, open }: NotificationDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className={cn(
      "border-2",
      type === "start" ? "border-green-500 bg-green-50" : "border-red-500 bg-red-100"
    )}>
      <DialogHeader>
        <DialogTitle className={cn(
          "text-xl font-bold",
          type === "start" ? "text-green-700" : "text-red-700"
        )}>
          {type === "start" ? "Lesson Started" : "⚠️ Lesson Ended"}
        </DialogTitle>
      </DialogHeader>
      <div className="p-4">
        <p className={cn(
          "text-lg font-medium mb-3",
          type === "start" ? "text-green-700" : "text-red-700"
        )}>
          {type === "start" 
            ? "A new lesson has started:" 
            : "The lesson has ended because the timer has expired:"}
        </p>
        <p className="text-xl font-bold mt-2">{data?.lessonName}</p>
        {type === "start" && (
          <p className="text-sm text-gray-600 mt-2 flex items-center gap-2">
            Duration: {data?.duration} minutes
          </p>
        )}
      </div>
    </DialogContent>
  </Dialog>
);

export default function Layout() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [openCourses, setOpenCourses] = useState<string[]>([]);
  const [openWeeks, setOpenWeeks] = useState<string[]>([]);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [isCurriculumOpen, setIsCurriculumOpen] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  const handleLessonClick = (lesson: Lesson) => {
    navigate(`/lessons/${lesson.id}`);
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const toggleCourse = (courseId: string) => {
    setOpenCourses(prev => 
      prev.includes(courseId) 
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  const toggleWeek = (weekId: string) => {
    setOpenWeeks(prev => 
      prev.includes(weekId) 
        ? prev.filter(id => id !== weekId)
        : [...prev, weekId]
    );
  };

  const toggleLessonComplete = (lessonId: string) => {
    setCompletedLessons(prev => 
      prev.includes(lessonId) 
        ? prev.filter(id => id !== lessonId)
        : [...prev, lessonId]
    );
  };

  // Render lesson item
  const renderLesson = (lesson: Lesson, course: Course, week: Week) => {
    return (
      <div
        key={lesson.id}
        className="flex items-center justify-between px-3 py-2 text-sm text-gray-800 hover:bg-gray-200 rounded-lg cursor-pointer"
        onClick={() => handleLessonClick(lesson)}
      >
        <div className="flex items-center gap-2">
          <span className="font-medium">{lesson.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600">{lesson.time}</span>
        </div>
      </div>
    );
  };

  // Function to format duration
  const formatDuration = (startTime: Date) => {
    const duration = new Date().getTime() - startTime.getTime();
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Fetch courses data when component mounts
  useEffect(() => {
    const fetchCourseData = async () => {
      setIsLoading(true);
      try {
        // This is a placeholder - you'll need to implement this API endpoint
        // to return the full course structure with weeks and lessons
        const coursesData = await api.getCourseStructure();
        console.log('Course structure data:', coursesData);
        
        // Check if coursesData is an array
        if (!Array.isArray(coursesData)) {
          console.error('Expected array of courses but received:', typeof coursesData);
          setCourses([]);
          return;
        }
        
        // If we got an empty array, log it for debugging
        if (coursesData.length === 0) {
          console.warn('Received empty array of courses');
        }
        
        setCourses(coursesData);
      } catch (error) {
        console.error("Failed to fetch course data:", error);
        // Fallback to empty courses array
        setCourses([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourseData();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar */}
        <div className={`${isSidebarCollapsed ? 'w-20' : 'w-72'} h-screen bg-gray-100 border-r transition-all duration-300 relative flex flex-col `}>
          {/* Toggle Button - Positioned at the edge between sidebar and content */}
          <button 
            onClick={toggleSidebar}
            className={`absolute -right-4 buttom-2 bg-white border border-gray-200 shadow-md rounded-full p-2 hover:bg-gray-100 transition-all duration-300 z-50 ${isSidebarCollapsed ? 'rotate-180' :  ''}`}
            >
            <ChevronLeft className="h-5 w-5 text-primary" />
          </button>

          {/* Top Section - Fixed */}
          <div className="flex-shrink-0">
            {/* Header */}
            <div className={`p-5 border-b transition-all duration-300 ${isSidebarCollapsed ? 'p-3' : ''}`}>
              <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
                <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center">
                  <Brain className="h-10 w-10 text-primary" />
                </div>
                <div className={`transition-opacity duration-300 ${isSidebarCollapsed ? 'hidden' : 'block'}`}>
                  <h1 className="text-2xl font-bold text-primary leading-tight">
                    AI Academia
                  </h1>
                  <p className="text-xs text-muted-foreground italic">
                    The Tirana school of AI where we make the government of Albania more efficient
                  </p>
                </div>
              </div>
            </div>
            
            {/* User Profile */}
            <div className={`p-5 border-b transition-all duration-300 ${isSidebarCollapsed ? 'p-3 flex justify-center' : ''}`}>
              {user ? (
                <div className={`flex items-center ${isSidebarCollapsed ? '' : 'gap-3'}`}>
                  <div className="relative w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold flex-shrink-0">
                    {user.username ? user.username.charAt(0).toUpperCase() : '?'}
                    {isSidebarCollapsed && (
                      <div className={cn(
                        "absolute -bottom-1 -right-1 rounded-full w-5 h-5 flex items-center justify-center shadow-sm border",
                        user.role === 'admin' ? "bg-purple-100 text-purple-800 border-purple-200" :
                        user.role === 'lead_student' ? "bg-gradient-to-r from-amber-100 to-amber-200 text-amber-700 border-amber-300" :
                        "bg-blue-100 text-blue-700 border-blue-200"
                      )}>
                        {user.role === 'admin' ? (
                          <Settings className="h-3 w-3" />
                        ) : user.role === 'lead_student' ? (
                          <Crown className="h-3 w-3" />
                        ) : (
                          <BookOpen className="h-3 w-3" />
                        )}
                      </div>
                    )}
                  </div>
                  {!isSidebarCollapsed && (
                    <div>
                      <div className="font-medium">{user.username}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                      <div className={cn(
                        "text-xs flex items-center gap-1.5 mt-1 px-2.5 py-1.5 rounded-full font-semibold shadow-sm border",
                        user.role === 'admin' ? "bg-purple-100 text-purple-800 border-purple-200" :
                        user.role === 'lead_student' ? "bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800 border-amber-300" :
                        "bg-blue-100 text-blue-700 border-blue-200"
                      )}>
                        {user.role === 'admin' ? (
                          <>
                            <Settings className="h-3.5 w-3.5" />
                            <span>Administrator</span>
                          </>
                        ) : user.role === 'lead_student' ? (
                          <>
                            <Crown className="h-4 w-4 text-amber-600" />
                            <span>Lead Student</span>
                          </>
                        ) : (
                          <>
                            <BookOpen className="h-3.5 w-3.5" />
                            <span>Student</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className={`flex items-center ${isSidebarCollapsed ? '' : 'gap-3'}`}>
                  <div className="w-10 h-10 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center font-bold flex-shrink-0">
                    ?
                  </div>
                  {!isSidebarCollapsed && (
                    <div className="text-sm text-gray-500">Not logged in</div>
                  )}
                </div>
              )}
            </div>
          </div>
            
          {/* Middle Section - Scrollable with fixed height */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <nav className="flex-1 overflow-y-auto">
              <div className={`space-y-4 ${isSidebarCollapsed ? 'p-2' : 'p-3'}`}>
                {/* Change from Home to General AI Chatbot and use Bot icon */}
                <NavItem to="/chat" icon={Bot} collapsed={isSidebarCollapsed}>
                  General AI Chatbot
                </NavItem>

                {/* Curriculum Dropdown */}
                {isSidebarCollapsed ? (
                  <div className="flex justify-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-9 w-9 relative`}
                      onClick={() => setIsCurriculumOpen(!isCurriculumOpen)}
                    >
                      <BookOpen className="h-5 w-5" />
                    </Button>
                  </div>
                ) : (
                  <Collapsible open={isCurriculumOpen} onOpenChange={setIsCurriculumOpen} className="flex-shrink-0">
                    <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-2 text-gray-800 transition-all hover:bg-gray-200 font-bold text-base rounded-lg">
                      <div className="flex items-center space-x-3">
                        <BookOpen className="h-5 w-5" />
                        <span>Curriculum</span>
                      </div>
                      <ChevronDown className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        isCurriculumOpen && "transform rotate-180"
                      )} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-1 space-y-0.5 pl-4">
                      {isLoading ? (
                        <div className="px-3 py-2 text-gray-500">Loading courses...</div>
                      ) : courses.length === 0 ? (
                        <div className="px-3 py-2 text-gray-500">No courses available</div>
                      ) : (
                        courses.map(course => (
                          <Collapsible
                            key={course.id}
                            open={openCourses.includes(course.id)}
                            onOpenChange={() => toggleCourse(course.id)}
                          >
                            <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 text-gray-800 hover:bg-gray-200 rounded-lg font-medium">
                              <div className="flex items-center gap-2">
                                <span>{course.name}</span>
                              </div>
                              <ChevronDown className={cn(
                                "h-4 w-4 transition-transform duration-200",
                                openCourses.includes(course.id) && "transform rotate-180"
                              )} />
                            </CollapsibleTrigger>
                            <CollapsibleContent className="ml-3 mt-0.5">
                              <div className="border-l-2 border-gray-200 pl-2 space-y-0.5">
                                {course.weeks.map(week => (
                                  <Collapsible
                                    key={week.id}
                                    open={openWeeks.includes(week.id)}
                                    onOpenChange={() => toggleWeek(week.id)}
                                  >
                                    <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 text-gray-800 hover:bg-gray-200 rounded-lg font-medium">
                                      <div className="flex items-center gap-2">
                                        <span>{week.name}</span>
                                      </div>
                                      <ChevronDown className={cn(
                                        "h-4 w-4 transition-transform duration-200",
                                        openWeeks.includes(week.id) && "transform rotate-180"
                                      )} />
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="ml-3 mt-0.5">
                                      <div className="border-l-2 border-gray-200 pl-2 space-y-0.5">
                                        {week.lessons.map(lesson => renderLesson(lesson, course, week))}
                                      </div>
                                    </CollapsibleContent>
                                  </Collapsible>
                                ))}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        ))
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Other navigation items */}
                <div className="space-y-4">
                  {/* Remove these three NavItem components */}
                  {/* 
                  <NavItem to="/challenges" icon={Home} collapsed={isSidebarCollapsed}>
                    Challenges
                  </NavItem>
                  <NavItem to="/quizzes" icon={Home} collapsed={isSidebarCollapsed}>
                    Quizzes
                  </NavItem>
                  <NavItem to="/group-chat" icon={Home} collapsed={isSidebarCollapsed}>
                    Group Chat
                  </NavItem>
                  */}
                  
                  {/* Admin link - only show for admin users */}
                  {user?.role === 'admin' && (
                    <NavItem to="/admin" icon={Settings} collapsed={isSidebarCollapsed}>
                      Admin
                    </NavItem>
                  )}
                </div>
              </div>
            </nav>
            
            {/* Sign Out Button - Fixed at bottom */}
            <div className={`p-3 border-t mt-auto flex-shrink-0 ${isSidebarCollapsed ? 'p-2' : ''}`}>
              <Button 
                variant="ghost" 
                className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-start'} text-red-600 hover:text-red-700 hover:bg-red-50`}
                onClick={handleSignOut}
              >
                <LogOut className={`${isSidebarCollapsed ? '' : 'mr-2'} h-4 w-4`} />
                {!isSidebarCollapsed && <span>Sign Out</span>}
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-h-screen">
          <div className="h-full flex flex-col">
            <div className="w-full">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NavItem({ to, icon: Icon, children, collapsed }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={cn(
        "flex items-center rounded-lg transition-all hover:bg-gray-200 font-bold text-base",
        collapsed ? "justify-center p-2" : "space-x-3 px-4 py-3",
        isActive && "bg-gray-200"
      )}
    >
      <Icon className="h-5 w-5" />
      {!collapsed && <span>{children}</span>}
    </Link>
  );
}
