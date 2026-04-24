// DeadlineSync - AssignmentHandler Lambda Function

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
    UpdateCommand,
    DeleteCommand,
    QueryCommand,
    ScanCommand
} = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({
    region: process.env.REGION || "us-east-1"
});

const docClient = DynamoDBDocumentClient.from(client);

// ✅ CORRECT TABLE NAMES
const TABLE_NAME =
    process.env.ASSIGNMENTS_TABLE || "Assignments";

const USERS_TABLE =
    process.env.USERS_TABLE || "Users";

const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
};

function getAuthorizationHeader(event) {
    const h = event.headers || {};
    return (
        h.Authorization ||
        h.authorization ||
        h.AUTHORIZATION ||
        ""
    );
}

/** Decode Cognito ID token payload when API Gateway has no authorizer (not cryptographically verified). */
function decodeIdTokenClaims(authHeader) {
    if (!authHeader || typeof authHeader !== "string") return null;
    const trimmed = authHeader.trim();
    if (!trimmed.toLowerCase().startsWith("bearer ")) return null;
    const token = trimmed.slice(7).trim();
    const parts = token.split(".");
    if (parts.length < 2) return null;
    try {
        const json = Buffer.from(parts[1], "base64url").toString("utf8");
        const payload = JSON.parse(json);
        if (!payload || !payload.sub) return null;
        return {
            sub: payload.sub,
            email: payload.email || payload["cognito:username"] || ""
        };
    } catch {
        return null;
    }
}

function resolveTokenClaims(event) {
    const claims = event.requestContext?.authorizer?.claims;
    if (claims?.sub) {
        return {
            sub: claims.sub,
            email: claims.email || ""
        };
    }
    return decodeIdTokenClaims(getAuthorizationHeader(event));
}

function resolveUserId(event) {
    return resolveTokenClaims(event)?.sub || "demo-user";
}

/** REST APIs include the stage in path (e.g. /prod/assignments/user). */
function isUserProfilePost(event) {
    if (event.httpMethod !== "POST") return false;
    const path = event.path || "";
    const resource = event.resource || "";
    return (
        path === "/assignments/user" ||
        path.endsWith("/assignments/user") ||
        resource === "/assignments/user" ||
        resource.endsWith("/assignments/user")
    );
}

exports.handler = async (event) => {
    console.log("Event:", JSON.stringify(event, null, 2));

    try {
        // CORS
        if (event.httpMethod === "OPTIONS") {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    message: "CORS preflight successful"
                })
            };
        }

        const userId = resolveUserId(event);

        if (isUserProfilePost(event)) {
            return await handleUserCreate(event);
        }

        switch (event.httpMethod) {
            case "GET":
                return await handleGet(event, userId);

            case "POST":
                return await handleCreate(event, userId);

            case "PUT":
                return await handleUpdate(event, userId);

            case "DELETE":
                return await handleDelete(event, userId);

            default:
                return {
                    statusCode: 405,
                    headers,
                    body: JSON.stringify({
                        error: "Method not allowed"
                    })
                };
        }
    } catch (error) {
        console.error("Error:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: "Internal server error",
                message: error.message
            })
        };
    }
};

// ===============================
// ASSIGNMENT HANDLERS
// ===============================

async function handleGet(event, userId) {
    const assignmentId = event.pathParameters?.id;

    if (assignmentId) {
        const result = await docClient.send(
            new GetCommand({
                TableName: TABLE_NAME,
                Key: { assignmentId, userId }
            })
        );

        if (!result.Item) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({
                    error: "Assignment not found"
                })
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result.Item)
        };
    } else {
        const result = await docClient.send(
            new QueryCommand({
                TableName: TABLE_NAME,
                IndexName: "UserDueDateIndex",
                KeyConditionExpression: "userId = :userId",
                ExpressionAttributeValues: {
                    ":userId": userId
                },
                ScanIndexForward: true
            })
        );

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                assignments: result.Items || [],
                count: result.Count || 0
            })
        };
    }
}

function resolveAssignmentId(body) {
    const raw = body.assignmentId;
    if (typeof raw === "string") {
        const id = raw.trim();
        if (/^canvas_\d+_\d+$/.test(id)) {
            return id;
        }
    }
    return `assign_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 9)}`;
}

function parseBody(event) {
    if (!event.body) return {};
    if (typeof event.body === "string") {
        try {
            return JSON.parse(event.body);
        } catch {
            return {};
        }
    }
    return event.body;
}

function inferCompleted(body = {}, existing = null) {
    const status = String(body.status ?? existing?.status ?? "").toLowerCase();
    const submissionStatus = String(body.submissionStatus ?? existing?.submissionStatus ?? "").toLowerCase();
    const gradeValue = body.grade ?? existing?.grade;
    const hasGrade = typeof gradeValue === "number";
    const submittedAt = body.submittedAt ?? existing?.submittedAt;
    const gradedAt = body.gradedAt ?? existing?.gradedAt;
    const explicitCompleted = body.completed ?? existing?.completed;

    return Boolean(
        explicitCompleted ||
        status === "completed" ||
        status === "submitted" ||
        submissionStatus === "submitted" ||
        submissionStatus === "graded" ||
        hasGrade ||
        submittedAt ||
        gradedAt
    );
}

async function handleCreate(event, userId) {
    const body = parseBody(event);

    if (!body.title || !body.dueDate || !body.courseId) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                error: "Missing required fields",
                required: ["title", "dueDate", "courseId"]
            })
        };
    }

    const resolvedAssignmentId = resolveAssignmentId(body);
    let existingRecord = null;

    let createdAt = new Date().toISOString();
    if (typeof body.assignmentId === "string" && /^canvas_\d+_\d+$/.test(body.assignmentId.trim())) {
        const existingCreate = await docClient.send(
            new GetCommand({
                TableName: TABLE_NAME,
                Key: { assignmentId: resolvedAssignmentId, userId }
            })
        );
        existingRecord = existingCreate.Item || null;
        if (existingCreate.Item?.createdAt) {
            createdAt = existingCreate.Item.createdAt;
        }
    }

    const platform =
        body.platform || body.sourcePlatform || "manual";
    const sourceUrl = body.sourceUrl || body.assignmentUrl || body.htmlUrl || "";
    const courseName = body.courseName || "";

    const assignment = {
        assignmentId: resolvedAssignmentId,
        userId,
        title: body.title,
        courseId: body.courseId,
        courseName,
        dueDate: body.dueDate,
        platform,
        sourceUrl,
        priority: body.priority || "medium",
        status: body.status || "not_started",
        completed: inferCompleted(body, existingRecord),
        estimatedHours: body.estimatedHours || 0,
        actualHours: body.actualHours || 0,
        description: body.description || "",
        grade: body.grade ?? null,
        submissionStatus: body.submissionStatus || null,
        submittedAt: body.submittedAt || null,
        gradedAt: body.gradedAt || null,
        maxPoints: body.maxPoints || 100,
        createdAt,
        updatedAt: new Date().toISOString()
    };

    await docClient.send(
        new PutCommand({
            TableName: TABLE_NAME,
            Item: assignment
        })
    );

    return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
            message: "Assignment created successfully",
            assignment
        })
    };
}

async function handleUpdate(event, userId) {
    const assignmentId = event.pathParameters?.id;

    if (!assignmentId) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                error: "Assignment ID required"
            })
        };
    }

    const body = parseBody(event);

    const updateExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    const allowedFields = [
        "title",
        "dueDate",
        "priority",
        "status",
        "completed",
        "estimatedHours",
        "actualHours",
        "description",
        "grade",
        "courseId",
        "courseName",
        "platform",
        "sourceUrl",
        "maxPoints",
        "submissionStatus",
        "submittedAt",
        "gradedAt"
    ];

    allowedFields.forEach((field) => {
        if (body[field] !== undefined) {
            updateExpressions.push(`#${field} = :${field}`);
            expressionAttributeNames[`#${field}`] = field;
            expressionAttributeValues[`:${field}`] = body[field];
        }
    });

    updateExpressions.push("#updatedAt = :updatedAt");
    expressionAttributeNames["#updatedAt"] = "updatedAt";
    expressionAttributeValues[":updatedAt"] =
        new Date().toISOString();

    if (inferCompleted(body)) {
        updateExpressions.push("#completed = :completed");
        expressionAttributeNames["#completed"] = "completed";
        expressionAttributeValues[":completed"] = true;
    }

    if (updateExpressions.length === 1) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                error: "No valid fields to update"
            })
        };
    }

    const result = await docClient.send(
        new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { assignmentId, userId },
            UpdateExpression:
                "SET " + updateExpressions.join(", "),
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: "ALL_NEW"
        })
    );

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            message: "Assignment updated successfully",
            assignment: result.Attributes
        })
    };
}

async function handleDelete(event, userId) {
    const assignmentId = event.pathParameters?.id;

    if (!assignmentId) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                error: "Assignment ID required"
            })
        };
    }

    await docClient.send(
        new DeleteCommand({
            TableName: TABLE_NAME,
            Key: { assignmentId, userId }
        })
    );

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            message: "Assignment deleted successfully",
            assignmentId
        })
    };
}

// ===============================
// USER CREATION HANDLER
// ===============================

async function handleUserCreate(event) {
    const body = parseBody(event);
    const tokenClaims = resolveTokenClaims(event);
    const bodyUserId = body.userID || body.userId;
    const userID = tokenClaims?.sub || bodyUserId;
    const email =
        (body.email && String(body.email).trim()) ||
        tokenClaims?.email ||
        "";

    if (!userID || !email) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                error: "Missing required fields",
                required: ["userID", "email"]
            })
        };
    }

    const user = {
        userID, // ✅ matches DynamoDB partition key
        email,
        name: body.name || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    const existing = await docClient.send(
        new GetCommand({
            TableName: USERS_TABLE,
            Key: { userID }
        })
    );

    const requestedCanvasToken =
        body?.preferences?.canvas?.token &&
        String(body.preferences.canvas.token).trim();

    if (requestedCanvasToken) {
        const tokenCollision = await docClient.send(
            new ScanCommand({
                TableName: USERS_TABLE,
                FilterExpression:
                    "userID <> :userID AND preferences.canvas.token = :canvasToken",
                ExpressionAttributeValues: {
                    ":userID": userID,
                    ":canvasToken": requestedCanvasToken
                },
                ProjectionExpression: "userID",
                Limit: 1
            })
        );

        if ((tokenCollision.Items || []).length > 0) {
            return {
                statusCode: 409,
                headers,
                body: JSON.stringify({
                    error: "Canvas token already linked to another user account"
                })
            };
        }
    }

    if (existing.Item) {
        await docClient.send(
            new UpdateCommand({
                TableName: USERS_TABLE,
                Key: { userID },
                UpdateExpression: "SET email = :email, #name = :name, updatedAt = :updatedAt",
                ExpressionAttributeNames: { "#name": "name" },
                ExpressionAttributeValues: {
                    ":email": email,
                    ":name": body.name || existing.Item.name || "",
                    ":updatedAt": new Date().toISOString()
                }
            })
        );

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                message: "User updated successfully",
                user: { ...existing.Item, email, name: body.name || existing.Item.name || "" }
            })
        };
    }

    await docClient.send(
        new PutCommand({
            TableName: USERS_TABLE,
            Item: user
        })
    );

    return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
            message: "User created successfully",
            user
        })
    };
}
