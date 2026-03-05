# Dashboard & Google OAuth Setup Guide

## ✅ What Was Fixed

### 1. Dashboard Overview Page
The dashboard page (`frontend/src/app/dashboard/page.tsx`) has been properly integrated to fetch and display data from the backend APIs:

**API Endpoints Used:**
- `GET /api/auth/me` - Fetches current user information
- `GET /api/rentals/mine?limit=20` - Fetches user's rental history with enriched data
- `GET /api/system-config` - Fetches system configuration (daily fine, max loan days, etc.)

**Data Flow:**
1. User data is fetched and displayed in the welcome message
2. Rentals are fetched with calculated fields:
   - `isOverdue` - Boolean indicating if the book is overdue
   - `daysOverdue` - Number of days the book is overdue
   - `daysUntilDue` - Number of days until the book is due
3. System config provides fine calculation parameters
4. Dashboard calculates:
   - Currently borrowed books (status = "BORROWED")
   - Total amount owed (pending fines + estimated overdue fines)
   - Borrowing history (returned/completed rentals)

**304 Status Codes:**
The 304 responses you see are "Not Modified" HTTP status codes. This is NORMAL and GOOD - it means the browser is efficiently using cached data. The data is still being fetched and used correctly.

### 2. Database Seeding
The database has been seeded with:
- Sample users (1 admin, 2 students)
- Books and digital books
- Categories and authors
- System configuration (14 days loan, 5.00 birr daily fine, 3 books max per user)
- Sample rentals and reviews

## 🔧 Google OAuth Setup

### Current Status
Your Google OAuth is configured in the backend with:
- Client ID: `1044775845575-2cbac90gur56hjo72jrhk6vd6n0kdhll`
- Callback URL: `http://localhost:5000/api/auth/google/callback`

### How It Works
1. User clicks "Continue with Google" on login page
2. Frontend redirects to `http://localhost:5000/api/auth/google`
3. Backend (302 redirect) sends user to Google's OAuth consent screen
4. User logs in with Google
5. Google redirects back to `http://localhost:5000/api/auth/google/callback`
6. Backend creates/logs in user and sets JWT cookie
7. User is redirected to dashboard

### ⚠️ Required Configuration in Google Cloud Console

To make Google OAuth work, you MUST configure the redirect URI in Google Cloud Console:

1. Go to: https://console.cloud.google.com/apis/credentials
2. Find your OAuth 2.0 Client ID: `1044775845575-2cbac90gur56hjo72jrhk6vd6n0kdhll`
3. Click on it to edit
4. Under "Authorized redirect URIs", add:
   ```
   http://localhost:5000/api/auth/google/callback
   ```
5. Under "Authorized JavaScript origins", add:
   ```
   http://localhost:3000
   http://localhost:5000
   ```
6. Save the changes
7. Make sure the OAuth consent screen is configured with:
   - App name
   - User support email
   - Developer contact email
   - Scopes: `profile` and `email`

### Testing Google OAuth
1. Make sure both servers are running:
   - Backend: `http://localhost:5000`
   - Frontend: `http://localhost:3000`
2. Go to `http://localhost:3000/auth/login`
3. Click "Continue with Google"
4. You should see Google's login page
5. After logging in, you'll be redirected back to the dashboard

### Common Issues

**Issue: "redirect_uri_mismatch" error**
- Solution: Make sure the redirect URI in Google Cloud Console exactly matches: `http://localhost:5000/api/auth/google/callback`

**Issue: "Access blocked: This app's request is invalid"**
- Solution: Configure the OAuth consent screen in Google Cloud Console

**Issue: Browser shows blank page after clicking Google login**
- Solution: Check browser console for errors, ensure CORS is properly configured

## 🚀 Running the Application

### Start Backend
```bash
cd backend
pnpm dev
```
Server runs on: http://localhost:5000

### Start Frontend
```bash
cd frontend
pnpm dev
```
App runs on: http://localhost:3000

### Test Accounts (from seed data)
**Admin:**
- Email: `yohannes@astu.edu.et`
- Password: `hash123` (you'll need to hash this properly or use Google OAuth)

**Student:**
- Email: `abebe@astu.edu.et`
- Password: `hash123`

## 📊 Dashboard Features

### For Students:
- View currently borrowed book with due date
- See days remaining or days overdue
- Calculate amount owed (fines)
- View borrowing history
- See system configuration (loan period, daily fine rate)

### For Admins:
- Access admin dashboard at `/dashboard/admin`
- View all rentals, users, and statistics
- Manage system configuration
- Process book returns and calculate fines

## 🔍 API Response Structures

### GET /api/auth/me
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "name": "User Name",
      "email": "user@example.com",
      "role": "STUDENT"
    }
  }
}
```

### GET /api/rentals/mine
```json
{
  "status": "success",
  "rentals": [
    {
      "id": "uuid",
      "loan_date": "2026-03-01T00:00:00.000Z",
      "due_date": "2026-03-15T00:00:00.000Z",
      "return_date": null,
      "status": "BORROWED",
      "fine": null,
      "isOverdue": false,
      "daysOverdue": 0,
      "daysUntilDue": 10,
      "physical_book": {
        "id": "uuid",
        "title": "Book Title",
        "cover_image_url": "https://...",
        "pages": 400
      },
      "payment": null
    }
  ],
  "statusSummary": {
    "BORROWED": 1,
    "RETURNED": 5
  },
  "meta": {
    "total": 6,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

### GET /api/system-config
```json
{
  "status": "success",
  "data": {
    "config": {
      "id": 1,
      "max_loan_days": 14,
      "daily_fine": "5.00",
      "max_books_per_user": 3,
      "enable_notifications": true
    }
  }
}
```

## ✨ Summary

Your dashboard is now fully functional and properly integrated with the backend APIs. The Google OAuth flow is configured on the backend side, but you need to complete the setup in Google Cloud Console by adding the authorized redirect URI.

Both servers are running and ready for testing!
