import { NextRequest, NextResponse } from 'next/server';

type CanvasCourse = {
  id: number;
  name?: string;
  course_code?: string;
  workflow_state?: string;
  access_restricted_by_date?: boolean;
};

type CanvasAssignment = {
  id: number;
  name: string;
  description?: string | null;
  due_at?: string | null;
  html_url?: string;
  published?: boolean;
};

function normalizeDomain(raw: string) {
  return raw.replace(/^https?:\/\//, '').split('/')[0].trim();
}

function parseNextUrl(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  for (const part of linkHeader.split(',')) {
    const m = part.match(/<([^>]+)>;\s*rel="next"/);
    if (m) return m[1];
  }
  return null;
}

async function canvasFetchJson(url: string, token: string): Promise<{ data: unknown; response: Response }> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });
  if (response.status === 401 || response.status === 403) {
    throw new Error('INVALID_CANVAS_TOKEN');
  }
  if (!response.ok) {
    const t = await response.text();
    throw new Error(`Canvas HTTP ${response.status}: ${t.slice(0, 300)}`);
  }
  const data = await response.json();
  return { data, response };
}

async function fetchAllPages<T>(startUrl: string, token: string): Promise<T[]> {
  const out: T[] = [];
  let url: string | null = startUrl;
  while (url) {
    const { data, response } = await canvasFetchJson(url, token);
    if (Array.isArray(data)) {
      out.push(...(data as T[]));
    }
    url = parseNextUrl(response.headers.get('link'));
  }
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
    const canvasToken = process.env.CANVAS_ACCESS_TOKEN;
    const domain = normalizeDomain(process.env.CANVAS_DOMAIN || 'mdc.instructure.com');

    if (!canvasToken) {
      return NextResponse.json(
        { error: 'Canvas is not configured (missing CANVAS_ACCESS_TOKEN).' },
        { status: 503 }
      );
    }
    if (!apiBase) {
      return NextResponse.json({ error: 'NEXT_PUBLIC_API_URL is not set.' }, { status: 503 });
    }

    const auth = req.headers.get('authorization');
    if (!auth?.toLowerCase().startsWith('bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid Authorization header.' }, { status: 401 });
    }

    const coursesUrl = `https://${domain}/api/v1/courses?enrollment_state=active&per_page=100`;
    let courses: CanvasCourse[];
    try {
      courses = await fetchAllPages<CanvasCourse>(coursesUrl, canvasToken);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === 'INVALID_CANVAS_TOKEN') {
        return NextResponse.json({ error: 'Invalid or unauthorized Canvas token.' }, { status: 401 });
      }
      return NextResponse.json({ error: `Failed to load Canvas courses: ${msg}` }, { status: 502 });
    }

    const active = courses.filter(
      (c) =>
        c &&
        typeof c.id === 'number' &&
        c.workflow_state !== 'deleted' &&
        c.workflow_state !== 'completed' &&
        !c.access_restricted_by_date
    );

    if (active.length === 0) {
      return NextResponse.json({
        imported: 0,
        success: true,
        message: 'No active Canvas courses found for this token.',
        courseCount: 0,
      });
    }

    let imported = 0;
    let skippedNoDueDate = 0;
    const warnings: string[] = [];

    for (const course of active) {
      const listUrl = `https://${domain}/api/v1/courses/${course.id}/assignments?per_page=100`;
      let assignments: CanvasAssignment[];
      try {
        assignments = await fetchAllPages<CanvasAssignment>(listUrl, canvasToken);
      } catch {
        warnings.push(`course ${course.id}: could not load assignments`);
        continue;
      }

      const courseName = course.name || course.course_code || String(course.id);
      const courseIdStr = String(course.id);

      for (const a of assignments) {
        if (!a || typeof a.id !== 'number') continue;
        if (a.published === false) continue;
        if (!a.due_at) {
          skippedNoDueDate += 1;
          continue;
        }

        const assignmentId = `canvas_${course.id}_${a.id}`;
        const description =
          typeof a.description === 'string' ? a.description.slice(0, 35000) : '';

        const payload = {
          assignmentId,
          title: a.name || 'Untitled assignment',
          dueDate: a.due_at,
          courseId: courseIdStr,
          courseName,
          description,
          platform: 'canvas',
          sourceUrl: typeof a.html_url === 'string' ? a.html_url : '',
        };

        const res = await fetch(`${apiBase}/assignments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: auth,
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errText = await res.text();
          warnings.push(`assignment ${assignmentId}: ${res.status} ${errText.slice(0, 120)}`);
          continue;
        }
        imported += 1;
      }
    }

    return NextResponse.json({
      imported,
      skippedNoDueDate,
      success: true,
      message:
        imported === 0
          ? 'No assignments were imported. Check API configuration, Canvas due dates, or warnings below.'
          : `Imported or updated ${imported} assignment(s) from Canvas.`,
      courseCount: active.length,
      warnings: warnings.length ? warnings : undefined,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
