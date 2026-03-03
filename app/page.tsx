'use client';

import * as React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, Loader2, Target, Mail, User, Lock } from 'lucide-react';

function AuthForm() {
  const { login, signup, confirmSignup, error, loading, clearError } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'confirm'>('login');
  const [formData, setFormData] = useState({ 
    email: '', 
    password: '', 
    name: '', 
    confirmationCode: '' 
  });

  React.useEffect(() => {
    if (error && (error.includes('verify your email') || error.includes('User is not confirmed') || error.includes('not confirmed'))) {
      setMode('confirm');
    }
  }, [error]);

  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(formData.email, formData.password);
      router.replace('/dashboard');
    } catch (err: any) {
      const isUnconfirmed = err?.message?.includes('verify your email') || err?.message?.includes('User is not confirmed');
      if (isUnconfirmed) setMode('confirm');
      console.error(err);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signup(formData.email, formData.password, formData.name);
      setMode('confirm');
      clearError();
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await confirmSignup(formData.email, formData.confirmationCode);
      await login(formData.email, formData.password);
      router.replace('/dashboard');
    } catch (err) {
      console.error(err);
    }
  };

  const inputIconClass = 'absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400';
  const inputWithIconClass = 'pl-10';

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100/80 p-4">
      <Card className="w-full max-w-md rounded-2xl border-0 bg-white shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-teal-600 flex items-center justify-center shrink-0">
              <Target className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-semibold text-slate-900">DeadlineSync</CardTitle>
              <CardDescription className="text-slate-500">
                {mode === 'login' && 'Sign in to your account'}
                {mode === 'signup' && 'Create a new account'}
                {mode === 'confirm' && 'Verify your email'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-600">Email</Label>
                <div className="relative">
                  <Mail className={inputIconClass} />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={inputWithIconClass}
                    required
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-600">Password</Label>
                <div className="relative">
                  <Lock className={inputIconClass} />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={inputWithIconClass}
                    required
                    disabled={loading}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full h-11 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
              <div className="text-center text-sm">
                <span className="text-slate-600">Don&apos;t have an account? </span>
                <Button
                  variant="link"
                  className="p-0 h-auto text-teal-600 hover:text-teal-700 font-medium"
                  onClick={() => setMode('signup')}
                  type="button"
                >
                  Sign up
                </Button>
              </div>
            </form>
          )}

          {mode === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-600">Full Name</Label>
                <div className="relative">
                  <User className={inputIconClass} />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Anthony Bartlett"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={inputWithIconClass}
                    required
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email" className="text-slate-600">Email</Label>
                <div className="relative">
                  <Mail className={inputIconClass} />
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="bartlett.anthony@gmail.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={inputWithIconClass}
                    required
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password" className="text-slate-600">Password</Label>
                <div className="relative">
                  <Lock className={inputIconClass} />
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Min 8 characters"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={inputWithIconClass}
                    required
                    disabled={loading}
                    minLength={8}
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Min 8 characters with uppercase, lowercase, and numbers
                </p>
              </div>
              <Button type="submit" className="w-full h-11 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
              <div className="text-center text-sm">
                <span className="text-slate-600">Already have an account? </span>
                <Button
                  variant="link"
                  className="p-0 h-auto text-teal-600 hover:text-teal-700 font-medium"
                  onClick={() => setMode('login')}
                  type="button"
                >
                  Sign in
                </Button>
              </div>
            </form>
          )}

          {mode === 'confirm' && (
            <form onSubmit={handleConfirm} className="space-y-4">
              <Alert className="bg-blue-50 border-blue-200">
                <Mail className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  {formData.email
                    ? `Enter the 6-digit code we sent to ${formData.email}`
                    : 'Enter the 6-digit verification code from your email'}
                </AlertDescription>
              </Alert>
              {!formData.email && (
                <div className="space-y-2">
                  <Label htmlFor="confirm-email" className="text-slate-600">Email</Label>
                  <Input
                    id="confirm-email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="code" className="text-slate-600">Verification Code</Label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  value={formData.confirmationCode}
                  onChange={(e) => setFormData({ ...formData, confirmationCode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                  required
                  disabled={loading}
                  maxLength={6}
                />
              </div>
              <Button type="submit" className="w-full h-11 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Verify and Sign In
                  </>
                )}
              </Button>
              <div className="text-center text-sm space-y-1">
                <p>
                  <span className="text-slate-600">Wrong account? </span>
                  <Button
                    variant="link"
                    className="p-0 h-auto text-teal-600 hover:text-teal-700 font-medium"
                    onClick={() => { setMode('login'); clearError(); }}
                    type="button"
                  >
                    Back to sign in
                  </Button>
                </p>
                <p>
                  <span className="text-slate-600">Opened the link from your email? </span>
                  <Link href={formData.email ? `/verify?email=${encodeURIComponent(formData.email)}` : '/verify'} className="text-teal-600 hover:text-teal-700 font-medium underline underline-offset-2">
                    Go to verify page
                  </Link>
                </p>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Page() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (mounted && !loading && user) {
      router.replace('/dashboard');
    }
  }, [mounted, loading, user, router]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (loading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return <AuthForm />;
}

