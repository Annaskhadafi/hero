# HERO - Immediate Action Items
**CTO Priority Task List**

**Date:** May 3, 2026
**Company:** PT Chitra Paratama
**Project:** HERO - Hub for Employee Reporting & Operations
**Status:** Active Implementation

---

## Critical Path Items (Next 7 Days)

### Day 1-2: Foundation & Planning

#### 1. Resolve Dual Employee System 🔴 CRITICAL
**Priority:** P0 - Blocking
**Owner:** CTO
**Estimated Time:** 4-6 hours

**Problem:**
- Two employee tables exist: `hero_employees` and `hero_hr_employees`
- Risk of data inconsistency and confusion
- Unclear which is source of truth

**Action Steps:**
1. Analyze both tables and their relationships
2. Determine which table is authoritative
3. Create migration plan to consolidate
4. Document decision in ADR
5. Execute migration in staging
6. Verify data integrity

**Success Criteria:**
- Single source of truth for employee data
- All references updated
- Zero data loss
- Documentation complete

---

#### 2. Start Recruiting - Senior Full-Stack Engineers (2 positions) 🔴 CRITICAL
**Priority:** P0 - Blocking
**Owner:** CTO + HR
**Estimated Time:** Ongoing

**Action Steps:**
1. Post job descriptions on LinkedIn, Glints, JobStreet
2. Reach out to tech communities (Indonesia JS, React Indonesia)
3. Screen resumes (target: 10-15 candidates per position)
4. Schedule initial technical screenings
5. Prepare coding challenges and interview questions

**Job Posting Channels:**
- LinkedIn Jobs
- Glints (Indonesia)
- JobStreet (Indonesia)
- We Work Remotely
- Remote OK
- React Indonesia community
- Indonesia JS community

**Target Timeline:**
- Week 1: Post jobs, start sourcing
- Week 2: Screen candidates, schedule interviews
- Week 3: Conduct interviews, make offers
- Week 4: Onboard first hires

**Success Criteria:**
- 20+ qualified applicants per position
- 5+ candidates reach final round
- 2 offers accepted by Week 3

---

#### 3. Research WhatsApp Gateway Providers 🔴 CRITICAL
**Priority:** P0 - Core Feature
**Owner:** CTO
**Estimated Time:** 3-4 hours

**Requirement:**
WhatsApp is the primary communication channel per PRD. Need reliable gateway for:
- Approval reminders
- Point transaction notifications
- Emergency alerts
- Daily activity reminders

**Providers to Evaluate:**

| Provider | Pricing | Features | Reliability | Notes |
|----------|---------|----------|-------------|-------|
| **Fonnte** | IDR 150K-500K/month | Template messages, media, API | Unknown | Indonesia-based |
| **Twilio** | $0.005-0.02/msg | Global, robust API, webhooks | High | Enterprise-grade |
| **Vonage** | $0.0045-0.016/msg | Multi-channel, API | High | Good docs |
| **MessageBird** | $0.01-0.03/msg | Omnichannel, flow builder | Medium | EU-based |
| **Wati** | $49-199/month | CRM integration, templates | Medium | SMB-focused |

**Evaluation Criteria:**
1. Cost (500+ users, ~5,000 messages/month)
2. Reliability (>99% delivery rate)
3. API quality (REST, webhooks, SDKs)
4. Template message support (WhatsApp Business API)
5. Indonesia phone number support
6. Compliance (WhatsApp Business Policy)

**Action Steps:**
1. Sign up for trial accounts
2. Test message delivery to Indonesian numbers
3. Review API documentation
4. Calculate monthly cost at scale
5. Test template message approval process
6. Make final recommendation

**Success Criteria:**
- Provider selected by Day 2
- Trial account active
- Test messages sent successfully
- Cost estimate documented

---

#### 4. Create Detailed Spec for Daily Report Generator (M4) 🔴 CRITICAL
**Priority:** P0 - Customer-Facing
**Owner:** CTO
**Estimated Time:** 4-6 hours

**Requirements from PRD:**
- Auto-generate from approved activities
- PDF template with customer branding
- Excel export functionality
- Photo selection (max 6 photos)
- Digital signature integration
- Email delivery to customers
- Customization per customer/contract

**Spec Document Outline:**
1. **Data Sources**
   - Which activities to include (approved only? specific types?)
   - Photo selection logic (most recent? user-selected?)
   - Employee information to display
   - Customer/contract metadata

2. **PDF Template Design**
   - Header (customer logo, report date, site name)
   - Activity summary table (date, employee, activity, duration, status)
   - Photo grid (max 6 photos with captions)
   - Footer (digital signature, generated timestamp)
   - Branding customization per customer

3. **Excel Export Format**
   - Sheet 1: Activity summary
   - Sheet 2: Employee breakdown
   - Sheet 3: Photo metadata
   - Formatting and formulas

4. **Email Delivery**
   - Recipient configuration (per customer/contract)
   - Email template
   - Attachment handling (PDF + Excel)
   - Delivery confirmation

5. **User Interface**
   - Report generation trigger (manual vs. automatic)
   - Date range selection
   - Photo selection UI
   - Preview before sending
   - Delivery status tracking

**Action Steps:**
1. Review PRD requirements in detail
2. Analyze existing activity data structure
3. Design PDF template mockup
4. Design Excel export format
5. Create API endpoint specifications
6. Document edge cases and error handling
7. Estimate implementation time

**Success Criteria:**
- Complete spec document
- Mockups for PDF and Excel
- API contract defined
- Edge cases documented
- Ready for implementation

---

### Day 3-4: Implementation & Infrastructure

#### 5. Begin Daily Report Generator Implementation 🔴 CRITICAL
**Priority:** P0 - Customer-Facing
**Owner:** CTO (until Full-Stack Engineer hired)
**Estimated Time:** 16-20 hours

**Implementation Plan:**

**Phase 1: Data Layer (4 hours)**
- Create database queries to fetch approved activities
- Aggregate activity data by date/employee
- Fetch associated photos and metadata
- Handle customer/contract configuration

**Phase 2: PDF Generation (6 hours)**
- Set up pdf-lib or Puppeteer
- Create PDF template with customer branding
- Implement photo grid layout
- Add digital signature support
- Test with sample data

**Phase 3: Excel Export (4 hours)**
- Set up xlsx library
- Create multi-sheet workbook
- Format cells and add formulas
- Test with sample data

**Phase 4: Email Delivery (3 hours)**
- Configure nodemailer
- Create email template
- Attach PDF and Excel files
- Implement delivery confirmation
- Error handling and retry logic

**Phase 5: API Endpoints (3 hours)**
- POST /api/reports/daily/generate
- GET /api/reports/daily/:reportId
- GET /api/reports/daily/:reportId/pdf
- GET /api/reports/daily/:reportId/excel
- POST /api/reports/daily/:reportId/send

**Success Criteria:**
- PDF generation working
- Excel export working
- Email delivery functional
- API endpoints tested
- Basic error handling in place

---

#### 6. Set Up Testing Infrastructure 🔴 CRITICAL
**Priority:** P0 - Quality Assurance
**Owner:** CTO
**Estimated Time:** 4-6 hours

**Current State:**
- Zero test coverage
- No testing framework configured
- High regression risk

**Action Steps:**

**1. Configure Jest/Vitest (1 hour)**
```bash
npm install --save-dev jest @types/jest ts-jest
npm install --save-dev @testing-library/react @testing-library/jest-dom
npm install --save-dev @testing-library/user-event
```

Create `jest.config.js`:
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
};
```

**2. Write First Unit Tests (2 hours)**
Priority test targets:
- `lib/points-calculator.ts` (if exists)
- `lib/timesheet-calculator.ts` (to be created)
- `lib/activity-aggregator.ts` (to be created)
- `lib/utils.ts` (existing utilities)

**3. Write First Integration Tests (2 hours)**
Priority API routes:
- `/api/auth/[...all]/route.ts` (authentication)
- `/api/mobile/sync/activity/route.ts` (activity submission)
- `/api/notifications/route.ts` (notification delivery)

**4. Configure CI/CD (1 hour)**
Update `.github/workflows/ci.yml`:
```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm test -- --coverage
      - run: npm run build
```

**Success Criteria:**
- Jest/Vitest configured and running
- 10+ unit tests written
- 5+ integration tests written
- CI/CD pipeline running tests
- Coverage report generated

---

#### 7. Start Recruiting - QA Engineer 🟡 HIGH
**Priority:** P1 - Quality Assurance
**Owner:** CTO + HR
**Estimated Time:** Ongoing

**Action Steps:**
1. Post job description on LinkedIn, Glints, JobStreet
2. Reach out to QA communities
3. Screen resumes (target: 8-10 candidates)
4. Schedule technical screenings
5. Prepare testing challenges

**Target Timeline:**
- Week 2: Post job, start sourcing
- Week 3: Screen candidates, schedule interviews
- Week 4: Conduct interviews, make offer
- Week 5: Onboard QA Engineer

**Success Criteria:**
- 15+ qualified applicants
- 3+ candidates reach final round
- 1 offer accepted by Week 4

---

#### 8. Document Current Database Schema 🟡 HIGH
**Priority:** P1 - Technical Debt
**Owner:** CTO
**Estimated Time:** 3-4 hours

**Current State:**
- 80+ database tables
- Complex relationships
- No ER diagrams
- Difficult for new engineers to understand

**Action Steps:**
1. Generate ER diagram using Drizzle Studio or dbdiagram.io
2. Document key tables and relationships
3. Identify redundant or unused tables
4. Document naming conventions
5. Create schema documentation in `/docs/database/`

**Key Tables to Document:**
- User and authentication tables
- Employee tables (hero_employees, hero_hr_employees)
- Activity and approval tables
- Notification tables
- Gamification tables (points, levels, rewards)
- HSE tables
- Timesheet and payroll tables

**Success Criteria:**
- ER diagram generated
- Key tables documented
- Relationships explained
- Documentation in `/docs/database/schema.md`

---

### Day 5-7: Continued Implementation

#### 9. Continue Daily Report Generator (PDF Template) 🔴 CRITICAL
**Priority:** P0 - Customer-Facing
**Owner:** CTO
**Estimated Time:** 8-10 hours

**Focus Areas:**
- Refine PDF template design
- Implement customer branding customization
- Add photo grid layout
- Test with real data
- Handle edge cases (no photos, long activity names, etc.)

**Success Criteria:**
- PDF template looks professional
- Customer branding works
- Photo grid renders correctly
- Edge cases handled

---

#### 10. Write First Unit Tests for Critical Business Logic 🔴 CRITICAL
**Priority:** P0 - Quality Assurance
**Owner:** CTO
**Estimated Time:** 6-8 hours

**Test Targets:**
1. **Point Calculation Logic**
   - Attendance points (on-time, late, absent)
   - Activity completion points
   - Complexity multipliers
   - Streak bonuses
   - Level progression

2. **Timesheet Calculation Logic**
   - Regular hours calculation
   - Overtime calculation (1.5x, 2x, 3x)
   - Holiday/weekend handling
   - Activity duration aggregation

3. **Approval Workflow Logic**
   - Multi-level approval routing
   - Approval status transitions
   - Notification triggers

**Success Criteria:**
- 30+ unit tests written
- Critical business logic covered
- Test coverage >60% for tested modules

---

#### 11. Start Recruiting - DevOps Engineer 🟡 HIGH
**Priority:** P1 - Infrastructure
**Owner:** CTO + HR
**Estimated Time:** Ongoing

**Action Steps:**
1. Post job description on LinkedIn, DevOps communities
2. Screen resumes (target: 8-10 candidates)
3. Schedule technical screenings
4. Prepare infrastructure challenges

**Target Timeline:**
- Week 4: Post job, start sourcing
- Week 5: Screen candidates, schedule interviews
- Week 6: Conduct interviews, make offer
- Week 7: Onboard DevOps Engineer

**Success Criteria:**
- 15+ qualified applicants
- 3+ candidates reach final round
- 1 offer accepted by Week 6

---

#### 12. Create Timesheet Auto-Calculation Spec 🔴 CRITICAL
**Priority:** P0 - Payroll Dependency
**Owner:** CTO
**Estimated Time:** 3-4 hours

**Requirements from PRD:**
- Automatic calculation from approved activities
- Overtime rate configuration (1.5x, 2x, 3x)
- Calendar integration for holidays/work days
- Payroll Excel export
- Timesheet approval workflow

**Spec Document Outline:**
1. **Data Sources**
   - Approved activities with duration
   - Employee work schedule (regular hours)
   - Holiday calendar
   - Overtime rate configuration

2. **Calculation Rules**
   - Regular hours (first 8 hours/day or 40 hours/week)
   - Overtime hours (beyond regular hours)
   - Weekend/holiday multipliers
   - Night shift differentials (if applicable)

3. **Payroll Export Format**
   - Employee ID, Name, Department, Position
   - Regular hours, Overtime hours (1.5x, 2x, 3x)
   - Total hours, Total pay (if rates configured)
   - Export to Excel format

4. **Approval Workflow**
   - Timesheet generation (weekly/monthly)
   - Supervisor review and approval
   - HR final approval
   - Lock timesheet after approval

**Success Criteria:**
- Complete spec document
- Calculation rules defined
- Export format specified
- Approval workflow documented
- Ready for implementation

---

## Week 2 Preview (Days 8-14)

### Planned Activities

1. **Complete Daily Report Generator (M4)**
   - Finish PDF and Excel export
   - Implement email delivery
   - Test with real customer data
   - Deploy to staging

2. **Begin Timesheet Automation (M3)**
   - Implement calculation logic
   - Create database tables/migrations
   - Build API endpoints
   - Create UI for timesheet review

3. **WhatsApp Integration**
   - Integrate selected gateway
   - Implement notification templates
   - Test message delivery
   - Deploy to staging

4. **Onboard First Engineers**
   - Senior Full-Stack Engineer 1 starts
   - Development environment setup
   - Codebase walkthrough
   - Assign first tasks (M3 or M4)

5. **Expand Test Coverage**
   - Write integration tests for API routes
   - Write E2E tests for critical flows
   - Achieve 40% overall test coverage

---

## Success Metrics (Week 1)

### Technical Deliverables
- [ ] Dual employee system resolved
- [ ] Daily Report Generator 50%+ complete
- [ ] Testing infrastructure operational
- [ ] 20+ unit tests written
- [ ] WhatsApp gateway selected and tested
- [ ] Database schema documented

### Recruiting Progress
- [ ] 2 Senior Full-Stack Engineer positions posted
- [ ] 1 QA Engineer position posted
- [ ] 20+ applications received
- [ ] 5+ candidates screened
- [ ] 2+ interviews scheduled

### Documentation
- [ ] Daily Report Generator spec complete
- [ ] Timesheet automation spec complete
- [ ] Database schema documented
- [ ] Architecture principles documented (already exists)

---

## Blockers & Risks

### Current Blockers
1. **No engineering team** - CTO doing all implementation work
   - Mitigation: Aggressive recruiting, consider contractors

2. **Dual employee system** - Unclear source of truth
   - Mitigation: Resolve in Day 1-2

3. **No test coverage** - High regression risk
   - Mitigation: Set up testing infrastructure Day 3-4

### Upcoming Risks
1. **WhatsApp gateway approval delay** - WhatsApp Business API requires approval
   - Mitigation: Start approval process immediately, have backup plan

2. **Hiring delays** - May not find qualified candidates quickly
   - Mitigation: Expand search to remote international candidates

3. **Daily Report complexity** - Customer requirements may be unclear
   - Mitigation: Create mockups, get customer feedback early

---

## Communication Plan

### Daily Standup (Async)
- What did I accomplish yesterday?
- What will I work on today?
- Any blockers?

### Weekly Review (Friday)
- Review progress against roadmap
- Update stakeholders on status
- Adjust priorities if needed

### Stakeholder Updates
- **Weekly:** Email update to management
- **Bi-weekly:** Demo of completed features
- **Monthly:** Roadmap review and adjustment

---

## Budget Tracking

### Week 1 Costs
- **Recruiting:** $500-1,000 (job board fees)
- **WhatsApp Gateway:** $50-100 (trial/testing)
- **Infrastructure:** $200-300 (AWS, staging environment)
- **Total:** $750-1,400

### Month 1 Projected Costs
- **Engineering Team:** $0 (hiring in progress)
- **Recruiting:** $2,000-3,000
- **Infrastructure:** $1,000-2,000
- **Tools/Software:** $500-1,000
- **Total:** $3,500-6,000

---

## Notes & Decisions

### Decision Log

**2026-05-03:**
- Prioritized Daily Report Generator (M4) as highest priority due to customer-facing nature
- Decided to resolve dual employee system before major feature work
- Selected WhatsApp as primary notification channel per PRD
- Established 60% test coverage target for production readiness

---

**Document Version:** 1.0
**Last Updated:** May 3, 2026
**Next Review:** Daily during Week 1
