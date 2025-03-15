import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '@/contexts/AuthContext';
import { motion } from "framer-motion";
import { User, Mail, Lock, UserCheck } from "lucide-react";

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
    <div className="flex flex-col items-center justify-center min-h-screen py-4 bg-[#f0f6ff]">
      <div className="flex flex-col items-center w-full max-w-md mx-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center mb-3"
        >
          <div className="flex items-center justify-center mb-1">
            <img src="/favicon.svg" alt="AI Academia" className="h-10 w-10 text-[#333]" />
            <h1 className="text-3xl font-bold ml-2 text-[#333]">AI Academia</h1>
          </div>
          <p className="text-[#666] italic text-sm">The Tirana school of AI where we make the government of Albania more efficient</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full"
        >
          <Card className="shadow-lg border-0">
            <CardHeader className="space-y-1 py-3">
              <CardTitle className="text-xl text-center font-bold">Create Account</CardTitle>
            </CardHeader>
            <CardContent>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mb-3 p-2 text-red-500 bg-red-50 rounded-md text-sm"
                >
                  {error}
                </motion.div>
              )}
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1 relative">
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
                        <User size={16} />
                      </div>
                      <Input
                        name="username"
                        placeholder="First name"
                        value={formData.username}
                        onChange={handleChange}
                        required
                        disabled={isLoading}
                        className="h-10 pl-9 pr-4"
                      />
                    </div>
                  </div>
                  <div className="space-y-1 relative">
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
                        <UserCheck size={16} />
                      </div>
                      <Input
                        name="surname"
                        placeholder="Last name"
                        value={formData.surname}
                        onChange={handleChange}
                        required
                        disabled={isLoading}
                        className="h-10 pl-9 pr-4"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
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
                      className="h-10 pl-9 pr-4"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
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
                      className="h-10 pl-9 pr-4"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
                      <Lock size={16} />
                    </div>
                    <Input
                      type="password"
                      name="confirmPassword"
                      placeholder="Confirm"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      disabled={isLoading}
                      className="h-10 pl-9 pr-4"
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-10 bg-[#1f2937] hover:bg-[#374151] transition-colors" 
                  disabled={isLoading}
                >
                  {isLoading ? "Signing up..." : "Sign up"}
                </Button>
              </form>
              <div className="mt-4 text-center text-sm">
                Already have an account?{" "}
                <Link to="/login" className="text-blue-600 hover:text-blue-800 font-medium transition-colors">
                  Login
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-4 text-xs text-gray-500"
        >
          © 2025 AI Academia. All rights reserved.
        </motion.div>
      </div>
    </div>
  );
}
