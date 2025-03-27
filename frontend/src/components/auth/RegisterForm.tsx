import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '@/contexts/AuthContext';
import { motion } from "framer-motion";
import { User, Mail, Lock, UserCheck, Brain } from "lucide-react";
import AuthBackground from "./AuthBackground";

export default function RegisterForm() {
  const [formData, setFormData] = useState({
    username: "",
    surname: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { register, isAuthenticated, checkAuthStatus } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      if (isAuthenticated) {
        navigate('/chat', { replace: true });
        return;
      }
      
      // Check if we have a valid session
      try {
        const isValid = await checkAuthStatus();
        if (isValid) {
          navigate('/chat', { replace: true });
        }
      } catch (error) {
        console.error("Auth check error:", error);
      }
    };
    
    checkAuth();
  }, [isAuthenticated, navigate, checkAuthStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Basic validation
      if (!formData.username.trim() || !formData.email.trim() || !formData.password.trim()) {
        setError("Please fill in all required fields");
        setIsLoading(false);
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match");
        setIsLoading(false);
        return;
      }

      if (formData.password.length < 6) {
        setError("Password must be at least 6 characters long");
        setIsLoading(false);
        return;
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError("Please enter a valid email address");
        setIsLoading(false);
        return;
      }

      const { confirmPassword, ...registerData } = formData;
      
      console.log('Attempting registration with:', {
        ...registerData,
        password: '[HIDDEN]'
      });

      await register(registerData);
      navigate('/chat');
    } catch (err: any) {
      console.error('Registration error:', err);
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.details ||
                          err.message || 
                          "Registration failed. Please try again.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <AuthBackground>
      <div className="flex flex-col items-center justify-center min-h-screen py-4">
        <div className="flex flex-col items-center w-full max-w-md mx-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center mb-3"
          >
            <div className="flex items-center justify-center mb-1">
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ 
                  rotate: [0, 10, 0, -10, 0],
                  scale: [1, 1.1, 1],
                }}
                transition={{ 
                  rotate: {
                    duration: 5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  },
                  scale: {
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }
                }}
                className="relative flex items-center justify-center"
              >
                <Brain size={40} className="text-gray-700" />
                <motion.div 
                  className="absolute inset-0 rounded-full border border-gray-400"
                  initial={{ scale: 1, opacity: 0.7 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  transition={{ 
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeOut" 
                  }}
                />
              </motion.div>
              <h1 className="text-3xl font-bold ml-2 text-gray-800">AI Academia</h1>
            </div>
            <p className="text-gray-500 italic text-sm">The Tirana school of AI where we make the government of Albania more efficient</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="w-full"
          >
            <Card className="shadow-xl border-0 backdrop-blur-sm bg-white/90">
              <CardHeader className="space-y-1 py-4">
                <CardTitle className="text-xl text-center font-bold text-gray-800">Create Account</CardTitle>
              </CardHeader>
              <CardContent>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mb-4 p-2 text-red-500 bg-red-50 rounded-md text-sm"
                  >
                    {error}
                  </motion.div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1 relative">
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                            <User size={16} />
                          </div>
                          <Input
                            name="username"
                            placeholder="First name"
                            value={formData.username}
                            onChange={handleChange}
                            required
                            disabled={isLoading}
                            className="h-11 pl-9 pr-4 bg-white/90 border-gray-200 focus:border-gray-400 focus:ring-gray-300"
                          />
                        </div>
                      </div>
                      <div className="space-y-1 relative">
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                            <UserCheck size={16} />
                          </div>
                          <Input
                            name="surname"
                            placeholder="Last name"
                            value={formData.surname}
                            onChange={handleChange}
                            required
                            disabled={isLoading}
                            className="h-11 pl-9 pr-4 bg-white/90 border-gray-200 focus:border-gray-400 focus:ring-gray-300"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    className="space-y-1"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                        <Mail size={16} />
                      </div>
                      <Input
                        type="email"
                        name="email"
                        placeholder="Email address"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        disabled={isLoading}
                        className="h-11 pl-9 pr-4 bg-white/90 border-gray-200 focus:border-gray-400 focus:ring-gray-300"
                      />
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    className="space-y-1"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                        <Lock size={16} />
                      </div>
                      <Input
                        type="password"
                        name="password"
                        placeholder="Password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        disabled={isLoading}
                        className="h-11 pl-9 pr-4 bg-white/90 border-gray-200 focus:border-gray-400 focus:ring-gray-300"
                      />
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    className="space-y-1"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.6 }}
                  >
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                        <Lock size={16} />
                      </div>
                      <Input
                        type="password"
                        name="confirmPassword"
                        placeholder="Confirm Password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                        disabled={isLoading}
                        className="h-11 pl-9 pr-4 bg-white/90 border-gray-200 focus:border-gray-400 focus:ring-gray-300"
                      />
                    </div>
                  </motion.div>
                  
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.7 }}
                  >
                    <Button 
                      type="submit" 
                      className="w-full h-11 bg-gradient-to-r from-gray-700 to-gray-900 hover:from-gray-800 hover:to-black transition-all shadow-md"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Signing up...
                        </span>
                      ) : "Sign up"}
                    </Button>
                  </motion.div>
                </form>
                <motion.div 
                  className="mt-4 text-center text-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  Already have an account?{" "}
                  <Link to="/login" className="text-gray-700 hover:text-black font-medium transition-colors">
                    Login
                  </Link>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.9 }}
            className="mt-4 text-xs text-gray-500"
          >
            © 2025 AI Academia. All rights reserved.
          </motion.div>
        </div>
      </div>
    </AuthBackground>
  );
}
