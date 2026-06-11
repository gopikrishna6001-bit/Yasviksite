# Yasvik App - Base44 to Supabase Migration Guide

Complete step-by-step guide to migrate from Base44 to Supabase.

## Table of Contents
1. [Pre-Migration Checklist](#pre-migration-checklist)
2. [Data Export from Base44](#data-export-from-base44)
3. [Data Transformation](#data-transformation)
4. [Supabase Setup](#supabase-setup)
5. [Data Import](#data-import)
6. [Testing & Verification](#testing--verification)
7. [Application Code Updates](#application-code-updates)
8. [Go-Live](#go-live)

---

## Pre-Migration Checklist

- [ ] Backup all Base44 data
- [ ] Create new Supabase project
- [ ] Get database credentials
- [ ] Review schema differences
- [ ] Plan downtime window (if needed)
- [ ] Notify team members
- [ ] Prepare rollback plan

---

## Data Export from Base44

### Step 1: Export User Data

Using Base44 SDK:

```javascript
import { base44 } from '@/api/base44Client'

async function exportUsers() {
  const users = await base44.entities.UserProfile.list('-created_date', 1000)
  console.log('Exported users:', users)
  
  // Save to JSON file
  const json = JSON.stringify(users, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'users.json'
  a.click()
}
```

### Step 2: Export All Entities

Create a comprehensive export script:

```javascript
const entities = [
  'UserProfile', 'Product', 'Category', 'Combo', 'ComboItem',
  'Journey', 'Story', 'StoryComment', 'Person', 'Recipe',
  'Collection', 'CollectionItem', 'Region', 'Order', 'OrderItem',
  'Subscription', 'UserSubscription', 'Review', 'Address',
  'AppSettings', 'HomepageSection', 'PageHero', 'MediaAsset'
]

async function exportAllData() {
  const exportedData = {}
  
  for (const entity of entities) {
    try {
      const data = await base44.entities[entity].list('-created_date', 5000)
      exportedData[entity] = data
      console.log Exported ${entity}: ${data.length} records`)(`
    } catch (error) {
      console. Failed to export ${entity}:`, error)error(`
    }
  }
  
  // Save to file
  const json = JSON.stringify(exportedData, null, 2)
  // ... write to file
  return exportedData
}
```

### Step 3: Backup to Cloud Storage

```bash
# Store exports in project folder
mkdir -p data/base44-export
# Run export script and save outputs
node scripts/export-base44.js > data/base44-export/export.json
```

---

## Data Transformation

Base44 data needs transformation to match Supabase schema.

### Mapping Table

| Base44 Entity | Supabase Table | Notes |
|---|---|---|
| UserProfile | user_profiles | Map email, display fields |
| Product | products | Add slug, category_id |
| Category | categories | Keep as-is mostly |
| Combo | combos | Rename fields if needed |
| ComboItem | combo_items | Add combo_id, product_id |
| Journey | journeys | Map fields |
| Story | stories | Add journey_id, person_id |
| StoryComment | story_comments | Map user_id, story_id |
| Person | people | Rename if needed |
| Recipe | recipes | Map person_id |
| Collection | collections | Map fields |
| CollectionItem | collection_items | Add IDs |
| Region | regions | Keep as-is |
| Order | orders | Add user_id, order_number |
| OrderItem | order_items | Add product_id, order_id |
| Subscription | subscriptions | Keep as-is |
| UserSubscription | user_subscriptions | Add user_id |
| Review | reviews | Add product_id, user_id |
| Address | addresses | Add user_id, type field |
| AppSettings | app_settings | Add setting_key |
| HomepageSection | homepage_sections | Keep fields |
| PageHero | page_heroes | Add page_slug |
| MediaAsset | media_assets | Add created_by |

### Transformation Script

```javascript
// Transform Base44 data to Supabase format
function transformData(base44Data) {
  const supabaseData = {}
  
  // Transform Users
  supabaseData.user_profiles = base44Data.UserProfile.map(user => ({
    id: user.id || uuid(),
    email: user.user_email,
    display_name: user.full_name,
    phone_number: user.phone,
    avatar_url: user.avatar_url,
    bio: user.bio,
    location: user.location,
    created_at: user.created_date,
    updated_at: user.modified_date,
    is_active: user.is_active !== false
  }))
  
  // Transform Products
  supabaseData.products = base44Data.Product.map(product => ({
    id: product.id || uuid(),
    name: product.product_name,
    slug: slugify(product.product_name),
    description: product.description,
    sku: product.sku,
    category_id: product.category_id,
    journey_id: product.journey_id || null,
    person_id: product.person_id || null,
    region_id: product.region_id || null,
    price: product.price,
    currency: product.currency || 'INR',
    discount_price: product.discount_price,
    is_published: product.is_published,
    is_featured: product.is_featured,
    featured_in_hero: product.featured_in_hero,
    stock_quantity: product.stock_quantity || 0,
    featured_image_url: product.featured_image_url,
    seo_title: product.seo_title,
    seo_description: product.seo_description,
    seo_keywords: product.seo_keywords,
    created_at: product.created_date,
    updated_at: product.modified_date,
    created_by: product.created_by
  }))
  
  // ... Continue for other entities
  
  return supabaseData
}

// Helper function
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
```

---

## Supabase Setup

### Step 1: Create Project

1. Go to supabase.com
2. Click "New Project"
3. Name: `yasvik-app`
4. Save credentials securely

### Step 2: Run Migrations

```bash
# Create migrations directory
mkdir -p supabase/migrations

# Copy SQL files to migrations/
cp 001_schema.sql supabase/migrations/
cp 002_rls_policies.sql supabase/migrations/
cp 003_storage_buckets.sql supabase/migrations/

# Apply using Supabase CLI
supabase link --project-ref [your-project-ref]
supabase db push
```

Or in Supabase Dashboard:
 New Query
 Run
 Run
4. Create storage buckets

### Step 3: Create Storage Buckets

 Storage:

```
product-images    (Public)
story-images      (Public)
person-images     (Public)
recipe-images     (Public)
journey-images    (Public)
media-assets      (Public)
user-uploads      (Private)
order-receipts    (Private)
```

---

## Data Import

### Step 1: Prepare Data

```javascript
// Validate transformed data before import
function validateData(data) {
  const errors = []
  
  // Check for required fields
  data.products?.forEach((p, i) => {
    if (!p.name) errors.push(`Product ${i}: missing name`)
    if (!p.category_id) errors.push(`Product ${i}: missing category_id`)
  })
  
  return errors
}

const errors = validateData(supabaseData)
if (errors.length > 0) {
  console.error('Validation errors:', errors)
  return
}

console.log Data validation passed')(
```

### Step 2: Import via Supabase JS Client

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY  // Use service role for server-side
)

async function importData(data) {
  const results = {}
  
  // 1. Import categories first (no dependencies)
  console.log('Importing categories...')
  const { data: categories, error } = await supabase
    .from('categories')
    .insert(data.categories)
  if (error) throw new Error(`Categories: ${error.message}`)
  results.categories = categories.length
  
  // 2. Import regions
  console.log('Importing regions...')
  const { data: regions } = await supabase
    .from('regions')
    .insert(data.regions)
  results.regions = regions?.length || 0
  
  // 3. Import user profiles
  console.log('Importing users...')
  const { data: users } = await supabase
    .from('user_profiles')
    .insert(data.user_profiles)
  results.users = users?.length || 0
  
  // 4. Import products (depends on categories)
  console.log('Importing products...')
  const { data: products } = await supabase
    .from('products')
    .insert(data.products)
  results.products = products?.length || 0
  
  // 5. Import product images
  console.log('Importing product images...')
  const { data: productImages } = await supabase
    .from('product_images')
    .insert(data.product_images)
  results.product_images = productImages?.length || 0
  
  // 6. Continue with other entities...
  
  return results
}
```

### Step 3: Import via psql (Faster for Large Datasets)

```bash
# Export as CSV from Base44
psql "postgresql://postgres:[password]@[host]:5432/postgres" << EOF

-- Disable RLS temporarily for import
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
-- ... disable all tables

-- Import data
\COPY user_profiles FROM 'data/user_profiles.csv' WITH (FORMAT csv, HEADER true)
\COPY categories FROM 'data/categories.csv' WITH (FORMAT csv, HEADER true)
\COPY products FROM 'data/products.csv' WITH (FORMAT csv, HEADER true)
-- ... copy all tables

-- Re-enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- ... enable all tables

EOF
```

---

## Testing & Verification

### Step 1: Verify Record Counts

```javascript
async function verifyImport() {
  const tables = [
    'user_profiles', 'categories', 'products', 'orders',
    'combos', 'journeys', 'stories', 'people', 'recipes'
  ]
  
  const results = {}
  for (const table of tables) {
    const { count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
    results[table] = count
  }
  
  console.table(results)
  return results
}
```

### Step 2: Test RLS Policies

```javascript
// Test 1: Public read (no auth)
const anonSupabase = createClient(url, anonKey)
const { data, error } = await anonSupabase
  .from('products')
  .select('*')
  .eq('is_published', true)
  .limit(1)

console.log(Public read:,  FAILED OK', data) : error ? 

// Test 2: User isolation
const userSupabase = createClient(url, anonKey)
await userSupabase.auth.signInWithPassword({ email, password })
const { data: userOrders } = await userSupabase
  .from('orders')
  .select('*')

console.log(User read own orders:, userOrders?.length > 0 ?   FAILED')OK' : '

// Test 3: Admin write
const adminSupabase = createClient(url, serviceRoleKey)
const { data: newProduct, error: insertError } = await adminSupabase
  .from('products')
  .insert([{
    name: 'Test Product',
    category_id: 'cat-uuid',
    price: 100,
    is_published: false
  }])

console.log(Admin write:,  FAILED OK') : insertError ? 
```

### Step 3: Test Media Uploads

```javascript
async function testStorageUpload() {
  const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
  
  // Public bucket (authenticated)
  const { data, error } = await supabase.storage
    .from('product-images')
    .upload('test/test.jpg', file)
  
  console.log(Upload:,  FAILED OK') : error ? 
  
  if (!error) {
    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl('test/test.jpg')
    console.log('Public URL:', publicUrl)
  }
}
```

---

## Application Code Updates

### Step 1: Install Supabase Client

```bash
npm install @supabase/supabase-js
```

### Step 2: Create Supabase Client

Update `src/api/supabaseClient.js`:

```javascript
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

### Step 3: Update API Service Layer

In `src/services/api.js`, replace Base44 calls:

```javascript
import { supabase } from '@/api/supabaseClient'

// Before (Base44):
export const products = {
  list: (sort = '-created_date', limit = 20) =>
    base44.entities.Product.list(sort, limit)
}

// After (Supabase):
export const products = {
  list: (sort = '-created_date', limit = 20) =>
    supabase
      .from('products')
      .select('*')
      .order(sort.replace('-', ''), { ascending: !sort.startsWith('-') })
      .limit(limit)
      .then(res => {
        if (res.error) throw res.error
        return res.data
      })
}
```

### Step 4: Test in Development

```bash
npm run dev
# Test all features with new Supabase backend
```

---

## Go-Live

### Pre-Flight Checks

- [ ] All tests passing
- [ ] RLS policies verified
- [ ] Performance acceptable
- [ ] Rollback plan ready
- [ ] Team trained on new system
- [ ] Monitoring alerts set up

### Deployment Steps

1. **Update Environment**
   ```bash
   # .env.production
   VITE_SUPABASE_URL=https://[project].supabase.co
   VITE_SUPABASE_ANON_KEY=[production-key]
   ```

2. **Deploy Application**
   ```bash
   npm run build
   npm run deploy
   ```

3. **Monitor**
   - Check Supabase Dashboard for errors
   - Monitor user reports
   - Track performance metrics

4. **Verify Production**
   - Test public pages
   - Test user flows (login, order, etc.)
   - Check storage URLs
   - Verify emails (if applicable)

### Rollback (if needed)

1. Switch DNS back to Base44
2. Revert environment variables
3. Redeploy application
4. Investigate issue
5. Plan retry

---

## Post-Migration

### Cleanup

- [ ] Delete Base44 project (after confidence period)
- [ ] Clean up old data exports
- [ ] Document final migration report
- [ ] Update team documentation

### Optimization

- [ ] Review RLS performance
- [ ] Add additional indexes if needed
- [ ] Set up database backups
- [ ] Configure monitoring & alerts
- [ ] Plan for scaling

---

## Support & Troubleshooting

### Common Issues

**Issue: Foreign key constraint error**
- Ensure parent records imported first
 products)
- Verify IDs match between tables

**Issue: RLS blocking legitimate access**
- Check user role is set in auth
- Verify policy conditions
- Test with service role (should work)

**Issue: Data mismatch**
- Compare record counts
- Spot-check random records
- Verify timestamps converted

**Issue: Performance degradation**
- Check for missing indexes
- Review slow queries in logs
- Consider materialized views

### Debugging

Enable Supabase debug logs:

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(url, key, {
  db: {
    schema: 'public'
  },
  auth: {
    persistSession: true
  },
  debug: true  // Enable console logs
})
```

---

## Questions?

See `SUPABASE_SETUP.md` for complete setup guide
See `supabase/migrations/README.md` for schema documentation
Check Supabase docs: https://supabase.com/docs
