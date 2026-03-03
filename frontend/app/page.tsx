'use client';

import * as React from 'react';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, Loader2, Target, Mail, User, Lock, Calendar, ClipboardList } from 'lucide-react';
import { listAssignments, type Assignment } from '../lib/assignments-api';

function AuthForm() {
  const { login, signup, confirmSignup, error, loading, clearError } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'confirm'>('login');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    confirmationCode: '',
  });

  // When login says "verify your email", show the code entry form
  React.useEffect(() => {
    if (error === 'Please verify your email first') {
      setMode('confirm');
    }
  }, [error]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(formData.email, formData.password);
    } catch (err) {
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
                  'Verify Email'
                )}
              </Button>
              <div className="text-center text-sm">
                <span className="text-slate-600">Wrong account? </span>
                <Button
                  variant="link"
                  className="p-0 h-auto text-teal-600 hover:text-teal-700 font-medium"
                  onClick={() => { setMode('login'); clearError(); }}
                  type="button"
                >
                  Back to sign in
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardContent() {
  const { user, loading } = useAuth();
  const [assignments, setAssignments] = React.useState<Assignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = React.useState(true);
  const [assignmentsError, setAssignmentsError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setAssignmentsLoading(true);
    setAssignmentsError(null);
    listAssignments()
      .then((data) => {
        if (!cancelled) setAssignments(data.assignments || []);
      })
      .catch((err) => {
        if (!cancelled) setAssignmentsError(err.message || 'Failed to load assignments');
      })
      .finally(() => {
        if (!cancelled) setAssignmentsLoading(false);
      });
    return () => { cancelled = true; };
  }, [user]);

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
      <div className="container mx-auto max-w-4xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">🎉 DeadlineSync Week 6 Complete!</CardTitle>
            <CardDescription>Welcome back, {user.email}!</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4 border-teal-200 bg-teal-50">
              <CheckCircle2 className="h-4 w-4 text-teal-600" />
              <AlertTitle className="text-teal-900">Authenticated Session Active</AlertTitle>
              <AlertDescription className="text-teal-700">
                Frontend deployed successfully!
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-6 w-6 text-teal-600" />
              Assignments
            </CardTitle>
            <CardDescription>
              Your assignments from the API (set NEXT_PUBLIC_API_URL and Cognito authorizer to load data).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {assignmentsLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
              </div>
            )}
            {!assignmentsLoading && assignmentsError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{assignmentsError}</AlertDescription>
              </Alert>
            )}
            {!assignmentsLoading && !assignmentsError && assignments.length === 0 && (
              <p className="text-slate-600 py-4">No assignments yet.</p>
            )}
            {!assignmentsLoading && !assignmentsError && assignments.length > 0 && (
              <ul className="space-y-3">
                {assignments.map((a) => (
                  <li key={a.assignmentId} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
                    <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900">{a.title}</p>
                      <p className="text-sm text-slate-500">
                        {a.courseId} · Due {a.dueDate}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function Page() {
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
