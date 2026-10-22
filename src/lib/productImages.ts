import { MAX_IMAGE_UPLOAD_BYTES } from '@/lib/imageValidation';

const COVER_WIDTH = 1024;
const COVER_HEIGHT = 1536;

async function toJpegBlob(canvas: HTMLCanvasElement, initialQuality: number): Promise<Blob> {
  for (const quality of [initialQuality, 0.84, 0.76, 0.68, 0.58, 0.48, 0.38]) {
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(result => {
        if (result) resolve(result);
        else reject(new Error('Impossible de préparer la photo.'));
      }, 'image/jpeg', quality);
    });
    if (blob.size <= MAX_IMAGE_UPLOAD_BYTES) return blob;
  }
  throw new Error('La photo préparée dépasse encore la limite de 2 Mo. Choisissez une image plus simple.');
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Impossible de lire cette image.'));
    };
    image.src = url;
  });
}

/**
 * Normalise la couverture sans déformer le produit : l’image est contenue dans
 * une toile portrait 2:3 et les marges sont remplies en blanc si nécessaire.
 */
export async function normalizeProductCoverImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;

  const image = await loadImage(file);
  if (image.naturalWidth === COVER_WIDTH && image.naturalHeight === COVER_HEIGHT) return file;

  const canvas = document.createElement('canvas');
  canvas.width = COVER_WIDTH;
  canvas.height = COVER_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Le traitement de l’image est indisponible sur cet appareil.');

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, COVER_WIDTH, COVER_HEIGHT);
  const scale = Math.min(COVER_WIDTH / image.naturalWidth, COVER_HEIGHT / image.naturalHeight);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const x = Math.round((COVER_WIDTH - width) / 2);
  const y = Math.round((COVER_HEIGHT - height) / 2);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, x, y, width, height);

  const blob = await toJpegBlob(canvas, 0.92);

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'couverture';
  return new File([blob], `${baseName}-1024x1536.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
}

/** Convertit une photo de profil dans un format universel accepté par le stockage. */
export async function normalizeSellerAvatarImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) throw new Error('Veuillez sélectionner un fichier image.');
  const image = await loadImage(file);
  const maxSide = 1200;
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Le traitement de la photo est indisponible sur cet appareil.');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await toJpegBlob(canvas, 0.9);
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo-vendeur';
  return new File([blob], `${baseName}-avatar.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
}

export const PRODUCT_COVER_DIMENSIONS = { width: COVER_WIDTH, height: COVER_HEIGHT } as const;
