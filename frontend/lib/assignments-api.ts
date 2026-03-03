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
  dueDate: string;
  priority?: string;
  status?: string;
  completed?: boolean;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
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

export async function listAssignments(): Promise<{ assignments: Assignment[]; count: number }> {
  const base = getBaseUrl();
  if (!base) return { assignments: [], count: 0 };
  const res = await fetch(`${base}/assignments`, { headers: await getAuthHeaders() });
  if (!res.ok) {
    const msg = await parseApiErrorBody(res);
    throw new Error(msg);
  }
  return res.json();
}

export async function createAssignment(body: { title: string; dueDate: string; courseId: string; description?: string; priority?: string }) {
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
