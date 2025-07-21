# Glow Wars Testing Checklist

This checklist ensures comprehensive testing at each stage of development. Follow these steps to maintain code quality and prevent regressions.

## Pre-Development

- [ ] Check existing tests for the area you'll be working on
- [ ] Write new E2E tests for frontend features before implementation
- [ ] Write unit tests for backend functions before implementation
- [ ] Review test coverage reports to identify gaps

## During Development

### Backend Development
- [ ] Run relevant unit tests after each change: `pnpm test -- <test-file>`
- [ ] Ensure new validators are tested
- [ ] Test error cases and edge conditions
- [ ] Verify real-time subscriptions work correctly

### Frontend Development
- [ ] Test in both frontends (minimal and tanstack) if applicable
- [ ] Check responsive behavior at different screen sizes
- [ ] Verify keyboard navigation and accessibility
- [ ] Test with slow network conditions

## Pre-Commit Checklist

### 1. Code Quality
- [ ] Run formatter: `pnpm format`
- [ ] Fix any TypeScript errors
- [ ] Remove console.logs and debug code
- [ ] Ensure no sensitive data in commits

### 2. Backend Tests
- [ ] Run all backend tests: `pnpm test`
- [ ] Verify all tests pass (currently 68/74 passing)
- [ ] Document any known failing tests in state.json

### 3. E2E Tests
- [ ] Install Playwright browsers if needed: `pnpm playwright:install`
- [ ] Run E2E tests for affected frontend:
  - [ ] Minimal: `pnpm test:e2e:minimal`
  - [ ] TanStack: `pnpm test:e2e:tanstack`
- [ ] Fix any failing tests
- [ ] Update E2E tests if UI/behavior changed

### 4. Documentation
- [ ] Update relevant documentation
- [ ] Add/update code comments for complex logic
- [ ] Update workflow state files

## Pre-Push Checklist

- [ ] All commits have descriptive messages
- [ ] No merge conflicts with main branch
- [ ] CI/CD will pass (run full test suite)
- [ ] Screenshots/videos for visual changes

## Pull Request Checklist

### Required Information
- [ ] Clear description of changes
- [ ] Link to related issue/task
- [ ] Screenshots for UI changes
- [ ] Test results summary

### Testing Evidence
- [ ] Backend test results (X/Y passing)
- [ ] E2E test results for both frontends
- [ ] Manual testing completed
- [ ] Performance impact assessed

### Review Preparation
- [ ] Self-review completed
- [ ] No commented-out code
- [ ] No TODO comments without tickets
- [ ] Breaking changes documented

## Post-Merge

- [ ] Monitor CI/CD for any issues
- [ ] Check production deployment
- [ ] Update task tracking in workflow files
- [ ] Create follow-up tasks if needed

## Continuous Monitoring

### Weekly
- [ ] Review test coverage trends
- [ ] Check for flaky tests
- [ ] Update test documentation
- [ ] Review CI/CD performance

### Monthly
- [ ] Audit test suite for redundancy
- [ ] Update test data/fixtures
- [ ] Review and update this checklist
- [ ] Plan test improvements

## Quick Commands Reference

```bash
# Backend testing
pnpm test                    # Run all backend tests
pnpm test <file>            # Run specific test file
pnpm test -- --watch        # Watch mode

# E2E testing
pnpm test:e2e               # Run all E2E tests
pnpm test:e2e:ui            # Run with UI (debugging)
pnpm test:e2e:minimal       # Test minimal frontend
pnpm test:e2e:tanstack      # Test tanstack frontend

# Code quality
pnpm format                 # Format all files
pnpm build                  # Build and type check

# Development
pnpm dev                    # Start all dev servers
pnpm dev:minimal            # Start minimal frontend
pnpm dev:tanstack           # Start tanstack frontend
```

## Known Issues

1. **Backend Tests**: 5 collision tests failing (Task 6 legacy issue)
2. **E2E Tests**: Not yet run in CI - awaiting first trigger
3. **Coverage**: Frontend unit tests not yet implemented

---

Remember: **Test early, test often, test everything!**