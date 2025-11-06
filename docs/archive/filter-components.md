# Reusable Filter Components

## Overview

I've created reusable components for table filtering and pagination that can be used across your application.

## Components Created

### 1. `TableFilters` Component
**Location:** `/src/components/shared/TableFilters.tsx`

A flexible filter component that supports:
- Search input with debounced search (300ms delay)
- Multiple select filters (role, status, etc.)
- Active filters display
- Clear all filters functionality
- Responsive design

**Usage:**
```tsx
<TableFilters
  searchPlaceholder="Search by name or email..."
  searchValue={searchValue}
  onSearchChange={setSearch}
  selectFilters={[
    {
      key: 'role',
      label: 'Roles',
      placeholder: 'Filter by role',
      options: roleOptions,
      value: roleFilter,
      onChange: setRoleFilter,
    },
  ]}
  onClear={clearAllFilters}
/>
```

### 2. `TablePagination` Component
**Location:** `/src/components/shared/TablePagination.tsx`

Handles pagination with:
- First/Previous/Next/Last navigation
- Page size selector
- Results count display
- Loading state support

**Usage:**
```tsx
<TablePagination
  pagination={paginationInfo}
  onPageChange={setPage}
  onLimitChange={setLimit}
  isLoading={isLoading}
/>
```

### 3. `useTableState` Hook
**Location:** `/src/hooks/use-table-state.ts`

Manages table state including:
- Search queries
- Filter values
- Pagination
- Sort orders
- URL query string generation

**Usage:**
```tsx
const tableState = useTableState({
  initialState: { limit: 10 },
  onStateChange: (state) => {
    // Handle state changes
  }
});
```

## Features Implemented

### ✅ Search Functionality
- Searches across name and email fields
- Debounced input (300ms delay)
- Case-insensitive search
- Resets to first page when searching

### ✅ Role Filtering
- Dropdown with all available roles
- "All Roles" option to clear filter
- Resets to first page when filtering

### ✅ Pagination
- Configurable page sizes (5, 10, 20, 50)
- Navigation controls
- Results count display
- Maintains filters across page changes

### ✅ Active Filters Display
- Shows current search query
- Shows active filter selections
- Visual indicators for active filters

### ✅ Clear Functionality
- "Clear" button appears when filters are active
- Resets all filters and search
- Returns to first page

## API Integration

The `/api/staff/users` endpoint has been updated to support:
- `search` parameter for name/email search
- `role` parameter for role filtering
- `page` and `limit` parameters for pagination

**Example API call:**
```
GET /api/staff/users?search=john&role=tenant&page=1&limit=10
```

## Reusability

These components are designed to be reused across different tables:

1. **Policies Table**: Can use the same components with different filter options
2. **Reports Table**: Easy to add date filters, status filters, etc.
3. **Any Data Table**: The components are generic and customizable

### Example for Policies Table:
```tsx
const policyFilters = [
  {
    key: 'status',
    label: 'Status',
    placeholder: 'Filter by status',
    options: [
      { value: 'pending', label: 'Pending' },
      { value: 'active', label: 'Active' },
      { value: 'expired', label: 'Expired' },
    ],
    value: statusFilter,
    onChange: setStatusFilter,
  },
  {
    key: 'payer',
    label: 'Payer',
    placeholder: 'Filter by payer',
    options: [
      { value: 'tenant', label: 'Tenant' },
      { value: 'landlord', label: 'Landlord' },
    ],
    value: payerFilter,
    onChange: setPayerFilter,
  },
];
```

## Performance Features

- **Debounced Search**: Prevents excessive API calls
- **State Management**: Efficient state updates
- **Query String Generation**: Automatic URL parameter building
- **Loading States**: UI feedback during data fetching