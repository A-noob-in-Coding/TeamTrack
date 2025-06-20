import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';

export const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within a AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const checkAuth = useCallback(async () => {
    if (user) {
      setLoading(false);
      return;
    }

    try {
      const res = await api.get('/api/auth/profile');
      if (res.status === 200) {
        setUser(res.data);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (credentials) => {
    try {
      const res = await api.post('/api/auth/login', credentials);
      if (res.status === 200) {
        setUser(res.data);
        toast.success('Logged in successfully!');
        navigate(location.state?.from?.pathname || '/');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
      throw new Error('Login failed');
    }
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
      setUser(null);
      toast.success('Logged out successfully!');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Logout failed');
    }
  };

  const updateUser = async (userData) => {
    setLoading(true);
    try {
      const res = await api.put('/api/auth/profile', userData);
      if (res.status === 200) {
        setUser(res.data);
        toast.success('Profile updated successfully!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  }

  const changePassword = async (passwords) => {
    setLoading(true);
    try {
      const res = await api.put('/api/auth/change-password', passwords);
      if (res.status === 200) {
        toast.success('Password changed successfully!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password change failed');
      throw new Error('Password change failed');
    } finally {
      setLoading(false);
    }
  }

  const value = {
    user,
    loading,
    login,
    logout,
    updateUser,
    changePassword,
    refreshUser: checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;