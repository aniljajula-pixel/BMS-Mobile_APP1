import React, { createContext, useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthContext = createContext();

// ---- JWT helpers (no external lib needed) ----
const decodeJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json);
  } catch (e) {
    console.error('decodeJwt error:', e);
    return null;
  }
};

const EMPTY_SCOPE = {
  state: null,
  zone: null,
  circle: null,
  division: null,
  area: null,
};

const extractScopeFromToken = (token) => {
  if (!token) return EMPTY_SCOPE;
  const payload = decodeJwt(token);
  const t = payload?.topic?.[0] || {};
  return {
    state:    t.state    ?? null,
    zone:     t.zone     ?? null,
    circle:   t.circle   ?? null,
    division: t.division ?? null,
    area:     t.area     ?? null,
  };
};

// ----------------------------------------------------------

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [userToken, setUserToken] = useState(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Restore token on app start
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

  // Derived values — recomputed automatically whenever userToken changes
  const scope = useMemo(() => extractScopeFromToken(userToken), [userToken]);

  const role = useMemo(() => {
    if (!userToken) return null;
    return decodeJwt(userToken)?.role ?? null;
  }, [userToken]);

  const accessPermissions = useMemo(() => {
    if (!userToken) return {};
    return decodeJwt(userToken)?.accessPermissions ?? {};
  }, [userToken]);

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
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userToken,
        isOfflineMode,
        login,
        logout,
        scope,              // <-- new: { state, zone, circle, division, area }
        role,               // <-- new: "SUPERADMIN" etc.
        accessPermissions,  // <-- new: { issuetracking, livemonitoring, ... }
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};