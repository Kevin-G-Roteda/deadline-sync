'use client';

import { fetchAuthSession } from 'aws-amplify/auth';

const getBaseUrl = () => process.env.NEXT_PUBLIC_API_URL || '';

async function getAuthHeaders(): Promise<HeadersInit> {
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export interface Assignment {
  assignmentId: string;
  userId: string;
  title: string;
  courseId: string;
  courseName?: string;
  dueDate: string;
  /** e.g. canvas, manual */
  platform?: string;
  /** LMS or external assignment URL */
  sourceUrl?: string;
  priority?: string;
  status?: string;
  completed?: boolean;
  grade?: number | null;
  submissionStatus?: string | null;
  submittedAt?: string | null;
  gradedAt?: string | null;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserProfilePayload {
  userId: string;
  email: string;
  name?: string;
}

export interface CanvasSettings {
  canvasTokenConfigured: boolean;
  canvasDomain: string;
  updatedAt?: string | null;
}

export interface StudyRecommendation {
  assignmentId: string;
  title: string;
  courseId: string;
  courseName: string;
  dueDate: string;
  sourceUrl: string;
  pointsPossible: number;
  assignmentGroup: string;
  assignmentGroupWeight: number;
  daysRemaining: number;
  priorityScore: number;
  recommendationReason: string;
}

export interface StoredFile {
  key: string;
  name: string;
  size: number;
  uploadedAt: string | null;
  category: string;
}

async function parseApiErrorBody(res: Response): Promise<string> {
  if (res.status === 401) {
    try {
      const body = (await res.clone().json()) as { __type?: string; message?: string };
      return body?.__type === 'UserNotConfirmedException' ? 'Please verify your email first' : 'Not authorized';
    } catch {
      return 'Not authorized';
    }
  }
  return `Failed to load assignments: ${res.status}`;
}

async function getJsonOrThrow<T>(res: Response, fallbackMessage: string): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || fallbackMessage);
  }
  return data;
}

export async function listAssignments(): Promise<{ assignments: Assignment[]; count: number }> {
  const base = getBaseUrl();
  if (!base) return { assignments: [], count: 0 };
  try {
    const res = await fetch(`${base}/assignments`, { headers: await getAuthHeaders() });
    if (!res.ok) {
      const msg = await parseApiErrorBody(res);
      throw new Error(msg);
    }
    return res.json();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === 'Failed to fetch' || message.includes('fetch')) {
      throw new Error(
        'Cannot reach the assignments API. Set NEXT_PUBLIC_API_URL in Vercel to your API Gateway URL and ensure the API is deployed and allows CORS.'
      );
    }
    throw err;
  }
}

export async function createAssignment(body: {
  assignmentId?: string;
  title: string;
  dueDate: string;
  courseId: string;
  courseName?: string;
  description?: string;
  priority?: string;
  platform?: string;
  sourceUrl?: string;
}) {
  const base = getBaseUrl();
  if (!base) throw new Error('NEXT_PUBLIC_API_URL is not set');
  const res = await fetch(`${base}/assignments`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    if (res.status === 401) {
      const msg = await parseApiErrorBody(res);
      throw new Error(msg);
    }
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || `Failed to create: ${res.status}`);
  }
  return res.json();
}

export async function upsertUserProfile(body: UserProfilePayload) {
  const base = getBaseUrl();
  if (!base) return { skipped: true };

  const res = await fetch(`${base}/assignments/user`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({
      userID: body.userId,
      email: body.email,
      name: body.name || '',
    }),
  });

  if (!res.ok && res.status !== 409) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || `Failed to sync user profile: ${res.status}`);
  }

  return res.json().catch(() => ({}));
}

export type CanvasImportResult = {
  imported: number;
  skippedNoDueDate?: number;
  success: boolean;
  message: string;
  courseCount?: number;
  warnings?: string[];
};

/** Server-side Canvas import; forwards your Cognito ID token to the assignments API. */
export async function importFromCanvas(): Promise<CanvasImportResult> {
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString();
  if (!token) throw new Error('Sign in required');

  const res = await fetch('/api/canvas/import', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = (await res.json().catch(() => ({}))) as CanvasImportResult & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || `Canvas import failed (${res.status})`);
  }
  return data as CanvasImportResult;
}

export async function getCanvasSettings(): Promise<CanvasSettings> {
  const res = await fetch('/api/user/canvas-settings', {
    headers: await getAuthHeaders(),
  });

  return getJsonOrThrow<CanvasSettings>(res, 'Failed to load Canvas settings');
}

export async function saveCanvasSettings(body: {
  canvasToken: string;
  canvasDomain: string;
}): Promise<CanvasSettings> {
  const res = await fetch('/api/user/canvas-settings', {
    method: 'PUT',
    headers: await getAuthHeaders(),
    body: JSON.stringify(body),
  });

  return getJsonOrThrow<CanvasSettings>(res, 'Failed to save Canvas settings');
}

export async function getCanvasRecommendations(): Promise<{
  recommendations: StudyRecommendation[];
  generatedAt: string;
  warnings?: string[];
}> {
  const res = await fetch('/api/canvas/recommendations', {
    headers: await getAuthHeaders(),
  });

  return getJsonOrThrow(res, 'Failed to load study recommendations');
}

export async function listUserFiles(): Promise<{ files: StoredFile[] }> {
  const res = await fetch('/api/files', {
    headers: await getAuthHeaders(),
  });

  return getJsonOrThrow<{ files: StoredFile[] }>(res, 'Failed to load files');
}

export async function createFileUpload(body: { fileName: string; contentType: string }) {
  const res = await fetch('/api/files', {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(body),
  });

  return getJsonOrThrow<{
    uploadUrl: string;
    file: Pick<StoredFile, 'key' | 'name' | 'category'>;
  }>(res, 'Failed to prepare upload');
}

export async function getFileViewUrl(key: string): Promise<{ url: string }> {
  const res = await fetch('/api/files/view', {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ key }),
  });

  return getJsonOrThrow<{ url: string }>(res, 'Failed to open file');
}
