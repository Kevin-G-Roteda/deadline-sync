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
