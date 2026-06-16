# Yasvik Storefront

Yasvik is a Supabase + Cloudflare powered ecommerce storefront and admin CMS.

## Local setup

1. Install dependencies:
   `npm install`
2. Create `.env.local`:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_PUBLIC_BUCKET=media-assets
VITE_SUPABASE_PRIVATE_BUCKET=user-uploads
VITE_CLOUDFLARE_API_BASE_URL=/api
```

3. Start dev server:
   `npm run dev`

## Build

`npm run build`

## Runtime architecture

- Frontend: React + Vite
- Auth/Data/Storage: Supabase
- Server functions/API routes: Cloudflare Worker (`cloudflare/worker.js`)
- Production domain: `https://www.yasvik.com`
