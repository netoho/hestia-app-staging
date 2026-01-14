# Remaining Work & Duplications

## Completed (This Session)
- ✅ Tier 2: formatCurrency, formatDate, payment labels, calculateProgress
- ✅ Tier 2: VerificationBadge adoption (3 files)
- ✅ Tier 1: ApprovalWorkflow refactor (563→282 lines)

---

## Found Duplications

### 1. InformationComplete Badge (4 files)
Same pattern in 4 places:
```tsx
{actor.informationComplete ? (
  <Badge className="bg-green-500 text-white">Completo</Badge>
) : (
  <Badge className="bg-orange-500 text-white">Pendiente</Badge>
)}
```

**Files:**
| File | Lines |
|------|-------|
| `ActorProgressCard.tsx` | 77-79 |
| `ActorCard.tsx` | 142-147 |
| `ActorCardMinimal.tsx` | 56-58 |
| `ShareInvitationModal.tsx` | 315-320 |

**Solution:** Create `CompletionBadge` component in `src/components/shared/`

### 2. ActorCard.tsx Still Large (~500 lines)
- Document rendering section is complex
- Could extract `ActorDocumentsSection.tsx`

### 3. PaymentCard.tsx (~350 lines after dedup)
- Still has dialog state patterns that could use `useDialogState()` hook

---

## Next Steps (Priority Order)

### Quick Win: CompletionBadge
Create shared badge for informationComplete status:
```tsx
// src/components/shared/CompletionBadge.tsx
export function CompletionBadge({ isComplete }: { isComplete: boolean }) {
  return isComplete ? (
    <Badge className="bg-green-500 text-white">Completo</Badge>
  ) : (
    <Badge className="bg-orange-500 text-white">Pendiente</Badge>
  );
}
```

Update 4 files to use it.

### Optional: Further Refactoring
1. Extract `ActorDocumentsSection.tsx` from ActorCard
2. Create `useDialogState()` hook for dialog patterns
3. Standardize empty states

### Deferred (Tier 3)
- Tab field consolidation (7 files)
- Type safety (~200 `any` usages)
- Tests for extracted components

---

## Summary

| Status | Category | Items |
|--------|----------|-------|
| ✅ Done | Tier 2 Quick Wins | 6 |
| ✅ Done | ApprovalWorkflow | 1 |
| 🔜 Next | CompletionBadge | 4 files |
| 📋 Later | ActorCard breakdown | Optional |
| 📋 Later | Dialog patterns | Optional |
