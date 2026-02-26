// Authentication and user context

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types/entities';
import { UsersAPI } from '../services/odataClient';

interface AuthContextType {
  currentUser: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  switchUser: (userId: string) => Promise<void>;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const getDefaultRouteForRole = (role: UserRole): string => {
  switch (role) {
    case 'ADMIN':
      return '/admin/dashboard';
    case 'MANAGER':
      return '/manager/dashboard';
    case 'PROJECT_MANAGER':
      return '/project-manager/dashboard';
    case 'DEV_COORDINATOR':
      return '/dev-coordinator/dashboard';
    case 'CONSULTANT_TECHNIQUE':
      return '/consultant-tech/dashboard';
    case 'CONSULTANT_FONCTIONNEL':
      return '/consultant-func/dashboard';
    default:
      return '/dashboard';
  }
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const storedUserId = localStorage.getItem('currentUserId');
        if (!storedUserId) return;

        const user = await UsersAPI.getById(storedUserId);
        if (!isMounted) return;

        if (user) {
          setCurrentUser(user);
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('currentUserId');
        }
      } finally {
        if (isMounted) {
          setIsAuthLoading(false);
        }
      }
    };

    void restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    // Demo credentials: all users share a single password.
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || password !== 'demo') {
      throw new Error('Invalid credentials');
    }

    const users = await UsersAPI.getAll();
    const user = users.find((u) => u.email.toLowerCase() === normalizedEmail);

    if (user && user.active) {
      setCurrentUser(user);
      setIsAuthenticated(true);
      localStorage.setItem('currentUserId', user.id);
    } else {
      throw new Error('Invalid credentials');
    }
  };

  const logout = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('currentUserId');
  };

  const switchUser = async (userId: string) => {
    const user = await UsersAPI.getById(userId);
    if (user) {
      setCurrentUser(user);
      setIsAuthenticated(true);
      localStorage.setItem('currentUserId', user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        login,
        logout,
      switchUser,
      isAuthenticated,
      isAuthLoading,
    }}
  >
      {children}
    </AuthContext.Provider>
  );
};
