# HERO - Hub for Employee Reporting & Operations

A modern, full-stack employee management and HR operations platform built with Next.js 15, TypeScript, and PostgreSQL.

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

# Initialize database schema
npm run db:push

# Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 📚 Documentation

- **[Development Setup Guide](docs/DEVELOPMENT_SETUP.md)** - Complete onboarding guide for new engineers
- **[Git Workflow](docs/GIT_WORKFLOW.md)** - Branching strategy, commit conventions, and PR process
- **[Testing Strategy](docs/TESTING_STRATEGY.md)** - Testing philosophy, tools, and best practices
- **[API Documentation](docs/)** - API endpoints and usage (coming soon)

## 🛠️ Tech Stack

### Core
- **Framework:** [Next.js 15](https://nextjs.org/) with App Router and Turbopack
- **Language:** TypeScript 5
- **Database:** PostgreSQL with [Drizzle ORM](https://orm.drizzle.team/)
- **Authentication:** [Better Auth](https://better-auth.com/)

### UI & Styling
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Components:** [shadcn/ui](https://ui.shadcn.com/) (40+ components)
- **Icons:** [Lucide React](https://lucide.dev/), [Tabler Icons](https://tabler.io/icons)
- **Theme:** Dark mode with [next-themes](https://github.com/pacocoursey/next-themes)

### Development Tools
- **Linting:** ESLint with Next.js config
- **Formatting:** Prettier with Tailwind plugin
- **Testing:** Jest + React Testing Library
- **Type Checking:** TypeScript strict mode
- **Containerization:** Docker & Docker Compose

## 📋 Available Scripts

### Development
```bash
npm run dev              # Start development server
npm run build            # Build for production
npm start                # Start production server
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint errors
npm run format           # Format code with Prettier
npm run type-check       # Run TypeScript type checking
npm run validate         # Run all checks (format, lint, type-check, test)
```

### Testing
```bash
npm test                 # Run tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage
```

### Database
```bash
npm run db:up            # Start PostgreSQL container
npm run db:down          # Stop PostgreSQL container
npm run db:push          # Push schema changes
npm run db:generate      # Generate migrations
npm run db:migrate       # Run migrations
npm run db:studio        # Open Drizzle Studio
npm run db:reset         # Reset database
```

### Docker
```bash
npm run docker:build     # Build Docker image
npm run docker:up        # Start full stack
npm run docker:down      # Stop containers
npm run docker:logs      # View logs
```

## 🏗️ Project Structure

```
hero/
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard pages
│   └── (auth)/            # Authentication pages
├── components/            # React components
│   └── ui/               # shadcn/ui components
├── db/                    # Database configuration
│   ├── schema/           # Drizzle schemas
│   └── migrations/       # Database migrations
├── lib/                   # Utility functions
│   ├── auth.ts           # Authentication config
│   └── utils.ts          # Helper functions
├── hooks/                 # Custom React hooks
├── public/               # Static assets
├── scripts/              # Utility scripts
├── tests/                # Test files
├── docs/                 # Documentation
└── docker/               # Docker configuration
```

## 🔐 Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

# Authentication
BETTER_AUTH_SECRET=your_secret_key_here
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000
```

See `.env.example` for all available options.

## 🧪 Testing

We follow a comprehensive testing strategy:

- **Unit Tests** - Functions, utilities, and components
- **Integration Tests** - API routes and database operations
- **Coverage Target** - 70% minimum, 90% for critical paths

```bash
# Run all tests
npm test

# Watch mode for development
npm run test:watch

# Generate coverage report
npm run test:coverage
```

See [Testing Strategy](docs/TESTING_STRATEGY.md) for detailed guidelines.

## 🔄 Git Workflow

We use a simplified Git Flow with conventional commits:

### Branch Types
- `main` - Production-ready code
- `feature/*` - New features
- `fix/*` - Bug fixes
- `hotfix/*` - Urgent production fixes
- `docs/*` - Documentation updates

### Commit Convention
```bash
feat(scope): add new feature
fix(scope): resolve bug
docs: update documentation
```

See [Git Workflow](docs/GIT_WORKFLOW.md) for complete guidelines.

## 🚢 Deployment

### CI/CD Pipeline

GitHub Actions automatically:
- Runs linting and type checking
- Executes test suite
- Builds the application
- Deploys to production (on merge to main)

### Deployment Options

1. **Vercel** (Recommended)
   ```bash
   vercel
   ```

2. **Docker**
   ```bash
   docker build -t hero .
   docker run -p 3000:3000 hero
   ```

3. **VPS/Server**
   ```bash
   npm run docker:up
   ```

See [Development Setup](docs/DEVELOPMENT_SETUP.md) for detailed deployment instructions.

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run validation (`npm run validate`)
5. Commit your changes (`git commit -m 'feat: add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

See [Git Workflow](docs/GIT_WORKFLOW.md) for detailed contribution guidelines.

## 📝 Code Quality

### Automated Checks

All code must pass:
- ✅ ESLint (no errors)
- ✅ Prettier (formatted)
- ✅ TypeScript (no type errors)
- ✅ Tests (passing with coverage)

Run all checks:
```bash
npm run validate
```

### Pre-commit Checklist

- [ ] Code is formatted
- [ ] No linting errors
- [ ] TypeScript compiles
- [ ] Tests pass
- [ ] No console.log statements
- [ ] Documentation updated

## 🔒 Security

- Never commit `.env` files or secrets
- Use environment variables for sensitive data
- Keep dependencies updated (`npm audit`)
- Follow security best practices
- Report vulnerabilities privately

## 📄 License

This project is private and proprietary.

## 👥 Team

- **Development Team** - Full-stack development
- **QA Team** - Testing and quality assurance
- **DevOps Team** - Infrastructure and deployment

## 📞 Support

- **Documentation** - Check the [docs](docs/) folder
- **Issues** - [GitHub Issues](https://github.com/Annaskhadafi/hero/issues)
- **Discussions** - [GitHub Discussions](https://github.com/Annaskhadafi/hero/discussions)

## 🗺️ Roadmap

- [x] Core authentication system
- [x] User management
- [x] Department and organization structure
- [x] Role-based access control
- [ ] Advanced reporting
- [ ] Mobile application
- [ ] API v2
- [ ] Internationalization

## 📊 Project Status

- **Version:** 0.1.0
- **Status:** Active Development
- **Last Updated:** 2026-05-03

---

Built with ❤️ by the HERO Team
