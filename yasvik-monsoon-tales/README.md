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
# Optional: set to false to hide Google sign-in. Enabled by default when Supabase is configured.
# VITE_ENABLE_GOOGLE_AUTH=true
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

## Razorpay (secure checkout)

- **Key ID** is returned from the worker when creating an order (safe for checkout UI).
- **Key Secret** lives only in Cloudflare Worker secrets — never in `.env`, Supabase, or the frontend.

```bash
cd yasvik-monsoon-tales
RAZORPAY_KEY_ID=rzp_test_xxx RAZORPAY_KEY_SECRET=your_secret npm run setup:razorpay
npx wrangler deploy
```

Verify in **Admin → Settings → Razorpay payments** (Test connection).

Production checkout flow: login → `razorpayCreateOrder` (worker) → Razorpay modal → `razorpayVerifyPayment` (HMAC signature check) → order confirmed + stock deducted.
