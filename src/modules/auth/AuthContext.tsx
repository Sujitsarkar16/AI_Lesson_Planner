/**
 * Auth Context
 * Provides authentication state and methods across the app
 */

import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { setApiAccessToken } from '@/shared/api/apiClient';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  error: string | null;
  accessToken: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Auth Provider Component
 * Wraps the app and provides auth state
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    isAuthenticated,
    isLoading,
    user,
    loginWithPopup,
    logout: auth0Logout,
    getAccessTokenSilently,
    error: auth0Error
  } = useAuth0();

  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  /**
   * Get and cache access token
   */
  useEffect(() => {
    const fetchToken = async () => {
      try {
        if (isAuthenticated) {
          const token = await getAccessTokenSilently();
          setAccessToken(token);
          setApiAccessToken(token);
          
        }
      } catch (err) {
        console.error('Failed to get access token:', err);
      }
    };

    if (isAuthenticated && !accessToken) {
      fetchToken();
    }
  }, [isAuthenticated, getAccessTokenSilently, user, accessToken]);

  /**
   * Login with email and password
   */
  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      await loginWithPopup({
        authorizationParams: {
          connection: 'Username-Password-Authentication',
          login_hint: email
        }
      });
    } catch (err: any) {
      const errorMsg = err?.error_description || err?.message || 'Login failed';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [loginWithPopup]);

  /**
   * Sign up with email and password
   */
  const signup = useCallback(async (email: string, password: string, name: string) => {
    setError(null);
    try {
      await loginWithPopup({
        authorizationParams: {
          connection: 'Username-Password-Authentication',
          screen_hint: 'signup',
          login_hint: email
        }
      });
    } catch (err: any) {
      const errorMsg = err?.error_description || err?.message || 'Sign up failed';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [loginWithPopup]);

  /**
   * Login with Google
   */
  const loginWithGoogle = useCallback(async () => {
    setError(null);
    try {
      await loginWithPopup({
        authorizationParams: {
          connection: 'google-oauth2'
        }
      });
    } catch (err: any) {
      const errorMsg = err?.error_description || err?.message || 'Google login failed';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [loginWithPopup]);

  /**
   * Logout
   */
  const logout = useCallback(async () => {
    setError(null);
    setAccessToken(null);
    setApiAccessToken(null);
    
    localStorage.removeItem('auth0_user');
    localStorage.removeItem('_encryption_seed');

    // Clear any cached settings
    localStorage.removeItem('userSettings');
    
    console.log('✅ All encrypted data cleared on logout');
    
    // Logout from Auth0
    auth0Logout({
      logoutParams: {
        returnTo: typeof window !== 'undefined' ? window.location.origin : '/'
      }
    });
  }, [auth0Logout]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        login,
        signup,
        loginWithGoogle,
        logout,
        error: error || (auth0Error?.message || null),
        accessToken
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/**
 * useAuth Hook
 * Get auth context in any component
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

/**
 * useAuthToken Hook
 * Get access token for API calls
 */
export const useAuthToken = (): string | null => {
  const { accessToken } = useAuth();
  return accessToken;
};
