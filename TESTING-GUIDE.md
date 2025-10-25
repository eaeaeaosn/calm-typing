# 🧪 Passages Cloud Storage Testing Guide

This guide will help you test the cloud storage functionality for user passages in your Calm Typing application.

## 🚀 Quick Start Testing

### 1. **Local Development Testing**

```bash
# Start the server locally
npm start

# In another terminal, run the database debug
node debug-database.js

# Run the API tests
node test-passages.js
```

### 2. **Frontend Testing**

Open `test-frontend.html` in your browser and follow the test steps:
1. Test Guest Authentication
2. Test User Authentication  
3. Save test passages
4. Load and verify passages

## 🔍 Debugging Steps

### Step 1: Check Database Connection

Run the database debug script to verify everything is working:

```bash
node debug-database.js
```

**Expected Output:**
- ✅ Database connected successfully
- ✅ Table exists: Yes
- Table columns listed
- Sample data (if any)

### Step 2: Test API Endpoints

Run the comprehensive API test:

```bash
node test-passages.js
```

**Expected Output:**
- ✅ Guest session created
- ✅ Passage saved
- ✅ Retrieved X passages
- ✅ User registered
- ✅ User passage saved
- ✅ Retrieved X user passages
- 🎉 All tests passed!

### Step 3: Test Frontend Integration

1. Open `test-frontend.html` in your browser
2. Click "Test Guest Authentication" 
3. Enter some text in the textarea
4. Click "Save as Guest"
5. Click "Load Guest Passages"
6. Verify the passage appears

## 🐛 Common Issues & Solutions

### Issue 1: "Table does not exist"

**Solution:**
```bash
# Restart the server to initialize the database
npm start
```

### Issue 2: "Database connection failed"

**For Local Development:**
- Ensure SQLite is working
- Check if `database.sqlite` file is created

**For Production (Render):**
- Verify `DATABASE_URL` environment variable is set
- Check Render logs for PostgreSQL connection errors

### Issue 3: "Failed to save passage"

**Check:**
1. Database connection is working
2. `user_passages` table exists
3. User is authenticated (token/guest ID present)
4. API endpoint is accessible

### Issue 4: "No passages found"

**Possible Causes:**
1. Passages are being saved to different user/guest
2. Database transaction not committed
3. Wrong authentication context

## 🔧 Production Testing (Render)

### 1. Check Environment Variables

In your Render dashboard, verify these are set:
```
NODE_ENV=production
DATABASE_URL=postgresql://...
SESSION_SECRET=your-secret
JWT_SECRET=your-jwt-secret
```

### 2. Test Production API

Replace `localhost:3000` with your Render URL:

```bash
# Test production endpoints
curl -X POST https://your-app.onrender.com/api/auth/guest
curl -X POST https://your-app.onrender.com/api/guest/passages \
  -H "Content-Type: application/json" \
  -H "x-guest-id: YOUR_GUEST_ID" \
  -d '{"title":"Test","content":"Hello world"}'
```

### 3. Check Render Logs

In Render dashboard:
1. Go to your service
2. Click "Logs" tab
3. Look for database connection messages
4. Check for any error messages

## 📊 Database Verification

### SQLite (Local)
```sql
-- Check if table exists
SELECT name FROM sqlite_master WHERE type='table' AND name='user_passages';

-- Check table structure
PRAGMA table_info(user_passages);

-- Check data
SELECT * FROM user_passages;
```

### PostgreSQL (Production)
```sql
-- Check if table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_passages'
);

-- Check table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_passages';

-- Check data
SELECT * FROM user_passages;
```

## 🎯 Expected Behavior

### When Working Correctly:

1. **User types a sentence and presses Enter**
   - Sentence appears as floating animation
   - "Passage saved to cloud!" notification appears
   - Passage is saved to database

2. **User clicks "View My Passages"**
   - Modal opens showing all saved passages
   - Each passage shows title, date, word count
   - Edit/Delete buttons work

3. **User clicks "Sync with Cloud"**
   - Notification shows "Synced X passages from cloud!"
   - Passages list updates

### Database Records:

Each passage should have:
- `id` (auto-increment)
- `user_id` or `guest_id` (depending on auth)
- `title` (auto-generated or custom)
- `content` (the actual passage text)
- `word_count` (calculated)
- `created_at` and `updated_at` timestamps

## 🚨 Troubleshooting Checklist

- [ ] Server is running (`npm start`)
- [ ] Database connection successful
- [ ] `user_passages` table exists
- [ ] User is authenticated (check localStorage)
- [ ] API endpoints return 200 status
- [ ] Passages appear in database
- [ ] Frontend can load passages
- [ ] Notifications appear on save

## 📞 Getting Help

If you're still having issues:

1. **Check the browser console** for JavaScript errors
2. **Check server logs** for database errors
3. **Verify environment variables** are set correctly
4. **Test with the provided scripts** to isolate the issue
5. **Check Render logs** if using production deployment

The most common issue is the database table not being created properly, which the debug script will help identify.
