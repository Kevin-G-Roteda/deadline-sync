'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Target,
  Calendar,
  LogOut,
  Link2,
  ExternalLink,
  UploadCloud,
  Files,
  Sparkles,
  ArrowUpRight,
  BrainCircuit,
  ChevronDown,
  ChevronRight,
  Settings,
  Sun,
  Moon,
  CalendarDays,
  CircleHelp,
} from 'lucide-react';
import {
  createFileUpload,
  getCanvasRecommendations,
  getCanvasSettings,
  getFileViewUrl,
  importFromCanvas,
  listAssignments,
  listUserFiles,
  saveCanvasSettings,
  type Assignment,
  type CanvasSettings,
  type StoredFile,
  type StudyRecommendation,
} from '@/lib/assignments-api';

function formatDueDate(iso: string) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(d);
  } catch {
    return iso;
  }
}

function platformLabel(platform?: string) {
  if (!platform || platform === 'manual') return 'Manual';
  const p = platform.toLowerCase();
  if (p === 'canvas') return 'Canvas';
  return platform.charAt(0).toUpperCase() + platform.slice(1);
}

function formatShortDate(iso: string | null | undefined) {
  if (!iso) return 'Unknown';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(d);
  } catch {
    return iso;
  }
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(date);
}

function getTimeGreeting() {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone: 'America/New_York',
    }).format(new Date())
  );
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

function getCourseColor(courseId: string) {
  const palette = [
    'bg-sky-100 text-sky-800 border-sky-200',
    'bg-violet-100 text-violet-800 border-violet-200',
    'bg-emerald-100 text-emerald-800 border-emerald-200',
    'bg-amber-100 text-amber-800 border-amber-200',
    'bg-rose-100 text-rose-800 border-rose-200',
    'bg-cyan-100 text-cyan-800 border-cyan-200',
  ];
  let hash = 0;
  for (let i = 0; i < courseId.length; i += 1) hash = (hash << 5) - hash + courseId.charCodeAt(i);
  return palette[Math.abs(hash) % palette.length];
}

function formatDayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function isLikelyCompleted(assignment: Assignment) {
  const status = String(assignment.status || '').toLowerCase();
  const anyAssignment = assignment as Assignment & {
    grade?: number | null;
    submissionStatus?: string;
    submittedAt?: string | null;
    gradedAt?: string | null;
  };
  const submissionStatus = String(anyAssignment.submissionStatus || '').toLowerCase();
  const grade =
    typeof anyAssignment.grade === 'string'
      ? Number(anyAssignment.grade)
      : anyAssignment.grade;
  const hasGrade = typeof grade === 'number' && Number.isFinite(grade);
  return Boolean(
    assignment.completed ||
      status === 'completed' ||
      status === 'submitted' ||
      status === 'done' ||
      status === 'turned_in' ||
      submissionStatus === 'submitted' ||
      submissionStatus === 'graded' ||
      submissionStatus === 'turned_in' ||
      hasGrade ||
      anyAssignment.submittedAt ||
      anyAssignment.gradedAt
  );
}

function getAssignmentBuckets(assignments: Assignment[]) {
  const today = startOfToday();
  const nextWeekBoundary = new Date(today);
  nextWeekBoundary.setDate(today.getDate() + 7);
  const stalePastDueBoundary = new Date(today);
  stalePastDueBoundary.setDate(today.getDate() - 14);

  const visibleAssignments = assignments.filter((assignment) => {
    const dueDate = new Date(assignment.dueDate);
    if (Number.isNaN(dueDate.getTime())) return true;
    if (dueDate < new Date() && assignment.completed) return false;
    return true;
  });

  const currentWeek: Assignment[] = [];
  const getAhead: Assignment[] = [];
  const pastDue: Assignment[] = [];

  for (const assignment of visibleAssignments) {
    const dueDate = new Date(assignment.dueDate);

    if (Number.isNaN(dueDate.getTime())) {
      getAhead.push(assignment);
      continue;
    }

    if (dueDate < new Date()) {
      if (dueDate < stalePastDueBoundary) {
        continue;
      }
      if (!isLikelyCompleted(assignment)) {
        pastDue.push(assignment);
      }
      continue;
    }

    if (dueDate < nextWeekBoundary) {
      currentWeek.push(assignment);
      continue;
    }

    getAhead.push(assignment);
  }

  const byDueDate = (a: Assignment, b: Assignment) => String(a.dueDate).localeCompare(String(b.dueDate));

  return {
    currentWeek: currentWeek.sort(byDueDate),
    getAhead: getAhead.sort(byDueDate),
    pastDue: pastDue.sort(byDueDate),
    todayLabel: formatShortDate(today.toISOString()),
  };
}

function SectionEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-sm text-slate-600">
      <p className="font-medium text-slate-800">{title}</p>
      <p className="mt-1">{description}</p>
    </div>
  );
}

function AssignmentList({
  assignments,
  accentClass,
}: {
  assignments: Assignment[];
  accentClass: string;
}) {
  return (
    <div className="space-y-3">
      {assignments.map((assignment) => (
        <div
          key={assignment.assignmentId}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-semibold text-slate-900">{assignment.title}</p>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${accentClass}`}>
                  {platformLabel(assignment.platform)}
                </span>
                {assignment.completed ? (
                  <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                    Completed
                  </span>
                ) : null}
              </div>
              <p className="text-sm text-slate-600">{assignment.courseName || assignment.courseId}</p>
              {assignment.description ? (
                <p className="text-sm leading-6 text-slate-500">
                  {assignment.description.slice(0, 140)}
                  {assignment.description.length > 140 ? '…' : ''}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2 lg:items-end">
              <p className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                <Calendar className="h-4 w-4 text-slate-400" />
                {formatDueDate(assignment.dueDate)}
              </p>
              {assignment.sourceUrl ? (
                <Button variant="outline" size="sm" className="gap-2" asChild>
                  <a href={assignment.sourceUrl} target="_blank" rel="noopener noreferrer">
                    <ArrowUpRight className="h-4 w-4" />
                    Open source
                  </a>
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [assignments, setAssignments] = React.useState<Assignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = React.useState(true);
  const [assignmentsError, setAssignmentsError] = React.useState<string | null>(null);
  const [canvasBusy, setCanvasBusy] = React.useState(false);
  const [canvasNotice, setCanvasNotice] = React.useState<string | null>(null);
  const [canvasError, setCanvasError] = React.useState<string | null>(null);
  const [canvasSettings, setCanvasSettings] = React.useState<CanvasSettings | null>(null);
  const [canvasSettingsLoading, setCanvasSettingsLoading] = React.useState(true);
  const [canvasDomainInput, setCanvasDomainInput] = React.useState('');
  const [canvasTokenInput, setCanvasTokenInput] = React.useState('');
  const [canvasSaveBusy, setCanvasSaveBusy] = React.useState(false);
  const [recommendations, setRecommendations] = React.useState<StudyRecommendation[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = React.useState(true);
  const [recommendationsError, setRecommendationsError] = React.useState<string | null>(null);
  const [recommendationsWarnings, setRecommendationsWarnings] = React.useState<string[]>([]);
  const [files, setFiles] = React.useState<StoredFile[]>([]);
  const [filesLoading, setFilesLoading] = React.useState(true);
  const [filesError, setFilesError] = React.useState<string | null>(null);
  const [uploadBusy, setUploadBusy] = React.useState(false);
  const [uploadNotice, setUploadNotice] = React.useState<string | null>(null);
  const [isDraggingFiles, setIsDraggingFiles] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<StoredFile | null>(null);
  const [selectedFileUrl, setSelectedFileUrl] = React.useState<string | null>(null);
  const [previewBusy, setPreviewBusy] = React.useState(false);
  const [activePage, setActivePage] = React.useState<'main' | 'files' | 'calendar'>('main');
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [appearance, setAppearance] = React.useState<'light' | 'dark'>('light');
  const [fontScale, setFontScale] = React.useState(1);
  const [helpMessage, setHelpMessage] = React.useState('');
  const [sectionOpen, setSectionOpen] = React.useState({
    assignments: true,
    currentAssignments: true,
    getAhead: true,
    pastDue: true,
    recommendations: true,
    files: true,
    canvas: true,
  });
  const [calendarMonth, setCalendarMonth] = React.useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedCourseId, setSelectedCourseId] = React.useState<string>('all');
  const [scrollDepth, setScrollDepth] = React.useState(0);

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
    if (!user) return;
    let cancelled = false;

    setCanvasSettingsLoading(true);
    getCanvasSettings()
      .then((settings) => {
        if (cancelled) return;
        setCanvasSettings(settings);
        setCanvasDomainInput(settings.canvasDomain || '');
      })
      .catch((err) => {
        if (!cancelled) {
          setCanvasError(err.message || 'Failed to load Canvas settings');
        }
      })
      .finally(() => {
        if (!cancelled) setCanvasSettingsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const refreshFiles = React.useCallback(async () => {
    setFilesLoading(true);
    setFilesError(null);
    try {
      const data = await listUserFiles();
      setFiles(data.files || []);
    } catch (err) {
      setFilesError(err instanceof Error ? err.message : String(err));
    } finally {
      setFilesLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!user) return;
    void refreshFiles();
  }, [user, refreshFiles]);

  const refreshRecommendations = React.useCallback(async () => {
    setRecommendationsLoading(true);
    setRecommendationsError(null);

    try {
      const data = await getCanvasRecommendations();
      setRecommendations(data.recommendations || []);
      setRecommendationsWarnings(data.warnings || []);
    } catch (err) {
      setRecommendations([]);
      setRecommendationsWarnings([]);
      setRecommendationsError(err instanceof Error ? err.message : String(err));
    } finally {
      setRecommendationsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!user) return;
    void refreshRecommendations();
  }, [user, refreshRecommendations]);

  React.useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [loading, user, router]);

  React.useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || 0;
      const progress = Math.min(y / 1400, 1);
      setScrollDepth(progress);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  const handleCanvasImport = async () => {
    setCanvasError(null);
    setCanvasNotice(null);
    setCanvasBusy(true);
    try {
      const result = await importFromCanvas();
      const extra =
        result.skippedNoDueDate && result.skippedNoDueDate > 0
          ? ` (${result.skippedNoDueDate} Canvas item(s) had no due date and were skipped.)`
          : '';
      setCanvasNotice(`${result.message}${extra}`);
      const data = await listAssignments();
      setAssignments(data.assignments || []);
      await refreshRecommendations();
    } catch (e) {
      setCanvasError(e instanceof Error ? e.message : String(e));
    } finally {
      setCanvasBusy(false);
    }
  };

  const handleCanvasSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setCanvasError(null);
    setCanvasNotice(null);
    setCanvasSaveBusy(true);

    try {
      const settings = await saveCanvasSettings({
        canvasToken: canvasTokenInput,
        canvasDomain: canvasDomainInput,
      });
      setCanvasSettings(settings);
      setCanvasTokenInput('');
      setCanvasNotice('Canvas token saved for your account. Future imports will use your personal Canvas connection.');
      await refreshRecommendations();
    } catch (error) {
      setCanvasError(error instanceof Error ? error.message : String(error));
    } finally {
      setCanvasSaveBusy(false);
    }
  };

  const handleDroppedFiles = async (droppedFiles: FileList | null) => {
    if (!droppedFiles?.length) return;

    setUploadBusy(true);
    setUploadNotice(null);
    setFilesError(null);

    try {
      for (const file of Array.from(droppedFiles)) {
        const { uploadUrl } = await createFileUpload({
          fileName: file.name,
          contentType: file.type || 'application/octet-stream',
        });

        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
          },
          body: file,
        });

        if (!uploadResponse.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }
      }

      await refreshFiles();
      setUploadNotice(
        droppedFiles.length === 1
          ? `${droppedFiles[0].name} uploaded successfully.`
          : `${droppedFiles.length} files uploaded successfully.`
      );
    } catch (error) {
      setFilesError(error instanceof Error ? error.message : String(error));
    } finally {
      setUploadBusy(false);
      setIsDraggingFiles(false);
    }
  };

  const handleOpenFile = async (file: StoredFile) => {
    setSelectedFile(file);
    setSelectedFileUrl(null);
    setPreviewBusy(true);

    try {
      const result = await getFileViewUrl(file.key);
      setSelectedFileUrl(result.url);
    } catch (error) {
      setFilesError(error instanceof Error ? error.message : String(error));
    } finally {
      setPreviewBusy(false);
    }
  };

  const assignmentBuckets = React.useMemo(() => getAssignmentBuckets(assignments), [assignments]);
  const greeting = React.useMemo(() => getTimeGreeting(), []);
  const monthAssignments = React.useMemo(() => {
    return assignments.filter((assignment) => {
      const date = new Date(assignment.dueDate);
      return (
        !Number.isNaN(date.getTime()) &&
        date.getMonth() === calendarMonth.getMonth() &&
        date.getFullYear() === calendarMonth.getFullYear()
      );
    });
  }, [assignments, calendarMonth]);
  const calendarGridDays = React.useMemo(() => {
    const firstOfMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const startOffset = firstOfMonth.getDay();
    const firstVisibleDay = new Date(firstOfMonth);
    firstVisibleDay.setDate(firstOfMonth.getDate() - startOffset);

    return Array.from({ length: 35 }, (_, index) => {
      const date = new Date(firstVisibleDay);
      date.setDate(firstVisibleDay.getDate() + index);
      return date;
    });
  }, [calendarMonth]);
  const assignmentsByDay = React.useMemo(() => {
    const map = new Map<string, Assignment[]>();
    for (const assignment of monthAssignments) {
      const dueDate = new Date(assignment.dueDate);
      if (Number.isNaN(dueDate.getTime())) continue;
      const key = formatDayKey(dueDate);
      const current = map.get(key) || [];
      current.push(assignment);
      map.set(key, current);
    }
    return map;
  }, [monthAssignments]);
  const courseOptions = React.useMemo(() => {
    const map = new Map<string, string>();
    assignments.forEach((item) => map.set(item.courseId, item.courseName || item.courseId));
    return Array.from(map.entries()).map(([courseId, courseName]) => ({ courseId, courseName }));
  }, [assignments]);
  const filteredFiles = React.useMemo(() => {
    if (selectedCourseId === 'all') return files;
    return files.filter((file) => {
      const lower = file.name.toLowerCase();
      const match = courseOptions.find((course) => course.courseId === selectedCourseId);
      if (!match) return false;
      return (
        lower.includes(match.courseName.toLowerCase()) ||
        lower.includes(match.courseId.toLowerCase())
      );
    });
  }, [files, selectedCourseId, courseOptions]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div
      className={`dashboard-shell min-h-screen ${
        appearance === 'dark'
          ? 'dashboard-theme-dark text-slate-100'
          : 'dashboard-theme-light text-slate-900'
      }`}
      style={
        {
          fontSize: `${fontScale}rem`,
          '--scroll-glow': (0.2 + scrollDepth * 0.55).toFixed(3),
        } as React.CSSProperties
      }
    >
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className={`dashboard-blob dashboard-blob-a ${appearance === 'dark' ? 'opacity-70' : 'opacity-80'}`}
          style={{ transform: `translate3d(0, ${-24 - scrollDepth * 48}px, 0)` }}
        />
        <div
          className={`dashboard-blob dashboard-blob-b ${appearance === 'dark' ? 'opacity-60' : 'opacity-70'}`}
          style={{ transform: `translate3d(0, ${-18 + scrollDepth * 64}px, 0)` }}
        />
        <div
          className={`dashboard-blob dashboard-blob-c ${appearance === 'dark' ? 'opacity-50' : 'opacity-65'}`}
          style={{ transform: `translate3d(0, ${-8 + scrollDepth * 30}px, 0)` }}
        />
        <div className="dashboard-vignette" />
      </div>
      <header
        className={`sticky top-0 z-10 border-b backdrop-blur-sm ${
          appearance === 'dark' ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-white/80'
        }`}
      >
        <div className="container mx-auto max-w-4xl px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            href="/dashboard"
            className={`flex items-center gap-2 font-semibold ${appearance === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}
          >
            <div className="h-8 w-8 rounded-lg bg-teal-600 flex items-center justify-center">
              <Target className="h-4 w-4 text-white" />
            </div>
            <span>DeadlineSync</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSettingsOpen((value) => !value)}
              className={`gap-2 ${
                appearance === 'dark' ? 'text-slate-900 bg-slate-100 border-slate-300 hover:bg-slate-200' : ''
              }`}
            >
              <Settings className="h-4 w-4" />
              Settings
            </Button>
            <span
              className={`max-w-[180px] truncate text-sm ${appearance === 'dark' ? 'text-slate-100' : 'text-slate-600'}`}
              title={user.email}
            >
              {user.email}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className={`gap-2 ${
                appearance === 'dark'
                  ? 'text-slate-900 bg-slate-100 border-slate-300 hover:bg-slate-200'
                  : 'text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto flex max-w-4xl flex-col gap-6 p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={activePage === 'main' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActivePage('main')}
            className={appearance === 'dark' && activePage !== 'main' ? 'text-slate-100 border-slate-600 hover:bg-slate-800' : ''}
          >
            Main Page
          </Button>
          <Button
            variant={activePage === 'files' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActivePage('files')}
            className={
              appearance === 'dark'
                ? activePage === 'files'
                  ? 'text-slate-900'
                  : 'text-slate-900 bg-slate-100 border-slate-300 hover:bg-slate-200'
                : ''
            }
          >
            Uploaded Files
          </Button>
          <Button
            variant={activePage === 'calendar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActivePage('calendar')}
            className={
              appearance === 'dark'
                ? activePage === 'calendar'
                  ? 'text-slate-900'
                  : 'text-slate-900 bg-slate-100 border-slate-300 hover:bg-slate-200'
                : ''
            }
          >
            Calendar
          </Button>
        </div>
        {settingsOpen ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-teal-600" />
                Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Button variant={appearance === 'light' ? 'default' : 'outline'} size="sm" onClick={() => setAppearance('light')}>
                  <Sun className="mr-2 h-4 w-4" />
                  Light
                </Button>
                <Button variant={appearance === 'dark' ? 'default' : 'outline'} size="sm" onClick={() => setAppearance('dark')}>
                  <Moon className="mr-2 h-4 w-4" />
                  Dark
                </Button>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Text size</label>
                <input
                  type="range"
                  min={0.9}
                  max={1.2}
                  step={0.05}
                  value={fontScale}
                  onChange={(event) => setFontScale(Number(event.target.value))}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <CircleHelp className="h-4 w-4" />
                  Help
                </label>
                <textarea
                  className="w-full rounded-md border border-slate-300 p-3 text-sm"
                  rows={4}
                  placeholder="Describe your issue and click Send help message."
                  value={helpMessage}
                  onChange={(event) => setHelpMessage(event.target.value)}
                />
                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    asChild
                  >
                    <a href={`mailto:kevingroteda@gmail.com?subject=DeadlineSync%20Help&body=${encodeURIComponent(helpMessage)}`}>
                      Send help message
                    </a>
                  </Button>
                  <p className="text-xs text-slate-500">Video help placeholders can be added here, including YouTube links.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}
        {activePage === 'main' ? (
        <Card className="overflow-hidden border-0 bg-slate-900 text-white shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-slate-900">{greeting}</CardTitle>
            <CardDescription className="text-slate-800">
              {user.name || user.email}, your planner is organized around what needs attention now, what you can start early, and the files tied to your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="border-teal-500/30 bg-teal-500/10 text-white">
              <CheckCircle2 className="h-4 w-4 text-teal-300" />
              <AlertTitle className="text-slate-900">Authenticated and synced</AlertTitle>
              <AlertDescription className="text-slate-800">
                Your Cognito account is active and the app now attempts to sync your user profile to the `Users` DynamoDB table on login.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
        ) : null}

        <div className={`grid gap-4 md:grid-cols-3 ${activePage === 'main' ? '' : 'hidden'}`}>
          <Card className="border-emerald-200 bg-emerald-50/70">
            <CardHeader className="pb-3">
              <CardDescription className="text-emerald-700">Due Within 7 Days</CardDescription>
              <CardTitle className="text-3xl text-emerald-900">{assignmentBuckets.currentWeek.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-sky-200 bg-sky-50/70">
            <CardHeader className="pb-3">
              <CardDescription className="text-sky-700">Get Ahead Queue</CardDescription>
              <CardTitle className="text-3xl text-sky-900">{assignmentBuckets.getAhead.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-rose-200 bg-rose-50/70">
            <CardHeader className="pb-3">
              <CardDescription className="text-rose-700">Past Due And Incomplete</CardDescription>
              <CardTitle className="text-3xl text-rose-900">{assignmentBuckets.pastDue.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card className={activePage === 'main' ? 'order-4' : 'hidden'}>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-teal-600" />
                Assignments Overview
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSectionOpen((prev) => ({ ...prev, assignments: !prev.assignments }))}
              >
                {sectionOpen.assignments ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </div>
            <CardDescription>
              Organized from today, {assignmentBuckets.todayLabel}. Past-due completed work is hidden from these sections so unfinished work stands out.
            </CardDescription>
          </CardHeader>
          <CardContent className={`space-y-6 ${sectionOpen.assignments ? '' : 'hidden'}`}>
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
              <SectionEmptyState
                title="No assignments yet"
                description="Import from Canvas or add assignments through the API and they will appear in the sections below."
              />
            )}
            {!assignmentsLoading && !assignmentsError && assignments.length > 0 && (
              <div className="space-y-6">
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Current Assignments</h3>
                      <p className="text-sm text-slate-500">Due within the next 7 days.</p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                      {assignmentBuckets.currentWeek.length}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSectionOpen((prev) => ({ ...prev, currentAssignments: !prev.currentAssignments }))}
                    >
                      {sectionOpen.currentAssignments ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                  </div>
                  {sectionOpen.currentAssignments && assignmentBuckets.currentWeek.length > 0 ? (
                    <AssignmentList assignments={assignmentBuckets.currentWeek} accentClass="bg-emerald-50 text-emerald-700" />
                  ) : sectionOpen.currentAssignments ? (
                    <SectionEmptyState
                      title="Nothing due this week"
                      description="You are clear for the next seven days."
                    />
                  ) : null}
                </section>

                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Get Ahead</h3>
                      <p className="text-sm text-slate-500">Assignments due next week and later.</p>
                    </div>
                    <span className="rounded-full bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700">
                      {assignmentBuckets.getAhead.length}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSectionOpen((prev) => ({ ...prev, getAhead: !prev.getAhead }))}
                    >
                      {sectionOpen.getAhead ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                  </div>
                  {sectionOpen.getAhead && assignmentBuckets.getAhead.length > 0 ? (
                    <AssignmentList assignments={assignmentBuckets.getAhead} accentClass="bg-sky-50 text-sky-700" />
                  ) : sectionOpen.getAhead ? (
                    <SectionEmptyState
                      title="No future assignments yet"
                      description="Once new work is imported or created, it will appear here so students can plan ahead."
                    />
                  ) : null}
                </section>

                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Past Due</h3>
                      <p className="text-sm text-slate-500">Only incomplete past-due assignments are shown.</p>
                    </div>
                    <span className="rounded-full bg-rose-50 px-3 py-1 text-sm font-medium text-rose-700">
                      {assignmentBuckets.pastDue.length}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSectionOpen((prev) => ({ ...prev, pastDue: !prev.pastDue }))}
                    >
                      {sectionOpen.pastDue ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                  </div>
                  {sectionOpen.pastDue && assignmentBuckets.pastDue.length > 0 ? (
                    <AssignmentList assignments={assignmentBuckets.pastDue} accentClass="bg-rose-50 text-rose-700" />
                  ) : sectionOpen.pastDue ? (
                    <SectionEmptyState
                      title="No overdue work"
                      description="Completed overdue assignments are hidden, and there are currently no incomplete past-due tasks."
                    />
                  ) : null}
                </section>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={activePage === 'main' ? '' : 'hidden'}>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-teal-600" />
                Canvas LMS
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSectionOpen((prev) => ({ ...prev, canvas: !prev.canvas }))}
              >
                {sectionOpen.canvas ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </div>
            <CardDescription>
              Each student can save their own Canvas personal access token and domain. Imports run server-side and only bring in that student&apos;s assignments.
            </CardDescription>
          </CardHeader>
          <CardContent className={`space-y-4 ${sectionOpen.canvas ? '' : 'hidden'}`}>
            {canvasError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{canvasError}</AlertDescription>
              </Alert>
            )}
            {canvasNotice && (
              <Alert className="border-emerald-200 bg-emerald-50">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <AlertDescription className="text-emerald-900">{canvasNotice}</AlertDescription>
              </Alert>
            )}
            <form className="grid gap-4 lg:grid-cols-[1.3fr_1fr_auto] lg:items-end" onSubmit={handleCanvasSave}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="canvas-token">
                  Canvas Access Token
                </label>
                <Input
                  id="canvas-token"
                  type="password"
                  value={canvasTokenInput}
                  onChange={(event) => setCanvasTokenInput(event.target.value)}
                  placeholder={canvasSettings?.canvasTokenConfigured ? 'Saved already. Paste a new token to replace it.' : 'Paste the student Canvas token'}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="canvas-domain">
                  School Canvas Domain
                </label>
                <Input
                  id="canvas-domain"
                  value={canvasDomainInput}
                  onChange={(event) => setCanvasDomainInput(event.target.value)}
                  placeholder="Examples: mdc.instructure.com, yourschool.instructure.com"
                  required
                />
              </div>
              <Button type="submit" className="bg-slate-900 text-white hover:bg-slate-800" disabled={canvasSaveBusy}>
                {canvasSaveBusy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving
                  </>
                ) : (
                  'Save token'
                )}
              </Button>
            </form>
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="font-medium text-slate-900">Canvas status</p>
                <p className="text-sm text-slate-600">
                  {canvasSettingsLoading
                    ? 'Checking saved token...'
                    : canvasSettings?.canvasTokenConfigured
                    ? `Personal token saved for ${canvasSettings.canvasDomain}.`
                    : 'No personal Canvas domain and token saved yet.'}
                </p>
                {canvasSettings?.updatedAt ? (
                  <p className="text-xs text-slate-500">Last updated {formatShortDate(canvasSettings.updatedAt)}</p>
                ) : null}
              </div>
              <Button
                type="button"
                className="bg-teal-600 hover:bg-teal-700 text-white"
                onClick={handleCanvasImport}
                disabled={canvasBusy || canvasSettingsLoading}
              >
                {canvasBusy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing from Canvas…
                  </>
                ) : (
                  'Import assignments from Canvas'
                )}
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              Students must enter both their school Canvas domain and their own Canvas token. Keep <code className="rounded bg-slate-100 px-1">NEXT_PUBLIC_API_URL</code> on Vercel for assignment sync.
            </p>
          </CardContent>
        </Card>

        <Card className={activePage === 'main' ? '' : 'hidden'}>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <BrainCircuit className="h-5 w-5 text-teal-600" />
                What To Work On First
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSectionOpen((prev) => ({ ...prev, recommendations: !prev.recommendations }))}
              >
                {sectionOpen.recommendations ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </div>
            <CardDescription>
              Separate from the assignment display, these recommendations use Canvas grading weight, points possible, and due date urgency to rank the work that should probably come first.
            </CardDescription>
          </CardHeader>
          <CardContent className={`space-y-4 ${sectionOpen.recommendations ? '' : 'hidden'}`}>
            {recommendationsError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{recommendationsError}</AlertDescription>
              </Alert>
            )}
            {recommendationsWarnings.length > 0 && (
              <Alert className="border-amber-200 bg-amber-50">
                <AlertDescription className="text-amber-900">
                  Some Canvas courses could not be analyzed completely, but the available recommendations are still shown.
                </AlertDescription>
              </Alert>
            )}
            {recommendationsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
              </div>
            ) : recommendations.length === 0 ? (
              <SectionEmptyState
                title="No study recommendations yet"
                description="Save your Canvas domain and token, then import or refresh so DeadlineSync can score your upcoming work."
              />
            ) : (
              <div className="space-y-3">
                {recommendations.map((item, index) => (
                  <div key={item.assignmentId} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-slate-900 px-2 text-xs font-semibold text-white">
                            #{index + 1}
                          </span>
                          <p className="text-base font-semibold text-slate-900">{item.title}</p>
                        </div>
                        <p className="text-sm text-slate-600">
                          {item.courseName} · {item.assignmentGroup}
                          {item.assignmentGroupWeight > 0 ? ` · ${item.assignmentGroupWeight}% weight` : ''}
                          {item.pointsPossible > 0 ? ` · ${item.pointsPossible} pts` : ''}
                        </p>
                        <p className="text-sm leading-6 text-slate-500">{item.recommendationReason}</p>
                      </div>
                      <div className="flex flex-col gap-2 lg:items-end">
                        <span className="rounded-full bg-teal-50 px-3 py-1 text-sm font-medium text-teal-700">
                          Priority {item.priorityScore}
                        </span>
                        <p className="text-sm text-slate-600">
                          {item.daysRemaining <= 0
                            ? 'Due now / overdue'
                            : item.daysRemaining === 1
                            ? 'Due in 1 day'
                            : `Due in ${item.daysRemaining} days`}
                        </p>
                        <p className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          {formatDueDate(item.dueDate)}
                        </p>
                        {item.sourceUrl ? (
                          <Button variant="outline" size="sm" className="gap-2" asChild>
                            <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                              Open in Canvas
                            </a>
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={activePage === 'calendar' ? '' : 'hidden'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-teal-600" />
              Assignment Calendar
            </CardTitle>
            <CardDescription>Browse assignments by month. Colors map to course.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCalendarMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
              >
                Previous month
              </Button>
              <p className="font-semibold text-slate-900">{formatMonthLabel(calendarMonth)}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCalendarMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
              >
                Next month
              </Button>
            </div>
            <div className="grid grid-cols-7 gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="px-2 py-1 text-center">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {calendarGridDays.map((date) => {
                const isCurrentMonth = date.getMonth() === calendarMonth.getMonth();
                const key = formatDayKey(date);
                const dayAssignments = assignmentsByDay.get(key) || [];
                return (
                  <div
                    key={key}
                    className={`min-h-28 rounded-xl border p-2 ${
                      isCurrentMonth ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50'
                    }`}
                  >
                    <p className={`text-xs font-semibold ${isCurrentMonth ? 'text-slate-700' : 'text-slate-400'}`}>
                      {date.getDate()}
                    </p>
                    <div className="mt-2 space-y-1">
                      {dayAssignments.slice(0, 2).map((assignment) => (
                        assignment.sourceUrl ? (
                          <a
                            key={assignment.assignmentId}
                            href={assignment.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`block truncate rounded border px-1.5 py-1 text-[10px] font-medium underline-offset-2 hover:underline ${getCourseColor(
                              assignment.courseId
                            )}`}
                            title={`Open in Canvas: ${assignment.title}`}
                          >
                            {(assignment.courseName || assignment.courseId) + ': ' + assignment.title}
                          </a>
                        ) : (
                          <div
                            key={assignment.assignmentId}
                            className={`truncate rounded border px-1.5 py-1 text-[10px] font-medium ${getCourseColor(
                              assignment.courseId
                            )}`}
                            title={`${assignment.title} - ${assignment.courseName || assignment.courseId}`}
                          >
                            {(assignment.courseName || assignment.courseId) + ': ' + assignment.title}
                          </div>
                        )
                      ))}
                      {dayAssignments.length > 2 ? (
                        <p className="text-[10px] text-slate-500">+{dayAssignments.length - 2} more</p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className={activePage === 'files' ? '' : 'hidden'}>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <Files className="h-5 w-5 text-teal-600" />
                My Files
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSectionOpen((prev) => ({ ...prev, files: !prev.files }))}
              >
                {sectionOpen.files ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </div>
            <CardDescription>
              Drag files like syllabi, rubrics, and notes into your personal library. Each student only sees files uploaded under their own account prefix in S3.
            </CardDescription>
          </CardHeader>
          <CardContent className={`space-y-4 ${sectionOpen.files ? '' : 'hidden'}`}>
            {filesError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{filesError}</AlertDescription>
              </Alert>
            )}
            {uploadNotice && (
              <Alert className="border-emerald-200 bg-emerald-50">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <AlertDescription className="text-emerald-900">{uploadNotice}</AlertDescription>
              </Alert>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant={selectedCourseId === 'all' ? 'default' : 'outline'}
                onClick={() => setSelectedCourseId('all')}
              >
                All classes
              </Button>
              {courseOptions.map((course) => (
                <Button
                  key={course.courseId}
                  size="sm"
                  variant={selectedCourseId === course.courseId ? 'default' : 'outline'}
                  onClick={() => setSelectedCourseId(course.courseId)}
                >
                  {course.courseName}
                </Button>
              ))}
            </div>
            <label
              className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
                isDraggingFiles ? 'border-teal-500 bg-teal-50' : 'border-slate-300 bg-slate-50 hover:border-slate-400'
              }`}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDraggingFiles(true);
              }}
              onDragLeave={() => setIsDraggingFiles(false)}
              onDrop={(event) => {
                event.preventDefault();
                void handleDroppedFiles(event.dataTransfer.files);
              }}
            >
              <UploadCloud className="mb-3 h-10 w-10 text-teal-600" />
              <p className="text-base font-semibold text-slate-900">
                {uploadBusy ? 'Uploading files…' : 'Drop files here or click to upload'}
              </p>
              <p className="mt-2 max-w-xl text-sm text-slate-500">
                Great for syllabi, assignment instructions, study guides, or class notes.
              </p>
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(event) => void handleDroppedFiles(event.target.files)}
              />
            </label>

            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-200 px-4 py-3">
                  <p className="font-semibold text-slate-900">Stored files</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {filesLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
                    </div>
                  ) : filteredFiles.length === 0 ? (
                    <div className="px-4 py-8">
                      <SectionEmptyState
                        title="Your file library is empty"
                        description="Upload a file and it will appear here with a preview link."
                      />
                    </div>
                  ) : (
                    filteredFiles.map((file) => (
                      <button
                        key={file.key}
                        type="button"
                        className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition hover:bg-slate-50"
                        onClick={() => void handleOpenFile(file)}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900">{file.name}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            {file.category} · {formatFileSize(file.size)} · {formatShortDate(file.uploadedAt)}
                          </p>
                        </div>
                        <ExternalLink className="h-4 w-4 shrink-0 text-slate-400" />
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-200 px-4 py-3">
                  <p className="font-semibold text-slate-900">Preview</p>
                </div>
                <div className="p-4">
                  {!selectedFile && !previewBusy && (
                    <SectionEmptyState
                      title="Select a file to preview"
                      description="When you click a filename, DeadlineSync generates a signed URL and opens it in the preview panel."
                    />
                  )}
                  {previewBusy && (
                    <div className="flex items-center justify-center py-14">
                      <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
                    </div>
                  )}
                  {selectedFile && selectedFileUrl && !previewBusy && (
                    <div className="space-y-3">
                      <div>
                        <p className="font-medium text-slate-900">{selectedFile.name}</p>
                        <p className="text-sm text-slate-500">
                          {selectedFile.category} · {formatFileSize(selectedFile.size)}
                        </p>
                      </div>
                      <iframe
                        title={selectedFile.name}
                        src={selectedFileUrl}
                        className="h-[420px] w-full rounded-xl border border-slate-200 bg-slate-50"
                      />
                      <Button variant="outline" size="sm" className="gap-2" asChild>
                        <a href={selectedFileUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                          Open in new tab
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
