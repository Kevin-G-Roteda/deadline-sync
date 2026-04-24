import { NextRequest, NextResponse } from 'next/server';
import { GetCommand, PutCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, usersTableName } from '@/lib/aws-server';
import { getAuthenticatedUserFromRequest } from '@/lib/server-auth';
import { normalizeCanvasDomain } from '@/lib/canvas-server';

async function findCanvasTokenOwner(userId: string, canvasToken: string) {
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const page = await docClient.send(
      new ScanCommand({
        TableName: usersTableName,
        FilterExpression:
          'userID <> :userId AND #preferences.#canvas.#token = :canvasToken',
        ExpressionAttributeNames: {
          '#preferences': 'preferences',
          '#canvas': 'canvas',
          '#token': 'token',
        },
        ExpressionAttributeValues: {
          ':userId': userId,
          ':canvasToken': canvasToken,
        },
        ProjectionExpression: 'userID',
        ExclusiveStartKey: exclusiveStartKey,
      })
    );

    if ((page.Items || []).length > 0) {
      return true;
    }
    exclusiveStartKey = page.LastEvaluatedKey;
  } while (exclusiveStartKey);

  return false;
}

export async function GET(request: NextRequest) {
  try {
    const user = getAuthenticatedUserFromRequest(request);
    const result = await docClient.send(
      new GetCommand({
        TableName: usersTableName,
        Key: { userID: user.sub },
      })
    );

    const canvas = result.Item?.preferences?.canvas || {};

    return NextResponse.json({
      canvasTokenConfigured: Boolean(canvas.token),
      canvasDomain: normalizeCanvasDomain(canvas.domain),
      updatedAt: canvas.updatedAt || result.Item?.updatedAt || null,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Failed to load Canvas settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = getAuthenticatedUserFromRequest(request);
    const body = (await request.json().catch(() => ({}))) as {
      canvasToken?: string;
      canvasDomain?: string;
    };

    const canvasToken = body.canvasToken?.trim();
    const canvasDomain = normalizeCanvasDomain(body.canvasDomain);

    if (!canvasToken || !canvasDomain) {
      return NextResponse.json(
        { error: 'Both Canvas token and school domain are required.' },
        { status: 400 }
      );
    }

    const hasCollision = await findCanvasTokenOwner(user.sub, canvasToken);
    if (hasCollision) {
      return NextResponse.json(
        { error: 'This Canvas token is already linked to another account.' },
        { status: 409 }
      );
    }

    const existing = await docClient.send(
      new GetCommand({
        TableName: usersTableName,
        Key: { userID: user.sub },
      })
    );

    const now = new Date().toISOString();
    const nextPreferences = {
      ...(existing.Item?.preferences || {}),
      canvas: {
        token: canvasToken,
        domain: canvasDomain,
        updatedAt: now,
      },
    };

    if (!existing.Item) {
      await docClient.send(
        new PutCommand({
          TableName: usersTableName,
          Item: {
            userID: user.sub,
            email: user.email || '',
            name: user.name || '',
            preferences: nextPreferences,
            createdAt: now,
            updatedAt: now,
          },
        })
      );
    } else {
      await docClient.send(
        new UpdateCommand({
          TableName: usersTableName,
          Key: { userID: user.sub },
          UpdateExpression: 'SET preferences = :preferences, updatedAt = :updatedAt',
          ExpressionAttributeValues: {
            ':preferences': nextPreferences,
            ':updatedAt': now,
          },
        })
      );
    }

    return NextResponse.json({
      success: true,
      canvasTokenConfigured: true,
      canvasDomain,
      updatedAt: now,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Failed to save Canvas settings' }, { status: 500 });
  }
}
