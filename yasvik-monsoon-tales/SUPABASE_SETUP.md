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

### Google sign-in: show “Yasvik” (not `*.supabase.co`)

When Google says **“Continue to cpksnpuavywbmhrzglyh.supabase.co”**, that is expected with Supabase’s default Google OAuth app. The app code cannot change that screen — you need **your own Google OAuth app** wired into Supabase.

#### 1. Google Cloud Console

1. Open [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **OAuth consent screen**
2. Set **App name** to `Yasvik` (or `Yasvik Natural Foods`)
3. Upload the **Yasvik logo**
4. Add **User support email**, **Privacy policy** (`https://www.yasvik.com/privacy` or your page), and **Terms** if you have one
5. Under **Authorized domains**, add: `yasvik.com` and `supabase.co`
6. Go to **Credentials** → **Create credentials** → **OAuth client ID** → **Web application**
7. **Authorized JavaScript origins:**
   - `https://www.yasvik.com`
   - `https://yasvik.com`
   - `http://localhost:5173` (for local dev)
8. **Authorized redirect URIs:**
   - `https://cpksnpuavywbmhrzglyh.supabase.co/auth/v1/callback`
9. Copy the **Client ID** and **Client Secret**

#### 2. Submit for Google brand verification (required for name + logo)

Google only shows your app **name and logo** after light **brand verification** (not full sensitive-scope review for basic profile/email).

1. In OAuth consent screen → **Branding** → confirm app name `Yasvik` and logo
2. Submit for **brand verification** when prompted
3. Until verified, Google may still show the domain instead of the name

#### 3. Supabase Dashboard

1. **Authentication** → **Providers** → **Google** → Enable
2. Paste your **Client ID** and **Client Secret** (do not rely on Supabase’s built-in Google app)
3. **Authentication** → **URL Configuration**:
   - **Site URL:** `https://www.yasvik.com`
   - **Redirect URLs:** `https://www.yasvik.com/**`, `http://localhost:5173/**`

#### 4. Optional (best trust): custom auth domain

On a paid Supabase plan you can set a custom auth domain such as `auth.yasvik.com` so users never see `.supabase.co` in the flow. See [Supabase custom domains](https://supabase.com/docs/guides/platform/custom-domains).

After steps 1–3, Google should show **“Continue to Yasvik”** with your logo once brand verification is approved (usually a few business days).


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
