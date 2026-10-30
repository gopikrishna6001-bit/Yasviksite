# Catalogue Manager — Phase 3 (Media ZIP)

## Naming

```text
<PRODUCT_CODE>_hero.webp
<PRODUCT_CODE>_2.webp
<PRODUCT_CODE>_3.webp
```

Match is case-insensitive against `product_code` (fallback sku).

## Rules

- Scan ZIP → preview matched / unmatched
- Apply uploads to R2 via existing `/media/upload`
- Updates `products.featured_image_url` + `product_images`
- Missing slot in ZIP = **keep** existing image
- Path traversal / oversized files rejected

## Admin

Catalogue Manager → **Media Library**
