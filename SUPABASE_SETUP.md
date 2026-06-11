# Yasvik App - Supabase Setup Guide

Complete guide to set up Supabase as a replacement for Base44.

## Table of Contents
1. [Project Setup](#project-setup)
2. [Database Initialization](#database-initialization)
3. [Storage Configuration](#storage-configuration)
4. [Authentication Setup](#authentication-setup)
5. [Row-Level Security](#row-level-security)
6. [Testing & Verification](#testing--verification)

---

## Project Setup

### Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and log in/sign up
2. Click "New Project"
3. Fill in project details:
   - **Name**: `yasvik-app` (or your choice)
   - **Database Password**: Create a strong password (save it securely)
   - **Region**: Select closest to your users (e.g., `us-east-1` for US)
4. Click "Create new project"
5. Wait for the database to be provisioned (~2 minutes)

### Step 2: Get Connection Details

 Database**
2. Copy the following and save them securely:
   - **Host**: `[project-ref].supabase.co`
   - **Port**: `5432`
   - **Database**: `postgres`
   - **User**: `postgres`
   - **Password**: (the one you created)
   - **Connection String**: Available under "Connection pooler"

 API**
4. Copy:
   - **Project URL**: `https://[project-ref].supabase.co`
   - **Anon Key**: Public API key
   - **Service Role Key**: Private API key (keep secret)

### Step 3: Update Environment Variables

Create/update `.env.local` in your project root:

```
VITE_SUPABASE_URL=https://[project-ref].supabase.co
VITE_SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]  # Server-side only
```

---

## Database Initialization

### Step 1: Connect to the Database

**Option A - Using Supabase Dashboard SQL Editor:**
1. In Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Paste the content of `supabase/migrations/001_schema.sql`
4. Click "Run"

**Option B - Using psql CLI:**
```bash
# Install psql if not already installed
# macOS: brew install postgresql

psql "postgresql://postgres:[password]@[host]:5432/postgres" < supabase/migrations/001_schema.sql
```

### Step 2: Initialize RLS Policies

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Paste the content of `supabase/migrations/002_rls_policies.sql`
4. Click "Run"

### Step 3: Verify Tables Created

In Supabase dashboard:
1. Go to **Table Editor**
2. You should see all tables listed in the left sidebar
3. Click each table to verify structure and data

---

## Storage Configuration

### Step 1: Create Storage Buckets

 Buckets**

Create the following buckets:

| Bucket Name | Type | Description |
|---|---|---|
| `product-images` | Public | Product photos & thumbnails |
| `story-images` | Public | Story featured images |
| `person-images` | Public | Person/chef avatars & photos |
| `recipe-images` | Public | Recipe photos |
| `journey-images` | Public | Journey cover images |
| `media-assets` | Public | General media files |
| `user-uploads` | Private | Private user uploads (avatars, etc) |
| `order-receipts` | Private | Order documents & receipts |

### Step 2: Configure Bucket Policies

For each **public** bucket, add these policies:

```sql
CREATE POLICY "Public Read"
ON storage.objects
FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated Upload"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'product-images'
  AND auth.role() = 'authenticated'
);
```

For **private** buckets, handle access in application code.

---

## Authentication Setup

### Step 1: Configure Auth Providers

 Providers**

**Email/Password** is enabled by default.

For **Social Login** (optional):
1. Click the provider (Google, GitHub, etc.)
2. Enable and add OAuth credentials

### Step 2: Configure Auth Settings

 Settings**:
- **Site URL**: Your production domain
- **Redirect URLs**: Add localhost and production URLs
- **JWT Expiration**: 3600 seconds
- **Email Confirmations**: Toggle as needed

### Step 3: Create Test User (Optional)

 Users** and click "Add User"

---

## Row-Level Security

### Overview

RLS enforces data access at the database level:

- **Published Content**: Anyone can read
- **User Data**: Only user can read their own orders, addresses
- **Admin Content**: Only admins can modify
- **Service Role**: Can bypass RLS (backend only)

All policies are defined in `supabase/migrations/002_rls_policies.sql`

### Enable RLS on All Tables

All tables have RLS enabled automatically. To verify:
1. Go to **Table Editor** in Supabase
2. Click any table
3. Check "RLS is enabled" in top-right

---

## Testing & Verification

### Test Database Connection

```bash
npm install @supabase/supabase-js
```

Create `test-supabase.js`:

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

const { data, error } = await supabase
  .from('categories')
  .select('*')
  .limit(1)

console.log(error ? 'Failed: ' + error.message : 'Success: ' + data)
```

Run: `node test-supabase.js`

---

## Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| Permission denied | RLS blocking access | Check RLS policies & user role |
| Invalid JWT token | Expired session | User needs to re-login |
| Storage upload fails | Bucket policy issue | Check CORS & bucket policies |
| Foreign key error | Referenced record missing | Verify parent record exists |

---

## Next Steps

1. Create Supabase project
2. Run schema migration (`001_schema.sql`)
3. Enable RLS policies (`002_rls_policies.sql`)
4. Create storage buckets
5. Configure authentication
6. Test connections
7. Update app code to use Supabase SDK
8. Migrate data from Base44
9. Deploy to production

See `supabase/migrations/` for all SQL files and detailed documentation.
