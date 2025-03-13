import { create } from 'zustand';
import { useContext } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface User {
  id: string;
  username: string;
  email: string;
  role: 'student' | 'lead_student' | 'admin';
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (userData: {
    username: string;
    surname: string;
    email: string;
    password: string;
  }) => Promise<void>;
  checkAuthStatus: () => Promise<boolean>;
  isLoading: boolean;
}

// This is a simple wrapper around useAuth that can be used like a store
export const useAuthStore = useAuth;

// For TypeScript support when using the hook as a selector
export const useAuthStoreSelector = <T>(selector: (state: AuthState) => T): T => {
  const store = useAuth();
  return selector(store as AuthState);
}; 