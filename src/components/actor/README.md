# Actor UI Components Documentation

## Overview

This directory contains React components for the actor data collection system. The components implement a tab-based wizard pattern for progressive data collection with real-time validation.

## Component Structure

```
actor/
├── ActorWizard.tsx          # THE wizard (T3 #127) — portals + inline admin
├── shared/                  # Reusable components
│   ├── FormWizardProgress.tsx
│   ├── FormWizardTabs.tsx
│   └── DocumentProgressBar.tsx
├── tenant/                  # tenantWizardConfig.tsx + [Tab Components]
├── landlord/                # landlordWizardConfig.tsx (save dispatch, selfId) + tabs
├── aval/                    # avalWizardConfig.tsx + tabs
└── joint-obligor/           # jointObligorWizardConfig.tsx + tabs
```

## Core Patterns

### 1. ActorWizard + config (T3 #127)

One generic `ActorWizard` renders every actor's portal AND the inline admin
editor — the same component, differing only in navigation policy
(`isAdminEdit` unlocks free tab access). What varies per actor lives in an
`ActorWizardConfig` (`<type>WizardConfig.tsx`): tab lists, the type
discriminator (`resolveContext`), the save wiring (`useSave` — tenant/JO/aval
share `useActorUpdateSave`; landlord dispatches to three mutations + co-owner
delete), and the tab/documents JSX:

```tsx
import ActorWizard from '@/components/actor/ActorWizard';
import { tenantWizardConfig } from '@/components/actor/tenant/tenantWizardConfig';

<ActorWizard
  config={tenantWizardConfig}
  token={token}          // or the actor id in admin flows (dual auth)
  initialData={tenant}
  policy={policy}
  onComplete={handleComplete}
  isAdminEdit={false}
/>
```

### 2. Tab Components

Each tab is a separate component handling specific data sections:

```tsx
export default function TenantPersonalInfoTab({
  formData,
  onFieldChange,
  errors,
  disabled,
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal Information</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Form fields */}
      </CardContent>
    </Card>
  );
}
```

### 3. State Management

Forms use React Hook Form for state management, with per-tab validation and save logic handled inside each wizard component.

## Key Components

### FormWizardProgress
Shows visual progress through the tabs:
```tsx
<FormWizardProgress
  tabs={tabs}
  savedTabs={wizard.savedTabs}
  activeTab={wizard.activeTab}
/>
```

### FormWizardTabs
Container for tab navigation and content:
```tsx
<FormWizardTabs
  tabs={tabs}
  activeTab={wizard.activeTab}
  onTabChange={wizard.handleTabChange}
  savedTabs={wizard.savedTabs}
>
  {renderTabContent()}
</FormWizardTabs>
```

### DocumentProgressBar
Shows document upload progress for a given actor:
```tsx
<DocumentProgressBar
  uploaded={uploadedCount}
  required={requiredCount}
/>
```

## Actor Type Handling

Components adapt based on actor type (Individual vs Company). Each wizard selects the appropriate tab set and renders different form fields based on the type selection.

## Validation Integration

Real-time validation with error display:

```tsx
// Field validation
const validatePersonalTab = useCallback(() => {
  const localErrors: Record<string, string> = {};

  if (!formData.firstName) {
    localErrors.firstName = 'First name is required';
  }

  setErrors(localErrors);
  return Object.keys(localErrors).length === 0;
}, [formData]);

// Error display
{errors.firstName && (
  <FieldError>{errors.firstName}</FieldError>
)}
```

## Data Flow

1. **Initial Load**: Fetch existing data via token
2. **User Input**: Update form state via `onFieldChange`
3. **Tab Save**: Validate and save partial data
4. **Tab Navigation**: Allow navigation only after validation
5. **Final Submit**: Complete validation and submission

## Shared Components

### AddressAutocomplete
Smart address input with autocomplete:
```tsx
<AddressAutocomplete
  value={formData.addressDetails}
  onChange={(address) => onFieldChange('addressDetails', address)}
  error={errors.addressDetails}
  disabled={disabled}
/>
```

## Unique Actor Features

### Tenant
- Employment verification
- Rental history (there is no financial tab on tenant)
- Income requirements

### Landlord
- Multiple landlords support
- Primary designation
- Property ownership details

### Aval
- Mandatory property guarantee
- Marriage information for property owners
- Exactly 3 references

### Joint Obligor
- Flexible guarantee (income OR property)
- Dynamic field display
- Relationship to tenant

## Adding a New Actor UI

1. **Create wizard component**:
```tsx
// src/components/actor/new-actor/NewActorFormWizard.tsx
export default function NewActorFormWizard({ token, initialData }) {
  // Implement wizard logic
}
```

2. **Create tab components**:
```tsx
// NewActorPersonalTab.tsx
// NewActorEmploymentTab.tsx
// etc.
```

3. **Configure tabs**:
```typescript
// src/lib/constants/actorConfig.ts
newActor: {
  personTabs: ['personal', 'employment', ...],
  companyTabs: ['personal', ...],
}
```

4. **Add to router page**:
```tsx
// app/actor/new-actor/[token]/page.tsx
<NewActorFormWizard token={token} />
```

## Styling

Components use Tailwind CSS with shadcn/ui:

```tsx
<Card className="space-y-4">
  <CardHeader className="pb-3">
    <CardTitle className="text-lg">Title</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Content */}
  </CardContent>
</Card>
```

## Accessibility

- Proper label associations
- Keyboard navigation support
- ARIA attributes where needed
- Error announcements
- Focus management

## Performance

- Lazy load tab content
- Debounced validation
- Optimistic UI updates
- Memoized callbacks
- Virtual scrolling for long lists

## Testing

```tsx
describe('TenantFormWizard', () => {
  it('validates required fields', () => {
    render(<TenantFormWizard token="test" />);

    const submitButton = screen.getByText('Submit');
    fireEvent.click(submitButton);

    expect(screen.getByText('First name is required')).toBeInTheDocument();
  });

  it('saves tab data', async () => {
    // Test partial save functionality
  });
});
```

## Common Issues & Solutions

### Issue: Tab validation fails silently
**Solution**: Check console for validation errors, ensure all required fields are mapped

### Issue: Type selection not updating form
**Solution**: Verify `onFieldChange` is updating the correct field name (e.g., `tenantType` not `isCompany`)

### Issue: Saved tabs not showing as complete
**Solution**: Ensure `wizard.markTabSaved(tabName)` is called after successful save

## Best Practices

### DO ✅
- Keep tabs focused on single concerns
- Validate on blur and before save
- Show clear error messages
- Maintain form state during navigation
- Use shared components for common fields

### DON'T ❌
- Mix business logic with UI
- Skip accessibility features
- Hardcode validation messages
- Create deeply nested components
- Ignore TypeScript warnings

---

For more details on the complete actor system, see the [Actor System Architecture](../../../docs/ACTOR_SYSTEM_ARCHITECTURE.md) documentation.