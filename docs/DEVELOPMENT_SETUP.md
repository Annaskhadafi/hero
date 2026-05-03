# Development Environment Setup Guide

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Development Workflow](#development-workflow)
4. [Git Workflow](#git-workflow)
5. [Code Quality Standards](#code-quality-standards)
6. [Testing Strategy](#testing-strategy)
7. [CI/CD Pipeline](#cicd-pipeline)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

Before starting development, ensure you have the following installed:

- **Node.js** 20.x or higher ([Download](https://nodejs.org/))
- **npm** 10.x or higher (comes with Node.js)
- **Docker Desktop** ([Download](https://www.docker.com/products/docker-desktop))
- **Git** ([Download](https://git-scm.com/))
- **VSCode** (recommended) with the following extensions:
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - Docker
  - GitLens

## Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Annaskhadafi/hero.git
cd hero
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your local configuration:

```env
# Database Configuration (defaults work with Docker)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

# Authentication
BETTER_AUTH_SECRET=your_local_secret_key_here
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000
```

### 4. Start the Database

```bash
npm run db:up
```

This starts PostgreSQL in a Docker container.

### 5. Initialize the Database Schema

```bash
npm run db:push
```

### 6. Start the Development Server

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

## Development Workflow

### Daily Development

1. **Pull latest changes**
   ```bash
   git pull origin main
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Make your changes** and test locally

5. **Run code quality checks**
   ```bash
   npm run validate
   ```

6. **Commit your changes** (see Git Workflow below)

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with Turbopack |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint errors automatically |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check code formatting |
| `npm run type-check` | Run TypeScript type checking |
| `npm test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run validate` | Run all checks (format, lint, type-check, test) |
| `npm run db:up` | Start PostgreSQL container |
| `npm run db:down` | Stop PostgreSQL container |
| `npm run db:push` | Push schema changes to database |
| `npm run db:studio` | Open Drizzle Studio (database GUI) |
| `npm run db:generate` | Generate migration files |
| `npm run db:migrate` | Run migrations |

## Git Workflow

### Branching Strategy

We follow a simplified Git Flow:

- **`main`** - Production-ready code
- **`develop`** - Integration branch for features (optional)
- **`feature/*`** - New features
- **`fix/*`** - Bug fixes
- **`hotfix/*`** - Urgent production fixes
- **`refactor/*`** - Code refactoring
- **`docs/*`** - Documentation updates

### Branch Naming Convention

```
feature/user-authentication
fix/login-validation-error
hotfix/critical-security-patch
refactor/database-queries
docs/api-documentation
```

### Commit Message Convention

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `ci`: CI/CD changes

**Examples:**

```bash
git commit -m "feat(auth): add password reset functionality"
git commit -m "fix(ui): resolve mobile navigation overflow issue"
git commit -m "docs: update development setup guide"
```

### Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes and commit**
   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```

3. **Push to remote**
   ```bash
   git push -u origin feature/your-feature-name
   ```

4. **Create a Pull Request** on GitHub
   - Use the PR template
   - Fill in all required sections
   - Link related issues
   - Request reviews from team members

5. **Address review comments**
   - Make requested changes
   - Push additional commits
   - Re-request review

6. **Merge** after approval
   - Squash and merge (preferred for feature branches)
   - Merge commit (for release branches)

### Code Review Guidelines

**For Authors:**
- Keep PRs small and focused (< 400 lines changed)
- Write clear PR descriptions
- Add screenshots for UI changes
- Ensure all CI checks pass
- Respond to feedback promptly

**For Reviewers:**
- Review within 24 hours
- Be constructive and specific
- Test the changes locally if needed
- Approve only when confident

## Code Quality Standards

### ESLint

ESLint is configured to enforce code quality and consistency. Run before committing:

```bash
npm run lint
npm run lint:fix  # Auto-fix issues
```

### Prettier

Prettier handles code formatting. VSCode is configured to format on save.

```bash
npm run format        # Format all files
npm run format:check  # Check formatting
```

### TypeScript

All code must pass TypeScript type checking:

```bash
npm run type-check
```

### Pre-commit Checklist

Before committing, ensure:

- [ ] Code is formatted (`npm run format`)
- [ ] No linting errors (`npm run lint`)
- [ ] TypeScript compiles (`npm run type-check`)
- [ ] Tests pass (`npm test`)
- [ ] No console.log statements (unless intentional)
- [ ] No commented-out code
- [ ] Environment variables are not hardcoded

Run all checks at once:

```bash
npm run validate
```

## Testing Strategy

### Test Structure

```
tests/
├── unit/           # Unit tests for functions and utilities
├── integration/    # Integration tests for API routes
└── e2e/           # End-to-end tests (future)
```

### Writing Tests

**Unit Test Example:**

```typescript
// lib/__tests__/utils.test.ts
import { formatDate } from '../utils'

describe('formatDate', () => {
  it('should format date correctly', () => {
    const date = new Date('2026-05-03')
    expect(formatDate(date)).toBe('May 3, 2026')
  })
})
```

**Component Test Example:**

```typescript
// components/__tests__/Button.test.tsx
import { render, screen } from '@testing-library/react'
import { Button } from '../ui/button'

describe('Button', () => {
  it('should render button with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })
})
```

### Running Tests

```bash
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # With coverage report
```

### Coverage Requirements

- **Minimum coverage:** 70% for branches, functions, lines, and statements
- **Critical paths:** 90%+ coverage (authentication, payments, data mutations)

## CI/CD Pipeline

### Continuous Integration

GitHub Actions runs automatically on:
- Push to `main` or `develop`
- Pull requests to `main` or `develop`

**CI Pipeline includes:**
1. **Lint** - ESLint checks
2. **Type Check** - TypeScript compilation
3. **Build** - Next.js build
4. **Test** - Jest test suite with PostgreSQL

### Continuous Deployment

Deployment happens automatically when code is merged to `main`:

1. **Build** - Application is built
2. **Deploy** - Deployed to production environment

**Environment Variables Required:**
- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `NEXT_PUBLIC_BETTER_AUTH_URL`

## Troubleshooting

### Database Connection Issues

**Problem:** Cannot connect to PostgreSQL

**Solution:**
```bash
# Check if container is running
docker ps

# Restart database
npm run db:down
npm run db:up

# Check logs
docker logs hero-postgres-1
```

### Port Already in Use

**Problem:** Port 3000 or 5432 already in use

**Solution:**
```bash
# Find process using port
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3000 | xargs kill -9
```

### Module Not Found Errors

**Problem:** Import errors after pulling changes

**Solution:**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors

**Problem:** Type errors in IDE

**Solution:**
```bash
# Restart TypeScript server in VSCode
# Cmd/Ctrl + Shift + P -> "TypeScript: Restart TS Server"

# Or rebuild TypeScript
npm run type-check
```

### Build Failures

**Problem:** Build fails locally

**Solution:**
```bash
# Clear Next.js cache
rm -rf .next

# Rebuild
npm run build
```

## Getting Help

- **Documentation:** Check the [README.md](../README.md)
- **Issues:** Search [GitHub Issues](https://github.com/Annaskhadafi/hero/issues)
- **Team:** Ask in the team chat or create a discussion

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [Better Auth Docs](https://better-auth.com/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)

---

**Last Updated:** 2026-05-03
