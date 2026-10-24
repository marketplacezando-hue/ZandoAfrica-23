export const MAX_IMAGE_UPLOAD_BYTES = 2 * 1024 * 1024;

export type SupportedImageMime =
  | 'image/jpeg'
  | 'image/png'
  | 'image/webp'
  | 'image/gif'
  | 'image/avif';

const MIME_ALIASES: Record<string, SupportedImageMime> = {
  'image/jpeg': 'image/jpeg',
  'image/jpg': 'image/jpeg',
  'image/pjpeg': 'image/jpeg',
  'image/png': 'image/png',
  'image/x-png': 'image/png',
  'image/webp': 'image/webp',
  'image/gif': 'image/gif',
  'image/avif': 'image/avif'
};

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.slice(start, end));
}

async function readImageHeader(file: File): Promise<Uint8Array> {
  try {
    return new Uint8Array(await file.slice(0, 32).arrayBuffer());
  } catch {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(new Uint8Array(reader.result));
        } else {
          reject(new Error('Le navigateur n’a pas renvoyé les octets du fichier.'));
        }
      };
      reader.onerror = () => reject(reader.error || new Error('Lecture du fichier impossible.'));
      reader.readAsArrayBuffer(file.slice(0, 32));
    });
  }
}

export function detectImageMimeFromBytes(bytes: Uint8Array): SupportedImageMime | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }

  const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (bytes.length >= 8 && pngSignature.every((value, index) => bytes[index] === value)) {
    return 'image/png';
  }

  if (bytes.length >= 6 && ['GIF87a', 'GIF89a'].includes(ascii(bytes, 0, 6))) {
    return 'image/gif';
  }

  if (bytes.length >= 12 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP') {
    return 'image/webp';
  }

  if (bytes.length >= 16 && ascii(bytes, 4, 8) === 'ftyp') {
    const brands = [ascii(bytes, 8, 12)];
    for (let offset = 16; offset + 4 <= Math.min(bytes.length, 32); offset += 4) {
      brands.push(ascii(bytes, offset, offset + 4));
    }
    if (brands.some(brand => brand === 'avif' || brand === 'avis')) {
      return 'image/avif';
    }
  }

  return null;
}

export async function getImageMime(file: File): Promise<SupportedImageMime | null> {
  const header = await readImageHeader(file);
  return detectImageMimeFromBytes(header);
}

function canDecodeWithImageElement(file: File): Promise<boolean> {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image.naturalWidth > 0 && image.naturalHeight > 0);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(false);
    };
    image.src = url;
  });
}

async function canDecodeImage(file: File): Promise<boolean> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      const validDimensions = bitmap.width > 0 && bitmap.height > 0;
      bitmap.close();
      if (validDimensions) return true;
    } catch {
      // Fall back to the image element for browsers with partial format support.
    }
  }

  return canDecodeWithImageElement(file);
}

export async function validateImageFile(
  file: File,
  maxBytes = MAX_IMAGE_UPLOAD_BYTES
): Promise<string | null> {
  if (!file.size) return 'Le fichier image est vide.';
  if (file.size > maxBytes) {
    const maxMiB = Math.round((maxBytes / (1024 * 1024)) * 10) / 10;
    return `La photo ne doit pas dépasser ${maxMiB} Mo.`;
  }

  let detectedMime: SupportedImageMime | null;
  try {
    detectedMime = await getImageMime(file);
  } catch {
    return 'Impossible de lire le fichier image sélectionné.';
  }
  if (!detectedMime) {
    return 'Format non pris en charge. Images acceptées : JPG/JPEG, PNG, WebP, GIF ou AVIF.';
  }

  const declaredMime = file.type.trim().toLowerCase();
  if (declaredMime && declaredMime !== 'application/octet-stream') {
    const canonicalMime = MIME_ALIASES[declaredMime];
    if (!canonicalMime || canonicalMime !== detectedMime) {
      return 'Le type déclaré ne correspond pas au contenu réel du fichier image.';
    }
  }

  try {
    if (!(await canDecodeImage(file))) {
      return 'Ce fichier est corrompu ou ne peut pas être décodé comme une image.';
    }
  } catch {
    return 'Ce fichier est corrompu ou ne peut pas être décodé comme une image.';
  }

  return null;
}
