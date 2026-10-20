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
  query: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  setHeader: (name: string, value: string) => VercelResponse;
  send: (body: string) => void;
};

declare const process: { env: Record<string, string | undefined> };

const BRAND_LOGO = 'https://miaoda-conversation-file.s3cdn.medo.dev/user-f5tkhvyf87pc/app-f5tomiygsu81/20261017/1000500253.png';
const FALLBACK_SITE_URL = 'https://zando-africa-23.vercel.app';

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getSiteUrl(): string {
  const configured = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  return configured ? `https://${configured.replace(/^https?:\/\//, '')}` : FALLBACK_SITE_URL;
}

function renderSocialHtml(product: ProductSocialData | null, productId: string, siteUrl: string): string {
  const isProduct = Boolean(product?.title);
  const title = isProduct ? `${product?.title} | Zando Africa` : 'Zando Africa — Marketplace panafricaine';
  const description = isProduct
    ? `${product?.description?.trim() || 'Découvrez cette annonce sur Zando Africa.'}${product?.seller_name ? ` — Vendeur : ${product.seller_name}.` : ''}`.slice(0, 240)
    : 'Achetez, vendez et évoluez avec Zando Africa, la marketplace panafricaine.';
  const image = isProduct && product?.photos?.[0]
    ? `${siteUrl}/api/social-product-image/${encodeURIComponent(productId)}`
    : BRAND_LOGO;
  const pageUrl = `${siteUrl}/produit/${encodeURIComponent(productId)}`;
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
  const rawId = req.query.id;
  const productId = Array.isArray(rawId) ? rawId[0] : rawId;
  const siteUrl = getSiteUrl();
  if (!productId || !/^[0-9a-f-]{12,}$/i.test(productId)) {
    res.status(400).send('Identifiant de produit invalide.');
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
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

  res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8').setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600').send(renderSocialHtml(product, productId, siteUrl));
}
