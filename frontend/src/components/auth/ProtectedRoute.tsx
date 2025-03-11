import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { FullPageLoading } from '@/components/ui/loading';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, checkAuthStatus } = useAuth();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthed, setIsAuthed] = useState(isAuthenticated);

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        // If already authenticated, no need to check again
        if (isAuthenticated) {
          setIsAuthed(true);
          setIsChecking(false);
          return;
        }
        
        // Try to verify token, but if server is unreachable, still use cached data
        const authValid = await checkAuthStatus();
        setIsAuthed(authValid);
      } catch (error) {
        console.error('Auth verification error:', error);
        // If there's an error, check if we have cached credentials
        const token = localStorage.getItem('authToken');
        const userData = localStorage.getItem('user');
        if (token && userData) {
          setIsAuthed(true);
        } else {
          setIsAuthed(false);
        }
      } finally {
        setIsChecking(false);
      }
    };

    verifyAuth();
  }, [isAuthenticated, checkAuthStatus]);

  // Show loading state while checking
  if (isChecking) {
    return <FullPageLoading text="Verifying your session..." />;
  }

  // Redirect to login if not authenticated
  if (!isAuthed) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Render children if authenticated
  return <>{children}</>;
} 