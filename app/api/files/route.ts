import { NextRequest, NextResponse } from 'next/server';
import { ListObjectsV2Command, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { attachmentsBucketName, s3Client } from '@/lib/aws-server';
import { getAuthenticatedUserFromRequest } from '@/lib/server-auth';

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^\w.\- ]+/g, '').trim().replace(/\s+/g, '-');
}

function inferCategory(fileName: string) {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';

  if (['pdf'].includes(extension)) return 'PDF';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) return 'Image';
  if (['doc', 'docx', 'pages', 'rtf'].includes(extension)) return 'Document';
  if (['ppt', 'pptx', 'key'].includes(extension)) return 'Presentation';
  if (['xls', 'xlsx', 'csv'].includes(extension)) return 'Spreadsheet';
  if (['txt', 'md'].includes(extension)) return 'Text';

  return 'File';
}

function getUserPrefix(userId: string) {
  return `${userId}/library/`;
}

export async function GET(request: NextRequest) {
  try {
    const user = getAuthenticatedUserFromRequest(request);
    const prefix = getUserPrefix(user.sub);

    const result = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: attachmentsBucketName,
        Prefix: prefix,
      })
    );

    const files = (result.Contents || [])
      .filter((item) => item.Key && item.Size && item.Size > 0)
      .map((item) => {
        const key = item.Key as string;
        const name = key.slice(prefix.length).replace(/^\d+-/, '');
        return {
          key,
          name,
          size: item.Size || 0,
          uploadedAt: item.LastModified?.toISOString() || null,
          category: inferCategory(name),
        };
      })
      .sort((a, b) => String(b.uploadedAt).localeCompare(String(a.uploadedAt)));

    return NextResponse.json({ files });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Failed to load files' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getAuthenticatedUserFromRequest(request);
    const body = (await request.json().catch(() => ({}))) as {
      fileName?: string;
      contentType?: string;
    };

    const originalFileName = body.fileName?.trim();
    if (!originalFileName) {
      return NextResponse.json({ error: 'File name is required.' }, { status: 400 });
    }

    const safeName = sanitizeFileName(originalFileName);
    const key = `${getUserPrefix(user.sub)}${Date.now()}-${safeName}`;
    const contentType = body.contentType || 'application/octet-stream';
    const uploadUrl = await getSignedUrl(
      s3Client,
      new PutObjectCommand({
        Bucket: attachmentsBucketName,
        Key: key,
        ContentType: contentType,
      }),
      { expiresIn: 900 }
    );

    return NextResponse.json({
      uploadUrl,
      file: {
        key,
        name: safeName,
        category: inferCategory(safeName),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Failed to prepare upload' }, { status: 500 });
  }
}
