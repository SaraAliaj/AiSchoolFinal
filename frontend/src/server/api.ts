import axios from 'axios';

// Use relative URL since we're using Vite's proxy
const axiosInstance = axios.create({
  baseURL: '/api',  // Changed from absolute URL to relative
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true // Add withCredentials for CORS
});

// Add request interceptor to include auth token
axiosInstance.interceptors.request.use(
  config => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// Add response interceptor for error handling
axiosInstance.interceptors.response.use(
  response => response,
  error => {
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout');
      throw new Error('Request timeout - server is not responding');
    }

    if (!error.response) {
      console.error('Network error:', error);
      throw new Error('Network error - please check your connection');
    }

    throw error;
  }
);

const api = {
  login: async (email: string, password: string) => {
    try {
      const response = await axiosInstance.post('/auth/login', { email, password });
      return response.data;
    } catch (error: any) {
      console.error('Login API error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      throw error;
    }
  },

  register: async (userData: { username: string, surname: string, email: string, password: string }) => {
    try {
      console.log('Sending registration request to:', `/auth/register`);
      const response = await axiosInstance.post('/auth/register', userData);
      return response.data;
    } catch (error: any) {
      console.error('Registration API error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      throw error;
    }
  },

  verifyToken: async () => {
    try {
      const response = await axiosInstance.get('/auth/verify');
      return response.data;
    } catch (error) {
      console.error('Token verification failed:', error);
      throw error;
    }
  },

  checkHealth: async () => {
    try {
      const response = await axiosInstance.get('/health');
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  },

  getCourses: async () => {
    try {
      const response = await axiosInstance.get('/courses');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch courses:', error);
      throw error;
    }
  },

  createCourse: async (name: string) => {
    try {
      const response = await axiosInstance.post('/courses', { name }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to create course:', error);
      throw error;
    }
  },

  getWeeks: async () => {
    try {
      const response = await axiosInstance.get('/weeks');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch weeks:', error);
      throw error;
    }
  },

  getDays: async () => {
    try {
      const response = await axiosInstance.get('/days');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch days:', error);
      throw error;
    }
  },

  getLessons: async () => {
    try {
      const response = await axiosInstance.get('/lessons');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch lessons:', error);
      throw error;
    }
  },

  getLessonContent: async (lessonId: string) => {
    try {
      const response = await axiosInstance.get(`/lessons/${lessonId}/content`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch lesson content:', error);
      throw error;
    }
  },

  downloadLessonFile: (lessonId: string) => {
    // Return the URL for direct download
    return `${axiosInstance.defaults.baseURL}/lessons/${lessonId}/download`;
  },

  // New method to fetch the full course structure with weeks and lessons
  getCourseStructure: async () => {
    try {
      // Fetch lessons which include course, week, and day information
      const lessonsResponse = await axiosInstance.get('/lessons');
      const lessons = lessonsResponse.data;

      // Group lessons by course, week, and day
      const courseMap = new Map();

      // Process each lesson to build the course structure
      lessons.forEach(lesson => {
        const courseId = lesson.course_id.toString();
        const weekId = lesson.week_id.toString();
        const dayId = lesson.day_id.toString();
        
        // Initialize course if not exists
        if (!courseMap.has(courseId)) {
          courseMap.set(courseId, {
            id: courseId,
            name: lesson.course_name,
            weeks: new Map()
          });
        }
        
        const course = courseMap.get(courseId);
        
        // Initialize week if not exists
        if (!course.weeks.has(weekId)) {
          course.weeks.set(weekId, {
            id: weekId,
            name: lesson.week_name,
            lessons: []
          });
        }
        
        // Add lesson to the week
        course.weeks.get(weekId).lessons.push({
          id: lesson.id.toString(),
          name: `${lesson.day_name}: ${lesson.title}`,
        });
      });

      // Convert maps to arrays for the final structure
      const result = Array.from(courseMap.values()).map(course => ({
        ...course,
        weeks: Array.from(course.weeks.values())
      }));

      return result;
    } catch (error) {
      console.error('Failed to fetch course structure:', error);
      throw error;
    }
  },

  uploadLesson: async (formData: FormData) => {
    try {
      console.log('Starting lesson upload request');
      
      // Log FormData entries for debugging
      console.log('FormData entries:');
      for (const pair of (formData as any).entries()) {
        const [key, value] = pair;
        if (key === 'files') {
          console.log(`File entry: ${key}, filename: ${value instanceof File ? value.name : 'not a file'}`);
        } else {
          console.log(`Form field: ${key}=${value}`);
        }
      }
      
      // Create a separate axios instance without auth interceptors for this request
      const noAuthAxios = axios.create({
        baseURL: '/api',
        timeout: 60000, // Increase timeout for file uploads (60 seconds)
        withCredentials: true
      });
      
      console.log('Sending POST request to /lessons');
      
      // Use the original FormData directly
      const response = await noAuthAxios.post('/lessons', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });
      
      console.log('Lesson upload successful:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to upload lesson:', error);
      if (axios.isAxiosError(error)) {
        console.error('Axios error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers
        });
      }
      throw error;
    }
  },

  // New method to upload a PDF file as a lesson
  uploadPDFLesson: async (formData: FormData) => {
    try {
      console.log('Starting PDF lesson upload request');
      
      // Log FormData entries for debugging
      console.log('FormData entries:');
      for (const pair of (formData as any).entries()) {
        const [key, value] = pair;
        if (key === 'pdfFile') {
          console.log(`File entry: ${key}, filename: ${value instanceof File ? value.name : 'not a file'}`);
        } else {
          console.log(`Form field: ${key}=${value}`);
        }
      }
      
      // Create a separate axios instance without auth interceptors for this request
      const noAuthAxios = axios.create({
        baseURL: '/api',
        timeout: 120000, // Increase timeout for PDF processing (120 seconds)
        withCredentials: true
      });
      
      console.log('Sending POST request to /lessons/pdf');
      
      // Use the original FormData directly
      const response = await noAuthAxios.post('/lessons/pdf', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });
      
      console.log('PDF lesson upload successful:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to upload PDF lesson:', error);
      if (axios.isAxiosError(error)) {
        console.error('Axios error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers
        });
      }
      throw error;
    }
  },

  // New methods for student management
  getStudents: async () => {
    try {
      const response = await axiosInstance.get('/admin/students');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch students:', error);
      throw error;
    }
  },

  updateStudentRole: async (userId: string) => {
    try {
      const response = await axiosInstance.put(`/admin/students/${userId}/role`);
      return response.data;
    } catch (error) {
      console.error('Failed to update student role:', error);
      throw error;
    }
  },
};
export { api };
