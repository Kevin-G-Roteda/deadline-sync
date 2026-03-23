'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2, Target, Mail, Lock } from 'lucide-react';

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, confirmSignup, resendVerificationCode, login, error, clearError } = useAuth();

  const emailFromUrl = searchParams.get('email') ?? '';
  const [email, setEmail] = React.useState('');
  const [code, setCode] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [resending, setResending] = React.useState(false);
  const [resendMessage, setResendMessage] = React.useState<string | null>(null);

  // Pre-fill email from URL when present (e.g. /verify?email=user@example.com)
  React.useEffect(() => {
    if (emailFromUrl) setEmail(prev => prev || emailFromUrl);
  }, [emailFromUrl]);

  // Redirect if already authenticated
  React.useEffect(() => {
    if (!authLoading && user) {
      router.replace('/dashboard');
    }
  }, [authLoading, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setSubmitting(true);
    try {
      await confirmSignup(email.trim(), code.trim());
      await login(email.trim(), password);
      router.replace('/dashboard');
    } catch {
      setSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) return;
    clearError();
    setResendMessage(null);
    setResending(true);
    try {
      await resendVerificationCode(normalizedEmail);
      setResendMessage(`A new verification code was sent to ${normalizedEmail}.`);
    } catch {
      // error is handled in auth context
    } finally {
      setResending(false);
    }
  };

  if (authLoading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

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
              <CardTitle className="text-2xl font-semibold text-slate-900">Verify your email</CardTitle>
              <CardDescription className="text-slate-500">
                Enter the 6-digit code we sent to your email, then sign in. Use this page if you opened the link from the email.
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="verify-email" className="text-slate-600">Email</Label>
              <div className="relative">
                <Mail className={inputIconClass} />
                <Input
                  id="verify-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputWithIconClass}
                  required
                  disabled={submitting}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="verify-code" className="text-slate-600">Verification code</Label>
              <Input
                id="verify-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                required
                disabled={submitting}
                className="text-center text-lg tracking-widest"
              />
              <p className="text-xs text-slate-500">Check your inbox for the 6-digit code from DeadlineSync.</p>
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
              disabled={submitting || resending || !email.trim()}
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

            <div className="space-y-2">
              <Label htmlFor="verify-password" className="text-slate-600">Password</Label>
              <div className="relative">
                <Lock className={inputIconClass} />
                <Input
                  id="verify-password"
                  type="password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputWithIconClass}
                  required
                  disabled={submitting}
                  autoComplete="current-password"
                />
              </div>
              <p className="text-xs text-slate-500">Enter the password you used when you signed up.</p>
            </div>

            <Button
              type="submit"
              className="w-full h-11 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify and sign in'
              )}
            </Button>

            <div className="text-center text-sm">
              <span className="text-slate-600">Already verified? </span>
              <Link
                href="/"
                className="text-teal-600 hover:text-teal-700 font-medium underline underline-offset-2"
              >
                Sign in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      }
    >
      <VerifyForm />
    </React.Suspense>
  );
}
