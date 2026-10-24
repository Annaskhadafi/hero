# HERO - Hub for Employee Reporting & Operations

A unified, modern enterprise platform built with Next.js 15, TypeScript, and PostgreSQL for managing operational activities, Human Capital workflows, tire management, and customer self-service through the MAESTRO portal.

---

## 🌟 Key Modules & Architecture

### 1. 🛠️ Operations & Field Activity

- **Daily Activity Hub:** Real-time reporting of site operational tasks, route checklists, per-activity team assignments, photo attachments, and supervisor review.
- **Dashboard Utilities (`/dashboard/utilities`):** Quantitative monitoring of physical task output (Tires, Pcs, Work units) and operational durations. **Calculates only approved activities** with interactive multi-site filtering, chronological daily trends, and Excel/CSV matrix exports (by Date, Technician, and Unit).
- **EWH (Effective Working Hours) & Unit Utility:** Comprehensive tracking of equipment utilization, downtime, losses ratio, and workforce operational effectiveness.
- **Tire Management:** Digital inspections, jobcard lifecycles, tire scrap analysis, and Ready For Retread (RFR) tracking.

### 2. 🌐 MAESTRO Customer Portal (`maestro.chitraparatama.com`)

Dedicated multi-tenant customer-facing portal with isolated RBAC and customer-scoped data access:

- **Helpdesk & Problem Ticketing:** SLA tracking, ticket submission, status updates, and customer-engineer communication.
- **Customer Daily Activity Visibility:** Real-time transparency of vendor activities conducted across customer mine sites.
- **Safety Management & PTW:** Customer visibility into safety permits to work and compliance checklists.
- **Tire Scrap & Inspection Analytics:** Detailed condition reports, scrap reason distributions, and tire inspection logs.
- **PO & Cargo Tracking:** Logistics milestone tracking and supply chain transparency.

### 3. ✍️ Centralized Dynamic Approval Engine

- **Universal Multi-Step Approvals:** Unified approval workflow handling Daily Activity Sessions, Overtime (SPL), Leave/Permissions, Training Requests, Safety Permits, APD, and Form WO.
- **Digital Signatures:** Secure canvas-based signature capture for every approval stage.
- **Real-Time Notification System:** Notification bell event subscriptions and automated transactional email delivery tracking.

### 4. 👥 Human Capital & Workforce Operations

- **Roster & Timesheet:** Scheduling, automated shift attendance, and overtime tracking.
- **Overtime Command Letters (SPL):** Structured overtime requests, shift allocations, and manager approvals.
- **Training & ISO Certification:** Training applications with full ISO documentation and trainer verification.
- **MCU & Wellness:** Medical check-up schedules, health records, and wellness tracking.
- **ChitraLearning LMS:** Interactive corporate learning modules, assessments, and progress tracking.

### 5. 🦺 Quality, Safety & Environment (HSE)

- **5R Workplace Inspections:** Regular 5R (Ringkas, Rapi, Resik, Rawat, Rajin) audits and photographic scoring.
- **Safety Permits to Work (PTW):** High-risk task authorizations, risk assessment matrices (HIRADC), and safety sign-offs.
- **Safety & Emergency Reporting:** Incident logs, immediate hazard alerts, and corrective action workflows.

---

## 📁 Persistent S3 Uploads & Proxy Architecture

To avoid 403 Forbidden errors and expired presigned URLs, all uploads follow a persistent proxy standard:

- **Proxy Endpoint:** `GET /api/uploads/[...path]` serves files from private S3 CloudHost buckets and Dokploy local persistent mounts (`/mnt/data/one-chitra/uploads`).
- **Dynamic Resolution:** URLs are resolved dynamically via `resolveUploadUrl()` adapting seamlessly between localhost, Dokploy production, and external notification webhooks.

---

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/Annaskhadafi/hero.git
cd hero

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Start database
npm run db:up

# Push database schema
npm run db:push

# Start development server
npm run dev
```

Visit HERO Desktop at [http://localhost:3000](http://localhost:3000) or MAESTRO Portal at [http://maestro.localhost:3000](http://maestro.localhost:3000).

---

## 🛠️ Tech Stack

### Core

- **Framework:** [Next.js 15](https://nextjs.org/) (App Router, Turbopack, Server Actions)
- **Language:** TypeScript 5 (Strict Mode)
- **Database:** PostgreSQL with [Drizzle ORM](https://orm.drizzle.team/)
- **Authentication:** [Better Auth](https://better-auth.com/) + Session Cookie RBAC
- **Storage:** S3 CloudHost Object Storage + Dokploy Persistent Mounts

### UI & Presentation

- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Component System:** `@/components/templates` (`HeroDataTable`, `HeroSearchableSelect`, `HeroKpiCard`, `HeroFormDialog`, `HeroDetailModal`, etc.)
- **Icons:** [Lucide React](https://lucide.dev/), [Tabler Icons](https://tabler.io/icons)
- **Visualizations:** [Recharts](https://recharts.org/)

### Testing & Verification

- **E2E Testing:** Agentic end-to-end testing with Playwright & e2e test runner
- **Unit & Contract Tests:** Node.js native test runner (`node --test`)
- **Type Checking:** TypeScript strict mode (`tsc --noEmit`)

---

## 📋 Available Scripts

### Development & Build

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm start                # Start production server
npm run type-check       # Run TypeScript validation
npm run lint             # Run ESLint
npm run format           # Format code with Prettier
```

### Database Management

```bash
npm run db:up            # Start local PostgreSQL container
npm run db:down          # Stop PostgreSQL container
npm run db:push          # Sync Drizzle schema to database
npm run db:generate      # Generate SQL migration files
npm run db:migrate       # Apply database migrations
npm run db:studio        # Open Drizzle Studio UI
```

### Testing

```bash
npm test                 # Run test suite
npm run test:e2e         # Run Playwright E2E browser tests
npx e2e run <file>       # Run specific agentic E2E test file
```

---

## 🧪 E2E Verification & Test Credentials

For authenticated end-to-end tests, provide `HERO_E2E_USERNAME` and `HERO_E2E_PASSWORD` in the git-ignored `.env.e2e.local` file or as process environment variables. The E2E configuration loads `.env.e2e.local` first. Never place test credentials in source files or commit them.

- Helper utilities are available at `tests/e2e-auth-helper.ts`.
- See `.gitignore` for the local secret-file exclusion.

---

## 🔒 Security & Code Standards

- **RBAC Enforcement:** All server actions and API routes strictly enforce role and resource permissions.
- **Zero Raw Select / Tables:** UI components standardize on `@/components/templates` for tables, searchable selects, and KPI cards with consistent `h-9` control heights.
- **Data Integrity:** Cascading foreign keys, strict null checks, and immutable audit logs.

---

## 📄 License & Status

- **Status:** Active Production & Development
- **Copyright:** Proprietary & Confidential - PT Chitra Paratama
