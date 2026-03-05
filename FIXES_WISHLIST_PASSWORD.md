# Fixes for Wishlist and Password Update Issues

## Issues Found

### 1. Wishlist 404 Error
**Error:** `GET /api/wishlist?page=1&limit=12 404`

**Root Cause:** 
The wishlist routes were mounted at `/api/wishlists` (plural) in `backend/src/app.js`, but the frontend was calling `/api/wishlist` (singular).

**Fix Applied:**
Changed the route mounting in `backend/src/app.js`:
```javascript
// Before
app.use("/api/wishlists", wishlistRoutes);

// After
app.use("/api/wishlist", wishlistRoutes);
```

**File Changed:** `backend/src/app.js`

### 2. Password Update 500 Error
**Error:** `PATCH /api/auth/update-password 500`

**Root Cause:**
The backend controller was expecting `current_password` and `new_password` (snake_case), but the frontend was sending `currentPassword` and `newPassword` (camelCase). This caused the values to be undefined, leading to a 500 error.

**Fix Applied:**
Updated the controller to accept both formats and added validation:

```javascript
// backend/src/controllers/auth.controller.js
export const updatePassword = async (req, res, next) => {
  try {
    // Support both camelCase and snake_case
    const currentPassword = req.body.currentPassword || req.body.current_password;
    const newPassword = req.body.newPassword || req.body.new_password;
    
    if (!currentPassword || !newPassword) {
      throw new AppError("Current password and new password are required", 400);
    }
    
    await authService.updatePassword(req.user.id, currentPassword, newPassword);
    res.status(200).json({
      status: "success",
      message: "Password updated successfully",
    });
  } catch (error) {
    next(error);
  }
};
```

**File Changed:** `backend/src/controllers/auth.controller.js`

## Testing

### Test Wishlist Endpoint
```bash
# After logging in, test the wishlist endpoint
curl -X GET http://localhost:5000/api/wishlist \
  -H "Cookie: token=YOUR_JWT_TOKEN"

# Expected: 200 OK with wishlist data
```

### Test Password Update
```bash
# Test password update
curl -X PATCH http://localhost:5000/api/auth/update-password \
  -H "Content-Type: application/json" \
  -H "Cookie: token=YOUR_JWT_TOKEN" \
  -d '{
    "currentPassword": "oldpass123",
    "newPassword": "newpass123"
  }'

# Expected: 200 OK with success message
```

## Verification Steps

1. **Restart Backend Server**
   ```bash
   cd backend
   pnpm dev
   ```

2. **Test Wishlist Page**
   - Visit `http://localhost:3000/dashboard/wishlist`
   - Should load without 404 errors
   - Should display wishlist items (if any)
   - Should show empty state if no items

3. **Test Password Change**
   - Visit `http://localhost:3000/dashboard/settings`
   - Click "Change Password"
   - Fill in the form with valid passwords
   - Submit and verify success message
   - Should not get 500 error

## Summary

Both issues have been fixed:
- ✅ Wishlist endpoint now correctly responds at `/api/wishlist`
- ✅ Password update now accepts camelCase parameters from frontend
- ✅ Added validation to prevent undefined values
- ✅ Both endpoints should work correctly now

The fixes maintain backward compatibility by accepting both naming conventions (camelCase and snake_case) for the password update endpoint.
