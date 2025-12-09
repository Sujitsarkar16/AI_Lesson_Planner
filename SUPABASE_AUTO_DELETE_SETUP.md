# Supabase Auto-Delete Configuration Guide

## 🗑️ Automatic Document Deletion After 3 Days

This guide explains how to configure Supabase to automatically delete documents older than 3 days.

---

## 📋 Prerequisites

- Supabase project created
- Database access (SQL Editor)
- Admin/superuser access for enabling extensions

---

## 🚀 Setup Instructions

### Step 1: Enable pg_cron Extension

1. **Go to Supabase Dashboard**
2. **Navigate to**: `Database` → `Extensions`
3. **Search for**: `pg_cron`
4. **Click**: `Enable` button next to pg_cron
5. **Wait**: For confirmation that extension is enabled

> **Note**: pg_cron allows you to schedule PostgreSQL commands to run at specific times using cron syntax.

---

### Step 2: Run the Updated Schema

1. **Go to**: `SQL Editor` in Supabase Dashboard
2. **Click**: `New Query`
3. **Copy entire contents** of `supabase/schema.sql`
4. **Paste** into the SQL editor
5. **Click**: `Run` button

This will create:
- ✅ `delete_old_documents()` function
- ✅ Daily cron job scheduled at 2 AM UTC
- ✅ `documents_expiring_soon` view
- ✅ `get_document_expiry_info()` helper function

---

### Step 3: Verify Installation

Run this query to check if the cron job is scheduled:

```sql
SELECT * FROM cron.job;
```

You should see an entry:
- **jobname**: `delete-old-documents-daily`
- **schedule**: `0 2 * * *` (Daily at 2 AM UTC)
- **command**: `SELECT delete_old_documents();`

---

## 🔍 How It Works

### Automatic Deletion

1. **Every day at 2:00 AM UTC**, pg_cron runs the deletion function
2. **Deletes all documents** where `created_at < NOW() - INTERVAL '3 days'`
3. **Logs the count** of deleted documents
4. **Cascade deletion** removes related data automatically

### Manual Deletion (Optional)

You can also trigger deletion manually:

```sql
SELECT delete_old_documents();
```

This returns the number of documents deleted.

---

## 📊 Monitoring Documents

### View Documents Expiring Soon

```sql
SELECT * FROM documents_expiring_soon;
```

Returns:
- Document ID, title, type
- Age of document
- Time remaining until deletion

### Check Specific Document Expiry

```sql
SELECT get_document_expiry_info('your-document-uuid-here');
```

Returns JSON:
```json
{
  "created_at": "2025-12-09T10:00:00Z",
  "expiry_date": "2025-12-12T10:00:00Z",
  "is_expired": false,
  "days_remaining": 2.5,
  "hours_remaining": 60.0
}
```

---

## ⚙️ Configuration Options

### Change Retention Period

To change from 3 days to a different period, modify the function:

```sql
CREATE OR REPLACE FUNCTION delete_old_documents()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Change '3 days' to '7 days', '1 day', etc.
  DELETE FROM documents
  WHERE created_at < NOW() - INTERVAL '7 days';  -- Changed to 7 days
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % old documents', deleted_count;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Change Schedule Time

To run at a different time, update the cron job:

```sql
-- First, unschedule the old job
SELECT cron.unschedule('delete-old-documents-daily');

-- Then create new schedule (e.g., every 6 hours)
SELECT cron.schedule(
  'delete-old-documents-daily',
  '0 */6 * * *',  -- Every 6 hours
  $$SELECT delete_old_documents();$$
);
```

**Cron Expression Examples:**
- `0 2 * * *` - Daily at 2 AM
- `0 */6 * * *` - Every 6 hours
- `0 0 * * 0` - Weekly on Sunday at midnight
- `*/30 * * * *` - Every 30 minutes

---

## 🧪 Testing

### Test Deletion Function

```sql
-- Create a test document with old timestamp
INSERT INTO documents (user_id, type, title, subject, grade, content, created_at)
VALUES (
  (SELECT id FROM users LIMIT 1),
  'lesson-plan',
  'Test Old Document',
  'Test Subject',
  'Test Grade',
  'Test Content',
  NOW() - INTERVAL '4 days'  -- 4 days old
);

-- Run deletion
SELECT delete_old_documents();

-- Verify it was deleted
SELECT * FROM documents WHERE title = 'Test Old Document';
-- Should return 0 rows
```

---

## 🚨 Important Notes

### Data Backup
- Documents are **permanently deleted** after 3 days
- **No recovery possible** after deletion
- Consider implementing backup strategy if needed

### User Notification
- Users should be notified about the 3-day retention policy
- Consider adding countdown/expiry warnings in the UI
- Show "days remaining" badge on documents

### Performance
- Index on `created_at` already exists (line 69 in schema.sql)
- Deletion is efficient even with thousands of documents
- pg_cron runs in background without blocking queries

---

## 🛠️ Troubleshooting

### pg_cron Not Available

If pg_cron extension is not available in your Supabase plan:

**Option 1: Use Edge Function**
Create a Supabase Edge Function that runs on a schedule.

**Option 2: External Cron Job**
Set up a cron job on your server to call the deletion function via Supabase API.

**Option 3: Application-Level Deletion**
Add cleanup logic in your app that runs periodically.

### Check Cron Job Status

```sql
-- View all scheduled jobs
SELECT * FROM cron.job;

-- View job run history
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;
```

### Manually Trigger Deletion

```sql
SELECT delete_old_documents();
```

---

## 📱 UI Integration (Optional)

Add expiry warnings to your documents list:

```typescript
// Example: Fetch document with expiry info
const { data } = await supabase
  .rpc('get_document_expiry_info', { document_id: docId });

if (data.days_remaining < 1) {
  // Show urgent warning
  console.log(`Document expires in ${data.hours_remaining} hours!`);
}
```

---

## ✅ Verification Checklist

- [ ] pg_cron extension enabled
- [ ] Schema updated with new functions
- [ ] Cron job appears in `cron.job` table
- [ ] Test deletion function works
- [ ] `documents_expiring_soon` view accessible
- [ ] Users notified about 3-day retention policy

---

## 📞 Support

If you encounter issues:
1. Check Supabase logs in Dashboard
2. Verify pg_cron extension is enabled
3. Ensure you have sufficient database permissions
4. Review cron job execution logs

---

**Last Updated**: December 2025  
**Version**: 1.0
