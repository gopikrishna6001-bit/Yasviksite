# Yasvik App - Database Migrations

This directory contains SQL migrations for the Supabase database.

## Files

1. **001_schema.sql** - Complete PostgreSQL schema with 24 tables, relationships, indexes, triggers, and views
2. **002_rls_policies.sql** - Row-Level Security policies (60+ policies for access control)
3. **003_storage_buckets.sql** - Supabase Storage bucket configuration (8 buckets with policies)

## How to Apply

### Option 1: Supabase Dashboard

1. Go to SQL Editor
2. Click "New Query"
 Run
 Run
 Buckets

### Option 2: CLI

```bash
supabase db push
```

### Option 3: Direct Database

```bash
psql "postgresql://user:password@host:5432/postgres" \
  -f 001_schema.sql \
  -f 002_rls_policies.sql
```

## Schema Overview

### 24 Tables
- **Auth & Users**: user_profiles
- **Products**: categories, products, product_images
- **Bundles**: combos, combo_items
- **Content**: journeys, stories, story_comments
- **People & Recipes**: people, recipes
- **Curation**: collections, collection_items
- **Geography**: regions
- **Transactions**: orders, order_items
- **Subscriptions**: subscriptions, user_subscriptions
- **Feedback**: reviews
- **User Data**: addresses
- **CMS**: app_settings, homepage_sections, page_heroes
- **Media**: media_assets

### Key Features
 UUID primary keys
 Foreign key relationships with CASCADE rules
 Automatic timestamps (created_at, updated_at)
 Soft delete support (is_published, is_active flags)
 Comprehensive indexes
 RLS-enabled for security
 Helper views for common queries

## RLS Policies (60+)

- Public read for published content
- User isolation for personal data (orders, addresses, reviews)
- Admin-only writes for content management
- Service role bypass for backend operations

## Storage Buckets (8)

**Public (CDN):**
- product-images
- story-images
- person-images
- recipe-images
- journey-images
- media-assets

**Private (Auth):**
- user-uploads
- order-receipts

See 003_storage_buckets.sql for bucket policies.

## See Also

- SUPABASE_SETUP.md - Complete setup guide
- MIGRATION_GUIDE.md - Data migration from Base44
- SCHEMA_DIAGRAM.md - Visual ERD
