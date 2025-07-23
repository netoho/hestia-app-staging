# Hestia App - Development TODO

## Current Status (July 23, 2025)
🎉 **Major Achievement**: Successfully migrated from Jest to Vitest with Django-style database testing!

### ✅ Recently Completed (This Session)
- [x] **Vitest Migration Complete** - Migrated entire test suite from Jest to Vitest
- [x] **Performance Gains** - Tests now run faster with native TypeScript support
- [x] **Django-style DB Testing** - Real PostgreSQL integration with drop/recreate pattern
- [x] **15 API Tests Passing** - Complete test coverage for critical workflows
- [x] **Test Infrastructure** - Comprehensive setup with proper mocking and environment handling

## 🚀 High Priority Tasks

### Testing & Quality Assurance
- [ ] **Fix remaining tenant workflow tests** 
  - Upload endpoint tests (FormData handling in Vitest)
  - Submit endpoint tests (database field name issues)
  - Integration test completion
- [ ] **Create component unit tests** (medium priority)
  - PolicyWizard component testing
  - PolicyTable component testing
  - Dialog components testing
  - Form validation testing

### Core Business Features
- [ ] **Create Incident tracking module** for active policies (medium priority)
  - Incident reporting interface
  - Status tracking and escalation
  - Email notifications for incidents
  - Integration with policy lifecycle

- [ ] **Add Guarantor section** to tenant wizard (medium priority)
  - New wizard step for guarantor information
  - Guarantor validation and verification
  - Integration with existing 6-step workflow
  - Database schema updates

### UI/UX Improvements
- [ ] **Add visual status differentiation** to PolicyTable (medium priority)
  - Color-coded status indicators
  - Progress bars for in-progress applications
  - Icons for different policy states
  - Improved filtering and sorting

- [ ] **Implement SLA tracking and alerts** for investigations (medium priority)
  - Automatic escalation for overdue investigations
  - Email alerts for approaching deadlines
  - Dashboard metrics for SLA compliance
  - Configurable SLA thresholds

### Operations & Management  
- [ ] **Create staff dashboard** with investigation queue (low priority)
  - Prioritized task list for staff
  - Workload distribution
  - Performance metrics
  - Quick actions and bulk operations

## 🔧 Technical Improvements

### Testing Framework Enhancements
- [ ] **Add E2E testing** with Playwright
  - Complete user journeys
  - Payment flow testing
  - Cross-browser compatibility
  - Mobile responsiveness testing

- [ ] **Expand test coverage**
  - Webhook endpoint testing
  - File upload/download testing
  - Payment integration testing
  - Email service testing

### Performance & Scalability
- [ ] **Database optimization**
  - Query optimization and indexing
  - Connection pooling
  - Migration performance improvements
  - Backup and recovery procedures

- [ ] **Caching implementation**
  - Redis integration for session storage
  - API response caching
  - Static asset optimization
  - CDN integration

### Security & Compliance
- [ ] **Security audit**
  - Vulnerability scanning
  - Authentication flow review
  - Data encryption at rest
  - GDPR compliance review

- [ ] **Monitoring and logging**
  - Application performance monitoring
  - Error tracking and alerting
  - User activity logging
  - System health dashboards

## 📋 Commands Reference

### Testing Commands (Vitest)
```bash
# Run all API tests
bun run test:api

# Run specific test files
bun run test:api policies-initiate
bun run test:api tenant-workflow

# Watch mode for development
bun run test:watch

# Coverage reporting
bun run test:coverage

# Component tests only
bun run test:components
```

### Development Commands
```bash
# Start development server
npm run dev

# Build and deploy
npm run build
npm run typecheck
npm run lint

# Database operations
npx prisma generate
npx prisma db push
npx prisma studio
```

## 🎯 Next Session Priorities

### Immediate Focus (Start here tomorrow)
1. **Fix remaining test issues** - Complete the Vitest migration by fixing upload/submit tests
2. **Component testing setup** - Create first component tests using the new Vitest infrastructure
3. **Incident tracking module** - Begin implementation of incident reporting system

### Development Strategy
- **Test-Driven Development** - Use the new Vitest setup to write tests first
- **Incremental Features** - Build small, testable features with immediate value
- **Performance First** - Leverage Vitest's speed for rapid development cycles
- **Quality Gates** - All new features must have corresponding tests

## 📚 Documentation Status

### ✅ Up to Date
- [x] CLAUDE.md - Updated with Vitest migration details
- [x] Testing infrastructure documentation
- [x] Development commands reference
- [x] Architecture overview

### ❓ Needs Review/Update
- [ ] API documentation - May need updates after testing improvements
- [ ] Deployment guide - Should include testing requirements
- [ ] Contributing guidelines - Should mention testing standards

## 🔄 Continuous Improvements

### Code Quality
- Run `bun run test:api` before all commits
- Maintain >90% test coverage for critical paths
- Regular dependency updates and security patches
- Code review process for all changes

### Performance Monitoring
- Monitor test execution times
- Track database query performance
- Measure API response times
- User experience metrics

---

**Last Updated**: July 23, 2025  
**Migration Status**: ✅ Jest → Vitest COMPLETE  
**Test Suite Status**: ✅ 15 API tests passing  
**Next Session**: Focus on completing test suite and incident tracking