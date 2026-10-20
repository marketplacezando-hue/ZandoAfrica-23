import { supabase } from '@/db/supabase';

export const DIGITAL_BOOK_MAX_BYTES = 300 * 1024 * 1024;
const PDF_SIGNATURE = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);

export type DigitalBookUpload = {
  upload_token: string;
  page_count: number;
};

/**
 * Performs the browser-side checks required before contacting the Edge Function.
 * The server remains authoritative and may apply a different configurable limit.
 */
export async function validateDigitalBookFile(file: File, maxBytes = DIGITAL_BOOK_MAX_BYTES): Promise<string | null> {
  if (!/\.pdf$/i.test(file.name)) {
    return 'Le fichier doit avoir l’extension .pdf.';
  }

  if (file.type.toLowerCase() !== 'application/pdf') {
    return 'Le fichier doit être déclaré avec le type MIME application/pdf.';
  }

  if (file.size > maxBytes) {
    const sizeMiB = (maxBytes / (1024 * 1024)).toLocaleString('fr-FR', { maximumFractionDigits: 1 });
    return `Le fichier PDF dépasse la limite configurée de ${sizeMiB} Mio.`;
  }

  const signature = new Uint8Array(await file.slice(0, PDF_SIGNATURE.length).arrayBuffer());
  if (signature.length !== PDF_SIGNATURE.length || !PDF_SIGNATURE.every((byte, index) => signature[index] === byte)) {
    return 'Le fichier ne possède pas une signature PDF valide (%PDF-).';
  }

  return null;
}

export async function uploadDigitalBook(file: File, maxBytes = DIGITAL_BOOK_MAX_BYTES): Promise<DigitalBookUpload> {
  const localError = await validateDigitalBookFile(file, maxBytes);
  if (localError) {
    throw new Error(localError);
  }

  const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
  const publishableKey = String(
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || ''
  );

  if (!supabaseUrl || !publishableKey) {
    throw new Error('Le service de livres numériques est indisponible : configuration Supabase manquante.');
  }

  let accessToken: string | null = null;
  try {
    const { data } = await supabase.auth.getSession();
    accessToken = data.session?.access_token || null;
  } catch {
    // The public key is still sufficient for an unauthenticated upload attempt.
  }

  let response: Response;
  try {
    response = await fetch(`${supabaseUrl}/functions/v1/digital-books?action=upload`, {
      method: 'POST',
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${accessToken || publishableKey}`,
        'Content-Type': 'application/pdf'
      },
      body: file
    });
  } catch {
    throw new Error('La fonction Edge digital-books est indisponible. Aucun téléversement n’est confirmé.');
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // Keep the HTTP status in the explicit error below when the backend returns no JSON.
  }

  if (!response.ok) {
    const serverMessage = payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
      ? payload.error
      : `Le service de livres numériques a répondu avec le statut HTTP ${response.status}.`;
    throw new Error(serverMessage);
  }

  if (!payload || typeof payload !== 'object') {
    throw new Error('Le service de livres numériques a renvoyé une réponse invalide. Aucun téléversement n’est confirmé.');
  }

  const responseData = payload as Record<string, unknown>;
  if (typeof responseData.upload_token !== 'string' || !responseData.upload_token.trim() || typeof responseData.page_count !== 'number' || !Number.isFinite(responseData.page_count)) {
    throw new Error('Le service de livres numériques a renvoyé une réponse invalide. Aucun téléversement n’est confirmé.');
  }

  return {
    upload_token: responseData.upload_token,
    page_count: responseData.page_count
  };
}

async function digitalBooksRequest(action: string, body: Record<string, unknown>): Promise<Response> {
  const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
  const publishableKey = String(
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || ''
  );
  if (!supabaseUrl || !publishableKey) throw new Error('Le service de livres numériques n’est pas configuré.');

  let accessToken: string | null = null;
  try {
    const { data } = await supabase.auth.getSession();
    accessToken = data.session?.access_token || null;
  } catch {
    // Les actions de consultation d’aperçu sont accessibles aux visiteurs.
  }

  try {
    return await fetch(`${supabaseUrl}/functions/v1/digital-books?action=${encodeURIComponent(action)}`, {
      method: 'POST',
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${accessToken || publishableKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
  } catch {
    throw new Error('Impossible de joindre le service de livres numériques. Réessayez ultérieurement.');
  }
}

async function responseError(response: Response): Promise<string> {
  try {
    const data = await response.json() as { error?: unknown };
    if (typeof data.error === 'string') return data.error;
  } catch {
    // The server may return a non-JSON gateway response.
  }
  return `Le service de livres numériques a répondu avec le statut HTTP ${response.status}.`;
}

export async function getDigitalPreview(productId: string): Promise<{
  blobUrl: string;
  totalPages: number;
  error?: string;
}> {
  const response = await digitalBooksRequest('preview', { product_id: productId });
  if (!response.ok) return { blobUrl: '', totalPages: 0, error: await responseError(response) };
  const pageCount = Number(response.headers.get('X-Digital-Page-Count'));
  if (!Number.isInteger(pageCount) || pageCount < 1) {
    return { blobUrl: '', totalPages: 0, error: 'Le serveur n’a pas renvoyé le nombre de pages de l’aperçu.' };
  }
  const pdf = await response.blob();
  if (pdf.type !== 'application/pdf' || pdf.size === 0) {
    return { blobUrl: '', totalPages: 0, error: 'L’aperçu PDF renvoyé par le serveur est invalide.' };
  }
  return { blobUrl: URL.createObjectURL(pdf), totalPages: pageCount };
}
