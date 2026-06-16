#!/usr/bin/env python3
"""Prepare Yasvik product import files from the Codex CEO-ready workbook.

This script is intentionally preview-first. It does not write to Supabase.
It normalizes products, product-page copy, and variants into files that can be
reviewed before a live import.
"""

from __future__ import annotations

import csv
import json
import math
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parent
DEFAULT_WORKBOOK = Path.home() / "Downloads" / "yasvik_codex_product_upload_ceo_ready.xlsx"
DEFAULT_OUT_DIR = ROOT / "import-preview"


def clean(value):
    if value is None:
        return ""
    if isinstance(value, float) and math.isnan(value):
        return ""
    return str(value).strip()


def number(value, default=None):
    if value is None:
        return default
    if isinstance(value, float) and math.isnan(value):
        return default
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return default
    return int(parsed) if parsed.is_integer() else parsed


def slugify(value):
    text = clean(value).lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


def split_keywords(value):
    raw = clean(value)
    if not raw:
        return []
    parts = re.split(r"[,;|]", raw)
    return [part.strip() for part in parts if part.strip()]


def normalize_sku(value, fallback):
    sku = clean(value) or fallback
    sku = re.sub(r"[^A-Za-z0-9]+", "-", sku.upper())
    sku = re.sub(r"-{2,}", "-", sku).strip("-")
    return sku


def pack_kg_from_label(label, explicit=None):
    explicit_number = number(explicit)
    if explicit_number and explicit_number > 0:
        return explicit_number
    match = re.search(r"(\d+(?:\.\d+)?)\s*(kg|g|gm|gram|grams)\b", clean(label).lower())
    if not match:
        return None
    amount = float(match.group(1))
    return amount if match.group(2) == "kg" else amount / 1000


def read_sheet(path, sheet):
    return pd.read_excel(path, sheet_name=sheet).fillna("")


def row_by_slug(frame, slug_column):
    result = {}
    for row in frame.to_dict("records"):
        slug = slugify(row.get(slug_column))
        if slug:
            result[slug] = row
    return result


def build_product(row, copy_row, variants):
    slug = slugify(row.get("Slug"))
    title = clean(row.get("Product Name"))
    category = clean(row.get("Category"))
    stock_kg = number(row.get("Stock kg"), 0) or 0
    launch_price = number(row.get("Launch Price/kg"), 0) or 0
    mrp = number(row.get("MRP/kg"), 0) or 0
    default_variant = next((v for v in variants if clean(v.get("Pack Size")).lower() == "1kg"), variants[0] if variants else None)
    price = number(default_variant.get("Sale Price"), launch_price) if default_variant else launch_price
    compare_price = number(default_variant.get("MRP"), mrp) if default_variant else mrp

    lead_copy = clean(copy_row.get("Lead Copy"))
    yasvik_mark_title = clean(copy_row.get("Yasvik Mark Title"))
    yasvik_mark_copy = clean(copy_row.get("Yasvik Mark Copy"))
    best_for = clean(copy_row.get("Best For"))
    pack_guidance = clean(copy_row.get("Pack Guidance"))
    trust_note = clean(copy_row.get("Trust Note"))
    storage_note = clean(row.get("Storage Note"))

    description_parts = [
        lead_copy,
        f"{yasvik_mark_title}: {yasvik_mark_copy}" if yasvik_mark_title and yasvik_mark_copy else yasvik_mark_copy,
        f"Best for: {best_for}" if best_for else "",
        f"Pack guidance: {pack_guidance}" if pack_guidance else "",
        f"Storage: {storage_note}" if storage_note else "",
        trust_note,
    ]
    description = "\n\n".join(part for part in description_parts if part)

    quick_variants = []
    for variant in variants:
        pack_label = clean(variant.get("Pack Size"))
        pack_kg = pack_kg_from_label(pack_label, variant.get("Pack kg"))
        quick_variants.append({
            "label": pack_label,
            "sku": normalize_sku(variant.get("SKU"), f"YAS-{slug.upper()}-{pack_label.upper()}"),
            "price": number(variant.get("Sale Price")),
            "compare_price": number(variant.get("MRP")),
            "pack_kg": pack_kg,
            "weight_grams": round(pack_kg * 1000) if pack_kg else None,
            "visible_stock_units": number(variant.get("Visible Stock Units")),
            "stock_source_kg": number(variant.get("Stock Source kg"), stock_kg),
            "notes": clean(variant.get("Notes")),
            "image_url": "",
            "image_urls": [],
        })

    primary_badge = clean(row.get("Primary Badge"))
    purity_badges = [{"label": primary_badge, "tone": "trust"}] if primary_badge else []

    return {
        "slug": slug,
        "title": title,
        "name": title,
        "sku": normalize_sku("", f"YAS-{slug.upper()}"),
        "category_name": category,
        "local_name": clean(row.get("Local/Telugu Name")),
        "short_description": clean(row.get("Short Description")),
        "description": description,
        "price": price,
        "compare_price": compare_price,
        "currency": "INR",
        "stock": stock_kg,
        "stock_unit": "kg",
        "low_stock_threshold": max(1, round(stock_kg * 0.15, 2)) if stock_kg else 1,
        "is_published": clean(row.get("Status")).lower() == "active",
        "is_featured": False,
        "seo_title": clean(copy_row.get("Product Title")) or f"{title} | Yasvik",
        "seo_description": clean(copy_row.get("Meta Description")),
        "seo_keywords": ", ".join(split_keywords(row.get("Search Keywords"))),
        "purity_badges": purity_badges,
        "quick_variants": quick_variants,
        "inventory_notes": (
            f"Bulk source stock: {stock_kg} kg. Variants share this same physical inventory. "
            "Deduct stock by pack_kg * quantity; do not treat variants as independent inventory."
        ),
        "image_prompt": clean(row.get("Image Prompt")),
        "source_workbook_id": clean(row.get("ID")),
        "website_copy": {
            "hero_eyebrow": clean(copy_row.get("Hero Eyebrow")),
            "hero_headline": clean(copy_row.get("Hero Headline")),
            "price_line": clean(copy_row.get("Price Line")),
            "badge_line": clean(copy_row.get("Badge Line")),
            "cta_text": clean(copy_row.get("CTA Text")),
        },
    }


def main():
    workbook = Path(sys.argv[1]).expanduser() if len(sys.argv) > 1 else DEFAULT_WORKBOOK
    out_dir = Path(sys.argv[2]).expanduser() if len(sys.argv) > 2 else DEFAULT_OUT_DIR
    out_dir.mkdir(parents=True, exist_ok=True)

    master = read_sheet(workbook, "Codex Product Master")
    variants = read_sheet(workbook, "Variant Upload")
    copy = read_sheet(workbook, "Product Page Copy")

    copy_map = row_by_slug(copy, "Slug")
    variants_by_slug = defaultdict(list)
    for row in variants.to_dict("records"):
      slug = slugify(row.get("Product Slug"))
      if slug:
          variants_by_slug[slug].append(row)

    products = []
    warnings = []
    for row in master.to_dict("records"):
        slug = slugify(row.get("Slug"))
        if not slug:
            warnings.append("Skipped a product row with missing slug.")
            continue
        product_variants = variants_by_slug.get(slug, [])
        if not product_variants:
            warnings.append(f"{slug}: no variants found.")
        if slug not in copy_map:
            warnings.append(f"{slug}: no product-page copy found.")
        products.append(build_product(row, copy_map.get(slug, {}), product_variants))

    product_json_path = out_dir / "products_import_preview.json"
    product_json_path.write_text(json.dumps(products, indent=2, ensure_ascii=False), encoding="utf-8")

    variant_csv_path = out_dir / "variants_import_preview.csv"
    with variant_csv_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=[
            "product_slug", "sku", "label", "pack_kg", "weight_grams", "price",
            "compare_price", "visible_stock_units", "stock_source_kg", "notes",
        ])
        writer.writeheader()
        for product in products:
            for variant in product["quick_variants"]:
                writer.writerow({
                    "product_slug": product["slug"],
                    "sku": variant["sku"],
                    "label": variant["label"],
                    "pack_kg": variant["pack_kg"],
                    "weight_grams": variant["weight_grams"],
                    "price": variant["price"],
                    "compare_price": variant["compare_price"],
                    "visible_stock_units": variant["visible_stock_units"],
                    "stock_source_kg": variant["stock_source_kg"],
                    "notes": variant["notes"],
                })

    categories = Counter(product["category_name"] for product in products)
    pack_sizes = Counter(variant["label"] for product in products for variant in product["quick_variants"])
    warning_lines = [f"- {warning}" for warning in warnings] if warnings else ["- None"]
    summary_lines = [
        "# Yasvik Product Import Preview",
        "",
        f"Workbook: `{workbook}`",
        f"Products: {len(products)}",
        f"Variants: {sum(len(product['quick_variants']) for product in products)}",
        f"Published products: {sum(1 for product in products if product['is_published'])}",
        "",
        "## Categories",
        *[f"- {name}: {count}" for name, count in sorted(categories.items())],
        "",
        "## Variant Pack Sizes",
        *[f"- {name}: {count}" for name, count in sorted(pack_sizes.items())],
        "",
        "## Stock Rule",
        "Variant rows are display/selling packs only. Physical stock remains product-level bulk kg.",
        "Deduction formula: `pack_kg * cart_quantity`.",
        "",
        "## Warnings",
        *warning_lines,
    ]
    summary_path = out_dir / "import_summary.md"
    summary_path.write_text("\n".join(summary_lines), encoding="utf-8")

    print(f"Wrote {product_json_path}")
    print(f"Wrote {variant_csv_path}")
    print(f"Wrote {summary_path}")


if __name__ == "__main__":
    main()
