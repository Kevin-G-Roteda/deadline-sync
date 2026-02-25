#!/bin/bash

################################################################################
# DeadlineSync Repository Initialization Script
# 
# This script sets up your complete DeadlineSync repository structure
# with all frontend and backend files
#
# Prerequisites:
# - Node.js 20.x installed
# - Git initialized
# - Next.js created with shadcn/ui
#
# Usage: bash init-deadlinesync-repo.sh
################################################################################

set -e

echo "======================================"
echo "DeadlineSync Repository Setup"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}[1/8]${NC} Creating directory structure..."

# Create directory structure
mkdir -p backend/lambda/assignment-handler
mkdir -p scripts
mkdir -p docs
mkdir -p .github/workflows

echo -e "${GREEN}✓${NC} Directories created"

echo -e "${BLUE}[2/8]${NC} Creating frontend files..."

# Create lib/amplify-config.ts
cat > lib/amplify-config.ts << 'EOF'
export const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID || '',
      userPoolClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID || '',
      loginWith: {
        email: true,
        username: false,
      },
      signUpVerificationMethod: 'code',
      userAttributes: {
        email: {
          required: true,
        },
        name: {
          required: true,
        },
      },
      passwordFormat: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireNumbers: true,
        requireSpecialCharacters: false,
      },
    },
  },
};
EOF

# Create .env.local template
cat > .env.local.example << 'EOF'
# AWS Cognito Configuration
NEXT_PUBLIC_AWS_REGION=us-east-1
NEXT_PUBLIC_USER_POOL_ID=your-user-pool-id
NEXT_PUBLIC_USER_POOL_CLIENT_ID=your-client-id
NEXT_PUBLIC_API_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com/prod
EOF

# Create .env.local (copy from example)
cp .env.local.example .env.local

echo -e "${GREEN}✓${NC} Frontend configuration files created"

echo -e "${BLUE}[3/8]${NC} Creating backend Lambda function..."

# Create Lambda function
cat > backend/lambda/assignment-handler/index.js << 'EOF'
// DeadlineSync - AssignmentHandler Lambda Function
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({ region: process.env.REGION || "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.ASSIGNMENTS_TABLE || "DeadlineSync-Assignments";

const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
};

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    try {
        if (event.httpMethod === 'OPTIONS') {
            return { statusCode: 200, headers, body: JSON.stringify({ message: 'CORS preflight successful' }) };
        }

        const userId = event.requestContext?.authorizer?.claims?.sub || 'demo-user';
        
        switch (event.httpMethod) {
            case 'GET': return await handleGet(event, userId);
            case 'POST': return await handleCreate(event, userId);
            case 'PUT': return await handleUpdate(event, userId);
            case 'DELETE': return await handleDelete(event, userId);
            default: return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
        }
    } catch (error) {
        console.error('Error:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error', message: error.message }) };
    }
};

async function handleGet(event, userId) {
    const assignmentId = event.pathParameters?.id;
    
    if (assignmentId) {
        const result = await docClient.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { assignmentId, userId }
        }));
        
        if (!result.Item) {
            return { statusCode: 404, headers, body: JSON.stringify({ error: 'Assignment not found' }) };
        }
        return { statusCode: 200, headers, body: JSON.stringify(result.Item) };
    } else {
        const result = await docClient.send(new QueryCommand({
            TableName: TABLE_NAME,
            IndexName: 'UserDueDateIndex',
            KeyConditionExpression: 'userId = :userId',
            ExpressionAttributeValues: { ':userId': userId },
            ScanIndexForward: true
        }));
        
        return { statusCode: 200, headers, body: JSON.stringify({ assignments: result.Items || [], count: result.Count || 0 }) };
    }
}

async function handleCreate(event, userId) {
    const body = JSON.parse(event.body || '{}');
    
    if (!body.title || !body.dueDate || !body.courseId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required fields', required: ['title', 'dueDate', 'courseId'] }) };
    }
    
    const assignment = {
        assignmentId: `assign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        title: body.title,
        courseId: body.courseId,
        dueDate: body.dueDate,
        priority: body.priority || 'medium',
        status: body.status || 'not_started',
        completed: false,
        estimatedHours: body.estimatedHours || 0,
        actualHours: 0,
        description: body.description || '',
        grade: null,
        maxPoints: body.maxPoints || 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: assignment }));
    return { statusCode: 201, headers, body: JSON.stringify({ message: 'Assignment created successfully', assignment }) };
}

async function handleUpdate(event, userId) {
    const assignmentId = event.pathParameters?.id;
    if (!assignmentId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Assignment ID required' }) };
    }
    
    const body = JSON.parse(event.body || '{}');
    const updateExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};
    
    const allowedFields = ['title', 'dueDate', 'priority', 'status', 'completed', 'estimatedHours', 'actualHours', 'description', 'grade'];
    
    allowedFields.forEach(field => {
        if (body[field] !== undefined) {
            updateExpressions.push(`#${field} = :${field}`);
            expressionAttributeNames[`#${field}`] = field;
            expressionAttributeValues[`:${field}`] = body[field];
        }
    });
    
    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();
    
    if (updateExpressions.length === 1) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'No valid fields to update' }) };
    }
    
    const result = await docClient.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { assignmentId, userId },
        UpdateExpression: 'SET ' + updateExpressions.join(', '),
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW'
    }));
    
    return { statusCode: 200, headers, body: JSON.stringify({ message: 'Assignment updated successfully', assignment: result.Attributes }) };
}

async function handleDelete(event, userId) {
    const assignmentId = event.pathParameters?.id;
    if (!assignmentId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Assignment ID required' }) };
    }
    
    await docClient.send(new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { assignmentId, userId }
    }));
    
    return { statusCode: 200, headers, body: JSON.stringify({ message: 'Assignment deleted successfully', assignmentId }) };
}
EOF

cat > backend/lambda/assignment-handler/package.json << 'EOF'
{
  "name": "deadlinesync-assignment-handler",
  "version": "1.0.0",
  "description": "Lambda function for managing DeadlineSync assignments",
  "main": "index.js",
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.478.0",
    "@aws-sdk/lib-dynamodb": "^3.478.0"
  }
}
EOF

echo -e "${GREEN}✓${NC} Lambda function created"

echo -e "${BLUE}[4/8]${NC} Creating deployment scripts..."

# Copy setup scripts
cp setup-cognito-auth.sh scripts/ 2>/dev/null || echo "Note: setup-cognito-auth.sh not found in current directory"
cp deploy-lambda.sh scripts/ 2>/dev/null || echo "Note: deploy-lambda.sh not found in current directory"

echo -e "${GREEN}✓${NC} Deployment scripts ready"

echo -e "${BLUE}[5/8]${NC} Creating documentation..."

# Create comprehensive README
cat > README.md << 'EOF'
# DeadlineSync

> Academic deadline management system with AWS serverless backend

[![AWS](https://img.shields.io/badge/AWS-Serverless-orange)](https://aws.amazon.com)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

## 📚 Overview

DeadlineSync is a cloud-native student assignment tracker that helps you manage academic deadlines across multiple courses. Built with AWS serverless architecture for zero-cost operation and infinite scalability.

### Problem
Students juggle assignments across multiple platforms (Canvas, Blackboard, Google Classroom), leading to:
- Missed deadlines
- Poor workload planning
- Fragmented information
- Manual tracking overhead

### Solution
Centralized deadline management with:
- ✅ Automatic Canvas LMS import
- ✅ Visual calendar & workload heatmap
- ✅ AI-powered study planner
- ✅ Grade tracking & GPA calculator
- ✅ File attachment support

---

## 🏗️ Architecture

```
Users → Frontend (Vercel) → AWS Cloud
                              ├─ Cognito (Auth)
                              ├─ API Gateway (REST API)
                              ├─ Lambda (6 Functions)
                              ├─ DynamoDB (4 Tables)
                              ├─ S3 (File Storage)
                              └─ CloudWatch (Monitoring)
```

**Key Design Decisions:**
- **Serverless:** Pay-per-request pricing ($0 with free tier)
- **NoSQL:** DynamoDB for flexible schema and auto-scaling
- **JWT Auth:** Cognito User Pools for secure authentication
- **CDN:** Vercel for global edge deployment

---

## 🚀 Features

### Core Features (MVP)
- ✅ **Assignment Management:** Create, edit, delete, complete assignments
- ✅ **Calendar View:** Visualize deadlines across courses
- ✅ **Study Planner:** AI-generated study session recommendations
- ✅ **Progress Tracking:** Track completion rates and trends
- ✅ **Grade Tracking:** Monitor current grades and calculate GPA
- ✅ **File Attachments:** Upload syllabi, rubrics, and notes

### Future Enhancements
- 🔄 Multi-LMS support (Blackboard, Google Classroom)
- 📱 Mobile apps (iOS/Android)
- 🤝 Collaboration features (study groups)
- 🔔 Push notifications for upcoming deadlines
- 📊 Advanced analytics dashboard
- 📅 Calendar integration (Google Calendar, Outlook)

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Components:** shadcn/ui
- **Authentication:** AWS Amplify
- **Hosting:** Vercel Global CDN

### Backend
- **Compute:** AWS Lambda (Node.js 20.x)
- **API:** API Gateway (REST)
- **Database:** DynamoDB (NoSQL)
- **Storage:** S3 (File uploads)
- **Auth:** Cognito User Pools
- **Monitoring:** CloudWatch

### Development Tools
- **Version Control:** Git/GitHub
- **IDE:** VS Code
- **Package Manager:** npm
- **AWS CLI:** v2
- **Testing:** Jest (planned)

---

## 📦 Installation

### Prerequisites
- Node.js 20.x
- AWS Account
- AWS CLI configured
- Git

### Quick Start

```bash
# 1. Clone repository
git clone https://github.com/YOUR-USERNAME/deadlinesync.git
cd deadlinesync

# 2. Install frontend dependencies
npm install

# 3. Set up AWS infrastructure
cd scripts
chmod +x *.sh
./setup-aws-infrastructure.sh

# 4. Configure Cognito authentication
./setup-cognito-auth.sh

# 5. Add environment variables
# Copy values from script output to .env.local

# 6. Deploy Lambda functions
./deploy-lambda.sh

# 7. Run frontend locally
cd ..
npm run dev
# Open http://localhost:3000

# 8. Deploy to Vercel
vercel --prod
```

---

## 📁 Project Structure

```
deadlinesync/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout with AuthProvider
│   └── page.tsx           # Main dashboard
├── components/
│   ├── ui/                # shadcn/ui components
│   └── auth-form.tsx      # Authentication UI
├── lib/
│   ├── amplify-config.ts  # AWS Amplify config
│   └── auth-context.tsx   # Auth state management
├── backend/
│   └── lambda/            # Lambda function code
│       └── assignment-handler/
│           ├── index.js
│           └── package.json
├── scripts/               # Deployment scripts
│   ├── setup-aws-infrastructure.sh
│   ├── setup-cognito-auth.sh
│   └── deploy-lambda.sh
├── docs/                  # Documentation
└── .github/
    └── workflows/         # CI/CD pipelines
```

---

## 🔐 Authentication

DeadlineSync uses AWS Cognito for secure user authentication:

- **JWT Tokens:** Industry-standard authentication
- **Email Verification:** Required for account activation
- **Password Policy:** Min 8 chars, uppercase, lowercase, numbers
- **User Isolation:** Each user sees only their data
- **Session Management:** Auto-refresh tokens

---

## 🌐 API Endpoints

### Assignments
- `GET /assignments` - List all user assignments
- `GET /assignments/{id}` - Get specific assignment
- `POST /assignments` - Create new assignment
- `PUT /assignments/{id}` - Update assignment
- `DELETE /assignments/{id}` - Delete assignment

### Canvas Integration
- `POST /canvas/import` - Import assignments from Canvas
- `POST /grades/sync` - Sync current grades

### Planning
- `GET /study-plan` - Get AI-generated study plan
- `GET /workload` - Get workload distribution

---

## 👥 Team

- **Kevin Roteda** - Backend & Documentation
- **Anthony Bartlett** - Frontend & Documentation

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

---

## 🙏 Acknowledgments

- AWS Educate for cloud credits
- shadcn/ui for component library
- Next.js team for the framework
- Canvas LMS for API access

---

## 📞 Contact

- **GitHub:** [github.com/YOUR-USERNAME/deadlinesync](https://github.com/YOUR-USERNAME/deadlinesync)
- **Issues:** [Report a bug](https://github.com/YOUR-USERNAME/deadlinesync/issues)

---

**Built with ❤️ by students, for students**
EOF

echo -e "${GREEN}✓${NC} README created"

echo -e "${BLUE}[6/8]${NC} Creating .gitignore..."

cat > .gitignore << 'EOF'
# Dependencies
node_modules/
/.pnp
.pnp.js

# Testing
/coverage

# Next.js
/.next/
/out/
.vercel

# Production
/build
dist/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
*.env

# AWS
.aws/
aws-credentials.json
*.pem
*.key

# Lambda deployment packages
*.zip
lambda-deployment/

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# IDE
.vscode/
.idea/
*.swp
*.swo
.DS_Store
.history/

# TypeScript
*.tsbuildinfo
next-env.d.ts

# Misc
.eslintcache
*.log
.cache/
EOF

echo -e "${GREEN}✓${NC} .gitignore created"

echo -e "${BLUE}[7/8]${NC} Creating GitHub Actions workflow..."

cat > .github/workflows/deploy.yml << 'EOF'
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test --if-present
        
      - name: Build application
        run: npm run build
        env:
          NEXT_PUBLIC_API_URL: ${{ secrets.NEXT_PUBLIC_API_URL }}
          NEXT_PUBLIC_USER_POOL_ID: ${{ secrets.NEXT_PUBLIC_USER_POOL_ID }}
          NEXT_PUBLIC_USER_POOL_CLIENT_ID: ${{ secrets.NEXT_PUBLIC_USER_POOL_CLIENT_ID }}
EOF

echo -e "${GREEN}✓${NC} GitHub Actions workflow created"

echo -e "${BLUE}[8/8]${NC} Initializing Git repository..."

git add .
git commit -m "Initial commit: DeadlineSync with AWS Cognito authentication

- Next.js 14 frontend with shadcn/ui
- AWS Cognito authentication
- Lambda function for assignment CRUD
- Deployment scripts for AWS infrastructure
- Complete documentation
" || echo "Note: Files already committed or no changes"

echo ""
echo "======================================"
echo -e "${GREEN}Repository Setup Complete!${NC}"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Push to GitHub: git push origin main"
echo "2. Set up AWS infrastructure: cd scripts && ./setup-aws-infrastructure.sh"
echo "3. Configure Cognito: ./setup-cognito-auth.sh"
echo "4. Update .env.local with AWS values"
echo "5. Deploy to Vercel: vercel --prod"
echo ""
