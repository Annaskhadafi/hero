# Architecture Memory

## Last Updated: 2026-06-14

## System Architecture
- **Frontend**: Next.js 14 with App Router
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: NextAuth.js with credentials provider
- **UI**: Custom enterprise component library
- **Deployment**: Vercel + Docker

## Key Components
- Enterprise Data Grid (table/list)
- Enterprise Form System
- RBAC with role-based permissions
- File upload with S3 integration
- Real-time notifications

## Database Schema
- Users, roles, departments
- Employee data (personal, job, salary)
- Timesheets and attendance
- Safety incidents and inspections
- Documents and files

## API Structure
- RESTful endpoints under `/api/`
- Server actions for form submissions
- Database queries via Drizzle ORM
- Authentication middleware