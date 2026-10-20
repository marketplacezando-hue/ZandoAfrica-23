import { describe, expect, it, vi } from 'vitest';

vi.mock('@/db/supabase', () => ({
  supabase: { auth: { getSession: vi.fn() } }
}));

import { DIGITAL_BOOK_MAX_BYTES, validateDigitalBookFile } from '@/services/digitalBooks';
import { isValidMerchantUrl, normalizeMerchantUrl } from '@/lib/digitalProducts';

const signature = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);

function pdfFile(name = 'livre.pdf', type = 'application/pdf', content: BlobPart = signature): File {
  return new File([content], name, { type });
}

describe('validateDigitalBookFile', () => {
  it('accepts a PDF with matching extension, MIME and PDF signature under the configured limit', async () => {
    await expect(validateDigitalBookFile(pdfFile(), 1024)).resolves.toBeNull();
  });

  it('rejects a non-PDF extension', async () => {
    await expect(validateDigitalBookFile(pdfFile('livre.txt'))).resolves.toContain('.pdf');
  });

  it('rejects a mismatched MIME type', async () => {
    await expect(validateDigitalBookFile(pdfFile('livre.pdf', 'text/plain'))).resolves.toContain('MIME');
  });

  it('rejects a forged PDF MIME when the file signature is invalid', async () => {
    await expect(validateDigitalBookFile(pdfFile('faux.pdf', 'application/pdf', 'not a PDF'))).resolves.toContain('signature PDF');
  });

  it('rejects a valid PDF larger than the configured file limit', async () => {
    const oversized = new Uint8Array(1025);
    oversized.set(signature);
    await expect(validateDigitalBookFile(pdfFile('large.pdf', 'application/pdf', oversized), 1024)).resolves.toContain('limite configurée');
  });
});

describe('digital product safety rules', () => {
  it('uses the 300 MiB maximum configured for digital PDFs', () => {
    expect(DIGITAL_BOOK_MAX_BYTES).toBe(300 * 1024 * 1024);
  });
  it('accepts HTTP/HTTPS merchant URLs and rejects dangerous schemes', () => {
    expect(isValidMerchantUrl('https://seller.example/book')).toBe(true);
    expect(isValidMerchantUrl('http://seller.example/book')).toBe(true);
    expect(isValidMerchantUrl('javascript:alert(1)')).toBe(false);
    expect(isValidMerchantUrl('https://user:pass@seller.example/book')).toBe(false);
  });
  it('adds HTTPS once to bare merchant domains', () => {
    expect(normalizeMerchantUrl('monsite.com')).toBe('https://monsite.com');
    expect(normalizeMerchantUrl('www.monsite.com')).toBe('https://www.monsite.com');
    expect(normalizeMerchantUrl('https://monsite.com')).toBe('https://monsite.com');
    expect(normalizeMerchantUrl('https://https://monsite.com')).toBeNull();
  });
});
