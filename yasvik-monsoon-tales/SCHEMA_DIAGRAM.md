# Yasvik App - Database Schema Diagram

Visual representation of Supabase database structure and relationships.

## Entity Relationship Diagram (ERD)

```

                      AUTHENTICATION                              


    auth.users (Supabase)
         
 1:1 (extends)         
 source "/Users/macbookprom3/Documents/Opany MVP/.venv/bin/activate"
    user_profiles
 auth.users.id
 email (unique)    
 display_name    
 phone_number    
 avatar_url    
 bio    
 created_at, updated_at    



                   PRODUCT CATALOG                                


    categories
 id (UUID) PK    
 name (unique)    
 slug    
 is_active    
 sort_order    
         
 1:N         
 source "/Users/macbookprom3/Documents/Opany MVP/.venv/bin/activate"
    products
 id (UUID) PK    
 name    
 slug    
 categories
 journeys (nullable)
 people (nullable)
 regions (nullable)
 price, discount_price    
 is_published, is_featured    
 created_at, updated_at    
         
 1:N (product has many images)         
 source "/Users/macbookprom3/Documents/Opany MVP/.venv/bin/activate"
    product_images
 id (UUID) PK    
 products
 image_url    
 alt_text    
 sort_order    



                    PRODUCT BUNDLES                               


    combos
 id (UUID) PK    
 name    
 combo_price    
 is_published    
 sort_order    
         
 1:N (combo has many items)         
 source "/Users/macbookprom3/Documents/Opany MVP/.venv/bin/activate"
    combo_items
 id (UUID) PK    
 combos
 products
 quantity    



                   CONTENT (Journeys & Stories)                   


    journeys
 id (UUID) PK    
 title    
 slug    
 is_published    
 sort_order    
         
 1:N         
 source "/Users/macbookprom3/Documents/Opany MVP/.venv/bin/activate"
    stories
 id (UUID) PK    
 title    
 slug    
 journeys (nullable)
 people (nullable)
 is_published    
 sort_order    
         
 1:N         
 source "/Users/macbookprom3/Documents/Opany MVP/.venv/bin/activate"
    story_comments
 id (UUID) PK    
 stories
 user_profiles
 comment_text    
 is_approved    



                    PEOPLE & RECIPES                              


    people
 id (UUID) PK    
 name    
 slug    
 bio, role    
 is_published    
         
 1:N         
 source "/Users/macbookprom3/Documents/Opany MVP/.venv/bin/activate"
    recipes
 id (UUID) PK    
 title    
 slug    
 people (nullable)
 ingredients, instructions    
 prep_time, cook_time    
 is_published    



                     COLLECTIONS & CURATION                       


    collections
 id (UUID) PK    
 name    
 slug    
 is_active    
 sort_order    
         
 1:N (collection has many products)         
 source "/Users/macbookprom3/Documents/Opany MVP/.venv/bin/activate"
    collection_items
 id (UUID) PK    
 collections
 products
 sort_order    



                      GEOGRAPHY                                   


    regions
 id (UUID) PK    
 name (unique)    
 code    
 sort_order    



                     ORDERS & TRANSACTIONS                        


    user_profiles
         
 1:N         
 source "/Users/macbookprom3/Documents/Opany MVP/.venv/bin/activate"
    orders
 id (UUID) PK    
 order_number (unique)    
 user_profiles
 status (pending, confirmed, shipped, delivered, etc)    
 payment_status (unpaid, paid, refunded)    
 total_amount    
 shipping_name, shipping_address    
 created_at    
         
 1:N (order has many items)         
 source "/Users/macbookprom3/Documents/Opany MVP/.venv/bin/activate"
    order_items
 id (UUID) PK    
 orders
 products
 quantity    
 unit_price    
 total_price    



                     SUBSCRIPTIONS                                


    subscriptions
 id (UUID) PK    
 name    
 billing_period (monthly, annual, etc)    
 price    
 is_active    
         
 1:N         
 source "/Users/macbookprom3/Documents/Opany MVP/.venv/bin/activate"
    user_subscriptions
 id (UUID) PK    
 user_profiles
 subscriptions
 status (active, cancelled, expired)    
 start_date, end_date    
 auto_renew    



                  REVIEWS & FEEDBACK                              


    products
         
 1:N         
 source "/Users/macbookprom3/Documents/Opany MVP/.venv/bin/activate"
    reviews
 id (UUID) PK    
 products
 user_profiles
 orders (nullable)
 rating (1-5)    
 review_text    
 is_verified    
 is_approved    



                    USER ADDRESSES                                


    user_profiles
         
 1:N         
 source "/Users/macbookprom3/Documents/Opany MVP/.venv/bin/activate"
    addresses
 id (UUID) PK    
 user_profiles
 type (home, office, other)    
 address_line_1, address_line_2    
 city, state, postal_code, country    
 is_default    
 created_at, updated_at    



                   CMS & CONFIGURATION                            


    app_settings
 id (UUID) PK    
 setting_key (unique)    
 setting_value    
 data_type (string, number, boolean, json)    
 updated_at    

    homepage_sections
 id (UUID) PK    
 title    
 section_type    
 sort_order    
 is_active    
 content_json (flexible structure)    
 created_at, updated_at    

    page_heroes
 id (UUID) PK    
 page_slug (unique)    
 title    
 image_url    
 cta_text, cta_link    
 is_active    



                    MEDIA & ASSETS                                


    media_assets
 id (UUID) PK    
 name, slug    
 file_path    
 file_size    
 mime_type    
 media_type (image, video, document)    
 entity_type, entity_id (flexible association)    
 alt_text    
 is_active    
 created_at, updated_at    
```

## Key Relationships Summary

### One-to-Many (1:N)
 Orders (user has many orders)
 Addresses (user has many addresses)
 Reviews (user has many reviews)
 Subscriptions (user has many subscriptions)
 Products (category has many products)
 Product Images (product has many images)
 Reviews (product has many reviews)
 Stories (journey has many stories)
 Recipes (person has many recipes)
 Combo Items (combo has many items)
 Collection Items (collection has many items)
 Order Items (order has many items)
 Story Comments (story has many comments)
 User Subscriptions (subscription has many user subscriptions)

### Many-to-Many (Implicit)
-  Collections (via collection_items)Products 
-  Combos (via combo_items)Products 

### One-to-One (1:1)
- User  Auth User (extends auth.users)Profile 

---

## Table Statistics

| Table | Purpose | FK Count | Index Count | RLS Enabled |
|---|---|---|---|---|
| user_profiles | User data | 1 | 2 | | 
| categories | Product categories | 0 | 2 | | 
| products | Main product catalog | 4 | 6 | | 
| product_images | Product photos | 1 | 2 | | 
| combos | Product bundles | 0 | 2 | | 
| combo_items | Bundle items | 2 | 2 | | 
| journeys | Journey content | 0 | 2 | | 
| stories | Story content | 3 | 3 | | 
| story_comments | Story feedback | 2 | 2 | | 
| people | People/Chefs | 0 | 2 | | 
| recipes | Recipe content | 1 | 2 | | 
| collections | Curated lists | 0 | 2 | | 
| collection_items | Collection products | 2 | 2 | | 
| regions | Geographic regions | 0 | 1 | | 
| orders | Customer orders | 1 | 5 | | 
| order_items | Order line items | 2 | 2 | | 
| subscriptions | Plans | 0 | 2 | | 
| user_subscriptions | User subscriptions | 2 | 3 | | 
| reviews | Product reviews | 3 | 3 | | 
| addresses | Shipping addresses | 1 | 2 | | 
| app_settings | Configuration | 1 | 1 | | 
| homepage_sections | Homepage layout | 0 | 2 | | 
| page_heroes | Page banners | 0 | 1 | | 
| media_assets | General media | 1 | 3 | | 

---

## Database Constraints

### Primary Keys
- All tables use `UUID` type for primary keys
- Generated via `uuid_generate_v4()` function
- Distributed across instances (no sequential ID issues)

### Foreign Keys
- All FKs reference UUID primary keys
- CASCADE DELETE for child-only records
- SET NULL for optional relationships
- RESTRICT for records with business logic

### Unique Constraints
- Email on user_profiles
- Slug on products, categories, journeys, stories, people, recipes, collections, page_heroes
- SKU on products
- Order number on orders
- Name on categories, regions
- Setting key on app_settings

### Check Constraints
- Order quantity > 0
- Review rating between 1-5
- Price and amount  0fields 

---

## Indexes Created

**Performance Indexes:**
- Foreign key columns (for joins)
- Filter columns (is_published, is_active, status)
- Sort columns (sort_order)
- Created_at (for ordering)
- Email (for auth lookups)

**Examples:**
```sql
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_published ON products(is_published);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_reviews_product ON reviews(product_id);
```

---

## Views Created

### published_products
Filtered view of published products with category join
- Used for public catalog queries
- Excludes unpublished items

### active_categories
Filtered view of active categories
- For public category listings
- Automatically sorted by sort_order

### user_order_summary
Aggregated view of user order statistics
- Total order count
- Lifetime value
- Last order date
- Delivery statistics

---

## Data Types Used

```sql
-- Identifiers
UUID PRIMARY KEY          -- All IDs
VARCHAR(255) UNIQUE       -- Slugs, SKUs, emails
VARCHAR(100/255)          -- Names, values, enum-like fields
INTEGER                   -- Quantities, counts, sort order

-- Pricing
DECIMAL(10, 2)            -- Individual prices
DECIMAL(12, 2)            -- Order totals
DECIMAL(5, 2)             -- Discounts, percentages

-- Text
TEXT                      -- Long content (bio, description, instructions)
VARCHAR(500)              -- Medium text (subtitles, short descriptions)
VARCHAR(255)              -- Short text (names, titles)

-- Status & Flags
BOOLEAN                   -- is_published, is_active, is_featured, is_verified
VARCHAR(50)               -- Enum-like (status, payment_status, type)

-- Timestamps
TIMESTAMP WITH TIME ZONE  -- All timestamps (created_at, updated_at)
DEFAULT NOW()             -- Automatic current time

-- Media
TEXT                      -- URLs (image_url, file_path)
BIGINT                    -- File sizes in bytes

-- Flexible
JSONB                     -- Flexible data (content_json, metadata)
```

---

## Scalability Considerations

### Current Design
- Single database instance (Supabase)
- UUID-based sharding ready
- Timestamp-based archiving ready
- Partition-ready structure

### Future Scaling
1. **Read Replicas** - Supabase supports read-only replicas
2. **Partitioning** - Orders & reviews by date
3. **Archival** - Move old orders to cold storage
4. **Caching** - Redis for frequently accessed products
5. **Sharding** - By region or user (if needed)

---

## Compliance & Security

### Data Privacy
-  User data isolated by RLS
-  No PII in logs
-  Soft deletes (data retention)
-  Timestamps for audit trail

### Security
-  Row-level security on all tables
-  Role-based access control
-  Service role for backend operations
-  Encrypted connections (SSL/TLS)

### Compliance
-  GDPR-ready (soft deletes, user isolation)
-  Audit trail (timestamps + triggers)
-  Data residency control (Supabase region selection)
