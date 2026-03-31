import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { NextRequest } from 'next/server';
import { docClient, usersTableName } from '@/lib/aws-server';
import { getAuthenticatedUserFromRequest } from '@/lib/server-auth';

export type CanvasCourse = {
  id: number;
  name?: string;
  course_code?: string;
  workflow_state?: string;
  access_restricted_by_date?: boolean;
};

export function normalizeCanvasDomain(raw?: string) {
  return (raw || '').replace(/^https?:\/\//, '').split('/')[0].trim();
}

export function parseNextUrl(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  for (const part of linkHeader.split(',')) {
    const match = part.match(/<([^>]+)>;\s*rel="next"/);
    if (match) return match[1];
  }
  return null;
}

export async function canvasFetchJson<T>(url: string, token: string): Promise<{ data: T; response: Response }> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error('INVALID_CANVAS_TOKEN');
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Canvas HTTP ${response.status}: ${text.slice(0, 300)}`);
  }

  const data = (await response.json()) as T;
  return { data, response };
}

export async function fetchAllCanvasPages<T>(startUrl: string, token: string): Promise<T[]> {
  const results: T[] = [];
  let url: string | null = startUrl;

  while (url) {
    const { data, response } = await canvasFetchJson<T[]>(url, token);
    if (Array.isArray(data)) {
      results.push(...data);
    }
    url = parseNextUrl(response.headers.get('link'));
  }

  return results;
}

export async function getCanvasConfigForRequest(request: NextRequest) {
  const user = getAuthenticatedUserFromRequest(request);
  const result = await docClient.send(
    new GetCommand({
      TableName: usersTableName,
      Key: { userID: user.sub },
    })
  );

  const canvas = result.Item?.preferences?.canvas || {};
  const token = typeof canvas.token === 'string' ? canvas.token.trim() : '';
  const domain = normalizeCanvasDomain(canvas.domain);

  if (!token || !domain) {
    throw new Error('CANVAS_NOT_CONFIGURED');
  }

  return {
    user,
    token,
    domain,
  };
}
