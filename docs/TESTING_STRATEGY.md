# Testing Strategy

## Overview

This document outlines the testing strategy for the HERO application, including testing types, tools, conventions, and best practices.

## Testing Philosophy

- **Test behavior, not implementation** - Focus on what the code does, not how it does it
- **Write tests that provide value** - Prioritize tests that catch real bugs
- **Keep tests simple and readable** - Tests should be easy to understand and maintain
- **Fast feedback loops** - Tests should run quickly to enable rapid development
- **Test at the right level** - Use the appropriate testing type for each scenario

## Testing Pyramid

```
        /\
       /  \
      / E2E \
     /--------\
    /          \
   / Integration \
  /--------------\
 /                \
/   Unit Tests     \
--------------------
```

- **70% Unit Tests** - Fast, isolated tests for functions and components
- **20% Integration Tests** - Test interactions between modules
- **10% E2E Tests** - Full user journey tests (future implementation)

## Testing Tools

- **Jest** - Test runner and assertion library
- **React Testing Library** - Component testing
- **ts-jest** - TypeScript support for Jest
- **@testing-library/user-event** - User interaction simulation
- **@testing-library/jest-dom** - Custom DOM matchers

## Test Structure

### Directory Organization

```
project-root/
├── app/
│   └── __tests__/           # Tests for app routes
├── components/
│   └── __tests__/           # Component tests
├── lib/
│   └── __tests__/           # Utility function tests
├── db/
│   └── __tests__/           # Database query tests
└── tests/
    ├── unit/                # Additional unit tests
    ├── integration/         # Integration tests
    └── fixtures/            # Test data and mocks
```

### File Naming Convention

- Unit tests: `*.test.ts` or `*.test.tsx`
- Integration tests: `*.integration.test.ts`
- Test utilities: `*.utils.ts`
- Fixtures: `*.fixture.ts`

## Unit Testing

### What to Test

- **Utility functions** - Pure functions with clear inputs/outputs
- **Business logic** - Calculations, validations, transformations
- **React components** - Rendering, props, user interactions
- **Hooks** - Custom React hooks
- **Type guards** - Type checking functions

### Unit Test Examples

#### Testing Utility Functions

```typescript
// lib/__tests__/date-utils.test.ts
import { formatDate, isWeekend, addBusinessDays } from '../date-utils'

describe('date-utils', () => {
  describe('formatDate', () => {
    it('should format date in default format', () => {
      const date = new Date('2026-05-03')
      expect(formatDate(date)).toBe('May 3, 2026')
    })

    it('should format date with custom format', () => {
      const date = new Date('2026-05-03')
      expect(formatDate(date, 'yyyy-MM-dd')).toBe('2026-05-03')
    })
  })

  describe('isWeekend', () => {
    it('should return true for Saturday', () => {
      const saturday = new Date('2026-05-02') // Saturday
      expect(isWeekend(saturday)).toBe(true)
    })

    it('should return false for Monday', () => {
      const monday = new Date('2026-05-04') // Monday
      expect(isWeekend(monday)).toBe(false)
    })
  })
})
```

#### Testing React Components

```typescript
// components/__tests__/Button.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '../ui/button'

describe('Button', () => {
  it('should render with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('should call onClick when clicked', async () => {
    const handleClick = jest.fn()
    const user = userEvent.setup()

    render(<Button onClick={handleClick}>Click me</Button>)
    await user.click(screen.getByRole('button'))

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('should apply variant styles', () => {
    render(<Button variant="destructive">Delete</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('destructive')
  })
})
```

#### Testing Custom Hooks

```typescript
// hooks/__tests__/useDebounce.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { useDebounce } from '../useDebounce'

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should debounce value changes', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    )

    expect(result.current).toBe('initial')

    rerender({ value: 'updated', delay: 500 })
    expect(result.current).toBe('initial') // Still old value

    jest.advanceTimersByTime(500)
    await waitFor(() => {
      expect(result.current).toBe('updated')
    })
  })
})
```

## Integration Testing

### What to Test

- **API routes** - Request/response handling
- **Database operations** - CRUD operations with real database
- **Authentication flows** - Login, logout, session management
- **Form submissions** - End-to-end form handling
- **Multi-component interactions** - Components working together

### Integration Test Examples

#### Testing API Routes

```typescript
// app/api/__tests__/users.integration.test.ts
import { POST, GET } from '../users/route'
import { db } from '@/db'
import { users } from '@/db/schema'

describe('Users API', () => {
  beforeEach(async () => {
    // Clean database before each test
    await db.delete(users)
  })

  describe('POST /api/users', () => {
    it('should create a new user', async () => {
      const request = new Request('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          name: 'Test User',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.email).toBe('test@example.com')
      expect(data.name).toBe('Test User')
    })

    it('should return 400 for invalid email', async () => {
      const request = new Request('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify({
          email: 'invalid-email',
          name: 'Test User',
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })
  })
})
```

#### Testing Database Operations

```typescript
// lib/__tests__/user-queries.integration.test.ts
import { db } from '@/db'
import { users } from '@/db/schema'
import { createUser, getUserById, updateUser, deleteUser } from '../user-queries'

describe('User Queries', () => {
  let testUserId: string

  beforeEach(async () => {
    await db.delete(users)
  })

  describe('createUser', () => {
    it('should create user and return user object', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
      }

      const user = await createUser(userData)

      expect(user).toMatchObject(userData)
      expect(user.id).toBeDefined()
      expect(user.createdAt).toBeInstanceOf(Date)
    })
  })

  describe('getUserById', () => {
    beforeEach(async () => {
      const user = await createUser({
        email: 'test@example.com',
        name: 'Test User',
      })
      testUserId = user.id
    })

    it('should return user when found', async () => {
      const user = await getUserById(testUserId)
      expect(user).toBeDefined()
      expect(user?.id).toBe(testUserId)
    })

    it('should return null when not found', async () => {
      const user = await getUserById('non-existent-id')
      expect(user).toBeNull()
    })
  })
})
```

## Test Data Management

### Fixtures

Create reusable test data:

```typescript
// tests/fixtures/users.fixture.ts
export const mockUser = {
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  createdAt: new Date('2026-01-01'),
}

export const mockUsers = [
  mockUser,
  {
    id: '2',
    email: 'admin@example.com',
    name: 'Admin User',
    createdAt: new Date('2026-01-01'),
  },
]

export const createMockUser = (overrides = {}) => ({
  ...mockUser,
  ...overrides,
})
```

### Factory Functions

```typescript
// tests/fixtures/factories.ts
let userIdCounter = 1

export const buildUser = (overrides = {}) => ({
  id: String(userIdCounter++),
  email: `user${userIdCounter}@example.com`,
  name: `User ${userIdCounter}`,
  createdAt: new Date(),
  ...overrides,
})
```

## Mocking

### Mocking External Dependencies

```typescript
// __tests__/email-service.test.ts
import { sendEmail } from '../email-service'
import nodemailer from 'nodemailer'

jest.mock('nodemailer')

describe('sendEmail', () => {
  it('should send email with correct parameters', async () => {
    const mockSendMail = jest.fn().mockResolvedValue({ messageId: '123' })
    ;(nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: mockSendMail,
    })

    await sendEmail({
      to: 'test@example.com',
      subject: 'Test',
      body: 'Test body',
    })

    expect(mockSendMail).toHaveBeenCalledWith({
      to: 'test@example.com',
      subject: 'Test',
      text: 'Test body',
    })
  })
})
```

### Mocking Database

```typescript
// __tests__/user-service.test.ts
import { getUserById } from '../user-service'
import { db } from '@/db'

jest.mock('@/db', () => ({
  db: {
    query: {
      users: {
        findFirst: jest.fn(),
      },
    },
  },
}))

describe('getUserById', () => {
  it('should return user from database', async () => {
    const mockUser = { id: '1', email: 'test@example.com' }
    ;(db.query.users.findFirst as jest.Mock).mockResolvedValue(mockUser)

    const user = await getUserById('1')
    expect(user).toEqual(mockUser)
  })
})
```

## Coverage Requirements

### Minimum Coverage Thresholds

- **Branches:** 70%
- **Functions:** 70%
- **Lines:** 70%
- **Statements:** 70%

### Critical Path Coverage

The following areas require **90%+ coverage**:

- Authentication and authorization
- Payment processing
- Data mutations (create, update, delete)
- Security-sensitive operations
- Business logic calculations

### Viewing Coverage Reports

```bash
npm run test:coverage
```

Coverage reports are generated in `coverage/` directory:
- `coverage/lcov-report/index.html` - HTML report
- `coverage/lcov.info` - LCOV format for CI tools

## Best Practices

### DO

✅ Write descriptive test names that explain the scenario
✅ Follow AAA pattern (Arrange, Act, Assert)
✅ Test one thing per test
✅ Use meaningful variable names
✅ Clean up after tests (database, mocks, timers)
✅ Test edge cases and error conditions
✅ Keep tests independent and isolated
✅ Use data-testid sparingly (prefer semantic queries)

### DON'T

❌ Test implementation details
❌ Write tests that depend on other tests
❌ Use random data that makes tests flaky
❌ Mock everything (test real integrations when possible)
❌ Write tests just to increase coverage
❌ Ignore failing tests
❌ Commit commented-out tests

## Running Tests

### Local Development

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- user-service.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should create user"
```

### CI/CD

Tests run automatically on:
- Every push to `main` or `develop`
- Every pull request
- Before deployment

## Debugging Tests

### VSCode Debugging

Add to `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Jest Debug",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand", "--no-cache"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### Debug Single Test

```typescript
it.only('should debug this test', () => {
  // This test will run in isolation
})
```

## Future Enhancements

- [ ] E2E testing with Playwright
- [ ] Visual regression testing
- [ ] Performance testing
- [ ] Load testing
- [ ] Accessibility testing
- [ ] Contract testing for APIs

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

**Last Updated:** 2026-05-03
