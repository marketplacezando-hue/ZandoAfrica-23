import { describe, expect, it } from 'vitest';
import { detectImageMimeFromBytes, MAX_IMAGE_UPLOAD_BYTES, validateImageFile } from './imageValidation';

describe('imageValidation', () => {
  it.each([
    [new Uint8Array([0xff, 0xd8, 0xff, 0]), 'image/jpeg'],
    [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), 'image/png'],
    [new TextEncoder().encode('GIF89a'), 'image/gif'],
    [new TextEncoder().encode('RIFF0000WEBP'), 'image/webp'],
    [new TextEncoder().encode('\u0000\u0000\u0000\u0000ftypavif\u0000\u0000\u0000\u0000'), 'image/avif'],
    [new TextEncoder().encode('\u0000\u0000\u0000\u0018ftypheic\u0000\u0000\u0000\u0000mif1'), 'image/heic'],
    [new TextEncoder().encode('\u0000\u0000\u0000\u0018ftypmif1\u0000\u0000\u0000\u0000heic'), 'image/heif']
  ])('détecte le type réel %s', (bytes, expected) => {
    expect(detectImageMimeFromBytes(bytes)).toBe(expected);
  });

  it('refuse les signatures inconnues', () => {
    expect(detectImageMimeFromBytes(new Uint8Array([0, 1, 2, 3, 4]))).toBeNull();
  });

  it('refuse une photo qui dépasse 2 Mio avant tout décodage', async () => {
    const file = new File([new Uint8Array(MAX_IMAGE_UPLOAD_BYTES + 1)], 'photo.png', { type: 'image/png' });
    await expect(validateImageFile(file)).resolves.toBe('La photo ne doit pas dépasser 2 Mo.');
  });

  it('refuse un MIME déclaré qui ne correspond pas à la signature', async () => {
    const pngSignature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    const file = new File([pngSignature], 'photo.jpg', { type: 'image/jpeg' });
    await expect(validateImageFile(file)).resolves.toBe('Le type déclaré ne correspond pas au contenu réel du fichier image.');
  });
});
