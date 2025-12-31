
## 🚨 Immediate Action Plan - Fix Critical Issues

### Phase 1: Fix TypeScript Errors (Day 1)
**Goal:** Get build passing
1. Run `npx prisma generate` to sync types
2. Fix role type mismatches (use UserRole enum)
3. Add missing propertyAddressDetails to interfaces
4. Fix undefined variable usage
5. Import missing types

### Phase 2: Security Fixes (Day 2)
**Goal:** Secure all endpoints
1. Add authorization middleware to all API routes
2. Implement rate limiting with express-rate-limit
3. Add CSRF protection to forms
4. Validate all input parameters
5. Sanitize database queries

### Phase 3: Data Integrity (Day 3)
**Goal:** Ensure data consistency
1. Wrap multi-table updates in transactions
2. Add optimistic locking to prevent race conditions
3. Standardize error response format
4. Add validation for all required fields
5. Implement proper error boundaries

### Phase 4: Performance Optimization (Day 4)
**Goal:** Improve response times
1. Remove all console.log statements
2. Add database indexes on frequently queried fields
3. Implement query result caching
4. Optimize bundle sizes with code splitting
5. Add select/include to minimize data transfer

### Phase 5: Code Quality (Day 5)
**Goal:** Production readiness
1. Complete all TODO items
2. Add error boundaries to all pages
3. Standardize error messages (Spanish for users)
4. Remove dead code
5. Add basic test coverage

### 🔄 In Progress
Fixing critical issues found in code audit

### 📋 Next Phase (Post-Critical Fixes)
1. **Full Flow Testing** - End-to-end testing of all features
2. **Authorization Middleware** - Role-based access control
3. **Investigation Module** - Complete workflow implementation
4. **Contract Generation** - PDF generation and signing
5. **Payment Integration** - Stripe or other gateway
6. **Admin Dashboard** - Analytics and reporting
7. **Incident Management** - Handle claims and disputes

---

## 🚀 Quick Start Commands

```bash
# Start development server
npm run dev

# Run database migrations
npx prisma migrate dev

# Seed database
npx prisma db seed

# Open Prisma Studio
npx prisma studio

# Run linting
npm run lint

# Run type checking
npm run typecheck
```

---

## 🔑 Environment Variables Needed

```env
# Database
DATABASE_URL="postgresql://..."

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="..."
JWT_SECRET="..."

# Email (at least one provider)
RESEND_API_KEY="..."
MAILGUN_API_KEY="..."
MAILGUN_DOMAIN="..."
EMAIL_FROM="..."

# Storage
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_REGION="..."
S3_BUCKET_NAME="..."

# Google Maps (NEW - Required for address autocomplete)
GOOGLE_MAPS_API_KEY="server-key"
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="client-key"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## 📝 Testing Scenarios

### 1. Create Policy with All Features
1. Login as STAFF or ADMIN
2. Go to `/dashboard/policies/new`
3. Fill all tabs including new fields:
   - Property: Use Google Maps autocomplete
   - Add parking, furnished, utilities options
   - Pricing: Select package and payment split
   - Landlord: Toggle Company/Individual mode
   - Tenant & Guarantors: Add all actor types
4. Check "Send invitations automatically"
5. Submit → Invitations sent to ALL actors including landlord

### 2. Actor Portal Flow (Company vs Individual)
1. Access each portal with token:
   - `/actor/landlord/[token]` - Test both modes
   - `/actor/tenant/[token]` - Test both modes
   - `/actor/joint-obligor/[token]` - Test both modes
   - `/actor/aval/[token]` - Test property guarantee section
2. Fill information based on entity type
3. Upload documents (dynamic categories appear)
4. Submit → Status auto-transitions when all complete

### 3. Document Categories Testing
1. Create policy with company actors
2. Check document requirements show:
   - Companies: Constitution, legal powers, tax certificate
   - Individuals: ID, income proof, employment letter
3. For Aval: Property deed, registry, appraisal appear
4. Verify all 20 categories work correctly


## 📚 Code Patterns & Conventions

### API Response Format
```typescript
// Success
{ success: true, data: { ... } }

// Error
{ success: false, error: "Error message" }
```

### Status Transitions
Always use `transitionPolicyStatus()` from `policyWorkflowService.ts` - never update status directly

### Activity Logging
Log all significant actions using `logPolicyActivity()` from `policyService.ts`

### Token Generation
Use services from `actorTokenService.ts` - tokens expire in 7 days

### Email Sending
Use `sendActorInvitation()` from `emailService.ts` - handles fallback providers

---

## 🤝 Team Notes

### Important Decisions Made
1. **Automatic Invitations** - Enabled by default on policy creation (includes landlord)
2. **Token Expiry** - 7 days for actor tokens
3. **Minimum References** - 3 required (personal for individuals, commercial for companies)
4. **Status Progression** - Automatic when all actors complete
5. **Language** - Spanish for actor-facing content, English for internal
6. **Entity Types** - All actors support both Individual and Company modes
7. **Document Categories** - Dynamic based on actor type and entity type
8. **Address Input** - Google Maps autocomplete for all addresses
9. **Property Guarantee** - Full property details for Aval actors
10. **Custom Implementations** - Each actor portal has unique implementation (no generic forms)

### Known Limitations
1. No bulk policy import
2. No policy templates/drafts
3. No multi-language support (Spanish only for actors)
4. No mobile app
5. No real-time notifications (email only)

---

## 💡 Tips for Next Session

1. **Start with:** Read this file for complete system overview
2. **Test tokens:** Use Prisma Studio to find valid tokens for testing actor portal
3. **Check emails:** Email sending might fail in dev without proper config
4. **Database state:** Run seed to ensure packages and all models exist
5. **Hot reload issues:** If changes don't reflect, restart dev server
6. **Google Maps:** Ensure both API keys are configured in .env
7. **Company Mode:** Test all actors in both Individual and Company modes
8. **Documents:** Check dynamic categories appear correctly per actor type

### System Architecture Highlights
- All policy detail components are in `/src/components/policies/details/`
- Actor portals have custom implementations (no shared forms)
- Document categories use `/src/lib/constants/documentCategories.ts`
- Google Maps integration via `/src/components/forms/AddressAutocomplete.tsx`
- All actors support company/individual toggle with different field names

## 📈 Development Summary (Sessions 1-4)

### What Was Built
- **Complete MVP** of rent insurance policy management system
- **4 actor portals** with full individual/company support
- **20 document categories** with smart filtering
- **Google Maps integration** for all addresses
- **25+ new fields** in policy creation
- **Dynamic document requirements** based on entity type
- **Property guarantee system** for Aval actors
- **Email invitations** for all actor types

### Current State
- **98% MVP Features Complete** - But with critical issues
- **Build Status:** ❌ 41 TypeScript errors
- **Security Status:** ⚠️ Multiple vulnerabilities
- **Performance:** ⚠️ Needs optimization
- **Production Ready:** ❌ Requires fixes before deployment

## 📋 Quick Fix Checklist

### Immediate (Before ANY deployment):
- [ ] Fix all TypeScript compilation errors
- [ ] Add authorization checks to all API routes
- [ ] Remove all console.log statements
- [ ] Add input validation to all forms
- [ ] Fix role type mismatches

### High Priority (Within 48 hours):
- [ ] Add database transactions
- [ ] Standardize error handling
- [ ] Create error boundaries

### Medium Priority (Within 1 week):
- [ ] Add database indexes
- [ ] Complete TODO items


---

**End of Session Context Document - Updated 2025-10-09**
