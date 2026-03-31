'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Amplify } from 'aws-amplify';
import { signIn, signUp, signOut, confirmSignUp, getCurrentUser, resendSignUpCode, fetchUserAttributes } from 'aws-amplify/auth';
import { amplifyConfig } from './amplify-config';
import { upsertUserProfile } from './assignments-api';

Amplify.configure(amplifyConfig, { ssr: true });

/** Parse Cognito/Amplify errors that may be raw JSON or Error objects so we never show raw JSON in the UI. */
function parseCognitoError(err: any): { type?: string; message: string } {
  const raw = err?.message ?? err?.error ?? String(err ?? '');
  if (typeof raw !== 'string') return { message: 'Something went wrong' };
  try {
    const parsed = JSON.parse(raw) as { __type?: string; message?: string };
    if (parsed && typeof parsed.message === 'string') {
      return { type: parsed.__type, message: parsed.message };
    }
  } catch {
    // not JSON, use as message
  }
  return { type: err?.name, message: raw };
}

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
  resendVerificationCode: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getSignInStepMessage(step?: string) {
  switch (step) {
    case 'CONFIRM_SIGN_UP':
      return 'Please verify your email first.';
    case 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED':
      return 'A new password is required before you can sign in.';
    case 'CONFIRM_SIGN_IN_WITH_SMS_CODE':
    case 'CONFIRM_SIGN_IN_WITH_EMAIL_CODE':
    case 'CONFIRM_SIGN_IN_WITH_TOTP_CODE':
      return 'Additional sign-in verification is required for this account.';
    case 'RESET_PASSWORD':
      return 'Password reset is required before you can sign in.';
    default:
      return 'Sign-in is not complete yet. Please complete the next authentication step.';
  }
}

async function syncUserProfile(user: User) {
  if (!user.userId || !user.email) return;
  try {
    await upsertUserProfile(user);
  } catch (err) {
    // Keep auth flow resilient if API is unavailable.
    console.warn('User profile sync failed:', err);
  }
}

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
      let email =
        currentUser.signInDetails?.loginId?.trim() ||
        (currentUser.username?.includes('@') ? currentUser.username : '') ||
        '';
      let name: string | undefined =
        currentUser.username?.includes('@') ? undefined : currentUser.username;

      try {
        const attrs = await fetchUserAttributes();
        if (attrs?.email) email = attrs.email;
        if (attrs?.name) name = attrs.name;
      } catch {
        // Attributes unavailable; keep values from getCurrentUser
      }

      const resolvedUser = {
        userId: currentUser.userId,
        email,
        name: name || undefined,
      };
      setUser(resolvedUser);
      await syncUserProfile(resolvedUser);
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
      const signInResult = await signIn({ username: email, password });
      if (!signInResult.isSignedIn) {
        const message = getSignInStepMessage(signInResult.nextStep?.signInStep);
        setError(message);
        throw new Error(message);
      }
      await new Promise((r) => setTimeout(r, 0));
      await checkUser();
    } catch (err: any) {
      const { type: errType, message: errMsg } = parseCognitoError(err);
      const isUnconfirmed = errType === 'UserNotConfirmedException' || errMsg?.includes('User is not confirmed');
      const errorMessage = isUnconfirmed
        ? 'Please verify your email first'
        : errType === 'NotAuthorizedException'
        ? 'Incorrect email or password'
        : errMsg || 'Login failed';
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
      await signUp({
        username: email,
        password,
        options: {
          userAttributes: { email, name },
          autoSignIn: true,
        },
      });
      setError(null);
    } catch (err: any) {
      const { type: errType, message: errMsg } = parseCognitoError(err);
      const errorMessage = errType === 'UsernameExistsException'
        ? 'Account already exists'
        : errMsg || 'Signup failed';
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
      await confirmSignUp({ username: email, confirmationCode: code });
      setError(null);
    } catch (err: any) {
      const { type: errType, message: errMsg } = parseCognitoError(err);
      const errorMessage = errType === 'CodeMismatchException'
        ? 'Invalid code'
        : errMsg || 'Verification failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resendVerificationCode = async (email: string) => {
    try {
      setError(null);
      await resendSignUpCode({ username: email });
    } catch (err: any) {
      const { type: errType, message: errMsg } = parseCognitoError(err);
      const errorMessage = errType === 'LimitExceededException'
        ? 'Too many attempts. Please wait a minute before trying again.'
        : errMsg || 'Failed to resend verification code';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await signOut();
      setUser(null);
      setError(null);
    } catch (err: any) {
      setError('Logout failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  const value = {
    user,
    loading,
    error,
    login,
    signup,
    confirmSignup,
    resendVerificationCode,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
