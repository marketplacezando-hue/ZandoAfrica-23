type SitemapProduct = {
  id?: string;
  updated_at?: string | null;
  published_at?: string | null;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  setHeader: (name: string, value: string) => VercelResponse;
  send: (body: string) => void;
};

declare const process: { env: Record<string, string | undefined> };

const SITE_URL = 'https://zando-africa.vercel.app';

function escapeXml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function validIsoDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function renderUrl(location: string, lastmod?: string | null, changefreq = 'weekly', priority = '0.7'): string {
  return [
    '  <url>',
    `    <loc>${escapeXml(location)}</loc>`,
    lastmod ? `    <lastmod>${escapeXml(lastmod)}</lastmod>` : '',
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    '  </url>'
  ].filter(Boolean).join('\n');
}

function renderSitemap(products: SitemapProduct[]): string {
  const urls = [
    renderUrl(`${SITE_URL}/`, null, 'daily', '1.0'),
    renderUrl(`${SITE_URL}/a-propos`, null, 'monthly', '0.6'),
    ...products.flatMap(product => {
      if (!product.id || !/^[0-9a-f-]{12,}$/i.test(product.id)) return [];
      return [renderUrl(`${SITE_URL}/produit/${encodeURIComponent(product.id)}`, validIsoDate(product.updated_at || product.published_at), 'daily', '0.8')];
    })
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`;
}

export default async function handler(_req: unknown, res: VercelResponse) {
  let products: SitemapProduct[] = [];
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const endpoint = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/products?select=id,updated_at,published_at&status=eq.published&order=updated_at.desc&limit=5000`;
      const response = await fetch(endpoint, {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
      });
      if (response.ok) products = await response.json() as SitemapProduct[];
    } catch (error) {
      console.error('Sitemap product lookup failed', error);
    }
  }

  res
    .status(200)
    .setHeader('Content-Type', 'application/xml; charset=utf-8')
    .setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=3600')
    .send(renderSitemap(products));
}
