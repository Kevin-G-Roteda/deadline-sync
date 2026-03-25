// Unit tests for assignment-handler Lambda
jest.mock('@aws-sdk/lib-dynamodb', () => {
  const mockSend = jest.fn();
  return {
    __mockSend: mockSend,
    DynamoDBDocumentClient: {
      from: () => ({ send: mockSend }),
    },
    GetCommand: jest.fn((opts) => ({ _get: opts })),
    PutCommand: jest.fn((opts) => ({ _put: opts })),
    UpdateCommand: jest.fn((opts) => ({ _update: opts })),
    DeleteCommand: jest.fn((opts) => ({ _delete: opts })),
    QueryCommand: jest.fn((opts) => ({ _query: opts })),
  };
});

const dynamodb = require('@aws-sdk/lib-dynamodb');
const mockSend = dynamodb.__mockSend;
const { handler } = require('./index');

const baseEvent = {
  httpMethod: 'GET',
  requestContext: { authorizer: { claims: { sub: 'user-123' } } },
  pathParameters: null,
  body: null,
  headers: {},
};

describe('assignment-handler', () => {
  beforeEach(() => {
    mockSend.mockReset();
  });

  describe('OPTIONS', () => {
    it('returns 200 for CORS preflight', async () => {
      const res = await handler({ ...baseEvent, httpMethod: 'OPTIONS' });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).message).toContain('CORS');
    });
  });

  describe('GET list', () => {
    it('returns assignments from Query', async () => {
      mockSend.mockResolvedValue({ Items: [{ assignmentId: 'a1', title: 'Test' }], Count: 1 });
      const res = await handler({ ...baseEvent, httpMethod: 'GET' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.assignments).toHaveLength(1);
      expect(body.count).toBe(1);
    });
  });

  describe('GET by id', () => {
    it('returns 404 when assignment not found', async () => {
      mockSend.mockResolvedValue({ Item: null });
      const res = await handler({
        ...baseEvent,
        httpMethod: 'GET',
        pathParameters: { id: 'assign_123' },
      });
      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res.body).error).toContain('not found');
    });

    it('returns 200 and assignment when found', async () => {
      const item = { assignmentId: 'assign_123', userId: 'user-123', title: 'Essay' };
      mockSend.mockResolvedValue({ Item: item });
      const res = await handler({
        ...baseEvent,
        httpMethod: 'GET',
        pathParameters: { id: 'assign_123' },
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toEqual(item);
    });
  });

  describe('POST create', () => {
    it('returns 400 when required fields missing', async () => {
      const res = await handler({
        ...baseEvent,
        httpMethod: 'POST',
        body: JSON.stringify({ title: 'Only title' }),
      });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toContain('Missing required');
    });

    it('returns 201 and creates assignment', async () => {
      mockSend.mockResolvedValue({});
      const res = await handler({
        ...baseEvent,
        httpMethod: 'POST',
        body: JSON.stringify({
          title: 'Homework',
          dueDate: '2025-12-01',
          courseId: 'course-1',
        }),
      });
      expect(res.statusCode).toBe(201);
      expect(mockSend).toHaveBeenCalled();
      const body = JSON.parse(res.body);
      expect(body.assignment).toBeDefined();
      expect(body.assignment.title).toBe('Homework');
      expect(body.assignment.userId).toBe('user-123');
    });
  });

  describe('PUT update', () => {
    it('returns 400 when assignment ID missing', async () => {
      const res = await handler({
        ...baseEvent,
        httpMethod: 'PUT',
        pathParameters: {},
        body: JSON.stringify({ title: 'Updated' }),
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 when no valid fields to update', async () => {
      mockSend.mockResolvedValue({ Attributes: {} });
      const res = await handler({
        ...baseEvent,
        httpMethod: 'PUT',
        pathParameters: { id: 'assign_123' },
        body: JSON.stringify({}),
      });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toContain('No valid fields');
    });
  });

  describe('DELETE', () => {
    it('returns 400 when assignment ID missing', async () => {
      const res = await handler({
        ...baseEvent,
        httpMethod: 'DELETE',
        pathParameters: {},
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 200 and calls DeleteCommand', async () => {
      mockSend.mockResolvedValue({});
      const res = await handler({
        ...baseEvent,
        httpMethod: 'DELETE',
        pathParameters: { id: 'assign_123' },
      });
      expect(res.statusCode).toBe(200);
      expect(mockSend).toHaveBeenCalled();
    });
  });

  describe('method not allowed', () => {
    it('returns 405 for unknown method', async () => {
      const res = await handler({ ...baseEvent, httpMethod: 'PATCH' });
      expect(res.statusCode).toBe(405);
    });
  });

  describe('POST /assignments/user', () => {
    it('creates user when path includes API Gateway stage', async () => {
      mockSend.mockResolvedValueOnce({ Item: null }).mockResolvedValueOnce({});
      const res = await handler({
        ...baseEvent,
        httpMethod: 'POST',
        path: '/prod/assignments/user',
        body: JSON.stringify({ email: 'stage@test.com', name: 'Stage User' }),
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.message).toContain('created');
    });

    it('updates user when record already exists', async () => {
      mockSend
        .mockResolvedValueOnce({
          Item: { userID: 'user-123', email: 'old@test.com', name: 'Old' },
        })
        .mockResolvedValueOnce({});
      const res = await handler({
        ...baseEvent,
        httpMethod: 'POST',
        path: '/prod/assignments/user',
        body: JSON.stringify({ email: 'new@test.com', name: 'New' }),
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).message).toContain('updated');
    });

    it('uses Cognito sub from Bearer ID token when authorizer is absent', async () => {
      const payload = Buffer.from(
        JSON.stringify({ sub: 'jwt-sub-xyz', email: 'jwt@test.com' })
      ).toString('base64url');
      const token = `e.${payload}.s`;
      mockSend.mockResolvedValueOnce({ Item: null }).mockResolvedValueOnce({});
      const res = await handler({
        ...baseEvent,
        httpMethod: 'POST',
        path: '/prod/assignments/user',
        requestContext: {},
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: 'From JWT' }),
      });
      expect(res.statusCode).toBe(201);
    });
  });

  describe('GET list with Bearer token', () => {
    it('uses sub from Bearer token for query when no authorizer', async () => {
      const payload = Buffer.from(JSON.stringify({ sub: 'list-user-99', email: 'l@test.com' })).toString(
        'base64url'
      );
      const token = `h.${payload}.x`;
      mockSend.mockResolvedValue({ Items: [], Count: 0 });
      const res = await handler({
        ...baseEvent,
        httpMethod: 'GET',
        requestContext: {},
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(200);
      expect(mockSend).toHaveBeenCalled();
      const queryCall = mockSend.mock.calls.find((c) => c[0] && c[0]._query);
      expect(queryCall).toBeDefined();
      expect(queryCall[0]._query.ExpressionAttributeValues[':userId']).toBe('list-user-99');
    });
  });
});
