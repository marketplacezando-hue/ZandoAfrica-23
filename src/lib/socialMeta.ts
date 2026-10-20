function upsertMeta(attribute: 'name' | 'property', key: string, content: string): void {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

export function updateProductSocialMeta(product: { title: string; description?: string | null; photos?: string[] | null }): void {
  const title = `${product.title} | Zando Africa`;
  const description = (product.description?.trim() || 'Découvrez cette annonce sur Zando Africa.').slice(0, 240);
  const image = product.photos?.[0] || 'https://miaoda-conversation-file.s3cdn.medo.dev/user-f5tkhvyf87pc/app-f5tomiygsu81/20261017/1000500253.png';
  document.title = title;
  upsertMeta('name', 'description', description);
  upsertMeta('property', 'og:title', title);
  upsertMeta('property', 'og:description', description);
  upsertMeta('property', 'og:image', image);
  upsertMeta('property', 'og:image:secure_url', image);
  upsertMeta('property', 'og:image:alt', product.title);
  upsertMeta('name', 'twitter:title', title);
  upsertMeta('name', 'twitter:description', description);
  upsertMeta('name', 'twitter:image', image);
}
