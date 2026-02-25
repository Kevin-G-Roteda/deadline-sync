'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Target,
  LogOut,
  User as UserIcon,
  Mail,
  Lock
} from 'lucide-react';

function AuthForm() {
  const { login, signup, confirmSignup, error, loading, clearError } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'confirm'>('login');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    confirmationCode: '',
  });

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

  const switchMode = (newMode: 'login' | 'signup' | 'confirm') => {
    setMode(newMode);
    clearError();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
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
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="pl-10"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="pl-10"
                    required
                    disabled={loading}
                  />
                </div>
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

              <div className="text-center text-sm">
                <span className="text-muted-foreground">Don&apos;t have an account? </span>
                <Button
                  variant="link"
                  className="p-0 h-auto text-teal-600 hover:text-teal-700"
                  onClick={() => switchMode('signup')}
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
                <div className="relative">
                  <UserIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="pl-10"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="pl-10"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Min 8 characters"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="pl-10"
                    required
                    disabled={loading}
                    minLength={8}
                  />
                </div>
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
                  onClick={() => switchMode('login')}
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

export default function Dashboard() {
  const { user, loading: authLoading, logout } = useAuth();

  if (authLoading) {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-teal-600 flex items-center justify-center">
              <Target className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900">DeadlineSync</h1>
              <p className="text-slate-600">Welcome, {user.name || user.email}!</p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <UserIcon className="h-4 w-4" />
                {user.email}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Alert className="mb-6 border-teal-200 bg-teal-50">
          <CheckCircle2 className="h-4 w-4 text-teal-600" />
          <AlertTitle className="text-teal-900">Authenticated Session Active</AlertTitle>
          <AlertDescription className="text-teal-700">
            Frontend deployed - Authentication working - Ready for backend
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>DeadlineSync Week 6 Complete</CardTitle>
            <CardDescription>
              Frontend deployed with authentication
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">What is Working:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Next.js 14 frontend with TypeScript</li>
                  <li>shadcn/ui components</li>
                  <li>AWS Amplify authentication ready</li>
                  <li>User login and signup flow</li>
                  <li>Responsive design</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Next Steps:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Set up AWS Cognito</li>
                  <li>Deploy Lambda functions</li>
                  <li>Connect to DynamoDB</li>
                  <li>Add assignment CRUD</li>
                  <li>Build calendar view</li>
                </ul>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-3">
                  Logged in as: <strong>{user.email}</strong>
                </p>
                <Button onClick={logout} variant="outline" className="gap-2">
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
