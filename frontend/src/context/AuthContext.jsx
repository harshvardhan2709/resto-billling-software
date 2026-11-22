import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('urban_token'));
  const [loading, setLoading] = useState(true);

  // Initialize auth state by verifying session
  useEffect(() => {
    const verifyUser = async () => {
      try {
        const currentUser = await authService.getMe();
        setUser(currentUser);
      } catch (err) {
        setUser(null);
        localStorage.removeItem('urban_token');
      } finally {
        setLoading(false);
      }
    };

    verifyUser();
  }, []);

  const login = async (identifier, password) => {
    const data = await authService.login(identifier, password);
    setUser(data.user);
    setToken(data.token);
    return data;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setToken(null);
    }
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isCashier: user?.role === 'cashier',
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
