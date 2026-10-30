/**
 * Premium multi-template HTML renderer.
 * Admin preview and Browser Run PDF share this exact output.
 */

import { qrImageUrl, escapeHtml, formatRupee, monthYear, SITE_ORIGIN } from './utils.js';

function chromeFooter(snapshot, page) {
  const brand = snapshot.brand || {};
  const options = snapshot.options || {};
  if (options.content?.page_chrome === false) return '';
  if (page.type === 'cover') return '';

  const logo = brand.logo_url
    ? `<img class="chrome-logo" src="${escapeHtml(brand.logo_url)}" alt="Yasvik" />`
    : `<span class="chrome-wordmark">YASVIK</span>`;
  const qr = `<img class="chrome-qr" src="${escapeHtml(qrImageUrl(brand.website || SITE_ORIGIN, 96))}" alt="QR" />`;

  return `
    <footer class="page-chrome">
      <div class="chrome-left">${logo}</div>
      <div class="chrome-mid">
        <span>${escapeHtml(brand.website || SITE_ORIGIN)}</span>
        <span>·</span>
        <span>WhatsApp ${escapeHtml(brand.whatsapp || '')}</span>
        <span>·</span>
        <span>${escapeHtml(monthYear(snapshot.generated_at))}</span>
      </div>
      <div class="chrome-right">
        ${qr}
        <span class="page-num">${page.page_number}</span>
      </div>
    </footer>
  `;
}

function priceBlock(variant, content, hidePrice, dealer = false) {
  if (hidePrice) return `<div class="price-block"><span class="price-ask">Price on request</span></div>`;
  if (dealer) {
    return `
      <div class="price-block dealer">
        <span class="price-today">${escapeHtml(formatRupee(variant.dealer_price))}</span>
        ${variant.moq ? `<span class="moq">MOQ ${escapeHtml(String(variant.moq))}</span>` : ''}
      </div>
    `;
  }

  const showMrp = content.mrp && variant.mrp;
  const showSave = content.savings && variant.savings_amount;
  return `
    <div class="price-block">
      <div class="price-row">
        <span class="price-today">${escapeHtml(formatRupee(variant.price))}</span>
        ${showMrp ? `<span class="price-mrp">MRP ${escapeHtml(formatRupee(variant.mrp))}</span>` : ''}
      </div>
      ${showSave ? `
        <div class="save-row">
          <span class="save-amt">Save ${escapeHtml(formatRupee(variant.savings_amount))}</span>
          ${variant.savings_pct != null ? `<span class="save-pct">${variant.savings_pct}% OFF</span>` : ''}
        </div>` : ''}
    </div>
  `;
}

function productCard(product, snapshot) {
  const options = snapshot.options || {};
  const content = options.content || {};
  const design = options.design || 'classic';
  const magazine = design === 'premium_magazine';
  const festival = design === 'festival_specials';
  const variants = (product.variants || []).slice(0, magazine ? 2 : 4);

  const image = content.product_image !== false && (product.image_optimized || product.image_url)
    ? `<div class="card-media"><img src="${escapeHtml(product.image_optimized || product.image_url)}" alt="${escapeHtml(product.name)}" loading="eager" decoding="sync" /></div>`
    : `<div class="card-media placeholder"><span>Yasvik</span></div>`;

  const badges = (product.badges || []).map((b) => `<span class="badge ${festival ? 'festive' : ''}">${escapeHtml(b)}</span>`).join('');
  const qr = content.qr_code
    ? `<img class="product-qr" src="${escapeHtml(qrImageUrl(product.product_url, 120))}" alt="Product QR" />`
    : '';

  const variantsHtml = variants.length
    ? `<div class="variant-pricing" aria-label="Pack-wise prices">
        <div class="variant-head">
          <span>Pack size</span>
          <span>Today's price</span>
          <span>MRP</span>
        </div>
        ${variants.map((v) => `
          <div class="variant-row">
            <strong>${escapeHtml(v.label || v.weight || 'Pack')}</strong>
            <strong class="variant-price">${product.hide_price ? 'Ask us' : escapeHtml(formatRupee(v.price || v.dealer_price))}</strong>
            <span class="variant-mrp">${!product.hide_price && content.mrp && v.mrp ? escapeHtml(formatRupee(v.mrp)) : '—'}</span>
          </div>
        `).join('')}
        ${content.savings && variants[0]?.savings_amount ? `
          <div class="variant-saving">
            Save ${escapeHtml(formatRupee(variants[0].savings_amount))}
            ${variants[0].savings_pct != null ? ` · ${variants[0].savings_pct}% off on ${escapeHtml(variants[0].label || 'first pack')}` : ''}
          </div>` : ''}
      </div>`
    : '<p class="price-ask">Contact us for pack sizes and prices</p>';

  return `
    <article class="product-card ${magazine ? 'magazine' : ''} ${festival ? 'festival' : ''}">
      ${image}
      <div class="card-body">
        ${badges ? `<div class="badges">${badges}</div>` : ''}
        <h3>${escapeHtml(product.name)}</h3>
        ${content.telugu_name !== false && product.local_name
          ? `<p class="telugu">${escapeHtml(product.local_name)}</p>` : ''}
        ${content.short_description && product.short_description
          ? `<p class="desc">${escapeHtml(product.short_description)}</p>` : ''}
        ${variantsHtml}
        <div class="card-meta">
          ${content.stock_status ? `<span class="stock">${escapeHtml(product.availability)}</span>` : '<span></span>'}
          ${qr}
        </div>
      </div>
    </article>
  `;
}

function dealerRows(products, content) {
  return `
    <table class="dealer-table">
      <thead>
        <tr>
          <th>Product</th>
          <th>Pack</th>
          <th>Dealer price</th>
          <th>MOQ</th>
        </tr>
      </thead>
      <tbody>
        ${(products || []).flatMap((product) => (product.variants || []).map((variant) => `
          <tr>
            <td>
              <strong>${escapeHtml(product.name)}</strong>
              ${product.local_name ? `<div class="muted">${escapeHtml(product.local_name)}</div>` : ''}
            </td>
            <td>${escapeHtml(variant.label)}</td>
            <td>${escapeHtml(formatRupee(variant.dealer_price))}</td>
            <td>${variant.moq != null ? escapeHtml(String(variant.moq)) : '—'}</td>
          </tr>
        `)).join('')}
      </tbody>
    </table>
  `;
}

function renderPage(page, snapshot) {
  const brand = snapshot.brand || {};
  const options = snapshot.options || {};
  const design = options.design || 'classic';
  const chrome = chromeFooter(snapshot, page);

  if (page.type === 'cover') {
    const coverImg = page.cover_image
      ? `<div class="cover-hero" style="background-image:url('${escapeHtml(page.cover_image)}')"></div>`
      : `<div class="cover-hero fallback"></div>`;
    return `
      <section class="sheet cover design-${escapeHtml(design)}">
        ${coverImg}
        <div class="cover-overlay">
          <p class="eyebrow">YASVIK</p>
          <h1>${escapeHtml(page.title || 'Yasvik Catalogue')}</h1>
          <p class="tagline">${escapeHtml(brand.tagline || 'Conscious foods for modern living')}</p>
          <p class="story">${escapeHtml(brand.story_line || '')}</p>
          <div class="cover-meta">
            <div>
              <div>${escapeHtml(brand.website || SITE_ORIGIN)}</div>
              <div>WhatsApp ${escapeHtml(brand.whatsapp || '')}</div>
              <div>${escapeHtml(monthYear(snapshot.generated_at))}</div>
              <div>${page.product_count || 0} products</div>
            </div>
            <img class="cover-qr" src="${escapeHtml(qrImageUrl(brand.website || SITE_ORIGIN, 180))}" alt="Website QR" />
          </div>
        </div>
      </section>
    `;
  }

  if (page.type === 'about') {
    return `
      <section class="sheet about design-${escapeHtml(design)}">
        <div class="about-grid">
          <div>
            <p class="eyebrow">Our story</p>
            <h2>Foods families trust</h2>
            <p>Yasvik brings carefully sourced everyday staples to modern homes — millets, oils, spices, snacks, pickles and more.</p>
            <p>We work with responsible producers, keep recipes honest, and deliver across Hyderabad with the same care we would offer our own family.</p>
            <ul class="values">
              <li>Traditional foods, modern living</li>
              <li>Responsible sourcing</li>
              <li>Transparent pricing</li>
              <li>Hyderabad delivery & store pickup</li>
            </ul>
          </div>
          <div class="about-photo" style="background-image:url('${escapeHtml(snapshot.cover?.image_optimized || snapshot.cover?.image_url || '')}')"></div>
        </div>
        ${chrome}
      </section>
    `;
  }

  if (page.type === 'category_hero') {
    const img = page.category_image
      ? `style="background-image:url('${escapeHtml(page.category_image)}')"`
      : '';
    return `
      <section class="sheet category-hero design-${escapeHtml(design)}">
        <div class="cat-hero-media ${page.category_image ? '' : 'fallback'}" ${img}></div>
        <div class="cat-hero-copy">
          <p class="eyebrow">Category</p>
          <h2>${escapeHtml(page.category_name)}</h2>
          <p>${escapeHtml(page.category_blurb || '')}</p>
          <p class="count">${page.product_count} products</p>
        </div>
        ${chrome}
      </section>
    `;
  }

  if (page.type === 'dealer_gated') {
    return `
      <section class="sheet gated">
        <div class="gated-box">
          <p class="eyebrow">Dealer mode</p>
          <h2>Pricing not configured</h2>
          <p>${escapeHtml(page.message || '')}</p>
        </div>
        ${chrome}
      </section>
    `;
  }

  if (page.type === 'dealer_list') {
    return `
      <section class="sheet products design-${escapeHtml(design)}">
        <div class="section-head">
          <h2>${escapeHtml(page.category_name || 'Products')}</h2>
          <p>${(page.products || []).length} items</p>
        </div>
        ${dealerRows(page.products, options.content || {})}
        ${chrome}
      </section>
    `;
  }

  if (page.type === 'product_grid') {
    const cols = page.columns || snapshot.format?.columns || 2;
    return `
      <section class="sheet products design-${escapeHtml(design)}">
        <div class="section-head quiet">
          <h2>${escapeHtml(page.category_name || 'Products')}</h2>
          <p>${(page.products || []).length} on this page</p>
        </div>
        <div class="product-grid cols-${cols}">
          ${(page.products || []).map((p) => productCard(p, snapshot)).join('')}
        </div>
        ${chrome}
      </section>
    `;
  }

  if (page.type === 'contact') {
    return `
      <section class="sheet contact design-${escapeHtml(design)}">
        <p class="eyebrow">Visit Yasvik</p>
        <h2>Order with confidence</h2>
        <div class="contact-grid">
          <div>
            <p><strong>Website</strong><br/>${escapeHtml(brand.website || SITE_ORIGIN)}</p>
            <p><strong>WhatsApp</strong><br/>${escapeHtml(brand.phone || brand.whatsapp || '')}</p>
            <p><strong>Store</strong><br/>${escapeHtml(brand.store_name || '')}<br/>${escapeHtml(brand.store_address || '')}</p>
            <p><strong>Delivery</strong><br/>Hyderabad delivery and store pickup available.</p>
            <p class="thanks">Thank you for choosing Yasvik.</p>
          </div>
          <div class="contact-qrs">
            <div>
              <img src="${escapeHtml(qrImageUrl(brand.website || SITE_ORIGIN, 180))}" alt="Website QR" />
              <p>Shop online</p>
            </div>
            <div>
              <img src="${escapeHtml(qrImageUrl(brand.maps_url || SITE_ORIGIN, 180))}" alt="Maps QR" />
              <p>Google Maps</p>
            </div>
          </div>
        </div>
        <p class="disclaimer">Prices and availability are subject to change. Please visit yasvik.com or WhatsApp Yasvik for the latest information.</p>
        ${chrome}
      </section>
    `;
  }

  return '';
}

function baseCss(snapshot) {
  const format = snapshot.format || {};
  const colour = snapshot.brand?.colour || '#1f2a1e';
  const dense = Boolean(format.dense);
  const configuredImgH = format.cardImageHeight || 150;
  const imgH = snapshot.options?.design === 'classic'
    ? Math.min(configuredImgH, 130)
    : configuredImgH;
  const isA5 = format.pageSize === 'A5';
  const landscape = format.orientation === 'landscape';
  const pageWidth = isA5 ? (landscape ? '210mm' : '148mm') : (landscape ? '297mm' : '210mm');
  const pageHeight = isA5 ? (landscape ? '148mm' : '210mm') : (landscape ? '210mm' : '297mm');

  return `
    @page { size: ${format.cssSize || 'A4 portrait'}; margin: 0; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      font-family: "DM Sans", "Noto Sans Telugu", sans-serif;
      color: ${colour};
      background: #f4eee4;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sheet {
      width: ${pageWidth};
      height: ${pageHeight};
      padding: 16mm 12mm 18mm;
      page-break-after: always;
      position: relative;
      background: #f7f1e8;
      overflow: hidden;
    }
    .sheet:last-child { page-break-after: auto; }
    .eyebrow {
      font-size: 11px;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      font-weight: 700;
      color: #6d7a68;
      margin: 0 0 10px;
    }
    h1, h2, h3 {
      font-family: "Cormorant Garamond", Georgia, serif;
      font-weight: 600;
      color: ${colour};
      margin: 0;
    }
    h1 { font-size: 48px; line-height: 1.05; }
    h2 { font-size: 34px; line-height: 1.1; }
    h3 { font-size: ${dense ? '15px' : '18px'}; line-height: 1.2; }

    .page-chrome {
      position: absolute;
      left: 12mm;
      right: 12mm;
      bottom: 8mm;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      border-top: 1px solid #ddd3c4;
      padding-top: 8px;
      font-size: 10px;
      color: #6d7a68;
    }
    .chrome-logo { height: 18px; width: auto; object-fit: contain; }
    .chrome-wordmark { font-family: "Cormorant Garamond", serif; font-size: 14px; font-weight: 600; letter-spacing: 0.18em; }
    .chrome-mid { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
    .chrome-right { display: flex; align-items: center; gap: 8px; }
    .chrome-qr { width: 28px; height: 28px; }
    .page-num { font-weight: 700; color: ${colour}; }

    .cover { padding: 0; background: #1f2a1e; color: #f7f1e8; }
    .cover-hero {
      position: absolute; inset: 0;
      background-size: cover; background-position: center;
      filter: saturate(0.92);
    }
    .cover-hero.fallback { background: linear-gradient(145deg, #2c3a29, #1f2a1e 55%, #4a5d3f); }
    .cover-overlay {
      position: relative;
      height: ${pageHeight};
      padding: 22mm 16mm;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      background: linear-gradient(180deg, rgba(20,28,18,0.15) 0%, rgba(20,28,18,0.72) 55%, rgba(20,28,18,0.92) 100%);
      color: #f7f1e8;
    }
    .cover .eyebrow, .cover h1, .cover .tagline, .cover .story, .cover .cover-meta { color: #f7f1e8; }
    .cover .tagline { font-size: 20px; margin: 12px 0 8px; }
    .cover .story { font-size: 14px; opacity: 0.9; max-width: 420px; line-height: 1.5; }
    .cover-meta { display: flex; justify-content: space-between; align-items: end; margin-top: 36px; gap: 24px; font-size: 13px; line-height: 1.7; }
    .cover-qr { width: 88px; height: 88px; background: #fff; padding: 6px; border-radius: 12px; }

    .about-grid { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 24px; min-height: 210mm; }
    .about p { font-size: 14px; line-height: 1.65; color: #4d5b48; }
    .values { padding-left: 18px; color: #4d5b48; font-size: 14px; line-height: 1.8; }
    .about-photo {
      border-radius: 24px;
      background: #e8dfd0 center/cover no-repeat;
      min-height: 210mm;
    }

    .category-hero { display: grid; grid-template-rows: 1.2fr 0.8fr; gap: 18px; padding-bottom: 24mm; }
    .cat-hero-media {
      border-radius: 28px;
      background: #e8dfd0 center/cover no-repeat;
      min-height: 140mm;
    }
    .cat-hero-media.fallback { background: linear-gradient(135deg, #efe6d7, #d9e0cf); }
    .cat-hero-copy p { color: #4d5b48; font-size: 15px; line-height: 1.6; max-width: 540px; }
    .cat-hero-copy .count { margin-top: 16px; font-weight: 700; color: ${colour}; }

    .section-head {
      display: flex; justify-content: space-between; align-items: baseline;
      margin-bottom: 14px; padding-bottom: 8px; border-bottom: 1px solid #ddd3c4;
    }
    .section-head.quiet { border-bottom: none; margin-bottom: 10px; }
    .section-head p { margin: 0; font-size: 11px; color: #6d7a68; }

    .product-grid {
      display: grid;
      gap: ${dense ? '10px' : '16px'};
      align-content: start;
    }
    .product-grid.cols-1 { grid-template-columns: 1fr; }
    .product-grid.cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .product-grid.cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }

    .product-card {
      break-inside: avoid;
      page-break-inside: avoid;
      background: #fffdf9;
      border: 1px solid #e7dfd2;
      border-radius: 22px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      min-height: ${dense ? '210px' : '260px'};
    }
    .product-card.magazine { min-height: 320px; }
    .card-media {
      height: ${imgH}px;
      background: #fff;
      overflow: hidden;
      border-bottom: 1px solid #eee6da;
      padding: 8px;
    }
    .card-media img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }
    .card-media.placeholder {
      display: flex; align-items: center; justify-content: center;
      color: #8a9485; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; font-size: 11px;
    }
    .card-body { padding: ${dense ? '10px 12px 12px' : '14px 14px 16px'}; display: flex; flex-direction: column; gap: 4px; flex: 1; }
    .badges { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 4px; }
    .badge {
      font-size: 9px; font-weight: 700; letter-spacing: 0.08em;
      text-transform: uppercase; background: #eef3e6; color: #355039;
      border-radius: 999px; padding: 3px 8px;
    }
    .badge.festive { background: #f4e6d2; color: #7a4b1e; }
    .telugu { font-family: "Noto Sans Telugu", sans-serif; font-size: 12px; color: #5a6757; margin: 0; }
    .desc {
      font-size: 11px; color: #5a6757; margin: 2px 0 4px; line-height: 1.4;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    .pack { font-size: 11px; color: #6d7a68; margin: 2px 0 0; font-weight: 600; }
    .price-block { margin-top: 6px; }
    .price-row { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
    .price-today { font-size: ${dense ? '16px' : '20px'}; font-weight: 700; color: ${colour}; }
    .price-mrp { font-size: 12px; color: #8a9485; text-decoration: line-through; }
    .save-row { display: flex; gap: 8px; margin-top: 3px; align-items: center; }
    .save-amt { font-size: 11px; color: #3f6b38; font-weight: 600; }
    .save-pct {
      font-size: 10px; font-weight: 700; color: #fff; background: #3f6b38;
      border-radius: 999px; padding: 2px 7px;
    }
    .more-variants { margin-top: 6px; display: grid; gap: 2px; }
    .more-row { display: flex; justify-content: space-between; font-size: 11px; color: #5a6757; }
    .variant-pricing {
      margin-top: 7px;
      border: 1px solid #e5dccd;
      border-radius: 10px;
      overflow: hidden;
      background: #fff;
    }
    .variant-head, .variant-row {
      display: grid;
      grid-template-columns: minmax(58px, 1fr) minmax(74px, 1.15fr) minmax(48px, 0.8fr);
      gap: 6px;
      align-items: center;
    }
    .variant-head {
      padding: 5px 7px;
      background: #f2ede4;
      color: #6d7569;
      font-size: 7px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .variant-row {
      padding: 5px 7px;
      border-top: 1px solid #eee7dc;
      font-size: 10px;
      color: #33412f;
    }
    .variant-price { color: ${colour}; font-size: 12px; }
    .variant-mrp { color: #7f877c; text-decoration: line-through; }
    .variant-saving {
      padding: 5px 7px;
      border-top: 1px solid #dfe8d8;
      background: #f1f7ed;
      color: #3f6b38;
      font-size: 9px;
      font-weight: 700;
    }
    .card-meta { margin-top: 6px; padding-top: 4px; display: flex; justify-content: space-between; align-items: end; }
    .stock { font-size: 10px; color: #4f7a45; font-weight: 600; }
    .product-qr { width: 40px; height: 40px; border-radius: 7px; background: #fff; }

    .design-premium_magazine .product-card,
    .design-premium_magazine .product-grid { /* magazine uses design class on sheet */ }
    .sheet.design-premium_magazine .product-card { border: none; background: transparent; }
    .sheet.design-premium_magazine .card-media { height: 220px; border-radius: 24px; }
    .sheet.design-premium_magazine .card-body { padding-left: 4px; padding-right: 4px; }

    .sheet.design-festival_specials .product-card { border-color: #ead7bc; }
    .sheet.design-whatsapp_compact .product-card { border-radius: 16px; }

    .dealer-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .dealer-table th, .dealer-table td { text-align: left; padding: 8px 6px; border-bottom: 1px solid #e4ddd2; vertical-align: top; }
    .dealer-table th { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #6d7a68; }
    .muted { color: #6d7a68; font-size: 11px; margin-top: 2px; }

    .contact h2 { margin-bottom: 18px; }
    .contact-grid { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 28px; }
    .contact p { font-size: 14px; line-height: 1.6; color: #4d5b48; }
    .thanks { margin-top: 24px; font-family: "Cormorant Garamond", serif; font-size: 28px; color: ${colour}; }
    .contact-qrs { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-content: start; }
    .contact-qrs img { width: 110px; height: 110px; background: #fff; padding: 8px; border-radius: 14px; border: 1px solid #e7dfd2; }
    .contact-qrs p { font-size: 12px; margin-top: 8px; }
    .disclaimer { margin-top: 28px; font-size: 11px; color: #7a8575; max-width: 560px; }

    .gated { display: flex; align-items: center; justify-content: center; }
    .gated-box {
      max-width: 480px; background: #fff; border: 1px solid #e7dfd2; border-radius: 24px; padding: 32px;
    }
  `;
}

export function renderCatalogueHtml(snapshot) {
  const planned = snapshot.pages?.length ? snapshot : snapshot;
  const pages = planned.pages || [];
  const body = pages.map((page) => renderPage(page, planned)).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(planned.catalogue?.name || 'Yasvik Catalogue')}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=DM+Sans:wght@400;500;600;700&family=Noto+Sans+Telugu:wght@400;500;600&display=swap" rel="stylesheet" />
  <style>${baseCss(planned)}</style>
</head>
<body>
  ${body || '<section class="sheet"><p>No products selected.</p></section>'}
</body>
</html>`;
}
