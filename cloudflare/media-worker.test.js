import { describe, expect, it, vi } from 'vitest';
import mediaWorker from './media-worker.js';

const ORIGIN = 'https://zando-africa.vercel.app';
const createEnv = () => ({
  MEDIA_BUCKET: { put: vi.fn(async () => undefined) },
  UPLOAD_RATES: {
    get: vi.fn(async () => '0'),
    put: vi.fn(async () => undefined)
  }
});

function uploadRequest(body) {
  return new Request('https://media.example.test/upload', {
    method: 'POST',
    headers: {
      Origin: ORIGIN,
      'CF-Connecting-IP': '203.0.113.10',
      'Content-Type': 'image/png',
      'X-Media-Folder': 'products'
    },
    body
  });
}

describe('Cloudflare media upload limit', () => {
  it('accepte une vraie image PNG valide sous la limite', async () => {
    const env = createEnv();
    const png = new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/qf8AAAAASUVORK5CYII=', 'base64'));
    const response = await mediaWorker.fetch(uploadRequest(png), env);

    expect(response.status).toBe(201);
    expect(env.MEDIA_BUCKET.put).toHaveBeenCalledOnce();
  });

  it('refuse côté serveur une image de plus de 2 Mio', async () => {
    const env = createEnv();
    const oversized = new Uint8Array(2 * 1024 * 1024 + 1);
    const response = await mediaWorker.fetch(uploadRequest(oversized), env);

    expect(response.status).toBe(413);
    expect(env.MEDIA_BUCKET.put).not.toHaveBeenCalled();
  });

  it('refuse une image dont les octets ne correspondent pas au MIME annoncé', async () => {
    const env = createEnv();
    const response = await mediaWorker.fetch(uploadRequest(new TextEncoder().encode('not an image')), env);

    expect(response.status).toBe(415);
    expect(env.MEDIA_BUCKET.put).not.toHaveBeenCalled();
  });
});
