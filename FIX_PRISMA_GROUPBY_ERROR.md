# Fix: Prisma groupBy() Error in Student Dashboard

## Problem
Error: `Invalid prisma.rental.groupBy() invocation` on the student dashboard overview page.

## Root Cause
The `groupBy()` query in `backend/src/services/rental.service.js` had an incorrect `_count` syntax.

### Before (Incorrect):
```javascript
prisma.rental.groupBy({
  by: ['status'],
  where: { user_id: userId },
  _count: { status: true },  // ❌ Wrong syntax
})
```

### After (Correct):
```javascript
prisma.rental.groupBy({
  by: ['status'],
  where: { user_id: userId },
  _count: true,  // ✅ Correct syntax
})
```

## Changes Made

### File: `backend/src/services/rental.service.js`

**Line 189-193:** Fixed the `groupBy()` query
```javascript
// Before
_count: { status: true }

// After
_count: true
```

**Line 212-214:** Updated the count processing
```javascript
// Before
acc[c.status] = c._count.status;

// After
acc[c.status] = c._count;
```

## Explanation

In Prisma's `groupBy()`:
- When you use `_count: true`, it counts all records in each group
- The result is `c._count` (a number)
- When you use `_count: { field: true }`, it counts non-null values of that field
- The result is `c._count.field` (a number)

Since we're grouping by `status` and want to count all records in each status group, we should use `_count: true`.

## Testing

After this fix, the student dashboard should:
1. Load without errors
2. Display the correct rental counts by status
3. Show the status summary properly

## API Response

The `statusSummary` object will now correctly contain:
```javascript
{
  "BORROWED": 1,
  "RETURNED": 5,
  "COMPLETED": 3,
  "PENDING": 0
}
```

## Verification

To verify the fix is working:
1. Restart the backend server
2. Visit `/dashboard/student`
3. Check that the page loads without errors
4. Verify rental data displays correctly

```bash
cd backend
pnpm dev
```

The dashboard should now load successfully!
