#!/usr/bin/env python3
import json
import math
import re
import sys
from pathlib import Path

import pandas as pd


WORKBOOK = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/Users/macbookprom3/Downloads/yasvik_codex_products_quality_copy_recipe_mapping_v2.xlsx")
OUT_DIR = Path(__file__).resolve().parent / "import-preview"
OUT_PATH = OUT_DIR / "quality_catalog_v2.json"


def clean(value):
    if value is None:
        return ""
    if isinstance(value, float) and math.isnan(value):
        return ""
    return str(value).strip()


def number(value, fallback=0):
    try:
        if value is None or (isinstance(value, float) and math.isnan(value)):
            return fallback
        return float(value)
    except Exception:
        return fallback


def slugify(value):
    value = clean(value).lower().replace("&", "and")
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return re.sub(r"(^-+|-+$)", "", value)


def pack_kg(unit):
    unit = clean(unit).lower().replace(" ", "")
    match = re.match(r"([0-9]+(?:\.[0-9]+)?)(kg|g)$", unit)
    if not match:
        return None
    amount = float(match.group(1))
    return amount if match.group(2) == "kg" else amount / 1000


def split_pipe(value):
    return [part.strip() for part in clean(value).split("|") if part.strip()]


def split_csv(value):
    text = clean(value)
    if not text:
        return []
    return [part.strip() for part in re.split(r"[,|]", text) if part.strip()]


def safe_media(value):
    text = clean(value)
    if not text:
        return ""
    if re.match(r"^https?://", text) or text.startswith("/"):
        return text
    # The workbook filenames are placeholders; do not publish broken relative image URLs.
    return ""


def public_copy(value):
    text = clean(value)
    text = re.sub(r"^premium quality\b", "Quality-assured", text, flags=re.IGNORECASE)
    return text


def main():
    if not WORKBOOK.exists():
        raise SystemExit(f"Workbook not found: {WORKBOOK}")

    upload = pd.read_excel(WORKBOOK, sheet_name="Codex Upload").fillna("")
    master = pd.read_excel(WORKBOOK, sheet_name="Product Master").fillna("")
    copy = pd.read_excel(WORKBOOK, sheet_name="Product Copy").fillna("")
    recipe_map = pd.read_excel(WORKBOOK, sheet_name="Recipe Map").fillna("")
    ingredient_map = pd.read_excel(WORKBOOK, sheet_name="Recipe Ingredient Map").fillna("")

    slug_by_product_id = {}
    for _, row in upload.iterrows():
      product_id = clean(row.get("product_id"))
      if product_id and product_id not in slug_by_product_id:
          slug_by_product_id[product_id] = slugify(row.get("product_slug") or row.get("title"))

    copy_by_id = {clean(row.get("product_id")): row for _, row in copy.iterrows()}

    recipes = []
    recipe_by_external_id = {}
    for _, row in recipe_map.iterrows():
        recipe_id = clean(row.get("recipe_id"))
        title = clean(row.get("recipe_title"))
        if not recipe_id or not title:
            continue
        linked_slugs = split_csv(row.get("linked_product_slugs"))
        linked_titles = split_csv(row.get("linked_product_titles"))
        recipe = {
            "external_recipe_id": recipe_id,
            "title": title,
            "slug": slugify(title),
            "recipe_category": clean(row.get("recipe_category")),
            "description": clean(row.get("recipe_description")),
            "linked_product_slugs": linked_slugs,
            "linked_product_titles": linked_titles,
            "ingredient_count": int(number(row.get("ingredient_count"), len(linked_slugs))),
        }
        recipes.append(recipe)
        recipe_by_external_id[recipe_id] = recipe

    recipe_links_by_product_slug = {}
    for _, row in ingredient_map.iterrows():
        recipe_id = clean(row.get("recipe_id"))
        product_slug = slugify(row.get("product_slug"))
        recipe = recipe_by_external_id.get(recipe_id)
        if not product_slug or not recipe:
            continue
        recipe_links_by_product_slug.setdefault(product_slug, [])
        if not any(link["external_recipe_id"] == recipe_id for link in recipe_links_by_product_slug[product_slug]):
            recipe_links_by_product_slug[product_slug].append({
                "external_recipe_id": recipe_id,
                "title": recipe["title"],
                "slug": recipe["slug"],
                "required_or_optional": clean(row.get("required_or_optional")) or "required",
            })

    variants_by_product_id = {}
    for _, row in upload.iterrows():
        product_id = clean(row.get("product_id"))
        if not product_id:
            continue
        unit = clean(row.get("unit"))
        pk = pack_kg(unit)
        variants_by_product_id.setdefault(product_id, []).append({
            "label": unit,
            "sku": clean(row.get("variant_sku")),
            "price": number(row.get("price")),
            "compare_price": number(row.get("compare_price")) or None,
            "pack_kg": pk,
            "weight_grams": int(round((pk or 0) * 1000)) if pk else None,
            "visible_stock_units": int(number(row.get("stock"), 0)),
            "stock_source_kg": number(row.get("shared_stock_kg"), 0),
            "notes": "Shared bulk stock. Website stock deducts from product-level bulk kg.",
            "image_url": safe_media(row.get("hero_image")),
            "image_urls": [u for u in [safe_media(row.get("gallery_images"))] if u],
        })

    products = []
    for _, row in master.iterrows():
        product_id = clean(row.get("product_id"))
        if not product_id:
            continue
        copy_row = copy_by_id.get(product_id, row)
        slug = slug_by_product_id.get(product_id) or slugify(row.get("title"))
        recipe_links = recipe_links_by_product_slug.get(slug, [])
        quality_badges = split_pipe(row.get("quality_badges"))
        products.append({
            "product_code": product_id,
            "slug": slug,
            "title": clean(row.get("title")),
            "name": clean(row.get("title")),
            "local_name": clean(row.get("local_name")),
            "category_name": clean(row.get("category")),
            "sku": product_id,
            "price": number(row.get("website_price_per_kg")),
            "compare_price": number(row.get("compare_price_per_kg")) or None,
            "currency": "INR",
            "stock": int(number(row.get("stock_kg"), 0)),
            "stock_unit": "kg",
            "inventory_group": product_id,
            "shared_stock_kg": number(row.get("stock_kg")),
            "short_description": public_copy(copy_row.get("short_hero_copy")),
            "description": public_copy(copy_row.get("product_description")),
            "best_for": public_copy(copy_row.get("best_for")),
            "storage_note": public_copy(copy_row.get("storage_note")),
            "yasvik_mark": public_copy(copy_row.get("yasvik_mark")),
            "delivery_card": public_copy(row.get("delivery_card")),
            "pack_info_card": public_copy(row.get("pack_info_card")),
            "sourcing_card": public_copy(row.get("sourcing_card")),
            "processing_method": clean(row.get("processing_method")),
            "seo_title": clean(row.get("seo_title")) or clean(row.get("title")),
            "seo_description": clean(row.get("seo_description")),
            "seo_keywords": ", ".join([clean(row.get("title")), clean(row.get("local_name")), clean(row.get("category")), "Yasvik"]).strip(", "),
            "hero_image": safe_media(row.get("hero_image")),
            "gallery_images": [u for u in [safe_media(row.get("gallery_images"))] if u],
            "hover_media": [u for u in [safe_media(row.get("hover_media"))] if u],
            "quality_badges": quality_badges,
            "purity_badges": [{"label": badge, "tone": "trust"} for badge in quality_badges[:6]],
            "recipe_ids": clean(row.get("recipe_ids")),
            "recipe_titles": clean(row.get("recipe_titles")),
            "recipe_links": recipe_links,
            "quick_variants": variants_by_product_id.get(product_id, []),
        })

    banned_public = [
        "Why Yasvik keeps this",
        "Show smaller packs",
        "No organic or farmer-direct claim",
        "unless verified",
        "internal_note",
    ]
    public_blob = json.dumps(products, ensure_ascii=False)
    leaked = [term for term in banned_public if term.lower() in public_blob.lower()]
    if leaked:
        raise SystemExit(f"Banned internal text found in public product payload: {leaked}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps({
        "source": str(WORKBOOK),
        "products": products,
        "recipes": recipes,
    }, ensure_ascii=False, indent=2))

    print(json.dumps({
        "output": str(OUT_PATH),
        "products": len(products),
        "variants": sum(len(p["quick_variants"]) for p in products),
        "recipes": len(recipes),
        "recipe_product_links": sum(len(p["recipe_links"]) for p in products),
    }, indent=2))


if __name__ == "__main__":
    main()
