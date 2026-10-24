function upsertMeta(attribute: 'name' | 'property', key: string, content: string): void {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function upsertCanonical(url: string): void {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', 'canonical');
    document.head.appendChild(element);
  }
  element.setAttribute('href', url);
}

const DEFAULT_SOCIAL_IMAGE = 'https://zando-africa.vercel.app/home/zando-logo.png';

export function updateProductSocialMeta(product: { title: string; description?: string | null; photos?: string[] | null }): void {
  const title = `${product.title} | Zando Africa`;
  const description = (product.description?.trim() || 'Découvrez cette annonce sur Zando Africa.').slice(0, 240);
  const image = product.photos?.[0] || DEFAULT_SOCIAL_IMAGE;
  const pageUrl = window.location.href.split('#')[0];
  document.title = title;
  upsertCanonical(pageUrl);
  upsertMeta('name', 'description', description);
  upsertMeta('property', 'og:title', title);
  upsertMeta('property', 'og:description', description);
  upsertMeta('property', 'og:url', pageUrl);
  upsertMeta('property', 'og:image', image);
  upsertMeta('property', 'og:image:url', image);
  upsertMeta('property', 'og:image:secure_url', image);
  upsertMeta('property', 'og:image:type', 'image/jpeg');
  upsertMeta('property', 'og:image:width', '1024');
  upsertMeta('property', 'og:image:height', '1536');
  upsertMeta('property', 'og:image:alt', product.title);
  upsertMeta('name', 'twitter:url', pageUrl);
  upsertMeta('name', 'twitter:title', title);
  upsertMeta('name', 'twitter:description', description);
  upsertMeta('name', 'twitter:image', image);
  upsertMeta('name', 'twitter:image:alt', product.title);
}
