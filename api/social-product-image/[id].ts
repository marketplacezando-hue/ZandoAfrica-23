type ProductRow = {
  photos?: string[] | null;
  status?: string | null;
};

type VercelRequest = {
  query: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  setHeader: (name: string, value: string) => VercelResponse;
  send: (body: Uint8Array) => void;
};

declare const process: { env: Record<string, string | undefined> };

const BRAND_LOGO = 'https://miaoda-conversation-file.s3cdn.medo.dev/user-f5tkhvyf87pc/app-f5tomiygsu81/20261017/1000500253.png';

function getProductId(req: VercelRequest): string | null {
  const rawId = req.query.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  return id && /^[0-9a-f-]{12,}$/i.test(id) ? id : null;
}

async function getProductImageUrl(productId: string): Promise<string> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return BRAND_LOGO;

  try {
    const endpoint = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/products?select=photos,status&id=eq.${encodeURIComponent(productId)}&status=eq.published&limit=1`;
    const response = await fetch(endpoint, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
    });
    if (!response.ok) return BRAND_LOGO;
    const rows = await response.json() as ProductRow[];
    const image = rows[0]?.photos?.[0];
    if (!image) return BRAND_LOGO;
    const url = new URL(image);
    return url.protocol === 'https:' ? url.toString() : BRAND_LOGO;
  } catch (error) {
    console.error('Social image lookup failed', error);
    return BRAND_LOGO;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const productId = getProductId(req);
  if (!productId) {
    res.status(400).setHeader('Content-Type', 'text/plain; charset=utf-8').send(new TextEncoder().encode('Identifiant de produit invalide.'));
    return;
  }

  const sourceUrl = await getProductImageUrl(productId);
  try {
    const imageResponse = await fetch(sourceUrl, { redirect: 'follow' });
    if (!imageResponse.ok) throw new Error(`Image source HTTP ${imageResponse.status}`);
    const bytes = new Uint8Array(await imageResponse.arrayBuffer());
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    res
      .status(200)
      .setHeader('Content-Type', contentType)
      .setHeader('Content-Length', String(bytes.byteLength))
      .setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800')
      .setHeader('X-Content-Type-Options', 'nosniff')
      .send(bytes);
  } catch (error) {
    console.error('Social image proxy failed', error);
    if (sourceUrl !== BRAND_LOGO) {
      try {
        const fallback = await fetch(BRAND_LOGO, { redirect: 'follow' });
        const bytes = new Uint8Array(await fallback.arrayBuffer());
        res
          .status(200)
          .setHeader('Content-Type', fallback.headers.get('content-type') || 'image/png')
          .setHeader('Content-Length', String(bytes.byteLength))
          .setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800')
          .send(bytes);
        return;
      } catch {
        // Fall through to the explicit error below.
      }
    }
    res.status(404).setHeader('Content-Type', 'text/plain; charset=utf-8').send(new TextEncoder().encode('Image indisponible.'));
  }
}
