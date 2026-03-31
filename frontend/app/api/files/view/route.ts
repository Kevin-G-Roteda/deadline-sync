import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { attachmentsBucketName, s3Client } from '@/lib/aws-server';
import { getAuthenticatedUserFromRequest } from '@/lib/server-auth';

export async function POST(request: NextRequest) {
  try {
    const user = getAuthenticatedUserFromRequest(request);
    const body = (await request.json().catch(() => ({}))) as { key?: string };
    const key = body.key?.trim();

    if (!key) {
      return NextResponse.json({ error: 'File key is required.' }, { status: 400 });
    }

    if (!key.startsWith(`${user.sub}/`)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = await getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: attachmentsBucketName,
        Key: key,
      }),
      { expiresIn: 3600 }
    );

    return NextResponse.json({ url });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Failed to prepare file preview' }, { status: 500 });
  }
}
