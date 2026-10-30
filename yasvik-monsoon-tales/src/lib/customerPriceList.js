/**
 * Simple customer price list — Excel + PDF from live catalogue packs.
 * Not the catalogue publishing engine.
 */

import { jsPDF } from 'jspdf';
import { isPricingMetaVariant } from '@/lib/productPricingMeta';

export const CUSTOMER_SHOP_URL = 'https://www.yasvik.com/shop';

function text(value, fallback = '') {
  const raw = String(value ?? '').trim();
  return raw || fallback;
}

function money(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function productTitle(product = {}) {
  return text(product.title || product.name, 'Product');
}

function productVariants(product = {}) {
  const raw = Array.isArray(product.quick_variants) && product.quick_variants.length
    ? product.quick_variants
    : Array.isArray(product.variants)
      ? product.variants
      : [];
  return raw.filter((v) => v && !isPricingMetaVariant(v));
}

function categoryNameFor(product, categoryById) {
  const fromJoin = text(product.category_name || product.categories?.name);
  if (fromJoin) return fromJoin;
  const id = product.category_id;
  if (id && categoryById?.has(String(id))) return categoryById.get(String(id));
  return 'Uncategorised';
}

function stamp() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Flatten products → one row per priced pack.
 * @param {object[]} products
 * @param {object[]} categories
 * @param {{ sellOnlineOnly?: boolean, publishedOnly?: boolean, pricedOnly?: boolean }} [options]
 */
export function buildCustomerPriceListRows(products = [], categories = [], options = {}) {
  const {
    sellOnlineOnly = true,
    publishedOnly = true,
    pricedOnly = true,
  } = options;

  const categoryById = new Map(
    (categories || []).map((c) => [String(c.id), text(c.name || c.title, 'Category')]),
  );

  const rows = [];

  for (const product of products || []) {
    if (publishedOnly && product.is_published === false) continue;
    if (sellOnlineOnly && product.sell_online === false) continue;

    const category = categoryNameFor(product, categoryById);
    const name = productTitle(product);
    const localName = text(product.local_name);
    const variants = productVariants(product);

    if (!variants.length) {
      const selling = money(product.price);
      const mrp = money(product.compare_price ?? product.discount_price);
      if (pricedOnly && selling == null) continue;
      rows.push({
        category,
        product: name,
        local_name: localName,
        pack: text(product.unit || product.weight || product.pack_size, '—'),
        selling,
        mrp: mrp != null && selling != null && mrp > selling ? mrp : null,
        sku: text(product.sku),
        slug: text(product.slug),
      });
      continue;
    }

    for (const variant of variants) {
      const selling = money(variant.price ?? variant.store_price ?? product.price);
      const rawMrp = money(
        variant.compare_price
        ?? variant.store_compare_price
        ?? product.compare_price
        ?? product.discount_price,
      );
      if (pricedOnly && selling == null) continue;
      rows.push({
        category,
        product: name,
        local_name: localName,
        pack: text(variant.label, 'Pack'),
        selling,
        mrp: rawMrp != null && selling != null && rawMrp > selling ? rawMrp : null,
        sku: text(variant.sku || product.sku),
        slug: text(product.slug),
      });
    }
  }

  rows.sort((a, b) => {
    const cat = a.category.localeCompare(b.category, undefined, { sensitivity: 'base' });
    if (cat) return cat;
    const prod = a.product.localeCompare(b.product, undefined, { sensitivity: 'base' });
    if (prod) return prod;
    return a.pack.localeCompare(b.pack, undefined, { sensitivity: 'base' });
  });

  return rows;
}

export function buildCustomerPriceListWhatsAppText(rows = [], { shopUrl = CUSTOMER_SHOP_URL } = {}) {
  const date = stamp();
  const lines = [
    `Yasvik price list — ${date}`,
    `Live shop (always current): ${shopUrl}`,
    '',
  ];

  let lastCategory = '';
  for (const row of rows) {
    if (row.category !== lastCategory) {
      lines.push(`*${row.category}*`);
      lastCategory = row.category;
    }
    const sell = row.selling != null ? `₹${row.selling}` : '—';
    const mrp = row.mrp != null ? ` (MRP ₹${row.mrp})` : '';
    lines.push(`• ${row.product} — ${row.pack}: ${sell}${mrp}`);
  }

  lines.push('', 'Prices subject to change. Confirm on the shop link above.');
  return lines.join('\n');
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/** Excel (.xlsx) — one sheet, dense rows. */
export async function downloadCustomerPriceListExcel(rows = [], {
  shopUrl = CUSTOMER_SHOP_URL,
  filename,
} = {}) {
  const XLSX = await import('xlsx');
  const date = stamp();
  const sheetRows = [
    ['Yasvik customer price list', date],
    ['Live shop (always current)', shopUrl],
    [],
    ['Category', 'Product', 'Local name', 'Pack', 'Selling ₹', 'MRP ₹', 'SKU'],
    ...rows.map((r) => [
      r.category,
      r.product,
      r.local_name || '',
      r.pack,
      r.selling ?? '',
      r.mrp ?? '',
      r.sku || '',
    ]),
  ];

  const sheet = XLSX.utils.aoa_to_sheet(sheetRows);
  sheet['!cols'] = [
    { wch: 22 },
    { wch: 36 },
    { wch: 22 },
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
    { wch: 14 },
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Price list');
  const out = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
    bookSST: true,
    compression: true,
  });
  triggerDownload(
    new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    filename || `yasvik-price-list-${date}.xlsx`,
  );
  return rows.length;
}

/** Dense A4 PDF table — shareable on WhatsApp. */
export function downloadCustomerPriceListPdf(rows = [], {
  shopUrl = CUSTOMER_SHOP_URL,
  filename,
} = {}) {
  const date = stamp();
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 12;
  const usable = pageW - margin * 2;
  let y = margin;

  const ensureSpace = (need = 8) => {
    if (y + need <= pageH - margin) return;
    pdf.addPage();
    y = margin;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(90);
    pdf.text(`Yasvik price list · ${date} · ${shopUrl}`, margin, y);
    y += 6;
  };

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.setTextColor(20, 40, 28);
  pdf.text('Yasvik — Customer Price List', margin, y);
  y += 6;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(60);
  pdf.text(`As of ${date}`, margin, y);
  y += 5;
  pdf.setTextColor(30, 90, 50);
  pdf.textWithLink(`Live shop: ${shopUrl}`, margin, y, { url: shopUrl });
  y += 4;
  pdf.setTextColor(100);
  pdf.setFontSize(8);
  pdf.text('Use the shop link for live availability. Prices subject to change.', margin, y);
  y += 7;

  const cols = [
    { key: 'product', label: 'Product', w: usable * 0.48 },
    { key: 'pack', label: 'Pack', w: usable * 0.16 },
    { key: 'selling', label: 'Selling', w: usable * 0.18 },
    { key: 'mrp', label: 'MRP', w: usable * 0.18 },
  ];

  const drawHeader = () => {
    ensureSpace(8);
    pdf.setFillColor(31, 42, 30);
    pdf.rect(margin, y - 3.5, usable, 7, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(255);
    let x = margin + 1;
    for (const col of cols) {
      pdf.text(col.label, x, y);
      x += col.w;
    }
    y += 6;
  };

  drawHeader();

  let lastCategory = null;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);

  for (const row of rows) {
    ensureSpace(7);
    if (y > pageH - margin - 10 && lastCategory !== null) {
      drawHeader();
    }

    if (row.category !== lastCategory) {
      ensureSpace(8);
      pdf.setFillColor(244, 241, 234);
      pdf.rect(margin, y - 3.2, usable, 6.5, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(31, 42, 30);
      pdf.text(row.category, margin + 1, y);
      y += 6;
      lastCategory = row.category;
      pdf.setFont('helvetica', 'normal');
    }

    ensureSpace(6);
    let x = margin + 1;
    pdf.setTextColor(40);
    const cells = [
      row.product,
      row.pack,
      row.selling != null ? `Rs ${row.selling}` : '—',
      row.mrp != null ? `Rs ${row.mrp}` : '—',
    ];
    cells.forEach((cell, i) => {
      const maxW = cols[i].w - 2;
      const clipped = pdf.splitTextToSize(String(cell), maxW)[0] || '';
      pdf.text(clipped, x, y);
      x += cols[i].w;
    });
    y += 5.2;
  }

  ensureSpace(10);
  y += 3;
  pdf.setFontSize(7.5);
  pdf.setTextColor(110);
  pdf.text(`${rows.length} pack lines · Live shop ${shopUrl}`, margin, y);

  pdf.save(filename || `yasvik-price-list-${date}.pdf`);
  return rows.length;
}
