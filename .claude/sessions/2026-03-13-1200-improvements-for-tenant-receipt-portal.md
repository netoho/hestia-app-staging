# Improvements for Tenant Receipt Portal
**Started:** 2026-03-13

## Overview
Three major improvements: admin receipt management, configurable receipt types per policy, wildcard "Other" uploads, and unified dashboard component.

## Goals
- [x] Let ADMIN/STAFF upload receipts from dashboard
- [x] Create ReceiptConfig (per-policy, versioned, admin-editable)
- [x] Add wildcard "Other" upload with category + description
- [x] Unify ReceiptDashboard for both portal and admin views

## Progress
- [x] Plan created and approved
- [x] Phase 1: Database — ReceiptConfig model, TenantReceipt fields (otherCategory, otherDescription, uploadedByUserId), unique constraint change
- [x] Phase 2: Service layer — getEffectiveReceiptTypes(), getConfigHistory(), initializeConfig()
- [x] Phase 3: Router — dual-auth endpoints, config CRUD, OTHER support
- [x] Phase 4: Frontend — unified ReceiptDashboard, per-month type resolution
- [x] Phase 5: New components — OtherReceiptUploadModal, OtherReceiptItem, ReceiptConfigEditor
- [x] Phase 6: i18n updates
- [x] Reminder service updated to use config-aware types
- [x] Build passes (`bun run build`)
- [ ] Migration needs to be run manually
- [ ] Manual testing pending

### Update - 2026-03-15

**Summary**: Full implementation complete. All code written, build passes.

**Git Changes**:
- Modified (13): schema.prisma, receipt.router.ts, receiptService.ts, useReceiptOperations.ts, ReceiptDashboard.tsx, MonthReceiptCard.tsx, ReceiptHistoryList.tsx, ReceiptSlot.tsx, admin receipts page, portal receipts page, receipts i18n, receiptReminderService.ts, CLAUDE.md
- Added (4): OtherReceiptUploadModal.tsx, OtherReceiptItem.tsx, ReceiptConfigEditor.tsx, receiptConfig.ts
- Migration created: 20260313221801_add_receipt_config
- Branch: release/2.8.0 (last commit: bbc58f8)

**Key decisions**:
- RENT always locked/required in config
- Track uploader via uploadedByUserId
- Show all OTHER categories (no filtering by existing types)
- Show removed-type receipts with "Ya no requerido" label
- otherCategory uses empty string (not null) for non-OTHER types (PostgreSQL unique constraint behavior)

**Pending**:
- Run migration on DB
- Manual E2E testing (portal + admin)
