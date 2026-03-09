// frontend/src/context/AuthContext.tsx — REPLACE ENTIRE FILE

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import * as authApi from '../api/auth';
import apiClient from '../api/client';

interface AuthContextType {
  user:            User | null;
  isLoading:       boolean;
  isAuthenticated: boolean;
  /** Step 1 — validate credentials, returns pre_auth_token + pin_is_set */
  loginStep1: (username: string, password: string) => Promise<{ pre_auth_token: string; pin_is_set: boolean; username: string }>;
  /** Step 2 — verify / set PIN, stores tokens and sets user */
  loginStep2: (
    pre_auth_token: string,
    opts: { pin?: string; new_pin?: string; confirm_pin?: string }
  ) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser]         = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: restore session if token exists
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      authApi.getProfile()
        .then(res => setUser(res.data))
        .catch(() => {
          localStorage.clear();
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const loginStep1 = async (username: string, password: string) => {
    const res = await apiClient.post('/auth/login/', { username, password });
    // Returns { pre_auth_token, pin_is_set, username }
    return res.data as { pre_auth_token: string; pin_is_set: boolean; username: string };
  };

  const loginStep2 = async (
    pre_auth_token: string,
    opts: { pin?: string; new_pin?: string; confirm_pin?: string }
  ) => {
    const res = await apiClient.post('/auth/verify-pin/', {
      pre_auth_token,
      ...opts,
    });
    const { user: userData, access, refresh } = res.data;
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    setUser(userData);
  };

  const logout = async () => {
    const refresh = localStorage.getItem('refresh_token');
    if (refresh) {
      try { await authApi.logout(refresh); } catch {}
    }
    localStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user, isLoading, isAuthenticated: !!user,
      loginStep1, loginStep2, logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
