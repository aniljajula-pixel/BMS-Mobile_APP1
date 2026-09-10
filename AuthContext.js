import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [userToken, setUserToken] = useState(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('jwtToken');
        
        if (storedToken && storedToken.length > 0) {
          console.log('Found stored token, restoring authentication');
          setUserToken(storedToken);
          setIsAuthenticated(true);
        } else {
          console.log('No stored token found, user is not authenticated');
          setUserToken(null);
          setIsAuthenticated(false);
        }
        
        setIsOfflineMode(false);
      } catch (error) {
        console.error('Error initializing auth:', error);
        setIsAuthenticated(false);
        setUserToken(null);
      }
    };
    initializeAuth();
  }, []);

  const login = async (token, source = 'unknown') => {
    try {
      console.log(`Login called from ${source} with token: ${token}`);
      await AsyncStorage.setItem('jwtToken', token);
      setUserToken(token);
      setIsAuthenticated(true);
      setIsOfflineMode(false);
      console.log('Login successful - isAuthenticated:', true);
    } catch (error) {
      console.error('Error storing token:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('jwtToken');
      setUserToken(null);
      setIsAuthenticated(false);
      setIsOfflineMode(false);
      console.log('Logout successful - isAuthenticated:', false);
    } catch (error) {
      console.error('Error removing token:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, userToken, isOfflineMode, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};