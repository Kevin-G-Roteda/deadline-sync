'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, Loader2, Target, Mail } from 'lucide-react';

function AuthForm() {
  const { login, signup, confirmSignup, error, loading } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'confirm'>('login');
  const [formData, setFormData] = useState({ email: '', password: '', name: '', confirmationCode: '' });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await login(formData.email, formData.password); } catch (err) { console.error(err); }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await signup(formData.email, formData.password, formData.name); setMode('confirm'); } catch (err) { console.error(err); }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await confirmSignup(formData.email, formData.confirmationCode); await login(formData.email, formData.password); } catch (err) { console.error(err); }
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
              <CardDescription>{mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Verify email'}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && <Alert variant="destructive" className="mb-4"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div><Label>Email</Label><Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required /></div>
              <div><Label>Password</Label><Input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required /></div>
              <Button type="submit" className="w-full bg-teal-600" disabled={loading}>{loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</> : 'Sign In'}</Button>
              <div className="text-center"><Button variant="link" onClick={() => setMode('signup')} type="button">Sign up</Button></div>
            </form>
          )}
          {mode === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-4">
              <div><Label>Name</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required /></div>
              <div><Label>Email</Label><Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required /></div>
              <div><Label>Password</Label><Input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required minLength={8} /></div>
              <Button type="submit" className="w-full bg-teal-600" disabled={loading}>{loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : 'Create Account'}</Button>
              <div className="text-center"><Button variant="link" onClick={() => setMode('login')} type="button">Sign in</Button></div>
            </form>
          )}
          {mode === 'confirm' && (
            <form onSubmit={handleConfirm} className="space-y-4">
              <Alert><Mail className="h-4 w-4" /><AlertDescription>Code sent to {formData.email}</AlertDescription></Alert>
              <div><Label>Verification Code</Label><Input value={formData.confirmationCode} onChange={(e) => setFormData({ ...formData, confirmationCode: e.target.value })} required maxLength={6} /></div>
              <Button type="submit" className="w-full bg-teal-600" disabled={loading}>{loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying...</> : 'Verify Email'}</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Dashboard() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-teal-600" /></div>;
  if (!user) return <AuthForm />;
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <Card><CardHeader><CardTitle>🎉 DeadlineSync Week 6 Complete!</CardTitle><CardDescription>Welcome {user.email}!</CardDescription></CardHeader>
      <CardContent><Alert className="border-teal-200 bg-teal-50"><CheckCircle2 className="h-4 w-4 text-teal-600" /><AlertTitle>Authenticated</AlertTitle><AlertDescription>Frontend deployed - Ready for Week 7!</AlertDescription></Alert></CardContent></Card>
    </div>
  );
}
```

---

### **Step 4: Commit**
```
1. Scroll down to bottom
2. In "Commit message" box, type: feat: Add DeadlineSync authentication UI
3. Click: Commit changes
```

---

### **Step 5: Wait for Vercel**
```
Vercel will auto-deploy in ~2 minutes
Watch: https://vercel.com/dashboard
```

---

### **Step 6: Check Live Site**
```
1. Wait 2 minutes
2. Open: https://deadline-sync-mu.vercel.app
3. Hard refresh: Ctrl+Shift+R
4. Should see DeadlineSync! 🎉
