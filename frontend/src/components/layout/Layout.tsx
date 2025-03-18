import { useState, useEffect, useRef } from "react";
import { Outlet, useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLesson } from "@/hooks/useLesson";
import { useWebSocket } from "@/contexts/WebSocketContext";
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
  BookOpenCheck,
  Loader2,
  User,
  PlayCircle,
  StopCircle,
  CheckCircle,
  FileText,
  Download
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
import { useToast } from '@/components/ui/use-toast';
import { StudentLessonNotification } from '../StudentLessonNotification';

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
          {type === "start" ? "Lesson Started" : "Lesson Ended"}
        </DialogTitle>
      </DialogHeader>
      <div className="p-4">
        <p className={cn(
          "text-lg font-medium mb-3",
          type === "start" ? "text-green-700" : "text-red-700"
        )}>
          {type === "start" 
            ? "A new lesson has started:" 
            : "The lesson has ended:"}
        </p>
        <p className="text-xl font-bold mt-2">{data?.lessonName}</p>
      </div>
    </DialogContent>
  </Dialog>
);

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const { toast } = useToast();
  const [openCourses, setOpenCourses] = useState<string[]>([]);
  const [openWeeks, setOpenWeeks] = useState<string[]>([]);
  const [isCurriculumOpen, setIsCurriculumOpen] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Add these new state variables for lesson management
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [isLessonActive, setIsLessonActive] = useState(false);
  const [lessonStartedBy, setLessonStartedBy] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<string>('');
  const { startLesson, endLesson, loading: lessonLoading } = useLesson();
  const { socket, isConnected } = useWebSocket();
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [showStartNotification, setShowStartNotification] = useState(false);
  const [showEndNotification, setShowEndNotification] = useState(false);
  const [notificationData, setNotificationData] = useState<{lessonName: string, duration?: number}>({
    lessonName: ''
  });
  const [showLessonStartPopup, setShowLessonStartPopup] = useState(false);

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  const handleLessonClick = (lesson: Lesson) => {
    if (lesson && lesson.id) {
      // Always use the exact ID from the database (converted to string)
      const lessonId = String(lesson.id);
      console.log(`Navigating to lesson: ${lessonId} - ${lesson.name}`);
      
      // Set the active lesson for the Lead Student Controls
      setActiveLesson(lesson);
      
      navigate(`/lessons/${lessonId}`);
    } else {
      console.error('Attempted to navigate to invalid lesson:', lesson);
      toast({
        title: "Lesson Not Available",
        description: "This lesson is not currently available.",
        variant: "destructive"
      });
    }
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

  // Add this function to extract the lesson ID from the URL
  const getLessonIdFromUrl = () => {
    const match = location.pathname.match(/\/lessons\/(\d+)/);
    return match ? match[1] : null;
  };

  // Add a function to directly test WebSocket connection
  const testWebSocketConnection = () => {
    if (!socket) {
      toast({
        title: "WebSocket Not Available",
        description: "WebSocket connection is not available.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (socket.readyState === WebSocket.OPEN) {
        console.log("Testing WebSocket connection directly...");
        const message = {
          type: 'test_message',
          message: 'Testing WebSocket connection',
          timestamp: new Date().toISOString()
        };
        socket.send(JSON.stringify(message));
        
        toast({
          title: "Test Message Sent",
          description: "WebSocket test message sent successfully. Check console for details.",
          variant: "default",
        });
      } else {
        toast({
          title: "WebSocket Not Connected",
          description: `WebSocket is in state: ${
            socket.readyState === WebSocket.CONNECTING ? 'CONNECTING' :
            socket.readyState === WebSocket.CLOSING ? 'CLOSING' :
            socket.readyState === WebSocket.CLOSED ? 'CLOSED' : 'UNKNOWN'
          }`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error testing WebSocket:", error);
      toast({
        title: "WebSocket Test Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Update the handleStartLesson function to include a WebSocket test check 
  const handleStartLesson = async () => {
    // Get lesson ID from either activeLesson or from URL
    const lessonId = activeLesson?.id || getLessonIdFromUrl();
    
    if (!lessonId) {
      toast({
        title: "Error",
        description: "No lesson selected. Please select a lesson first.",
        variant: "destructive",
      });
      return;
    }

    try {
      // First check if WebSocket is connected properly
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        testWebSocketConnection();
        toast({
          title: "Connection Issue",
          description: "Attempting to ensure WebSocket connection before starting lesson...",
          variant: "default",
        });
        // Wait briefly for the WebSocket to potentially connect
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      setIsLoading(true);
      // If we don't have the active lesson object but have the ID, create a minimal lesson object
      const currentLesson = activeLesson || { 
        id: lessonId, 
        name: `Lesson ${lessonId}`,
        time: new Date().toLocaleTimeString()
      };
      
      await startLesson(lessonId);
      setIsLessonActive(true);
      setActiveLessonId(lessonId);
      setLessonStartedBy(user?.username || 'Lead Student');
      
      // Also set the activeLesson if it's not already set
      if (!activeLesson) {
        setActiveLesson(currentLesson);
      }
      
      // Show notification for the lead student
      setNotificationData({
        lessonName: currentLesson.name
      });
      setShowStartNotification(true);
      
      toast({
        title: "Success",
        description: "Lesson started successfully",
        variant: "default",
      });
      
      console.log(`Lesson ${lessonId} started by ${user?.username}`);
    } catch (error) {
      console.error("Failed to start lesson:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndLesson = async () => {
    if (!activeLessonId) {
      toast({
        title: "Error",
        description: "No active lesson to end",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true); // Set local loading state
      await endLesson(activeLessonId);
      setIsLessonActive(false);
      setActiveLessonId(null);
      
      // Show notification for the lead student
      setNotificationData({
        lessonName: activeLesson?.name || 'Current Lesson'
      });
      setShowEndNotification(true);
      setActiveLesson(null);
      setLessonStartedBy(null);
    } catch (error) {
      console.error("Failed to end lesson:", error);
    } finally {
      setIsLoading(false); // Clear local loading state
    }
  };

  // Add socket message handling for lesson events
  useEffect(() => {
    if (!socket) return;

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("WebSocket message received:", data);

        if (data.type === 'lesson_started') {
          console.log("Lesson started event received");
          setIsLessonActive(true);
          setActiveLessonId(data.lesson_id?.toString());
          setLessonStartedBy(data.user_name || 'Lead Student');
          
          // Show popup for students only
          if (user?.role === 'student') {
            setShowLessonStartPopup(true);
          }

          // Show toast notification
          toast({
            title: "Lesson Started",
            description: `${data.user_name || 'A lead student'} has started lesson ${data.lesson_id}`,
            variant: "default",
          });
        } 
        else if (data.type === 'lesson_ended') {
          console.log("Lesson ended event received");
          setIsLessonActive(false);
          
          // Find the lesson with this ID if possible
          const lessonName = findLessonName(data.lesson_id) || `Lesson ${data.lesson_id}`;
          
          // Show notification to all users except the initiator
          const isInitiator = user?.username === data.user_name;
          if (!isInitiator) {
            setNotificationData({
              lessonName: lessonName
            });
            setShowEndNotification(true);
            
            // Display toast notification for better visibility
            toast({
              title: "Lesson Ended",
              description: `${data.user_name || 'A lead student'} has ended the lesson "${lessonName}"`,
              variant: "default",
            });
          }
          
          // Clear lesson state
          setActiveLessonId(null);
          setActiveLesson(null);
          setLessonStartedBy(null);
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
      }
    };
  }, [socket, user]);

  // Helper function to find a lesson name by ID
  const findLessonName = (lessonId: string | number): string | null => {
    if (!lessonId) return null;
    
    const id = lessonId.toString();
    
    for (const course of courses) {
      for (const week of course.weeks) {
        const lesson = week.lessons.find(l => l.id.toString() === id);
        if (lesson) return lesson.name;
      }
    }
    
    return null;
  };

  return (
    <>
      {user?.role === 'student' && (
        <StudentLessonNotification
          isOpen={showLessonStartPopup}
          onClose={() => setShowLessonStartPopup(false)}
          lessonId={activeLessonId || ''}
        />
      )}
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

                  {/* Personal Information */}
                  <NavItem to="/personal-info" icon={User} collapsed={isSidebarCollapsed}>
                    Personal Information
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
              {/* Lead Student Controls - visible only to lead students and only on lessons page */}
              {user?.role === 'lead_student' && location.pathname.includes('/lessons') && (
                <div className="p-1">
                  <div className="bg-white p-2 rounded-lg border border-amber-200/50 shadow-sm">
                    {/* Add lesson title, icon and download PDF button at the top */}
                    <div className="flex justify-between items-center">
                      <h2 className="text-xl font-bold flex items-center text-slate-800">
                        <FileText className="mr-3 h-5 w-5 text-primary" />
                        {activeLesson?.name || 'Setup&First API Call'}
                      </h2>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          className="flex items-center gap-2 hover:bg-slate-50 transition-all duration-200"
                          onClick={() => {
                            const lessonId = activeLesson?.id || getLessonIdFromUrl();
                            if (lessonId) {
                              window.open(api.downloadLessonFile(lessonId), '_blank');
                            }
                          }}
                        >
                          <Download className="h-4 w-4" />
                          Download PDF
                        </Button>
                        
                        {!isLessonActive ? (
                          <Button 
                            onClick={handleStartLesson} 
                            disabled={isLoading || lessonLoading}
                            className="bg-green-600 hover:bg-green-700 text-white transition-all whitespace-nowrap"
                          >
                            {isLoading || lessonLoading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Starting...
                              </>
                            ) : (
                              <>
                                <PlayCircle className="mr-2 h-4 w-4" />
                                Start Lesson
                              </>
                            )}
                          </Button>
                        ) : (
                          <Button 
                            onClick={handleEndLesson} 
                            disabled={isLoading || lessonLoading}
                            className="bg-red-600 hover:bg-red-700 text-white transition-all whitespace-nowrap"
                          >
                            {isLoading || lessonLoading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Ending...
                              </>
                            ) : (
                              <>
                                <StopCircle className="mr-2 h-4 w-4" />
                                End Lesson
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Student Notification - visible only to students */}
              {user?.role === 'student' && location.pathname.includes('/lessons') && (
                <div className="p-1">
                  <div className="bg-white p-2 rounded-lg border border-amber-200/50 shadow-sm">
                    <div className="flex justify-between items-center">
                      <h2 className="text-xl font-bold flex items-center text-slate-800">
                        <FileText className="mr-3 h-5 w-5 text-primary" />
                        {activeLesson?.name || 'Setup&First API Call'}
                      </h2>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          className="flex items-center gap-2 hover:bg-slate-50 transition-all duration-200"
                          onClick={() => {
                            const lessonId = activeLesson?.id || getLessonIdFromUrl();
                            if (lessonId) {
                              window.open(api.downloadLessonFile(lessonId), '_blank');
                            }
                          }}
                        >
                          <Download className="h-4 w-4" />
                          Download PDF
                        </Button>
                        
                        {isLessonActive ? (
                          <div className="text-green-700 font-medium flex items-center bg-green-50 px-3 py-1.5 rounded border border-green-200">
                            <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                            Lesson In Progress
                          </div>
                        ) : (
                          <div className="text-amber-700 font-medium flex items-center bg-amber-50 px-3 py-1.5 rounded border border-amber-200">
                            <Clock className="h-4 w-4 mr-2 text-amber-600" />
                            Waiting for Lesson to Begin
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Main Content Area */}
              <div className="w-full">
                <Outlet />
              </div>
            </div>
          </div>
        </div>

        {/* Notification Dialogs */}
        <NotificationDialog 
          type="start" 
          data={notificationData} 
          open={showStartNotification} 
          onOpenChange={setShowStartNotification} 
        />
        <NotificationDialog 
          type="end" 
          data={notificationData} 
          open={showEndNotification} 
          onOpenChange={setShowEndNotification} 
        />
      </div>
    </>
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
