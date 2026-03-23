'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, Loader2, Target, ClipboardList, Calendar, LogOut, Cloud, Database, Link2 } from 'lucide-react';
import { listAssignments, type Assignment } from '@/lib/assignments-api';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
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

  React.useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [loading, user, router]);

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto max-w-4xl px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-slate-900 font-semibold">
            <div className="h-8 w-8 rounded-lg bg-teal-600 flex items-center justify-center">
              <Target className="h-4 w-4 text-white" />
            </div>
            <span>DeadlineSync</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600 truncate max-w-[180px]" title={user.email}>
              {user.email}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="gap-2 text-slate-600 border-slate-200 hover:bg-slate-50"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl p-6 sm:p-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Welcome to DeadlineSync</CardTitle>
            <CardDescription>Hi {user.name || user.email}, this dashboard is ready for your Canvas and AWS integrations.</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="border-teal-200 bg-teal-50">
              <CheckCircle2 className="h-4 w-4 text-teal-600" />
              <AlertTitle className="text-teal-900">Authenticated and synced</AlertTitle>
              <AlertDescription className="text-teal-700">
                Your Cognito account is active and the app now attempts to sync your user profile to the `Users` DynamoDB table on login.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-teal-600" />
              Integrations Roadmap
            </CardTitle>
            <CardDescription>Scaffold for upcoming capstone integrations.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="font-medium text-slate-900 flex items-center gap-2"><Link2 className="h-4 w-4 text-slate-500" />Canvas API</p>
              <p className="text-sm text-slate-600 mt-1">Add a secure Canvas token input and run import/sync jobs for deadlines.</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="font-medium text-slate-900 flex items-center gap-2"><Cloud className="h-4 w-4 text-slate-500" />S3 Storage</p>
              <p className="text-sm text-slate-600 mt-1">Store supporting files like syllabi and assignment attachments.</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="font-medium text-slate-900 flex items-center gap-2"><Database className="h-4 w-4 text-slate-500" />DynamoDB</p>
              <p className="text-sm text-slate-600 mt-1">Track users, imports, assignments, and sync metadata.</p>
            </div>
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
      </main>
    </div>
  );
}
