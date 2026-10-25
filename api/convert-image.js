import Busboy from 'busboy';
import convert from 'heic-convert';

const MAX_INPUT_BYTES = 12 * 1024 * 1024;
const ALLOWED_ORIGINS = new Set([
  'https://zando-africa.vercel.app',
  'https://zando-africa-23.vercel.app',
  'https://zando-africa-23-konolive23.vercel.app',
]);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  try {
    const url = new URL(origin);
    return url.protocol === 'https:' && /^zando-africa-23-[a-z0-9]+-konolive23\.vercel\.app$/.test(url.hostname);
  } catch {
    return false;
  }
}

function sendJson(res, status, payload, origin) {
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(status).json(payload);
}

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const contentType = req.headers['content-type'] || '';
    if (!contentType.toLowerCase().startsWith('multipart/form-data')) {
      reject(new Error('Multipart form-data required.'));
      return;
    }

    const parser = Busboy({
      headers: req.headers,
      limits: { files: 1, fileSize: MAX_INPUT_BYTES },
    });
    const chunks = [];
    let filename = 'image.heic';
    let mimeType = '';
    let tooLarge = false;
    let fileFound = false;

    parser.on('file', (_fieldName, file, info) => {
      fileFound = true;
      filename = info.filename || filename;
      mimeType = info.mimeType || '';
      file.on('data', chunk => chunks.push(chunk));
      file.on('limit', () => { tooLarge = true; });
    });
    parser.on('error', reject);
    parser.on('finish', () => {
      if (tooLarge) {
        reject(new Error('File too large'));
      } else if (!fileFound || chunks.length === 0) {
        reject(new Error('Image file missing'));
      } else {
        resolve({ buffer: Buffer.concat(chunks), filename, mimeType });
      }
    });
    req.pipe(parser);
  });
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  if (req.method === 'OPTIONS') {
    if (!isAllowedOrigin(origin)) return sendJson(res, 403, { error: 'Origin not allowed' }, origin);
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' }, origin);
  if (!isAllowedOrigin(origin)) return sendJson(res, 403, { error: 'Origin not allowed' }, origin);

  try {
    const { buffer, filename } = await parseMultipart(req);
    const output = await convert({ buffer, format: 'JPEG', quality: 0.9 });
    const jpeg = Buffer.from(output);
    if (!jpeg.length || jpeg.length > MAX_INPUT_BYTES) {
      return sendJson(res, 413, { error: 'Converted image is too large' }, origin);
    }
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Vary', 'Origin');
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Content-Disposition', `inline; filename="${filename.replace(/[^a-z0-9._-]/gi, '_').replace(/\.[^.]+$/, '') || 'image'}-converted.jpg"`);
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(jpeg);
  } catch (error) {
    console.error('HEIC conversion failed', error);
    const message = error instanceof Error ? error.message : 'Conversion failed';
    const status = message === 'File too large' ? 413 : 422;
    sendJson(res, status, { error: 'Ce fichier HEIC/HEIF ne peut pas être converti en JPEG.', detail: message }, origin);
  }
}
