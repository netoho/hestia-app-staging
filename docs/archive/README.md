# Documentation Archive

**Purpose**: Historical documentation that has been superseded by newer, consolidated guides

**Last Updated**: November 5, 2024

---

## What's in this Archive

This directory contains documentation that was created during active development sessions but has since been replaced by comprehensive, consolidated documentation in the main `/docs/` directory.

### Archived Files

#### Handoff Documents

**ACTOR_FORMS_STANDARDIZATION_HANDOFF.md**
- **Created**: October 2024
- **Purpose**: Session handoff document tracking migration from single `fullName` field to 4-field Mexican naming system
- **Status**: ✅ Work completed
- **Replaced By**: [ACTOR_SYSTEM.md](../ACTOR_SYSTEM.md#migration-history)
- **Why Archived**: This was a temporary working document for a development session. The migration is complete, and all valuable information has been extracted into ACTOR_SYSTEM.md

**ACTOR_ROUTES_REFACTOR_HANDOFF.md**
- **Created**: October 2024
- **Purpose**: Session handoff document tracking refactor to unified actor routes
- **Status**: ✅ 90% complete (minor TS errors remain)
- **Replaced By**: [ACTOR_SYSTEM.md](../ACTOR_SYSTEM.md#api-routes) and [API_ROUTE_PATTERNS.md](../API_ROUTE_PATTERNS.md)
- **Why Archived**: Temporary working document. Unified routes are implemented and documented in the new comprehensive guides

#### Original Architecture Documents

**ACTOR_ARCHITECTURE.md**
- **Created**: Early development (exact date unknown)
- **Purpose**: Original actor system architecture documentation
- **Status**: Outdated
- **Replaced By**: [ACTOR_SYSTEM.md](../ACTOR_SYSTEM.md)
- **Why Archived**:
  - Still referenced `fullName` field (deprecated)
  - Missing PersonNameFields component
  - Missing BaseActorService pattern
  - Missing unified routes
  - Missing real code examples
  - ACTOR_SYSTEM.md is a complete rewrite with current implementation

#### Legacy API and Design Documents

**api.md**
- **Created**: Early development (~August 2024)
- **Purpose**: Original API endpoint documentation
- **Status**: Significantly outdated
- **Replaced By**: [API_ROUTE_PATTERNS.md](../API_ROUTE_PATTERNS.md) and [ACTOR_SYSTEM.md](../ACTOR_SYSTEM.md#api-routes)
- **Why Archived**:
  - Missing unified actor routes (`/api/actors/[type]/[identifier]`)
  - Missing dual authentication pattern (token vs session)
  - Outdated user roles and authentication details
  - Invalid test credentials
  - New comprehensive API documentation covers all current patterns

**blueprint.md**
- **Created**: Project inception (~June 2024)
- **Purpose**: Original system design and blueprint
- **Status**: Historical reference only
- **Replaced By**: [DEVELOPER_GUIDE.md](../DEVELOPER_GUIDE.md) and feature-specific docs
- **Why Archived**:
  - Original high-level design document
  - System has evolved significantly since inception
  - Historical value for understanding original vision
  - Current documentation is based on actual implementation, not initial design

**filter-components.md**
- **Created**: Early development (~August 2024)
- **Purpose**: Filter component documentation (appears abandoned)
- **Status**: Unclear if implemented or abandoned
- **Replaced By**: N/A (feature may not have been completed)
- **Why Archived**:
  - Unclear if components were ever fully implemented
  - Not referenced in any current code or documentation
  - If feature exists, should be documented in active docs
  - If feature doesn't exist, this is a historical artifact

---

## Why Archive Instead of Delete?

These documents are preserved for:

1. **Historical Context**: Understanding how features evolved
2. **Decision Trail**: Seeing what problems were solved and how
3. **Learning Resource**: Examples of development session documentation
4. **Reference**: Comparing original design vs final implementation

---

## Active Documentation

For current, accurate documentation, see:

### Core Guides
- **[DEVELOPER_GUIDE.md](../DEVELOPER_GUIDE.md)** - Main entrypoint for all development documentation
- **[ACTOR_SYSTEM.md](../ACTOR_SYSTEM.md)** - Complete actor system architecture (replaces ACTOR_ARCHITECTURE.md)
- **[FORM_VALIDATION_PATTERNS.md](../FORM_VALIDATION_PATTERNS.md)** - Validation best practices across all layers
- **[REACT_STATE_PATTERNS.md](../REACT_STATE_PATTERNS.md)** - State management patterns and common bugs
- **[API_ROUTE_PATTERNS.md](../API_ROUTE_PATTERNS.md)** - API architecture and authentication patterns

### Feature Documentation
- **[CRON_JOBS_IMPLEMENTATION.md](../CRON_JOBS_IMPLEMENTATION.md)** - Vercel cron jobs
- **[PERFORMANCE_OPTIMIZATIONS.md](../PERFORMANCE_OPTIMIZATIONS.md)** - Performance improvements
- **[POLICIES_LIST_REFACTOR.md](../POLICIES_LIST_REFACTOR.md)** - Policies list optimization
- And more in `/docs/`

---

## Handoff Document Pattern

The archived handoff documents followed this pattern:

```markdown
# Feature Name - Handoff Document

**Status**: In Progress
**Session Date**: YYYY-MM-DD
**Next Session**: Continue from Phase X

## Context
Brief overview of what we're building

## Current State
What's implemented so far

## Next Steps
1. Step one
2. Step two
3. Step three

## Blockers
Any issues preventing progress

## Resources
Links to related code, docs, sessions
```

This pattern is documented in the development workflow guide (if you're creating a new handoff document, consider if a session note in `.claude/sessions/` would be more appropriate).

---

## When to Archive vs Delete

**Archive when**:
- Document has historical value
- Shows evolution of a feature
- Contains decisions/context worth preserving
- Was substantial work that shouldn't just disappear

**Delete when**:
- Document is completely obsolete with no historical value
- Contains incorrect/misleading information
- Is a duplicate of current documentation
- Was created in error or never completed

---

**Note**: If you need to reference any of these archived documents, consider whether that information should be added to the current documentation. The archived docs may be outdated.
