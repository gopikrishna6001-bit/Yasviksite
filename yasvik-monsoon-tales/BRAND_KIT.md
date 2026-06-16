# Yasvik Brand System (Source of Truth)

This repository now treats brand rules as runtime contracts, not static notes.

- Brand: `YASVIK`
- Core statement: `Foods Sourced Through Journeys`
- Storefront line: `Traditional Foods • Fair Prices • Trusted Quality`
- Emotional line: `Taste What Was Lost`
- Voice: grounded, calm, transparent, premium-but-human

## Runtime Contracts

- Tokens and layout constants: `src/brand/brandSystem.js`
- Runtime logo rendering and admin-driven variants: `src/components/brand/YasvikLogo.jsx`
- App-wide CSS variables and brand utilities: `src/index.css`
- Tailwind color/type aliases: `tailwind.config.js`
- Admin controls for active settings: `src/pages/admin/AdminSettings.jsx`

## Design Token Architecture

The design system follows a three-layer token model so the site can evolve without page-by-page restyling.

- Primitive tokens: raw Yasvik colors, typefaces, radii, shadows and easing curves.
- Semantic tokens: page surface, paper surface, primary text, muted text, focus ring, soft border.
- Component tokens: header background, nav background, hero overlay, product card radius, harvest CTA shape.

Primary CSS utilities:

- `.yasvik-header-shell`: warm translucent header surface.
- `.yasvik-search-pill`: search fields and search triggers.
- `.yasvik-icon-button`: profile/cart/menu-style icon affordances.
- `.yasvik-harvest-cta`: primary commerce CTA.
- `.yasvik-editorial-card`: storytelling/category surfaces.
- `.yasvik-product-card`: product catalogue card surface.
- `.yasvik-trace-ribbon`: traceability/farmer-linked cue.
- `.yasvik-pressable`: consistent physical tap/press response.

## Logo Usage Matrix

Use only `YasvikLogo` variants in product UI.

- Header desktop and mobile: `horizontal`
- Hero seal and trust markers: `symbol`
- Drawer identity and formal lockups: `lockup`
- Footer: `tagline`
- SEO organization logo: `horizontal`
- Browser icon/favicon: `symbol`

If an admin-provided logo URL fails, the component automatically falls back to local default assets.

## Header Architecture

- Layer 1: Announcement strip (session-close only, returns on hard refresh)
- Layer 2: Search + centered logo + profile/cart controls
- Layer 3: Primary nav (`SHOP | OUR ROOTS | CONTACT`) on desktop only
- Scroll behavior:
- Desktop: nav collapses in compact mode
- Mobile: single row, no overlap, top padding derived from CSS variables

## Hero Standards

All hero surfaces are admin-tunable through `Admin Settings`.

- `home_hero_media_url` and `home_hero_media_mobile_url` for device-specific composition
- `home_hero_overlay_strength` for readability control
- `home_hero_headline_color` and `home_hero_subheadline_color` for brand-accurate contrast
- Headline tracking stays wide and serif-led for editorial tone

## Performance Guardrail

Avoid replacing logos with extremely large image-embedded SVG exports. Prefer optimized vector or compressed bitmap assets to preserve LCP and overall interaction smoothness.

## Brand Foundation Mapping

Every public surface should answer at least one of these Yasvik promises:

- Where did this food come from?
- Who is connected to it?
- Why is it trustworthy for an everyday family kitchen?
- Is it reasonably priced and practical, not luxury for luxury's sake?

Commerce copy should prefer `harvest bag`, `sourced through journeys`, `traditional foods`, `fair prices`, and `trusted quality` over generic e-commerce language.
