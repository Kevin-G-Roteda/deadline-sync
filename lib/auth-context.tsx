'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Amplify } from 'aws-amplify';
import { 
  signIn, 
  signUp, 
  signOut, 
  confirmSignUp, 
  resendSignUpCode,
  getCurrentUser,
  fetchAuthSession,
  type SignInInput,
  type SignUpInput
} from 'aws-amplify/auth';
import { amplifyConfig } from './amplify-config';

Amplify.configure(amplifyConfig, { ssr: true });

interface User {
  userId: string;
  email: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  confirmSignup: (email: string, code: string) => Promise<void>;
  resendCode: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      setLoading(true);
      const currentUser = await getCurrentUser();
      
      setUser({
        userId: currentUser.userId,
        email: currentUser.signInDetails?.loginId || '',
        name: currentUser.username,
      });
      
      setError(null);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      const signInInput: SignInInput = {
        username: email,
        password,
      };

      const { isSignedIn } = await signIn(signInInput);

      if (isSignedIn) {
        await checkUser();
      }
    } catch (err: any) {
      console.error('Login error:', err);
      
      let errorMessage = 'Login failed. Please try again.';
      
      if (err.name === 'UserNotConfirmedException') {
        errorMessage = 'Please verify your email address before logging in.';
      } else if (err.name === 'NotAuthorizedException') {
        errorMessage = 'Incorrect email or password.';
      } else if (err.name === 'UserNotFoundException') {
        errorMessage = 'No account found with this email address.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    try {
      setLoading(true);
      setError(null);

      const signUpInput: SignUpInput = {
        username: email,
        password,
        options: {
          userAttributes: {
            email,
            name,
          },
          autoSignIn: true,
        },
      };

      const { isSignUpComplete, nextStep } = await signUp(signUpInput);

      if (!isSignUpComplete && nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
        setError(null);
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      
      let errorMessage = 'Signup failed. Please try again.';
      
      if (err.name === 'UsernameExistsException') {
        errorMessage = 'An account with this email already exists.';
      } else if (err.name === 'InvalidPasswordException') {
        errorMessage = 'Password must be at least 8 characters with uppercase, lowercase, and numbers.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const confirmSignup = async (email: string, code: string) => {
    try {
      setLoading(true);
      setError(null);

      await confirmSignUp({
        username: email,
        confirmationCode: code,
      });

      setError(null);
    } catch (err: any) {
      console.error('Confirmation error:', err);
      
      let errorMessage = 'Verification failed. Please try again.';
      
      if (err.name === 'CodeMismatchException') {
        errorMessage = 'Invalid verification code. Please check and try again.';
      } else if (err.name === 'ExpiredCodeException') {
        errorMessage = 'Verification code has expired. Please request a new one.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async (email: string) => {
    try {
      setLoading(true);
      setError(null);

      await resendSignUpCode({
        username: email,
      });

      setError(null);
    } catch (err: any) {
      console.error('Resend code error:', err);
      setError(err.message || 'Failed to resend code. Please try again.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await signOut();
      setUser(null);
      setError(null);
    } catch (err: any) {
      console.error('Logout error:', err);
      setError('Logout failed. Please try again.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getAccessToken = async (): Promise<string | null> => {
    try {
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString();
      return idToken || null;
    } catch (err) {
      console.error('Error getting access token:', err);
      return null;
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value = {
    user,
    loading,
    error,
    login,
    signup,
    confirmSignup,
    resendCode,
    logout,
    getAccessToken,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
