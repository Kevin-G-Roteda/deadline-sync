import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';

const region = process.env.AWS_REGION || process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1';

export const usersTableName = process.env.USERS_TABLE || 'Users';
export const attachmentsBucketName =
  process.env.ATTACHMENTS_BUCKET || process.env.S3_ATTACHMENTS_BUCKET || 'deadlinesync-attachments';

const dynamoClient = new DynamoDBClient({ region });
export const docClient = DynamoDBDocumentClient.from(dynamoClient);

export const s3Client = new S3Client({ region });
