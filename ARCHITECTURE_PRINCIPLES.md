# HERO Architecture Principles & Technical Decisions

**Company:** PT Chitra Paratama
**Project:** HERO - Hub for Employee Reporting & Operations
**Date:** May 3, 2026
**Prepared by:** CTO

---

## Purpose

This document establishes the architectural principles and technical decisions that guide HERO's development. All engineers must understand and follow these principles to maintain consistency, quality, and long-term maintainability.

---

## Core Principles

### 1. Mobile-First, Always

**Principle:** Every feature must work seamlessly on mobile before desktop optimization.

**Rationale:**
- 500+ field workers primarily use mobile devices (Android phones)
- Desktop is secondary for managers and executives
- Poor mobile UX = system failure

**Implementation Guidelines:**
- Design mobile layouts first, then adapt for desktop
- Touch-friendly UI (minimum 44px tap targets)
- Optimize for slow 3G/4G connections
- Test on real devices, not just browser DevTools
- Progressive Web App (PWA) for offline capability
- Photo compression (max 500KB per image)
- GPS validation for location-based features

**Code Example:**
```tsx
// ✅ Good: Mobile-first responsive design
<Button className="w-full md:w-auto min-h-[44px]">
  Submit Activity
</Button>

// ❌ Bad: Desktop-first, small tap targets
<Button className="px-2 py-1">Submit</Button>
```

**Testing Requirements:**
- All features must pass mobile testing before PR approval
- Test on actual Android devices (not just emulators)
- Verify offline functionality for critical flows

---

### 2. Boring Technology Wins

**Principle:** Choose proven, stable technologies over bleeding-edge frameworks.

**Rationale:**
- Minimize technical risk
- Maximize team velocity (easier to hire, easier to learn)
- Ensure long-term maintainability
- Reduce debugging time

**Technology Choices:**

| Category | Choice | Why |
|----------|--------|-----|
| **Framework** | Next.js 16 | Industry standard, excellent docs, large community |
| **Language** | TypeScript | Type safety, refactoring confidence, IDE support |
| **Database** | PostgreSQL | Battle-tested, ACID compliance, rich ecosystem |
| **ORM** | Drizzle | Type-safe, lightweight, SQL-first approach |
| **Auth** | Better Auth | Modern, flexible, well-documented |
| **UI** | Tailwind CSS + shadcn/ui | Utility-first, fast iteration, accessible components |
| **Testing** | Jest/Vitest + Playwright | Standard tools, good TypeScript support |

**What We Avoid:**
- ❌ Experimental frameworks (Svelte, Solid, Qwik)
- ❌ NoSQL databases for transactional data
- ❌ Custom-built solutions when proven libraries exist
- ❌ Microservices (monolith is simpler for our scale)

---

### 3. Database-First Design

**Principle:** Schema changes go through migrations. No ad-hoc ALTER TABLE in production.

**Rationale:**
- Data integrity is critical for HR/payroll systems
- Audit trail required for compliance
- Rollback capability for failed deployments
- Team coordination on schema changes

**Process:**

1. **Design schema changes** in Drizzle schema files
   ```typescript
   // db/schema/hero.ts
   export const heroActivities = pgTable('hero_daily_activities', {
     id: uuid('id').primaryKey().defaultRandom(),
     userId: uuid('user_id').notNull().references(() => users.id),
     // ... other fields
   });
   ```

2. **Generate migration**
   ```bash
   npm run db:generate
   ```

3. **Review migration SQL**
   - Check for data loss risks
   - Verify indexes are created
   - Ensure foreign keys are correct

4. **Test in staging**
   ```bash
   npm run db:push  # staging environment
   ```

5. **Apply to production** with rollback plan
   ```bash
   npm run db:migrate  # production
   ```

**Migration Guidelines:**
- ✅ Always add columns as nullable first, then backfill, then make NOT NULL
- ✅ Create indexes concurrently in PostgreSQL (avoid table locks)
- ✅ Test migrations on production-sized datasets
- ❌ Never drop columns without a deprecation period
- ❌ Never rename columns directly (add new, migrate data, drop old)

---

### 4. API-First Development

**Principle:** All business logic exposed via API routes. Frontend is a thin client.

**Rationale:**
- Enables future mobile apps (native iOS/Android)
- Supports third-party integrations
- Allows API consumers (reporting tools, analytics)
- Separates concerns (backend logic vs. UI)

**API Standards:**

**RESTful Conventions:**
```
GET    /api/activities          # List activities
GET    /api/activities/:id      # Get single activity
POST   /api/activities          # Create activity
PATCH  /api/activities/:id      # Update activity
DELETE /api/activities/:id      # Delete activity
```

**Consistent Error Responses:**
```typescript
// ✅ Good: Structured error response
return NextResponse.json(
  { error: 'Activity not found', code: 'ACTIVITY_NOT_FOUND' },
  { status: 404 }
);

// ❌ Bad: Plain text error
return new Response('Not found', { status: 404 });
```

**API Versioning:**
- Start with `/api/v1/...` when breaking changes are anticipated
- For now, `/api/...` is acceptable (v1 implicit)

**Rate Limiting:**
- Implement per-user rate limits (100 requests/minute)
- Stricter limits for expensive operations (10 reports/hour)

**Documentation:**
- OpenAPI/Swagger spec for all endpoints
- Example requests and responses
- Authentication requirements

---

### 5. Security by Default

**Principle:** Security is not optional. Every feature must consider authentication, authorization, and data protection.

**Security Checklist:**

**Authentication:**
- ✅ Better Auth for session management
- ✅ Secure cookies (httpOnly, secure, sameSite)
- ✅ Password hashing (bcrypt via Better Auth)
- ✅ Email verification for new accounts
- 🔄 2FA/MFA (schema ready, implementation pending)

**Authorization:**
- ✅ Role-Based Access Control (RBAC)
- ✅ Check permissions on every API route
- ✅ Site-scoped data access (users only see their site)
- ✅ Audit logging for sensitive operations

**Data Protection:**
- ✅ Input validation at API boundaries (Zod schemas)
- ✅ SQL injection prevention (Drizzle parameterized queries)
- ✅ XSS prevention (React auto-escaping)
- 🔄 CSRF protection (pending implementation)
- ✅ Secrets in environment variables, never in code
- ✅ HTTPS only in production

**Code Example:**
```typescript
// ✅ Good: Authorization check
export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check permission
  const hasPermission = await checkPermission(session.user.id, 'view_activities');
  if (!hasPermission) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Proceed with logic
}

// ❌ Bad: No authorization check
export async function GET(req: Request) {
  const activities = await db.select().from(heroActivities);
  return NextResponse.json(activities);
}
```

**Security Headers:**
```typescript
// next.config.ts
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Content-Security-Policy', value: "default-src 'self'; ..." },
];
```

---

### 6. Test Coverage Targets

**Principle:** Minimum 60% test coverage for critical paths before production.

**Coverage Targets:**

| Code Type | Target | Priority |
|-----------|--------|----------|
| Business logic (lib/) | 80%+ | Critical |
| API routes | 70%+ | High |
| React components | 50%+ | Medium |
| E2E critical flows | 100% | Critical |

**Testing Strategy:**

**Unit Tests (Jest/Vitest):**
```typescript
// lib/points-calculator.test.ts
describe('calculateActivityPoints', () => {
  it('should calculate base points correctly', () => {
    const points = calculateActivityPoints({
      basePoints: 10,
      complexityLevel: 1,
      isOnTime: true,
    });
    expect(points).toBe(12); // 10 base + 2 on-time bonus
  });

  it('should apply complexity multiplier', () => {
    const points = calculateActivityPoints({
      basePoints: 10,
      complexityLevel: 5,
      isOnTime: false,
    });
    expect(points).toBe(15); // 10 base * 1.5 (level 5 multiplier)
  });
});
```

**Integration Tests (API routes):**
```typescript
// app/api/activities/route.test.ts
describe('POST /api/activities', () => {
  it('should create activity with valid data', async () => {
    const response = await POST(new Request('http://localhost/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Activity', basePoints: 10 }),
    }));

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.id).toBeDefined();
  });

  it('should reject invalid data', async () => {
    const response = await POST(new Request('http://localhost/api/activities', {
      method: 'POST',
      body: JSON.stringify({ name: '' }), // Invalid: empty name
    }));

    expect(response.status).toBe(400);
  });
});
```

**E2E Tests (Playwright):**
```typescript
// tests/e2e/activity-submission.spec.ts
test('employee can submit activity', async ({ page }) => {
  await page.goto('/mobile/activity');
  await page.fill('[name="activityName"]', 'Equipment Inspection');
  await page.fill('[name="duration"]', '30');
  await page.click('button:has-text("Submit")');

  await expect(page.locator('text=Activity submitted')).toBeVisible();
});
```

**Testing Requirements:**
- ✅ All new features must include tests
- ✅ PRs with <60% coverage are blocked
- ✅ E2E tests run on every deployment
- ✅ Flaky tests are fixed immediately (not skipped)

---

### 7. Performance Budgets

**Principle:** Enforce performance budgets to maintain fast user experience.

**Performance Targets:**

| Metric | Target | Measurement |
|--------|--------|-------------|
| First Contentful Paint (FCP) | <1.5s | Lighthouse, Web Vitals |
| Largest Contentful Paint (LCP) | <2.5s | Lighthouse, Web Vitals |
| Time to Interactive (TTI) | <3.5s | Lighthouse |
| Cumulative Layout Shift (CLS) | <0.1 | Web Vitals |
| API response time (p95) | <500ms | Sentry, custom monitoring |
| Database query time (p95) | <100ms | PostgreSQL slow query log |

**Performance Optimization Strategies:**

**1. Code Splitting:**
```typescript
// ✅ Good: Dynamic import for heavy components
const HeavyChart = dynamic(() => import('@/components/heavy-chart'), {
  loading: () => <Skeleton />,
  ssr: false,
});

// ❌ Bad: Import everything upfront
import HeavyChart from '@/components/heavy-chart';
```

**2. Image Optimization:**
```tsx
// ✅ Good: Next.js Image with optimization
import Image from 'next/image';
<Image src="/photo.jpg" width={800} height={600} alt="Activity" />

// ❌ Bad: Regular img tag
<img src="/photo.jpg" alt="Activity" />
```

**3. Database Query Optimization:**
```typescript
// ✅ Good: Select only needed columns
const activities = await db
  .select({ id: heroActivities.id, name: heroActivities.name })
  .from(heroActivities)
  .where(eq(heroActivities.userId, userId))
  .limit(20);

// ❌ Bad: Select all columns
const activities = await db.select().from(heroActivities);
```

**4. Caching Strategy:**
```typescript
// ✅ Good: Cache expensive operations
import { unstable_cache } from 'next/cache';

const getActivityLibrary = unstable_cache(
  async (departmentId: string) => {
    return await db.select().from(heroActivityLibraries)
      .where(eq(heroActivityLibraries.departmentId, departmentId));
  },
  ['activity-library'],
  { revalidate: 3600 } // 1 hour
);

// ❌ Bad: No caching
const getActivityLibrary = async (departmentId: string) => {
  return await db.select().from(heroActivityLibraries);
};
```

**Monitoring:**
- ✅ Web Vitals tracking in production
- ✅ Sentry performance monitoring
- ✅ Database slow query log (queries >100ms)
- ✅ Weekly performance review

---

### 8. Incremental Rollout Strategy

**Principle:** Deploy to pilot site first, then gradual rollout to all sites.

**Rollout Phases:**

**Phase 1: Pilot (1 site, 50 users) - Week 18-20**
- Select stable site with engaged management
- Deploy with feature flags for easy rollback
- Daily monitoring and bug fixes
- Collect user feedback

**Phase 2: Beta (3 sites, 150 users) - Week 21-24**
- Add 2 more diverse sites (different operations)
- Monitor performance at scale
- Refine based on pilot learnings
- Train site administrators

**Phase 3: General Availability (all sites, 500+ users) - Week 25+**
- Gradual rollout to remaining sites (1-2 per week)
- Full monitoring and support
- Continuous improvement based on feedback

**Feature Flags:**
```typescript
// lib/feature-flags.ts
export const featureFlags = {
  dailyReportGenerator: process.env.FEATURE_DAILY_REPORTS === 'true',
  whatsappNotifications: process.env.FEATURE_WHATSAPP === 'true',
  advancedAnalytics: process.env.FEATURE_ANALYTICS === 'true',
};

// Usage in code
if (featureFlags.dailyReportGenerator) {
  // Show daily report feature
}
```

**Rollback Plan:**
- Database migrations are reversible
- Feature flags for instant disable
- Blue-green deployment for zero downtime
- Automated rollback on error rate spike

---

## Technical Decisions (ADRs)

### ADR-001: Use Drizzle ORM instead of Prisma

**Status:** Accepted
**Date:** 2026-04-15

**Context:**
Need a type-safe ORM for PostgreSQL with good TypeScript support.

**Decision:**
Use Drizzle ORM instead of Prisma.

**Rationale:**
- Drizzle is SQL-first (easier to optimize queries)
- Lighter weight (smaller bundle size)
- Better TypeScript inference
- No schema generation step (faster iteration)
- Direct SQL access when needed

**Consequences:**
- Smaller community than Prisma
- Fewer third-party integrations
- Team needs to learn Drizzle syntax

---

### ADR-002: Separate /mobile routes instead of responsive-only

**Status:** Accepted
**Date:** 2026-04-10

**Context:**
Need to optimize for mobile users (80% of traffic) while supporting desktop.

**Decision:**
Create separate `/mobile` routes with dedicated layouts and components.

**Rationale:**
- Mobile-specific optimizations (smaller bundles, touch-first UI)
- Easier to maintain separate UX patterns
- Better performance (no desktop code loaded on mobile)
- Clearer separation of concerns

**Consequences:**
- Some code duplication between mobile and desktop
- Need to maintain two sets of routes
- Redirect logic required based on device detection

---

### ADR-003: Use Better Auth instead of NextAuth

**Status:** Accepted
**Date:** 2026-04-08

**Context:**
Need authentication solution for Next.js 15+ with App Router support.

**Decision:**
Use Better Auth instead of NextAuth.

**Rationale:**
- Better App Router support (NextAuth v5 still beta)
- More flexible (easier to customize)
- Better TypeScript support
- Simpler API
- Active development

**Consequences:**
- Smaller community than NextAuth
- Fewer third-party provider integrations
- Need to implement some features manually

---

### ADR-004: Monolith architecture instead of microservices

**Status:** Accepted
**Date:** 2026-04-05

**Context:**
Decide on overall system architecture for HERO.

**Decision:**
Build as a monolithic Next.js application, not microservices.

**Rationale:**
- Simpler deployment and operations
- Easier to develop and debug
- Lower infrastructure costs
- Sufficient for 500-1000 users
- Can extract services later if needed

**Consequences:**
- All code in one repository
- Shared database (no service isolation)
- Scaling requires scaling entire app
- Easier to maintain with small team

---

### ADR-005: PostgreSQL instead of MySQL

**Status:** Accepted
**Date:** 2026-04-01

**Context:**
Choose relational database for HERO.

**Decision:**
Use PostgreSQL instead of MySQL.

**Rationale:**
- Better JSON support (for flexible fields)
- More advanced features (CTEs, window functions)
- Better full-text search
- ACID compliance
- Strong community and ecosystem

**Consequences:**
- Team needs PostgreSQL expertise
- Slightly higher resource usage than MySQL
- Excellent Drizzle ORM support

---

## Code Style Guidelines

### TypeScript

**Use strict mode:**
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true
  }
}
```

**Prefer interfaces over types for objects:**
```typescript
// ✅ Good
interface Activity {
  id: string;
  name: string;
  basePoints: number;
}

// ❌ Avoid (unless union/intersection needed)
type Activity = {
  id: string;
  name: string;
  basePoints: number;
};
```

**Use Zod for runtime validation:**
```typescript
import { z } from 'zod';

const activitySchema = z.object({
  name: z.string().min(1).max(100),
  basePoints: z.number().int().min(0).max(1000),
  complexityLevel: z.number().int().min(1).max(5),
});

export type Activity = z.infer<typeof activitySchema>;
```

### React Components

**Use Server Components by default:**
```typescript
// ✅ Good: Server Component (default)
export default async function ActivityPage() {
  const activities = await getActivities();
  return <ActivityList activities={activities} />;
}

// Only use 'use client' when needed
'use client';
export function InteractiveButton() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

**Prefer composition over props drilling:**
```typescript
// ✅ Good: Composition
<Card>
  <CardHeader>
    <CardTitle>Activity</CardTitle>
  </CardHeader>
  <CardContent>
    {/* content */}
  </CardContent>
</Card>

// ❌ Bad: Props drilling
<Card title="Activity" content={<div>...</div>} />
```

### File Naming

```
components/
  activity-card.tsx          # kebab-case for files
  ActivityCard.tsx           # PascalCase also acceptable
lib/
  activity-data.ts           # kebab-case for utilities
  points-calculator.ts
app/
  dashboard/
    activity-hub/
      page.tsx               # Next.js convention
      layout.tsx
```

---

## Deployment Guidelines

### Environment Variables

**Required for all environments:**
```env
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=https://...
NEXT_PUBLIC_BETTER_AUTH_URL=https://...
```

**Production-specific:**
```env
NODE_ENV=production
AWS_S3_BUCKET=hero-production
SENTRY_DSN=https://...
```

### Deployment Checklist

**Before deploying to production:**
- [ ] All tests passing
- [ ] Database migrations tested in staging
- [ ] Environment variables configured
- [ ] Monitoring and alerting set up
- [ ] Backup strategy in place
- [ ] Rollback plan documented
- [ ] Team notified of deployment window

**After deployment:**
- [ ] Smoke tests passed
- [ ] Monitoring shows healthy metrics
- [ ] No error spikes in Sentry
- [ ] User-facing features working
- [ ] Database migrations applied successfully

---

## Conclusion

These principles and decisions guide HERO's development toward a maintainable, scalable, and secure system. All engineers must understand and follow these guidelines.

**Key Takeaways:**
1. **Mobile-first** - Field workers are our primary users
2. **Boring technology** - Proven tools over bleeding-edge
3. **Security by default** - Every feature considers auth/authz
4. **Test coverage** - 60%+ before production
5. **Performance budgets** - Fast UX is non-negotiable

**Questions or Concerns:**
Contact CTO for clarification or to propose changes to these principles.

---

**Document Version:** 1.0
**Last Updated:** May 3, 2026
**Next Review:** Monthly or when major architectural decisions are needed
