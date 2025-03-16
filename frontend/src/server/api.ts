import axios from 'axios';

// Determine the backend URL based on the environment
const getBaseUrl = () => {
  const port = window.location.port || '80';
  // If we're running on a dev server (usual ports: 5173, 3000, etc)
  if (['5173', '5174', '3000', '3001'].includes(port)) {
    return 'http://localhost:3000/api';
  } 
  // In production, assume the API is served from the same domain
  return '/api';
};

// Use determined URL
const axiosInstance = axios.create({
  baseURL: getBaseUrl(),
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

// Get the direct API URL for failover cases
const getDirectApiUrl = () => {
  return 'http://localhost:3000/api';
};

const api = {
  login: async (email: string, password: string) => {
    try {
      // First try with the configured baseURL
      try {
        const response = await axiosInstance.post('/auth/login', { email, password });
        return response.data;
      } catch (error: any) {
        if (error.response && error.response.status === 404) {
          // If 404, try direct URL as fallback
          console.log('Retrying login with direct URL...');
          const directResponse = await axios.post(`${getDirectApiUrl()}/auth/login`, { email, password });
          return directResponse.data;
        }
        throw error;
      }
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
      // First try with the configured baseURL
      try {
        console.log('Sending registration request to:', `/auth/register`);
        const response = await axiosInstance.post('/auth/register', userData);
        return response.data;
      } catch (error: any) {
        if (error.response && error.response.status === 404) {
          // If 404, try direct URL as fallback
          console.log('Retrying registration with direct URL...');
          const directResponse = await axios.post(`${getDirectApiUrl()}/auth/register`, userData);
          return directResponse.data;
        }
        throw error;
      }
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
      // Ensure lessonId is always treated as a string
      const safeId = String(lessonId);
      console.log(`API requesting content for lesson ID: ${safeId}`);
      
      const response = await axiosInstance.get(`/lessons/${safeId}/content`);
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
      let lessons = lessonsResponse.data;

      // Check if lessons is a string (which happens in production)
      if (typeof lessons === 'string') {
        console.log('Received string instead of array:', lessons);
        try {
          // Try to parse the string as JSON
          lessons = JSON.parse(lessons);
        } catch (parseError) {
          console.error('Failed to parse string as JSON:', parseError);
          return [];
        }
      }

      // Check if lessons is an array, if not return an empty array
      if (!Array.isArray(lessons)) {
        console.error('Expected array of lessons but received:', typeof lessons);
        return [];
      }

      // Print lessons IDs for debugging
      console.log('Received lessons with IDs:', lessons.map(l => l.id).join(', '));

      // Group lessons by course, week, and day
      const courseMap = new Map();

      // Process each lesson to build the course structure
      lessons.forEach(lesson => {
        const courseId = String(lesson.course_id);
        const weekId = String(lesson.week_id);
        // Ensure lesson ID is always a string
        const lessonId = String(lesson.id);
        
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
        
        // Add lesson to the week using the database ID directly as string
        course.weeks.get(weekId).lessons.push({
          id: lessonId,
          name: `${lesson.day_name}: ${lesson.title}`,
        });
      });

      // Convert maps to arrays for the final structure
      const result = Array.from(courseMap.values()).map(course => ({
        ...course,
        weeks: Array.from(course.weeks.values())
      }));

      // Log the final course structure for debugging
      console.log('Course structure built with:', result.length, 'courses');
      result.forEach(course => {
        console.log(`Course ${course.id}: ${course.name} with ${course.weeks.length} weeks`);
        course.weeks.forEach(week => {
          console.log(`  Week ${week.id}: ${week.name} with ${week.lessons.length} lessons`);
          week.lessons.forEach(lesson => {
            console.log(`    Lesson ${lesson.id}: ${lesson.name}`);
          });
        });
      });

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

  // Add a method for lesson-specific chat
  sendLessonChat: async (lessonId: string, message: string) => {
    try {
      const response = await axiosInstance.post(`/lessons/${lessonId}/chat`, { message });
      return response.data;
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        // If 404, try direct URL as fallback
        console.log('Retrying lesson chat with direct URL...');
        const directResponse = await axios.post(`${getDirectApiUrl()}/lessons/${lessonId}/chat`, { message });
        return directResponse.data;
      }
      throw error;
    }
  },
  
  // Add a general chat method
  sendChatMessage: async (message: string) => {
    try {
      console.log('Sending general chat message:', message);
      const response = await axiosInstance.post(`/chat`, {
        message
      });
      return response.data;
    } catch (error) {
      console.error('Failed to send chat message:', error);
      throw error;
    }
  }
};
export { api };
