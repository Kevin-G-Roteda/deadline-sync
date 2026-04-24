import { NextRequest, NextResponse } from 'next/server';
import { CanvasCourse, fetchAllCanvasPages, getCanvasConfigForRequest } from '@/lib/canvas-server';

type CanvasAssignment = {
  id: number;
  name: string;
  description?: string | null;
  due_at?: string | null;
  html_url?: string;
  published?: boolean;
  has_submitted_submissions?: boolean;
  graded_submissions_exist?: boolean;
};

export async function POST(req: NextRequest) {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
    const auth = req.headers.get('authorization');
    const { token: canvasToken, domain } = await getCanvasConfigForRequest(req);

    if (!apiBase) {
      return NextResponse.json({ error: 'NEXT_PUBLIC_API_URL is not set.' }, { status: 503 });
    }

    if (!auth?.toLowerCase().startsWith('bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid Authorization header.' }, { status: 401 });
    }

    const coursesUrl = `https://${domain}/api/v1/courses?enrollment_state=active&per_page=100`;
    let courses: CanvasCourse[];
    try {
      courses = await fetchAllCanvasPages<CanvasCourse>(coursesUrl, canvasToken);
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
        assignments = await fetchAllCanvasPages<CanvasAssignment>(listUrl, canvasToken);
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
          completed: Boolean(a.has_submitted_submissions || a.graded_submissions_exist),
          submissionStatus:
            a.graded_submissions_exist ? 'graded' : a.has_submitted_submissions ? 'submitted' : 'not_submitted',
          submittedAt: a.has_submitted_submissions ? new Date().toISOString() : null,
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
    if (e instanceof Error && e.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (e instanceof Error && e.message === 'CANVAS_NOT_CONFIGURED') {
      return NextResponse.json(
        { error: 'Save both your school Canvas domain and Canvas token before importing.' },
        { status: 400 }
      );
    }
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
