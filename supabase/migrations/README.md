# Yasvik App - Supabase Database Migrations

Complete PostgreSQL schema and configuration for migrating from Base44 to Supabase.

## Migration Files

### 1. `001_schema.sql` (603 lines)
**Complete PostgreSQL database schema** with all tables, relationships, and constraints.

#### Tables Created (24 total):

**Authentication & Users:**
- `user_profiles` - Extended user data (email, display_name, avatar, preferences)

**Products & Catalog:**
- `categories` - Product categories with sorting
- `products` - Main product table with pricing, status, media
- `product_images` - Product image gallery

**Bundles & Combos:**
- `combos` - Product combo bundles
- `combo_items` - Items in combos

**Content:**
- `journeys` - Journey collections
- `stories` - Individual stories
- `story_comments` - Story comments (with approval)
- `people` - People/chefs profiles
- `recipes` - Recipe content

**Curation:**
- `collections` - Curated product collections
- `collection_items` - Products in collections

**Geography:**
- `regions` - Regions/states

**Transactions:**
- `orders` - Customer orders
- `order_items` - Items in orders

**Subscriptions:**
- `subscriptions` - Subscription plans
- `user_subscriptions` - User subscription instances

**Feedback:**
- `reviews` - Product reviews & ratings

**User Data:**
- `addresses` - Shipping addresses

**CMS & Config:**
- `app_settings` - Global configuration
- `homepage_sections` - Homepage layout sections
- `page_heroes` - Page hero banners

**Media:**
- `media_assets` - General media asset tracking

#### Key Features:
-  UUID primary keys for all tables
-  Foreign key relationships with CASCADE delete rules
-  `created_at` and `updated_at` timestamps on all tables
-  Automatic timestamp updates via triggers
-  Soft delete support via `is_published` and `is_active` flags
-  Comprehensive indexes on foreign keys and filter columns
-  Helper views for common queries
-  PostgreSQL `moddatetime` trigger for timestamp automation

#### Indexes Created:
- Foreign key indexes for query performance
- Filter column indexes (is_published, is_active, status)
- Sort order indexes (sort_order columns)
- Composite indexes where needed

#### Views Created:
- `published_products` - Products with category info
- `active_categories` - Active categories only
- `user_order_summary` - Order statistics per user

---

### 2. `002_rls_policies.sql` (651 lines)
**Row-Level Security policies** implementing access control at database level.

#### RLS Policy Summary (60+ policies):

**Public Content (Anyone Can Read):**
-  Published products, combos, journeys, stories
-  Published people, recipes, collections
-  Active categories, regions, subscriptions
-  Approved story comments & reviews
-  Active homepage sections & page heroes

**User Personal Data:**
-  Users can read/write own profile
-  Users can read/write own orders & order items
-  Users can read/write own addresses
-  Users can read/write own subscriptions
-  Users can create & update own reviews

**Admin-Only Operations:**
-  Create/update/delete products, categories, combos
-  Create/update/delete content (journeys, stories, people, recipes)
-  Create/update/delete collections
-  Manage app settings
-  Upload media to public buckets
-  Approve/delete comments and reviews
-  Update order statuses

**Admin Reads:**
-  Admins can read all user profiles
-  Admins can read all orders & order items
-  Admins can read all addresses
-  Admins can read all subscriptions
-  Admins can read all reviews
-  Admins can read all content (unpublished)

#### Helper Functions:
- `auth.is_admin()` - Checks if user has admin role
- `is_admin()` - Alternative using JWT claims

#### Implementation Notes:
- All RLS policies use `auth.uid()` for user context
- Role checking via `raw_user_meta_data->>'role'` in Supabase auth
- Can be customized to use custom claims in JWT
- Service role key can bypass all RLS (for backend operations)

---

### 3. `003_storage_buckets.sql` (212 lines)
**Storage bucket configuration** for Supabase Storage.

#### Buckets (8 total):

**Public Buckets (CDN accessible):**
1. `product-images` - Product photos & thumbnails
2. `story-images` - Story featured images
3. `person-images` - Chef/person profile photos
4. `recipe-images` - Recipe photos
5. `journey-images` - Journey cover images
6. `media-assets` - General media files

**Private Buckets (Authenticated only):**
7. `user-uploads` - User avatars, documents
8. `order-receipts` - Order PDFs, invoices

#### Storage Policies (18 policies):

**Public Read:**
-  Anyone can download from public buckets
-  No auth needed (via anonymous role)

**Authenticated Upload:**
-  Only authenticated admins can upload to public buckets
-  Role check required (admin or staff)

**Private User Data:**
-  Users can read/write own uploads
-  Users organized by directory: `{user_id}/*`
-  Admins can read all private files

**Order Receipts:**
-  Admins can upload
-  Authenticated users can read own
-  Admins can read all

---

## How to Apply Migrations

### Option 1: Supabase Dashboard (Recommended for Testing)

1. **Create Project**
 New Project
   - Copy Project URL and Keys

2. **Run Schema Migration**
   - Go to SQL Editor
   - Click "New Query"
   - Open `001_schema.sql`
   - Copy & paste entire contents
   - Click "Run"

3. **Enable RLS**
   - Click "New Query"
   - Open `002_rls_policies.sql`
   - Copy & paste entire contents
   - Click "Run"

4. **Configure Storage Policies**
 Buckets
   - Create buckets manually (see table above)
   - Run `003_storage_buckets.sql` for policies

### Option 2: Supabase CLI (Recommended for Production)

```bash
# Install Supabase CLI
npm install -g supabase

# Link to project
supabase link --project-ref=[your-project-ref]

# Run migrations
supabase db push

# Or run specific migration
psql "postgresql://postgres:[password]@[host]:5432/postgres" < 001_schema.sql
```

### Option 3: psql (Direct Database)

```bash
# Install PostgreSQL client
brew install postgresql  # macOS
apt-get install postgresql-client  # Ubuntu

# Connect and run
psql "postgresql://postgres:[password]@[host]:5432/postgres" \
  -f 001_schema.sql \
  -f 002_rls_policies.sql \
  -f 003_storage_buckets.sql
```

---

## Verification Checklist

After running migrations:

### Database
- [ ] 24 tables created (check Table Editor)
- [ ] All foreign key relationships exist
- [ ] Indexes created successfully
- [ ] Triggers for `updated_at` working
- [ ] Views created (published_products, etc.)

### RLS
- [ ] All tables have RLS enabled
- [ ] 60+ policies created
- [ ] Public read policies working
- [ ] User isolation working
- [ ] Admin access working

### Storage
- [ ] 8 buckets created
- [ ] Public buckets accessible via URL
- [ ] Private buckets require auth
- [ ] CORS configured for localhost & production

### Test Connection

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// Test 1: Public read
const { data: products } = await supabase
  .from('products')
  .select('*')
  .eq('is_published', true)
  .limit(1)
console.log('Public read:', products)

// Test 2: User auth
const { data: { user } } = await supabase.auth.getUser()
if (user) {
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', user.id)
  console.log('User orders:', orders)
}

// Test 3: Admin check
const isAdmin = await supabase
  .from('user_profiles')
  .select('*')
  .eq('id', user?.id)
  .then(res => res.data?.[0]?.raw_user_meta_data?.role === 'admin')
console.log('Is admin:', isAdmin)
```

---

## Common Issues & Solutions

### Issue: "relation does not exist"
**Cause:** Migrations not fully applied
- Run all three migrations in order
- Check for SQL syntax errors in output

### Issue: "permission denied" on INSERT
**Cause:** RLS blocking insert (expected for users without role)
- Only admins can create products, etc.
- Users need `raw_user_meta_data` role set

### Issue: Storage upload fails
**Cause:** Bucket doesn't exist or policy missing
- Create bucket via Dashboard first
- Ensure policy applied with correct role check

### Issue: Foreign key constraint error
**Cause:** Referencing non-existent record
- Verify parent record exists first
- Check ID type matches (UUID)

### Issue: Updated_at not updating
**Cause:** Trigger not attached
- Verify triggers created in schema
- Check `pg_triggers` table

---

## Schema Design Decisions

### 1. UUID Primary Keys
- More secure than sequential IDs
- Distributed-friendly (Supabase multi-region)
- No enumeration attacks

### 2. Soft Deletes via Flags
- `is_published` for content visibility
- `is_active` for configuration items
- Preserves data integrity & history
- No hard deletes for compliance

### 3. Timestamps with Triggers
- `created_at` immutable (set on insert)
- `updated_at` auto-updated on modification
- PostgreSQL timezone-aware
- Functions defined in schema

### 4. Role-Based Access Control
- Admin/staff roles in auth metadata
- RLS policies enforce at DB level
- No reliance on app-level checks
- Secure by default

### 5. Comprehensive Relationships
- Foreign keys with CASCADE rules
- Referential integrity enforced
- Indexes on FK for query performance
- Minimal data duplication

---

## Data Types & Constraints

### Standard Field Types:
```sql
-- IDs
id UUID PRIMARY KEY DEFAULT uuid_generate_v4()

-- Text
name VARCHAR(255) NOT NULL
description TEXT
slug VARCHAR(255) UNIQUE

-- Numbers
price DECIMAL(10, 2)
rating INTEGER CHECK (rating >= 1 AND rating <= 5)

-- Status
is_published BOOLEAN DEFAULT FALSE
status VARCHAR(50)

-- Timestamps
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()

-- Relationships
category_id UUID REFERENCES categories(id) ON DELETE SET NULL
user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE
```

---

## Future Extensions

Consider adding:
1. **Audit Logging** - Track all changes for compliance
2. **Soft Delete Marker** - `deleted_at` timestamp
3. **Versioning** - Product/content revision history
4. **Full-Text Search** - PostgreSQL FTS for products
5. **Analytics** - User behavior & sales tracking
6. **Webhooks** - Real-time events (order created, etc.)
7. **Rate Limiting** - Prevent abuse of API

---

## Support & Documentation

- **Supabase Docs**: https://supabase.com/docs
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **RLS Guide**: https://supabase.com/docs/guides/auth/row-level-security
- **Storage Guide**: https://supabase.com/docs/guides/storage/overview

See `../SUPABASE_SETUP.md` for complete setup instructions.
