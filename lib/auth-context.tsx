'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Amplify } from 'aws-amplify';
import { signIn, signUp, signOut, confirmSignUp, getCurrentUser } from 'aws-amplify/auth';
import { amplifyConfig } from './amplify-config';

Amplify.configure(amplifyConfig, { ssr: true });

function parseCognitoError(err: any): { type?: string; message: string } {
const raw = err?.message ?? err?.error ?? String(err ?? '');
if (typeof raw !== 'string') return { message: 'Something went wrong' };

try {
const parsed = JSON.parse(raw) as { __type?: string; message?: string };
if (parsed && typeof parsed.message === 'string') {
return { type: parsed.__type, message: parsed.message };
}
} catch {}

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
logout: () => Promise<void>;
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
const currentUser = await getCurrentUser();

```
  setUser({
    userId: currentUser.userId,
    email: currentUser.signInDetails?.loginId || '',
    name: currentUser.username,
  });

  setError(null);
} catch {
  setUser(null);
} finally {
  setLoading(false);
}
```

};

const login = async (email: string, password: string) => {
try {
setLoading(true);
setError(null);

```
  await signIn({ username: email, password });

  await new Promise((r) => setTimeout(r, 0));
  await checkUser();
} catch (err: any) {
  const { type: errType, message: errMsg } = parseCognitoError(err);

  const isUnconfirmed =
    errType === 'UserNotConfirmedException' ||
    errMsg?.includes('User is not confirmed');

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
```

};

const signup = async (email: string, password: string, name: string) => {
try {
setLoading(true);
setError(null);

```
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

  const errorMessage =
    errType === 'UsernameExistsException'
      ? 'Account already exists'
      : errMsg || 'Signup failed';

  setError(errorMessage);
  throw new Error(errorMessage);
} finally {
  setLoading(false);
}
```

};

const confirmSignup = async (email: string, code: string) => {
try {
setLoading(true);
setError(null);

```
  await confirmSignUp({ username: email, confirmationCode: code });

  const currentUser = await getCurrentUser();

  // Write user to DynamoDB
  await fetch(
    "https://9bxi8jswh3.execute-api.us-east-1.amazonaws.com/prod/assignments/user",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userID: currentUser.userId,
        email: email,
        name: currentUser.username || email,
      }),
    }
  );

  setError(null);
} catch (err: any) {
  const { type: errType, message: errMsg } = parseCognitoError(err);

  const errorMessage =
    errType === 'CodeMismatchException'
      ? 'Invalid code'
      : errMsg || 'Verification failed';

  setError(errorMessage);
  throw new Error(errorMessage);
} finally {
  setLoading(false);
}
```

};

const logout = async () => {
try {
setLoading(true);
await signOut();
setUser(null);
setError(null);
} catch {
setError('Logout failed');
throw new Error('Logout failed');
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

