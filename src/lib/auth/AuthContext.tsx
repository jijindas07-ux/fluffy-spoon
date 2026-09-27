'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  interviewCount?: number;
  createdAt?: number;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  logout: () => {},
  refreshUser: async () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const saveAuth = (newToken: string, newUser: AuthUser) => {
    localStorage.setItem('verveai_token', newToken);
    localStorage.setItem('verveai_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const clearAuth = () => {
    localStorage.removeItem('verveai_token');
    localStorage.removeItem('verveai_user');
    localStorage.removeItem('verveai_session_id');
    localStorage.removeItem('verveai_candidate_id');
    setToken(null);
    setUser(null);
  };

  const refreshUser = useCallback(async () => {
    const storedToken = localStorage.getItem('verveai_token');
    if (!storedToken) {
      setIsLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${storedToken}` }
      });
      const data = await res.json();
      if (data.success && data.user) {
        setToken(storedToken);
        setUser(data.user);
      } else {
        clearAuth();
      }
    } catch {
      // Use cached user if network fails
      const cachedUser = localStorage.getItem('verveai_user');
      if (cachedUser) {
        try {
          setToken(storedToken);
          setUser(JSON.parse(cachedUser));
        } catch {
          clearAuth();
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.success && data.token && data.user) {
        saveAuth(data.token, data.user);
        return { success: true };
      }
      return { success: false, error: data.error || 'Login failed' };
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const register = async (name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();
      if (data.success && data.token && data.user) {
        saveAuth(data.token, data.user);
        return { success: true };
      }
      return { success: false, error: data.error || 'Registration failed' };
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const logout = () => {
    const storedToken = localStorage.getItem('verveai_token');
    if (storedToken) {
      fetch('/api/auth/me', {
        method: 'POST',
        headers: { Authorization: `Bearer ${storedToken}` }
      }).catch(() => {});
    }
    clearAuth();
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isLoading,
      isAuthenticated: !!user && !!token,
      login,
      register,
      logout,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
