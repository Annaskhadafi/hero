# Git Workflow and Branching Strategy

## Overview

This document defines the Git workflow, branching strategy, and collaboration practices for the HERO project.

## Branching Strategy

We use a simplified Git Flow model optimized for continuous delivery.

### Branch Types

#### Main Branches

- **`main`** - Production-ready code
  - Always deployable
  - Protected branch (requires PR and reviews)
  - Automatically deploys to production
  - Never commit directly to this branch

- **`develop`** (optional) - Integration branch
  - Latest development changes
  - Used for staging deployments
  - Merges into `main` for releases

#### Supporting Branches

- **`feature/*`** - New features and enhancements
  - Branch from: `main` or `develop`
  - Merge into: `main` or `develop`
  - Naming: `feature/user-authentication`, `feature/dashboard-redesign`
  - Deleted after merge

- **`fix/*`** - Bug fixes
  - Branch from: `main` or `develop`
  - Merge into: `main` or `develop`
  - Naming: `fix/login-validation`, `fix/memory-leak`
  - Deleted after merge

- **`hotfix/*`** - Urgent production fixes
  - Branch from: `main`
  - Merge into: `main` (and back-merge to `develop` if exists)
  - Naming: `hotfix/critical-security-patch`, `hotfix/payment-failure`
  - Deleted after merge

- **`refactor/*`** - Code refactoring
  - Branch from: `main` or `develop`
  - Merge into: `main` or `develop`
  - Naming: `refactor/database-queries`, `refactor/component-structure`
  - Deleted after merge

- **`docs/*`** - Documentation updates
  - Branch from: `main`
  - Merge into: `main`
  - Naming: `docs/api-documentation`, `docs/setup-guide`
  - Deleted after merge

- **`test/*`** - Test additions or improvements
  - Branch from: `main` or `develop`
  - Merge into: `main` or `develop`
  - Naming: `test/user-service`, `test/integration-suite`
  - Deleted after merge

## Workflow

### Starting New Work

1. **Update your local main branch**
   ```bash
   git checkout main
   git pull origin main
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Write code
   - Add tests
   - Update documentation

4. **Commit regularly with meaningful messages**
   ```bash
   git add .
   git commit -m "feat(auth): add password reset functionality"
   ```

### Keeping Your Branch Updated

Regularly sync with the main branch to avoid conflicts:

```bash
# Option 1: Rebase (preferred for clean history)
git checkout main
git pull origin main
git checkout feature/your-feature-name
git rebase main

# Option 2: Merge (if rebase is problematic)
git checkout feature/your-feature-name
git merge main
```

### Submitting Your Work

1. **Ensure all checks pass locally**
   ```bash
   npm run validate
   ```

2. **Push your branch**
   ```bash
   git push -u origin feature/your-feature-name
   ```

3. **Create a Pull Request**
   - Go to GitHub repository
   - Click "New Pull Request"
   - Select your branch
   - Fill in the PR template
   - Request reviews

4. **Address review feedback**
   - Make requested changes
   - Commit and push updates
   - Re-request review

5. **Merge after approval**
   - Use "Squash and merge" for feature branches
   - Use "Merge commit" for release branches
   - Delete the branch after merging

## Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type

Must be one of:

- **feat** - New feature
- **fix** - Bug fix
- **docs** - Documentation changes
- **style** - Code style changes (formatting, semicolons, etc.)
- **refactor** - Code refactoring (no functional changes)
- **perf** - Performance improvements
- **test** - Adding or updating tests
- **chore** - Maintenance tasks (dependencies, build, etc.)
- **ci** - CI/CD configuration changes
- **revert** - Revert a previous commit

### Scope (Optional)

The scope specifies the area of the codebase:

- `auth` - Authentication
- `ui` - User interface
- `api` - API routes
- `db` - Database
- `deps` - Dependencies
- `config` - Configuration

### Subject

- Use imperative mood ("add" not "added" or "adds")
- Don't capitalize first letter
- No period at the end
- Maximum 50 characters

### Body (Optional)

- Explain what and why, not how
- Wrap at 72 characters
- Separate from subject with blank line

### Footer (Optional)

- Reference issues: `Closes #123`, `Fixes #456`
- Breaking changes: `BREAKING CHANGE: description`

### Examples

```bash
# Simple feature
git commit -m "feat(auth): add password reset functionality"

# Bug fix with scope
git commit -m "fix(ui): resolve mobile navigation overflow"

# With body
git commit -m "feat(api): add user export endpoint

Implements CSV and JSON export formats for user data.
Includes pagination and filtering options."

# With issue reference
git commit -m "fix(db): prevent duplicate email registration

Closes #234"

# Breaking change
git commit -m "feat(api): change authentication response format

BREAKING CHANGE: Auth endpoints now return { user, token } instead of { data }"
```

## Pull Request Process

### Creating a Pull Request

1. **Use the PR template** - Fill in all sections
2. **Write a clear title** - Follow commit message convention
3. **Describe your changes** - What, why, and how
4. **Link related issues** - Use `Closes #123` or `Fixes #456`
5. **Add screenshots** - For UI changes
6. **Check the boxes** - Complete the checklist
7. **Request reviewers** - Tag appropriate team members
8. **Add labels** - bug, enhancement, documentation, etc.

### PR Title Format

Follow the same convention as commit messages:

```
feat(auth): add two-factor authentication
fix(ui): resolve dashboard loading state
docs: update API documentation
```

### PR Description Template

The template is automatically loaded from `.github/pull_request_template.md`:

- Description of changes
- Type of change
- Related issues
- Testing performed
- Screenshots (if applicable)
- Checklist

### Review Process

#### For Authors

- **Keep PRs small** - Aim for < 400 lines changed
- **One concern per PR** - Don't mix features and refactoring
- **Respond promptly** - Address feedback within 24 hours
- **Be open to feedback** - Reviews improve code quality
- **Update the PR** - Push additional commits as needed
- **Don't force push** - After review has started (makes tracking changes difficult)

#### For Reviewers

- **Review within 24 hours** - Don't block teammates
- **Be constructive** - Suggest improvements, don't just criticize
- **Be specific** - Point to exact lines and explain why
- **Test locally** - For complex changes
- **Approve when confident** - Don't approve if you have concerns
- **Use review features** - Comment, Request Changes, or Approve

### Review Checklist

- [ ] Code follows project conventions
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] No security vulnerabilities introduced
- [ ] Performance impact is acceptable
- [ ] Error handling is appropriate
- [ ] Code is readable and maintainable
- [ ] No unnecessary complexity
- [ ] Breaking changes are documented

### Merge Strategies

#### Squash and Merge (Default)

Use for feature branches:
- Combines all commits into one
- Keeps main branch history clean
- Preserves PR reference

```bash
# GitHub does this automatically
# Results in one commit on main
```

#### Merge Commit

Use for release branches or important milestones:
- Preserves all individual commits
- Shows complete history
- Creates a merge commit

#### Rebase and Merge

Use rarely, only for very clean branches:
- Replays commits on top of main
- No merge commit
- Linear history

## Branch Protection Rules

### Main Branch Protection

- ✅ Require pull request before merging
- ✅ Require 1+ approvals
- ✅ Dismiss stale reviews on new commits
- ✅ Require status checks to pass (CI)
- ✅ Require branches to be up to date
- ✅ Require conversation resolution
- ✅ Require signed commits (optional)
- ✅ Include administrators
- ❌ Allow force pushes
- ❌ Allow deletions

### Status Checks Required

- Lint
- Type Check
- Build
- Tests

## Handling Conflicts

### Preventing Conflicts

- Pull from main frequently
- Keep branches short-lived (< 3 days)
- Communicate with team about overlapping work
- Break large features into smaller PRs

### Resolving Conflicts

1. **Update your branch**
   ```bash
   git checkout main
   git pull origin main
   git checkout feature/your-branch
   git rebase main
   ```

2. **Resolve conflicts**
   - Open conflicted files
   - Look for conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`)
   - Choose the correct code
   - Remove conflict markers

3. **Continue rebase**
   ```bash
   git add .
   git rebase --continue
   ```

4. **Force push (if already pushed)**
   ```bash
   git push --force-with-lease origin feature/your-branch
   ```

## Hotfix Process

For urgent production fixes:

1. **Create hotfix branch from main**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b hotfix/critical-issue
   ```

2. **Fix the issue**
   - Make minimal changes
   - Add tests
   - Verify fix

3. **Create PR to main**
   - Mark as urgent
   - Request immediate review
   - Fast-track approval

4. **After merge to main**
   - Back-merge to develop (if exists)
   ```bash
   git checkout develop
   git merge main
   git push origin develop
   ```

## Release Process

### Version Numbering

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR** - Breaking changes (v2.0.0)
- **MINOR** - New features (v1.1.0)
- **PATCH** - Bug fixes (v1.0.1)

### Creating a Release

1. **Update version in package.json**
   ```bash
   npm version patch  # or minor, or major
   ```

2. **Create release branch** (optional)
   ```bash
   git checkout -b release/v1.0.0
   ```

3. **Update CHANGELOG.md**
   - List all changes since last release
   - Group by type (Features, Fixes, etc.)

4. **Create PR to main**
   - Title: `Release v1.0.0`
   - Include changelog in description

5. **After merge, create Git tag**
   ```bash
   git checkout main
   git pull origin main
   git tag -a v1.0.0 -m "Release version 1.0.0"
   git push origin v1.0.0
   ```

6. **Create GitHub Release**
   - Go to Releases on GitHub
   - Click "Create a new release"
   - Select the tag
   - Add release notes
   - Publish release

## Best Practices

### DO

✅ Commit early and often
✅ Write meaningful commit messages
✅ Keep commits atomic (one logical change)
✅ Pull before you push
✅ Review your own PR before requesting reviews
✅ Delete branches after merging
✅ Use draft PRs for work in progress
✅ Tag people in comments for specific questions

### DON'T

❌ Commit directly to main
❌ Force push to shared branches
❌ Commit secrets or credentials
❌ Commit large binary files
❌ Leave branches stale for weeks
❌ Merge without review
❌ Ignore CI failures
❌ Commit commented-out code

## Git Commands Reference

### Daily Workflow

```bash
# Start new feature
git checkout -b feature/my-feature

# Check status
git status

# Stage changes
git add .
git add specific-file.ts

# Commit
git commit -m "feat: add new feature"

# Push
git push -u origin feature/my-feature

# Update from main
git checkout main
git pull
git checkout feature/my-feature
git rebase main
```

### Useful Commands

```bash
# View commit history
git log --oneline --graph --all

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1

# Stash changes
git stash
git stash pop

# View diff
git diff
git diff main

# Amend last commit
git commit --amend

# Cherry-pick commit
git cherry-pick <commit-hash>

# Clean untracked files
git clean -fd
```

## Troubleshooting

### Accidentally committed to main

```bash
# Create branch from current state
git branch feature/my-changes

# Reset main to origin
git reset --hard origin/main

# Switch to new branch
git checkout feature/my-changes
```

### Need to undo a pushed commit

```bash
# Create revert commit
git revert <commit-hash>
git push origin main
```

### Messed up rebase

```bash
# Abort rebase
git rebase --abort

# Or force reset to origin
git reset --hard origin/feature/my-branch
```

## Resources

- [Git Documentation](https://git-scm.com/doc)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [GitHub Flow](https://guides.github.com/introduction/flow/)

---

**Last Updated:** 2026-05-03
