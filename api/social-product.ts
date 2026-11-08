function decodeProductRouteId(routeId: string): string {
  if (!/^[A-Za-z0-9_-]{20,24}$/.test(routeId)) return routeId;
  try {
    const normalized = routeId.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - routeId.length % 4) % 4);
    const binary = atob(normalized);
    if (binary.length !== 16) return routeId;
    const hex = Array.from(binary, char => char.charCodeAt(0).toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  } catch {
    return routeId;
  }
}

function encodeProductRouteId(productId: string): string {
  try {
    const hex = productId.replace(/-/g, '');
    if (!/^[0-9a-f]{32}$/i.test(hex)) return productId;
    const binary = (hex.match(/.{2}/g) || []).map(pair => String.fromCharCode(Number.parseInt(pair, 16))).join('');
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  } catch {
    return productId;
  }
}

type ProductSocialData = {
  title?: string;
  description?: string | null;
  photos?: string[] | null;
  seller_name?: string | null;
  city?: string | null;
  price?: number | null;
  currency?: string | null;
  status?: string | null;
};

type VercelRequest = {
  query?: Record<string, string | string[] | undefined>;
  url?: string;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  setHeader: (name: string, value: string) => VercelResponse;
  send: (body: string) => void;
};

type RuntimeGlobal = typeof globalThis & { process?: { env?: Record<string, string | undefined> } };
const ENV = (globalThis as RuntimeGlobal).process?.env ?? {};

const BRAND_LOGO = 'https://miaoda-conversation-file.s3cdn.medo.dev/user-f5tkhvyf87pc/app-f5tomiygsu81/20261017/1000500253.png';
const FALLBACK_SITE_URL = 'https://zando-africa.vercel.app';

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getSiteUrl(): string {
  const configured = ENV.VERCEL_PROJECT_PRODUCTION_URL || ENV.VERCEL_URL;
  return configured ? `https://${configured.replace(/^https?:\/\//, '')}` : FALLBACK_SITE_URL;
}

function publicProductImage(product: ProductSocialData | null): string {
  const candidate = product?.photos?.[0]?.trim();
  return candidate && /^https:\/\//i.test(candidate) ? candidate : BRAND_LOGO;
}

function renderSocialHtml(product: ProductSocialData | null, productId: string, siteUrl: string): string {
  const isProduct = Boolean(product?.title);
  const title = isProduct ? `${product?.title} | Zando Africa` : 'Zando Africa — Marketplace panafricaine';
  const description = isProduct
    ? `${product?.description?.trim() || 'Découvrez cette annonce sur Zando Africa.'}${product?.seller_name ? ` — Vendeur : ${product.seller_name}.` : ''}`.slice(0, 240)
    : 'Achetez, vendez et évoluez avec Zando Africa, la marketplace panafricaine.';
  // The stored product photo is already a public HTTPS asset. Using it directly
  // avoids an extra serverless image proxy that social crawlers may reject.
  const image = isProduct ? publicProductImage(product) : BRAND_LOGO;
  const pageUrl = `${siteUrl}/p/${encodeProductRouteId(productId)}`;
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeImage = escapeHtml(image);
  const safePageUrl = escapeHtml(pageUrl);

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${safeTitle}</title>
<meta name="description" content="${safeDescription}">
<link rel="canonical" href="${safePageUrl}">
<meta property="og:type" content="${isProduct ? 'product' : 'website'}">
<meta property="og:site_name" content="Zando Africa">
<meta property="og:title" content="${safeTitle}">
<meta property="og:description" content="${safeDescription}">
<meta property="og:url" content="${safePageUrl}">
<meta property="og:image" content="${safeImage}">
<meta property="og:image:url" content="${safeImage}">
<meta property="og:image:secure_url" content="${safeImage}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1024">
<meta property="og:image:height" content="1536">
<meta property="og:image:alt" content="${escapeHtml(isProduct ? product?.title : 'Logo Zando Africa')}">
<meta property="og:locale" content="fr_FR">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:url" content="${safePageUrl}">
<meta name="twitter:title" content="${safeTitle}">
<meta name="twitter:description" content="${safeDescription}">
<meta name="twitter:image" content="${safeImage}">
<meta name="twitter:image:alt" content="${escapeHtml(isProduct ? product?.title : 'Logo Zando Africa')}">
<meta http-equiv="refresh" content="0;url=${safePageUrl}">
</head>
<body><p><a href="${safePageUrl}">Ouvrir sur Zando Africa</a></p></body>
</html>`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rawId = req.query?.id;
  const queryId = Array.isArray(rawId) ? rawId[0] : rawId;
  const routeId = queryId || (req.url ? new URL(req.url, 'https://zando-africa.vercel.app').pathname.split('/').filter(Boolean).pop() : undefined);
  const productId = routeId ? decodeProductRouteId(routeId) : null;
  const siteUrl = getSiteUrl();
  if (!productId || !/^[0-9a-f-]{12,}$/i.test(productId)) {
    res.status(400).send('Identifiant de produit invalide.');
    return;
  }

  const supabaseUrl = ENV.VITE_SUPABASE_URL || ENV.SUPABASE_URL;
  const supabaseKey = ENV.VITE_SUPABASE_ANON_KEY || ENV.VITE_SUPABASE_PUBLISHABLE_KEY || ENV.SUPABASE_ANON_KEY;
  let product: ProductSocialData | null = null;
  if (supabaseUrl && supabaseKey) {
    try {
      const endpoint = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/products?select=title,description,photos,seller_name,city,price,currency,status&id=eq.${encodeURIComponent(productId)}&status=eq.published&limit=1`;
      const response = await fetch(endpoint, { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } });
      if (response.ok) {
        const rows = await response.json() as ProductSocialData[];
        product = rows[0] || null;
      }
    } catch (error) {
      console.error('Social metadata lookup failed', error);
    }
  }

  if (!product) {
    res.status(404)
      .setHeader('Content-Type', 'text/html; charset=utf-8')
      .setHeader('X-Robots-Tag', 'noindex, nofollow')
      .send('<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="robots" content="noindex, nofollow"><title>Annonce introuvable | Zando Africa</title></head><body><h1>Annonce introuvable</h1><p>Cette annonce n’existe pas ou n’est plus publiée.</p></body></html>');
    return;
  }

  res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8').setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600').send(renderSocialHtml(product, productId, siteUrl));
}
