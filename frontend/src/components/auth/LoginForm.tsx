import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '@/contexts/AuthContext';
import { motion } from "framer-motion";
import { Mail, Lock } from "lucide-react";

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
    <div className="flex flex-col items-center justify-center min-h-screen py-4 bg-[#f0f6ff]">
      <div className="flex flex-col items-center w-full max-w-md mx-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center mb-3"
        >
          <div className="flex items-center justify-center mb-1">
            <img src="/favicon.svg" alt="AI School" className="h-10 w-10 text-[#333]" />
            <h1 className="text-3xl font-bold ml-2 text-[#333]">AI School</h1>
          </div>
          <p className="text-[#666] italic text-sm">Learn. Challenge. Grow.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full"
        >
          <Card className="shadow-lg border-0">
            <CardHeader className="space-y-1 py-3">
              <CardTitle className="text-xl text-center font-bold">Login</CardTitle>
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
                <div className="space-y-1">
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
                      <Mail size={16} />
                    </div>
                    <Input
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
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
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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
                  {isLoading ? "Logging in..." : "Login"}
                </Button>
              </form>
              <div className="mt-4 text-center text-sm">
                Don't have an account?{" "}
                <Link to="/register" className="text-blue-600 hover:text-blue-800 font-medium transition-colors">
                  Register
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
          © 2025 AI School. All rights reserved.
        </motion.div>
      </div>
    </div>
  );
}
