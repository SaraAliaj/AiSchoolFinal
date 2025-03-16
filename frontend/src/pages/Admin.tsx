import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Upload, Plus, Loader2, Clock, Users } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { api } from "@/server/api"; // Adjust this import to match where your API functions are located
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface FileWithPreview extends File {
  id: string;
  name: string;
}

interface Student {
  id: number;
  username: string;
  surname: string;
  email: string;
  role: 'student' | 'lead_student' | 'admin';
}

export default function Admin() {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [selectedWeek, setSelectedWeek] = useState<string>("");
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [lessonTitle, setLessonTitle] = useState<string>("");
  const [courses, setCourses] = useState<any[]>([]);
  const [weeks, setWeeks] = useState<any[]>([]);
  const [days, setDays] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const [newCourseName, setNewCourseName] = useState("");
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);
  const [showCourseDialog, setShowCourseDialog] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [showStudentsDialog, setShowStudentsDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  // Check basic authentication
  useEffect(() => {
    if (isAuthLoading) {
      return; // Wait for auth to load
    }

    if (!user) {
      navigate('/login');
      return;
    }
  }, [user, navigate, isAuthLoading]);

  // Show loading state while auth is being checked
  if (isAuthLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-4 flex justify-center items-center min-h-[300px]">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-gray-500">Checking access...</p>
        </div>
      </div>
    );
  }

  // Only check if user is logged in
  if (!user) {
    return null;
  }

  // Fetch all required data in a single useEffect
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch all data in parallel
        const [coursesData, weeksData, daysData] = await Promise.all([
          api.getCourses(),
          api.getWeeks(),
          api.getDays()
        ]);
        
        // Validate and ensure the data is in array format
        const validCoursesData = Array.isArray(coursesData) ? coursesData : [];
        const validWeeksData = Array.isArray(weeksData) ? weeksData : [];
        const validDaysData = Array.isArray(daysData) ? daysData : [];
        
        console.log('Days data:', validDaysData);
        
        setCourses(validCoursesData);
        setWeeks(validWeeksData);
        setDays(validDaysData);
      } catch (error) {
        console.error("Failed to fetch data:", error);
        // Set empty arrays as fallback
        setCourses([]);
        setWeeks([]);
        setDays([]);
        toast({
          title: "Error",
          description: "Failed to load required data. Please try refreshing the page.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [toast, navigate, user]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      console.log('No files selected');
      return;
    }
    
    console.log('Files selected:', e.target.files.length);
    
    // Store the raw File objects directly
    const selectedFiles = Array.from(e.target.files);
    
    // Create new file objects with IDs for our state management
    const newFiles = selectedFiles.map(file => {
      // Store the original file object as a property
      return {
        ...file,
        id: `${file.name}-${Date.now()}`,
        name: file.name,
        originalFile: file // Store the original File object
      };
    });

    setFiles(prev => [...prev, ...newFiles]);

    // Show toast for the first file and a summary if multiple
    if (newFiles.length === 1) {
      toast({
        title: "File Added",
        description: `Added: ${newFiles[0].name}`,
      });
    } else {
      toast({
        title: "Files Added",
        description: `Added ${newFiles.length} files`,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCourse || !selectedWeek || !selectedDay || !lessonTitle) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      
      formData.append('courseId', String(selectedCourse));
      formData.append('weekId', String(selectedWeek));
      formData.append('dayId', String(selectedDay));
      formData.append('title', lessonTitle);
      
      for (const fileObj of files) {
        const fileToUpload = (fileObj as any).originalFile || fileObj;
        formData.append('files', fileToUpload);
      }
      
      const response = await api.uploadLesson(formData);
      console.log('Upload successful:', response);
      
      toast({
        title: "Success",
        description: `Lesson "${lessonTitle}" uploaded successfully`,
      });

      // Reset form
      setSelectedCourse("");
      setSelectedWeek("");
      setSelectedDay("");
      setLessonTitle("");
      setFiles([]);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: any) {
      console.error('Lesson upload error:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || error.message || "Failed to upload lesson",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeFile = (fileId: string) => {
    const fileToRemove = files.find(f => f.id === fileId);
    if (fileToRemove) {
      setFiles(prev => prev.filter(file => file.id !== fileId));
      toast({
        title: "File Removed",
        description: `Removed: ${fileToRemove.name}`,
      });
    }
  };

  const addMoreFiles = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent default form submission
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCourseName.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter a course name",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingCourse(true);
    try {
      const response = await api.createCourse(newCourseName);
      
      // Refresh courses list
      const coursesData = await api.getCourses();
      setCourses(coursesData);
      
      toast({
        title: "Success",
        description: `Course "${newCourseName}" created successfully`,
      });

      // Reset form and close dialog
      setNewCourseName("");
      setShowCourseDialog(false);
    } catch (error: any) {
      console.error('Course creation error:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || error.message || "Failed to create course",
        variant: "destructive",
      });
    } finally {
      setIsCreatingCourse(false);
    }
  };

  const handleLoadStudents = async () => {
    setIsLoadingStudents(true);
    try {
      const studentsData = await api.getStudents();
      setStudents(studentsData);
    } catch (error: any) {
      console.error('Failed to load students:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || error.message || "Failed to load students",
        variant: "destructive",
      });
    } finally {
      setIsLoadingStudents(false);
    }
  };

  const handleUpdateStudentRole = async (userId: number) => {
    try {
      await api.updateStudentRole(userId.toString());
      // Refresh students list
      const studentsData = await api.getStudents();
      setStudents(studentsData);
      
      toast({
        title: "Success",
        description: "Student role updated successfully",
      });
    } catch (error: any) {
      console.error('Failed to update student role:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || error.message || "Failed to update student role",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-4 flex justify-center items-center min-h-[300px]">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-gray-500">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Card className="p-8 shadow-lg border-t-4 border-t-primary">
        <CardHeader className="pb-8">
          <CardTitle className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
            Admin Panel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 my-8">
            <Dialog open={showCourseDialog} onOpenChange={setShowCourseDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full h-48 relative group p-6 border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-md" />
                  <div className="relative flex flex-col items-center justify-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center transform group-hover:scale-110 transition-transform">
                      <Plus className="w-8 h-8 text-white" />
                    </div>
                    <span className="text-xl font-medium">Add Course</span>
                    <p className="text-sm text-gray-500 text-center">Create a new course</p>
                  </div>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Course</DialogTitle>
                  <DialogDescription>
                    Enter the name for the new course.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateCourse}>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="courseName">Course Name</Label>
                      <Input
                        id="courseName"
                        value={newCourseName}
                        onChange={(e) => setNewCourseName(e.target.value)}
                        placeholder="Enter course name"
                        disabled={isCreatingCourse}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={isCreatingCourse}>
                      {isCreatingCourse ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create Course"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full h-48 relative group p-6 border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-50 to-pink-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-md" />
                  <div className="relative flex flex-col items-center justify-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center transform group-hover:scale-110 transition-transform">
                      <Upload className="w-8 h-8 text-white" />
                    </div>
                    <span className="text-xl font-medium">Upload Lesson</span>
                    <p className="text-sm text-gray-500 text-center">Add new lesson materials</p>
                  </div>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Upload Lesson</DialogTitle>
                  <DialogDescription>
                    Fill in the details and upload lesson materials.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="course">Course</Label>
                      <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select course" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.isArray(courses) && courses.map((course) => (
                            <SelectItem key={course.id} value={String(course.id)}>
                              {course.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="week">Week</Label>
                      <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select week" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.isArray(weeks) && weeks.map((week) => (
                            <SelectItem key={week.id} value={String(week.id)}>
                              {week.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="day">Day</Label>
                      <Select value={selectedDay} onValueChange={setSelectedDay}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select day" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.isArray(days) && days.map((day) => (
                            <SelectItem key={day.id} value={String(day.id)}>
                              {day.day_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="title">Lesson Title</Label>
                      <Input
                        id="title"
                        value={lessonTitle}
                        onChange={(e) => setLessonTitle(e.target.value)}
                        placeholder="Enter lesson title"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Upload Files</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        className="hidden"
                        multiple
                      />
                      <Button type="button" variant="outline" onClick={addMoreFiles}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Files
                      </Button>
                    </div>
                    {files.length > 0 && (
                      <ScrollArea className="h-[100px] w-full border rounded-md p-2">
                        <div className="space-y-2">
                          {files.map((file) => (
                            <div
                              key={file.id}
                              className="flex items-center justify-between"
                            >
                              <span className="text-sm">{file.name}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFile(file.id)}
                              >
                                Remove
                              </Button>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>

                  <DialogFooter>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full sm:w-auto"
                    >
                      {isSubmitting && (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      )}
                      {isSubmitting ? "Uploading..." : "Upload Lesson"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={showStudentsDialog} onOpenChange={setShowStudentsDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full h-48 relative group p-6 border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg" onClick={handleLoadStudents}>
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-50 to-teal-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-md" />
                  <div className="relative flex flex-col items-center justify-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center transform group-hover:scale-110 transition-transform">
                      <Users className="w-8 h-8 text-white" />
                    </div>
                    <span className="text-xl font-medium">Lead Student</span>
                    <p className="text-sm text-gray-500 text-center">Manage student roles</p>
                  </div>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Manage Lead Students</DialogTitle>
                  <DialogDescription>
                    Select a student to make them a lead student.
                  </DialogDescription>
                </DialogHeader>
                {isLoadingStudents ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : students.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No students found
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Surname</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students
                        .filter(student => student.role !== 'admin')
                        .map((student) => (
                          <TableRow key={student.id}>
                            <TableCell>{student.username}</TableCell>
                            <TableCell>{student.surname}</TableCell>
                            <TableCell>
                              {student.role === 'lead_student' ? 'Lead Student' : 'Student'}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUpdateStudentRole(student.id)}
                                disabled={student.role === 'lead_student'}
                              >
                                Make Lead
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
