import { NextRequest, NextResponse } from 'next/server';
import { CanvasCourse, canvasFetchJson, fetchAllCanvasPages, getCanvasConfigForRequest } from '@/lib/canvas-server';

type CanvasAssignment = {
  id: number;
  name: string;
  due_at?: string | null;
  html_url?: string;
  points_possible?: number | null;
  assignment_group_id?: number | null;
  has_submitted_submissions?: boolean;
  published?: boolean;
  omit_from_final_grade?: boolean;
};

type CanvasAssignmentGroup = {
  id: number;
  name: string;
  group_weight?: number | null;
};

type Recommendation = {
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
};

function daysUntil(dateString: string) {
  const now = Date.now();
  const due = new Date(dateString).getTime();
  return Math.ceil((due - now) / (24 * 60 * 60 * 1000));
}

function computePriorityScore(input: {
  daysRemaining: number;
  weight: number;
  pointsPossible: number;
}) {
  const clampedDays = Math.max(input.daysRemaining, 0);
  const urgencyScore = 100 / (clampedDays + 1);
  const weightScore = input.weight * 4;
  const pointsScore = Math.min(input.pointsPossible || 0, 200) / 8;
  return Number((urgencyScore + weightScore + pointsScore).toFixed(2));
}

function buildReason(input: {
  courseName: string;
  groupName: string;
  weight: number;
  daysRemaining: number;
  pointsPossible: number;
}) {
  const duePart =
    input.daysRemaining <= 0
      ? 'it is due now or overdue'
      : input.daysRemaining === 1
      ? 'it is due within 1 day'
      : `it is due within ${input.daysRemaining} days`;

  const weightPart =
    input.weight > 0
      ? `${input.groupName} is weighted at ${input.weight}% in ${input.courseName}`
      : `${input.groupName} does not expose a Canvas grade weight, so urgency and points were used`;

  const pointsPart = input.pointsPossible > 0 ? `and it is worth ${input.pointsPossible} point(s)` : '';

  return `${duePart}, ${weightPart}${pointsPart ? `, ${pointsPart}` : ''}.`;
}

export async function GET(request: NextRequest) {
  try {
    const { token, domain } = await getCanvasConfigForRequest(request);

    const coursesUrl = `https://${domain}/api/v1/courses?enrollment_state=active&per_page=100`;
    const courses = await fetchAllCanvasPages<CanvasCourse>(coursesUrl, token);
    const activeCourses = courses.filter(
      (course) =>
        course &&
        typeof course.id === 'number' &&
        course.workflow_state !== 'deleted' &&
        course.workflow_state !== 'completed' &&
        !course.access_restricted_by_date
    );

    const recommendations: Recommendation[] = [];
    const warnings: string[] = [];

    for (const course of activeCourses) {
      const courseName = course.name || course.course_code || String(course.id);

      let groups: CanvasAssignmentGroup[] = [];
      let assignments: CanvasAssignment[] = [];

      try {
        const groupsResponse = await canvasFetchJson<CanvasAssignmentGroup[]>(
          `https://${domain}/api/v1/courses/${course.id}/assignment_groups?per_page=100`,
          token
        );
        groups = Array.isArray(groupsResponse.data) ? groupsResponse.data : [];
      } catch {
        warnings.push(`course ${course.id}: could not load assignment groups`);
      }

      try {
        assignments = await fetchAllCanvasPages<CanvasAssignment>(
          `https://${domain}/api/v1/courses/${course.id}/assignments?per_page=100`,
          token
        );
      } catch {
        warnings.push(`course ${course.id}: could not load assignments`);
        continue;
      }

      const groupMap = new Map(groups.map((group) => [group.id, group]));

      for (const assignment of assignments) {
        if (!assignment?.id || !assignment.name || !assignment.due_at) continue;
        if (assignment.published === false) continue;
        if (assignment.omit_from_final_grade) continue;
        if (assignment.has_submitted_submissions) continue;

        const daysRemaining = daysUntil(assignment.due_at);
        if (daysRemaining > 30) continue;

        const group = assignment.assignment_group_id ? groupMap.get(assignment.assignment_group_id) : undefined;
        const weight = Number(group?.group_weight || 0);
        const pointsPossible = Number(assignment.points_possible || 0);
        const priorityScore = computePriorityScore({
          daysRemaining,
          weight,
          pointsPossible,
        });

        recommendations.push({
          assignmentId: `canvas_${course.id}_${assignment.id}`,
          title: assignment.name,
          courseId: String(course.id),
          courseName,
          dueDate: assignment.due_at,
          sourceUrl: assignment.html_url || '',
          pointsPossible,
          assignmentGroup: group?.name || 'Ungrouped',
          assignmentGroupWeight: weight,
          daysRemaining,
          priorityScore,
          recommendationReason: buildReason({
            courseName,
            groupName: group?.name || 'This assignment',
            weight,
            daysRemaining,
            pointsPossible,
          }),
        });
      }
    }

    recommendations.sort((a, b) => b.priorityScore - a.priorityScore || a.dueDate.localeCompare(b.dueDate));

    return NextResponse.json({
      recommendations: recommendations.slice(0, 8),
      generatedAt: new Date().toISOString(),
      warnings: warnings.length ? warnings : undefined,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'CANVAS_NOT_CONFIGURED') {
      return NextResponse.json(
        { error: 'Save both your school Canvas domain and Canvas token before requesting recommendations.' },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message === 'INVALID_CANVAS_TOKEN') {
      return NextResponse.json({ error: 'Invalid or unauthorized Canvas token.' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Failed to generate recommendations' }, { status: 500 });
  }
}
