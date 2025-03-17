import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import LoginForm from "@/components/auth/LoginForm";
import RegisterForm from "@/components/auth/RegisterForm";
import Layout from "./components/layout/Layout";
import Lessons from "./pages/Lessons";
import Chat from "@/pages/Chat";
import NotFound from "./pages/NotFound";
import Admin from "@/pages/Admin";
import LessonChat from "@/components/chat/LessonChat";
import LessonPage from "@/pages/LessonPage";
import PersonalInfoForm from "@/components/PersonalInfoForm";

const queryClient = new QueryClient();

// Admin route wrapper component
const AdminRoute = ({ children }) => {
  const { user } = useAuth();
  
  if (!user || (user.role !== 'admin' && user.role !== 'student')) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

// WebSocket enabled route component
const WebSocketEnabledRoute = ({ children }) => {
  const { user } = useAuth();
  
  if (!user) {
    return children;
  }
  
  return (
    <WebSocketProvider 
      userId={user.id.toString()} 
      username={user.username} 
      role={user.role}
    >
      {children}
    </WebSocketProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginForm />} />
            <Route path="/register" element={<RegisterForm />} />

            {/* Protected routes with WebSocket */}
            <Route path="/" element={
              <ProtectedRoute>
                <WebSocketEnabledRoute>
                  <Layout />
                </WebSocketEnabledRoute>
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/chat" replace />} />
              <Route path="chat" element={<Chat />} />
              <Route path="lessons" element={<Lessons />} />
              <Route path="lessons/:lessonId" element={<LessonPage />} />
              <Route path="lessons/:lessonId/chat" element={<LessonChat />} />
              <Route path="personal-info" element={<PersonalInfoForm />} />
              <Route 
                path="admin" 
                element={
                  <ProtectedRoute>
                    <Admin />
                  </ProtectedRoute>
                } 
              />
            </Route>

            {/* 404 route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
