import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '@/contexts/AuthContext';
import { motion } from "framer-motion";
import { Mail, Lock, Brain } from "lucide-react";
import AuthBackground from "./AuthBackground";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated, checkAuthStatus } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      if (isAuthenticated) {
        const from = (location.state as any)?.from?.pathname || "/chat";
        navigate(from, { replace: true });
        return;
      }
      
      // Check if we have a valid session
      try {
        const isValid = await checkAuthStatus();
        if (isValid) {
          const from = (location.state as any)?.from?.pathname || "/chat";
          navigate(from, { replace: true });
        }
      } catch (error) {
        console.error("Auth check error:", error);
      }
    };
    
    checkAuth();
  }, [isAuthenticated, navigate, location, checkAuthStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    
    try {
      await login(email, password);
      // Change default redirect to /chat
      const from = (location.state as any)?.from?.pathname || "/chat";
      navigate(from, { replace: true });
    } catch (err) {
      setError("Failed to login. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
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
                <CardTitle className="text-xl text-center font-bold text-gray-800">Login</CardTitle>
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
                    className="space-y-1"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                        <Mail size={16} />
                      </div>
                      <Input
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
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
                    transition={{ delay: 0.4 }}
                  >
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                        <Lock size={16} />
                      </div>
                      <Input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isLoading}
                        className="h-11 pl-9 pr-4 bg-white/90 border-gray-200 focus:border-gray-400 focus:ring-gray-300"
                      />
                    </div>
                  </motion.div>
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
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
                          Logging in...
                        </span>
                      ) : "Login"}
                    </Button>
                  </motion.div>
                </form>
                <motion.div 
                  className="mt-4 text-center text-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  Don't have an account?{" "}
                  <Link to="/register" className="text-gray-700 hover:text-black font-medium transition-colors">
                    Register
                  </Link>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="mt-4 text-xs text-gray-500"
          >
            © 2025 AI Academia. All rights reserved.
          </motion.div>
        </div>
      </div>
    </AuthBackground>
  );
}
