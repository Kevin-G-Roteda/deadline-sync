'use client';

import * as React from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, Loader2, Target, Mail, LogOut } from 'lucide-react';

function AuthForm() {
  const { login, signup, confirmSignup, resendVerificationCode, error, loading, clearError } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'confirm'>('login');
  const [formData, setFormData] = useState({ 
    email: '', 
    password: '', 
    name: '', 
    confirmationCode: '' 
  });
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [loginResendMessage, setLoginResendMessage] = useState<string | null>(null);
  const [loginResending, setLoginResending] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginResendMessage(null);
    try {
      await login(formData.email, formData.password);
    } catch (err) {
      console.error(err);
    }
  };

  const handleResendFromLogin = async () => {
    const email = formData.email.trim();
    if (!email) return;
    setLoginResendMessage(null);
    clearError();
    try {
      setLoginResending(true);
      await resendVerificationCode(email);
      setLoginResendMessage(
        `We sent a new message to ${email} with your verification code. The same email also includes a link to confirm your account (or use Verify below).`
      );
    } catch {
      // Error shown via auth context
    } finally {
      setLoginResending(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signup(formData.email, formData.password, formData.name);
      setMode('confirm');
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await confirmSignup(formData.email, formData.confirmationCode);
      await login(formData.email, formData.password);
    } catch (err) {
      console.error(err);
    }
  };

  const handleResendCode = async () => {
    const email = formData.email.trim();
    if (!email) return;
    setResendMessage(null);
    try {
      setResending(true);
      await resendVerificationCode(email);
      setResendMessage(`A new verification code was sent to ${email}.`);
    } catch (err) {
      console.error(err);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-lg bg-teal-600 flex items-center justify-center">
              <Target className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl">DeadlineSync</CardTitle>
              <CardDescription>
                {mode === 'login' && 'Sign in to your account'}
                {mode === 'signup' && 'Create a new account'}
                {mode === 'confirm' && 'Verify your email'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
              {loginResendMessage && (
                <Alert className="bg-emerald-50 border-emerald-200">
                  <AlertDescription className="text-emerald-800">{loginResendMessage}</AlertDescription>
                </Alert>
              )}
              <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 space-y-3">
                <p className="text-sm text-slate-600">
                  Haven&apos;t verified yet? Resend the email from Cognito — it contains your <strong className="font-medium text-slate-800">verification code</strong> and a <strong className="font-medium text-slate-800">confirmation link</strong>.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-slate-300"
                  onClick={handleResendFromLogin}
                  disabled={loading || loginResending || !formData.email.trim()}
                >
                  {loginResending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending verification email...
                    </>
                  ) : (
                    'Resend verification email'
                  )}
                </Button>
                <p className="text-center text-sm text-slate-600">
                  <Link
                    href={formData.email.trim() ? `/verify?email=${encodeURIComponent(formData.email.trim())}` : '/verify'}
                    className="text-teal-600 hover:text-teal-700 font-medium underline underline-offset-2"
                  >
                    Open verify page with code or password
                  </Link>
                </p>
              </div>
              <div className="text-center text-sm">
                <span className="text-muted-foreground">Don&apos;t have an account? </span>
                <Button
                  variant="link"
                  className="p-0 h-auto text-teal-600 hover:text-teal-700"
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
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  disabled={loading}
                  minLength={8}
                />
                <p className="text-xs text-muted-foreground">
                  Min 8 characters with uppercase, lowercase, and numbers
                </p>
              </div>
              <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700" disabled={loading}>
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
                <span className="text-muted-foreground">Already have an account? </span>
                <Button
                  variant="link"
                  className="p-0 h-auto text-teal-600 hover:text-teal-700"
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
                  Verification code sent to {formData.email}
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label htmlFor="code">Verification Code</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="123456"
                  value={formData.confirmationCode}
                  onChange={(e) => setFormData({ ...formData, confirmationCode: e.target.value })}
                  required
                  disabled={loading}
                  maxLength={6}
                />
              </div>
              {resendMessage && (
                <Alert className="bg-emerald-50 border-emerald-200">
                  <AlertDescription className="text-emerald-800">{resendMessage}</AlertDescription>
                </Alert>
              )}
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleResendCode}
                disabled={loading || resending || !formData.email.trim()}
              >
                {resending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Resend verification code'
                )}
              </Button>
              <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify Email'
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardContent() {
  const { user, loading, logout } = useAuth();
  const [loggingOut, setLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="container mx-auto max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Welcome to DeadlineSync</CardTitle>
            <CardDescription>Welcome back, {user.email}!</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4 border-teal-200 bg-teal-50">
              <CheckCircle2 className="h-4 w-4 text-teal-600" />
              <AlertTitle className="text-teal-900">Authenticated Session Active</AlertTitle>
              <AlertDescription className="text-teal-700">
                Dashboard scaffold is ready for Canvas API, S3, and assignment sync integrations.
              </AlertDescription>
            </Alert>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleLogout}
                disabled={loggingOut}
                className="gap-2"
              >
                {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                {loggingOut ? 'Signing out...' : 'Sign out'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return <DashboardContent />;
}
