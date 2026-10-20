import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { PDFDocument, PDFName } from 'npm:pdf-lib@1.17.1';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
// Keep the same legacy/new-key resolution as moneroo-payments. Do not import that
// entry point: it starts its own Deno server. No browser JWT is used as DB authority.
function getServiceRoleKey(): string {
  const legacyKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legacyKey) return legacyKey;
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}') as Record<string, unknown>;
    if (typeof keys.default === 'string') return keys.default;
    const firstKey = Object.values(keys).find((value): value is string => typeof value === 'string');
    return firstKey ?? '';
  } catch {
    return '';
  }
}
const SERVICE_ROLE_KEY = getServiceRoleKey();
const WORKER_URL = (Deno.env.get('DIGITAL_BOOKS_WORKER_URL') ?? '').replace(/\/+$/, '');
const STORAGE_SECRET = Deno.env.get('DIGITAL_BOOKS_STORAGE_SECRET') ?? '';
const DEFAULT_PDF_MAX_BYTES = 20 * 1024 * 1024;
const JSON_MAX_BYTES = 16 * 1024;
const BODY_TIMEOUT_MS = 30_000;
const WORKER_TIMEOUT_MS = 60_000;
const UPLOAD_TTL_MS = 60 * 60 * 1000;
const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTIONS = ['upload', 'preview', 'create_purchase', 'download'] as const;
type Action = typeof ACTIONS[number];
type JsonRecord = Record<string, unknown>;
type PrivateKind = 'originals' | 'previews';
type DatabaseError = { code?: string } | null;

class HttpError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
  }
}
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };

function configuredOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
    return url.origin;
  } catch {
    return null;
  }
}
const ALLOWED_ORIGINS = new Set([
  ...((Deno.env.get('ZANDO_ALLOWED_ORIGINS') ?? '').split(',')
    .map((value) => configuredOrigin(value.trim())).filter((value): value is string => Boolean(value))),
  ...[configuredOrigin(Deno.env.get('ZANDO_SITE_URL') ?? '')].filter((value): value is string => Boolean(value)),
  'http://localhost:5173',
]);
function isAllowedOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (url.origin !== origin) return false;
    if (ALLOWED_ORIGINS.has(origin)) return true;
    if (url.protocol !== 'https:') return false;
    const host = url.hostname;
    // Same production/preview allowlist as moneroo-payments; never wildcard CORS.
    return host === 'zando-africa.vercel.app'
      || host === 'zando-africa-23.vercel.app'
      || host === 'zando-africa-23-konolive23.vercel.app'
      || /^zando-africa-23-(?:[a-z0-9]+|git-[a-z0-9-]+)-konolive23\.vercel\.app$/.test(host);
  } catch {
    return false;
  }
}
function responseHeaders(origin: string | null): Headers {
  const headers = new Headers({
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    Vary: 'Origin',
  });
  if (origin && isAllowedOrigin(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Expose-Headers', 'X-Digital-Page-Count, Content-Disposition');
  }
  return headers;
}
function jsonResponse(body: JsonRecord, origin: string | null, status = 200): Response {
  const headers = responseHeaders(origin);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(body), { status, headers });
}
function isAction(value: unknown): value is Action {
  return typeof value === 'string' && (ACTIONS as readonly string[]).includes(value);
}
function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}
function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
function contentType(request: Request): string {
  return (request.headers.get('content-type') ?? '').split(';', 1)[0].trim().toLowerCase();
}
function isBackendUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    return (url.protocol === 'https:' || (url.protocol === 'http:' && local))
      && !url.username && !url.password && !url.search && !url.hash;
  } catch {
    return false;
  }
}

let databaseClient: SupabaseClient | null = null;
function database(): SupabaseClient {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new HttpError(503, 'supabase_not_configured',
      'Le service de livres numériques nécessite SUPABASE_URL et une clé service_role (SUPABASE_SERVICE_ROLE_KEY ou SUPABASE_SECRET_KEYS).');
  }
  if (!isBackendUrl(SUPABASE_URL)) {
    throw new HttpError(503, 'supabase_url_invalid', 'La configuration SUPABASE_URL est invalide.');
  }
  if (!databaseClient) {
    databaseClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      db: { schema: 'public' },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: {
        fetch: (input, init) => fetch(input, {
          ...init,
          signal: init?.signal
            ? AbortSignal.any([init.signal, AbortSignal.timeout(8000)])
            : AbortSignal.timeout(8000),
          redirect: 'error',
        }),
      },
    });
  }
  return databaseClient;
}
function requireWorker(): void {
  if (!WORKER_URL || !STORAGE_SECRET.trim()) {
    throw new HttpError(503, 'private_storage_not_configured',
      'Le stockage privé nécessite DIGITAL_BOOKS_WORKER_URL et DIGITAL_BOOKS_STORAGE_SECRET. Aucun stockage public de remplacement n’est utilisé.');
  }
  if (!isBackendUrl(WORKER_URL)) {
    throw new HttpError(503, 'private_storage_url_invalid', 'La configuration DIGITAL_BOOKS_WORKER_URL est invalide (HTTPS requis hors développement local).');
  }
}
function checkDatabaseError(error: DatabaseError, table: string): void {
  if (!error) return;
  if (error.code === '42P01' || error.code === 'PGRST205') {
    throw new HttpError(503, 'database_table_missing',
      `La table public.${table} est absente du schéma exposé. Les migrations des livres numériques, dont 20261021, doivent être appliquées avant d’utiliser ce service.`);
  }
  if (error.code === '42703' || error.code === 'PGRST204') {
    throw new HttpError(503, 'database_schema_incompatible',
      `Le schéma public.${table} est incompatible. Vérifiez les migrations 20261020/20261021 et le cache de schéma Supabase.`);
  }
  throw new HttpError(503, 'database_unavailable', 'La base de données du service de livres numériques est indisponible.');
}
async function auditDigitalBookEvent(action: Action | 'unknown', status: number, code: string | undefined, elapsedMs: number, productId: string | null): Promise<void> {
  try {
    const { error } = await database().from('digital_book_events').insert({
      action, status, code: code ?? null, elapsed_ms: elapsedMs, product_id: productId,
    });
    if (error) console.warn('digital_books_audit_write_failed', { code: error.code ?? 'database_error' });
  } catch {
    // Auditing must never change the result; the redacted provider log remains.
    console.warn('digital_books_audit_write_failed', { code: 'audit_unavailable' });
  }
}

// Enforce the actual bytes read, not only a client-controlled Content-Length.
// Distributed per-IP quotas are checked through the authenticated Cloudflare KV Worker.
async function readBoundedBody(request: Request, maximum: number): Promise<Uint8Array<ArrayBuffer>> {
  const encoding = request.headers.get('content-encoding');
  if (encoding && encoding.toLowerCase() !== 'identity') {
    throw new HttpError(415, 'unsupported_content_encoding', 'Les corps compressés ne sont pas acceptés.');
  }
  const declaredLength = request.headers.get('content-length');
  if (declaredLength !== null && (!/^\d+$/.test(declaredLength) || !Number.isSafeInteger(Number(declaredLength)))) {
    throw new HttpError(400, 'invalid_content_length', 'La taille déclarée de la requête est invalide.');
  }
  if (declaredLength !== null && Number(declaredLength) > maximum) {
    throw new HttpError(413, 'request_too_large', `La requête dépasse la limite serveur de ${maximum} octets.`);
  }
  if (!request.body) throw new HttpError(400, 'empty_body', 'Le corps de la requête est vide.');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new HttpError(408, 'body_timeout', 'Le délai de lecture de la requête est dépassé.')), BODY_TIMEOUT_MS);
  });
  try {
    while (true) {
      const { done, value } = await Promise.race([reader.read(), timeout]);
      if (done) break;
      length += value.byteLength;
      if (length > maximum) {
        throw new HttpError(413, 'request_too_large', `La requête dépasse la limite serveur de ${maximum} octets.`);
      }
      chunks.push(value);
    }
    if (!length) throw new HttpError(400, 'empty_body', 'Le corps de la requête est vide.');
    if (declaredLength !== null && Number(declaredLength) !== length) {
      throw new HttpError(400, 'body_length_mismatch', 'Le corps de la requête est incomplet ou sa taille déclarée est incorrecte.');
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return bytes;
  } catch (error) {
    void reader.cancel().catch(() => {});
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, 'invalid_request_body', 'Le corps de la requête ne peut pas être lu.');
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    reader.releaseLock();
  }
}
async function readJson(request: Request): Promise<JsonRecord> {
  if (contentType(request) !== 'application/json') {
    throw new HttpError(415, 'json_required', 'Cette action nécessite un corps application/json.');
  }
  const bytes = await readBoundedBody(request, JSON_MAX_BYTES);
  try {
    const value: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (!isRecord(value)) throw new Error('not_an_object');
    return value;
  } catch {
    throw new HttpError(400, 'invalid_json', 'Le corps JSON doit être un objet valide.');
  }
}
async function pdfMaximumBytes(db: SupabaseClient): Promise<number> {
  const { data, error } = await db.from('platform_settings').select('value')
    .eq('key', 'digital_pdf_max_bytes').maybeSingle();
  checkDatabaseError(error, 'platform_settings');
  // The setting is a JSON integer (a numeric string is also accepted).
  const raw = data?.value;
  const value = typeof raw === 'number' ? raw
    : typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : NaN;
  if (Number.isSafeInteger(value) && value >= PDF_SIGNATURE.length) return value;
  if (data) console.warn('digital_books_invalid_size_setting', { code: 'using_default_pdf_limit' });
  return DEFAULT_PDF_MAX_BYTES;
}
async function sha256(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
function strongUploadToken(): string {
  // 256 random bits, represented as hex. Only SHA-256(token UTF-8) is persisted.
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
function validPrivateKey(key: unknown, kind: PrivateKind): key is string {
  if (typeof key !== 'string') return false;
  const prefix = `digital/${kind}/`;
  return key.startsWith(prefix) && key.endsWith('.pdf')
    && UUID_PATTERN.test(key.slice(prefix.length, -4));
}
async function workerRequest(kind: PrivateKind, key: string, bytes?: Uint8Array<ArrayBuffer>): Promise<Response> {
  requireWorker();
  if (!validPrivateKey(key, kind)) {
    throw new HttpError(503, 'invalid_private_storage_key', 'La clé privée du livre est incompatible avec le stockage numérique.');
  }
  const url = new URL(`${WORKER_URL}/digital-internal/${bytes ? 'upload' : 'get'}`);
  url.searchParams.set('key', key);
  let result: Response;
  try {
    result = await fetch(url, {
      method: bytes ? 'POST' : 'GET',
      headers: {
        Authorization: `Bearer ${STORAGE_SECRET}`,
        ...(bytes ? { 'Content-Type': 'application/pdf' } : { Accept: 'application/pdf' }),
      },
      body: bytes,
      redirect: 'error', // Never send the bearer secret to a redirected/public host.
      signal: AbortSignal.timeout(WORKER_TIMEOUT_MS),
    });
  } catch {
    throw new HttpError(502, 'private_storage_unreachable', 'Le Worker de stockage privé est indisponible.');
  }
  if (!result.ok) {
    void result.body?.cancel().catch(() => {});
    if (!bytes && result.status === 404) throw new HttpError(404, 'file_not_found', 'Le fichier numérique est introuvable.');
    if (result.status === 401 || result.status === 403) {
      throw new HttpError(503, 'private_storage_auth_failed', 'Le Worker a refusé l’authentification serveur du stockage privé.');
    }
    throw new HttpError(502, 'private_storage_failed', 'Le Worker de stockage privé n’a pas pu traiter cette opération.');
  }
  if (bytes) {
    void result.body?.cancel().catch(() => {});
  } else if (!result.body || (result.headers.get('content-type') ?? '').split(';', 1)[0].trim().toLowerCase() !== 'application/pdf') {
    void result.body?.cancel().catch(() => {});
    throw new HttpError(502, 'private_storage_invalid_pdf_response', 'Le Worker privé n’a pas renvoyé un fichier application/pdf valide.');
  }
  return result;
}
async function deleteWorkerObject(kind: PrivateKind, key: string): Promise<void> {
  requireWorker();
  if (!validPrivateKey(key, kind)) throw new HttpError(503, 'invalid_private_storage_key', 'La clé privée du livre est invalide.');
  const url = new URL(`${WORKER_URL}/digital-internal/delete`);
  url.searchParams.set('key', key);
  const result = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${STORAGE_SECRET}` },
    redirect: 'error',
    signal: AbortSignal.timeout(8000),
  });
  if (!result.ok) {
    void result.body?.cancel().catch(() => {});
    throw new HttpError(502, 'private_storage_cleanup_failed', 'Le nettoyage du stockage privé a échoué.');
  }
  void result.body?.cancel().catch(() => {});
}

type DigitalRateScope = 'upload' | 'preview' | 'create_purchase' | 'download';
function trustedClientIp(request: Request): string {
  // The Supabase Edge gateway overwrites CF-Connecting-IP and appends the
  // originating peer to X-Forwarded-For. Prefer its single-IP header; otherwise
  // use the final proxy-appended address, never a client-supplied leading hop.
  const direct = request.headers.get('cf-connecting-ip')?.trim();
  if (direct && direct.length <= 100 && !/[\r\n,]/.test(direct)) return direct;
  const forwarded = request.headers.get('x-forwarded-for');
  const lastHop = forwarded?.split(',').at(-1)?.trim();
  if (lastHop && lastHop.length <= 100 && !/[\r\n]/.test(lastHop)) return lastHop;
  throw new HttpError(503, 'client_ip_unavailable', 'La limite de requêtes sécurisée est momentanément indisponible.');
}
async function enforceRateLimit(request: Request, scope: DigitalRateScope): Promise<void> {
  requireWorker();
  const url = new URL(`${WORKER_URL}/digital-internal/limit`);
  let result: Response;
  try {
    result = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${STORAGE_SECRET}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope, client_ip: trustedClientIp(request) }),
      redirect: 'error',
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new HttpError(503, 'rate_limiter_unavailable', 'La vérification anti-abus est momentanément indisponible.');
  }
  if (result.status === 429) throw new HttpError(429, 'rate_limit_exceeded', 'Trop de demandes rapprochées. Réessayez plus tard.');
  if (!result.ok) {
    void result.body?.cancel().catch(() => {});
    throw new HttpError(503, 'rate_limiter_unavailable', 'La vérification anti-abus est momentanément indisponible.');
  }
  void result.body?.cancel().catch(() => {});
}

async function upload(request: Request, origin: string | null): Promise<Response> {
  await enforceRateLimit(request, 'upload');
  if (contentType(request) !== 'application/pdf') {
    throw new HttpError(415, 'pdf_required', 'Le téléversement nécessite un corps binaire application/pdf.');
  }
  const db = database();
  requireWorker();
  // Fail clearly before storing files when the staging migration is missing.
  const [staging, maximum] = await Promise.all([
    db.from('digital_book_uploads')
      .select('upload_token_hash,original_key,preview_key,page_count,byte_size,content_hash,expires_at,consumed_at').limit(0),
    pdfMaximumBytes(db),
  ]);
  checkDatabaseError(staging.error, 'digital_book_uploads');
  const original = await readBoundedBody(request, maximum);
  if (!PDF_SIGNATURE.every((byte, index) => original[index] === byte)) {
    throw new HttpError(422, 'invalid_pdf_signature', 'Le fichier ne possède pas une signature PDF valide (%PDF-).');
  }
  let source: PDFDocument;
  let pageCount: number;
  try {
    source = await PDFDocument.load(original, {
      ignoreEncryption: false,
      throwOnInvalidObject: true,
      updateMetadata: false,
    });
    pageCount = source.getPageCount();
  } catch {
    throw new HttpError(422, 'invalid_pdf', 'Le PDF est invalide, endommagé ou chiffré; un PDF lisible non chiffré est requis.');
  }
  if (!Number.isSafeInteger(pageCount) || pageCount < 1) {
    throw new HttpError(422, 'empty_pdf', 'Le PDF doit contenir au moins une page.');
  }
  let preview: Uint8Array<ArrayBuffer>;
  try {
    // Serialize a NEW document, never the original with pages merely hidden.
    // Page annotations (including destinations pointing at excluded pages),
    // actions and auxiliary metadata are not imported into the public preview.
    const indices = Array.from({ length: Math.min(5, pageCount) }, (_, index) => index);
    for (const index of indices) {
      const page = source.getPage(index);
      for (const name of ['Annots', 'AA', 'Metadata', 'PieceInfo', 'Thumb', 'B', 'PresSteps', 'SeparationInfo']) {
        page.node.delete(PDFName.of(name));
      }
    }
    const derived = await PDFDocument.create();
    const pages = await derived.copyPages(source, indices);
    for (const page of pages) derived.addPage(page);
    // pdf-lib returns bytes backed by an ArrayBuffer; make an owned buffer for
    // fetch/WebCrypto compatibility across current Deno/TypeScript versions.
    preview = new Uint8Array(await derived.save());
  } catch {
    throw new HttpError(422, 'preview_generation_failed', 'Impossible de générer un aperçu autonome de ce PDF.');
  }
  const uploadToken = strongUploadToken();
  const [tokenHash, contentHash] = await Promise.all([
    sha256(new TextEncoder().encode(uploadToken)),
    sha256(original),
  ]);
  const objectId = crypto.randomUUID();
  const originalKey = `digital/originals/${objectId}.pdf`;
  const previewKey = `digital/previews/${objectId}.pdf`;
  let storedObjects = 0;
  try {
    await workerRequest('originals', originalKey, original);
    storedObjects++;
    await workerRequest('previews', previewKey, preview);
    storedObjects++;
    // supabase-js uses service-role PostgREST here. No raw token, URLs or
    // digital_books attachment: submit_product (20261021) consumes this row.
    const { error } = await db.from('digital_book_uploads').insert({
      upload_token_hash: tokenHash,
      original_key: originalKey,
      preview_key: previewKey,
      page_count: pageCount,
      byte_size: original.byteLength,
      content_hash: contentHash,
      expires_at: new Date(Date.now() + UPLOAD_TTL_MS).toISOString(),
      consumed_at: null,
    });
    checkDatabaseError(error, 'digital_book_uploads');
  } catch (error) {
    // Roll back only objects created by this failed request through the
    // authenticated internal cleanup route; never fall back to a public store.
    const storedKeys = [
      ...(storedObjects >= 1 ? [{ kind: 'originals' as const, key: originalKey }] : []),
      ...(storedObjects >= 2 ? [{ kind: 'previews' as const, key: previewKey }] : []),
    ];
    const cleanup = await Promise.allSettled(storedKeys.map(({ kind, key }) => deleteWorkerObject(kind, key)));
    const failedCleanup = cleanup.filter(item => item.status === 'rejected').length;
    if (storedObjects) console.warn('digital_books_upload_incomplete', { stored_objects: storedObjects, cleanup_failures: failedCleanup });
    throw error;
  }
  console.info('digital_books_upload_staged', { byte_size: original.byteLength, page_count: pageCount });
  return jsonResponse({ upload_token: uploadToken, page_count: pageCount }, origin);
}

async function requirePublishedProduct(db: SupabaseClient, productId: unknown): Promise<string> {
  if (!isUuid(productId)) throw new HttpError(400, 'invalid_product_id', 'L’identifiant du produit est invalide.');
  // "Active" in this schema means published, unexpired and not soft-deleted;
  // neither products nor digital_books has an is_active column.
  const { data, error } = await db.from('products').select('id')
    .eq('id', productId).eq('category_id', 'digital-products').eq('status', 'published')
    .is('deleted_at', null).gt('expires_at', new Date().toISOString()).maybeSingle();
  checkDatabaseError(error, 'products');
  if (!data) throw new HttpError(404, 'product_not_found', 'Ce produit numérique publié et actif est introuvable.');
  return productId;
}
function pdfResponse(result: Response, origin: string | null, disposition: 'inline' | 'attachment', pageCount?: number): Response {
  const headers = responseHeaders(origin);
  headers.set('Content-Type', 'application/pdf');
  headers.set('Content-Disposition', `${disposition}; filename="${disposition === 'inline' ? 'apercu' : 'livre-numerique'}.pdf"`);
  if (pageCount !== undefined) headers.set('X-Digital-Page-Count', String(pageCount));
  // Do not forward Worker URLs, keys, ETags, cookies, or internal headers.
  const length = result.headers.get('content-length');
  if (length && /^\d+$/.test(length) && !result.headers.get('content-encoding')) headers.set('Content-Length', length);
  return new Response(result.body, { status: 200, headers });
}
async function preview(request: Request, body: JsonRecord, origin: string | null): Promise<Response> {
  await enforceRateLimit(request, 'preview');
  const db = database();
  requireWorker();
  const productId = await requirePublishedProduct(db, body.product_id);
  const { data: book, error } = await db.from('digital_books').select('preview_key,page_count')
    .eq('product_id', productId).eq('status', 'published').maybeSingle();
  checkDatabaseError(error, 'digital_books');
  if (!book) throw new HttpError(404, 'book_not_found', 'L’aperçu de ce livre numérique est introuvable.');
  if (!Number.isSafeInteger(book.page_count) || book.page_count < 1 || !validPrivateKey(book.preview_key, 'previews')) {
    throw new HttpError(503, 'book_preview_metadata_invalid', 'Les métadonnées privées de l’aperçu sont invalides.');
  }
  // Fetch ONLY the preview key. The original is never used as an approximation.
  const result = await workerRequest('previews', book.preview_key);
  return pdfResponse(result, origin, 'inline', book.page_count);
}
function validateCustomer(value: unknown): void {
  if (!isRecord(value)) throw new HttpError(400, 'invalid_customer', 'Les coordonnées du client sont invalides.');
  const { first_name: firstName, last_name: lastName, email, phone } = value;
  if (typeof firstName !== 'string' || !firstName.trim() || firstName.trim().length > 120
    || typeof lastName !== 'string' || !lastName.trim() || lastName.trim().length > 120
    || typeof email !== 'string' || email.trim().length > 254
    || !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email.trim())
    || (phone !== undefined && (typeof phone !== 'string' || phone.trim().length < 6 || phone.trim().length > 32))) {
    throw new HttpError(400, 'invalid_customer', 'Le prénom, le nom, l’email ou le téléphone du client est invalide.');
  }
}
async function createPurchase(request: Request, body: JsonRecord, origin: string | null): Promise<Response> {
  await enforceRateLimit(request, 'create_purchase');
  validateCustomer(body.customer);
  const db = database();
  const productId = await requirePublishedProduct(db, body.product_id);
  const { data: book, error } = await db.from('digital_books').select('id')
    .eq('product_id', productId).eq('status', 'published').maybeSingle();
  checkDatabaseError(error, 'digital_books');
  if (!book || !isUuid(book.id)) throw new HttpError(404, 'book_not_found', 'Ce livre numérique publié est introuvable.');
  // Compatibility name only: this is the book ID, NOT a transaction/entitlement.
  // moneroo-payments(action=create) -> prepare_moneroo_payment is the sole
  // creator of the transaction; that RPC validates the current price/customer.
  return jsonResponse({ purchaseId: book.id }, origin);
}
async function download(request: Request, body: JsonRecord, origin: string | null): Promise<Response> {
  await enforceRateLimit(request, 'download');
  if (!isUuid(body.reference)) throw new HttpError(400, 'invalid_reference', 'La référence de paiement est invalide.');
  const db = database();
  const { data: transaction, error: transactionError } = await db.from('transactions')
    .select('id,reference,type,item_id,status').eq('reference', body.reference).eq('type', 'book_purchase').maybeSingle();
  checkDatabaseError(transactionError, 'transactions');
  if (!transaction || !isUuid(transaction.item_id)) throw new HttpError(404, 'purchase_not_found', 'Cet achat de livre numérique est introuvable.');
  if (transaction.status !== 'completed') throw new HttpError(403, 'payment_not_completed', 'Le paiement de cet achat n’est pas confirmé.');
  // Entitlement.reference is independent of transactions.reference in the SQL
  // schema. Resolve the supplied PAYMENT reference through transaction_id,
  // never compare the two unrelated references or accept a browser entitlement.
  const { data: entitlement, error: entitlementError } = await db.from('digital_book_entitlements')
    .select('id').eq('transaction_id', transaction.id)
    .eq('digital_book_id', transaction.item_id).eq('status', 'completed').maybeSingle();
  checkDatabaseError(entitlementError, 'digital_book_entitlements');
  if (!entitlement) throw new HttpError(403, 'entitlement_not_completed', 'Aucun droit de téléchargement terminé ne correspond à cet achat.');
  // Access depends ONLY on BOTH server-side completed statuses and the matching
  // transaction/reference/book. Ignore browser email, status or payment claims.
  // A later expiry of the public listing does not invalidate a completed purchase.
  const { data: book, error: bookError } = await db.from('digital_books').select('original_key')
    .eq('id', transaction.item_id).maybeSingle();
  checkDatabaseError(bookError, 'digital_books');
  if (!book) throw new HttpError(404, 'book_not_found', 'Le livre acheté est introuvable.');
  if (!validPrivateKey(book.original_key, 'originals')) {
    throw new HttpError(503, 'book_original_metadata_invalid', 'Les métadonnées privées du livre acheté sont invalides.');
  }
  requireWorker();
  const result = await workerRequest('originals', book.original_key);
  return pdfResponse(result, origin, 'attachment');
}

export async function handleRequest(request: Request): Promise<Response> {
  const startedAt = Date.now();
  const origin = request.headers.get('origin');
  let action: Action | 'unknown' = 'unknown';
  let status = 500;
  let failureCode: string | undefined;
  let auditProductId: string | null = null;
  try {
    const url = new URL(request.url);
    if (!['/', '/digital-books', '/digital-books/', '/functions/v1/digital-books', '/functions/v1/digital-books/'].includes(url.pathname)) {
      throw new HttpError(404, 'route_not_found', 'Cet endpoint est introuvable.');
    }
    if (origin && !isAllowedOrigin(origin)) throw new HttpError(403, 'origin_not_allowed', 'Origine non autorisée.');
    if (request.method === 'OPTIONS') {
      const requestedMethod = request.headers.get('access-control-request-method');
      if (requestedMethod && requestedMethod !== 'POST') throw new HttpError(405, 'method_not_allowed', 'Seule la méthode POST est autorisée.');
      const headers = responseHeaders(origin);
      if (origin) {
        headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
        headers.set('Access-Control-Allow-Headers', 'authorization, apikey, content-type, x-client-info');
        headers.set('Access-Control-Max-Age', '600');
      }
      status = 204;
      return new Response(null, { status, headers });
    }
    if (request.method !== 'POST') throw new HttpError(405, 'method_not_allowed', 'Seules les méthodes POST et OPTIONS sont autorisées.');
    const queryActions = url.searchParams.getAll('action');
    if (queryActions.length > 1 || (queryActions.length === 1 && !isAction(queryActions[0]))) {
      throw new HttpError(400, 'invalid_action', 'L’action demandée est invalide.');
    }
    const queryAction = queryActions[0];
    let result: Response;
    if (queryAction === 'upload') {
      action = 'upload';
      result = await upload(request, origin);
    } else {
      const body = await readJson(request);
      if (isUuid(body.product_id)) auditProductId = body.product_id;
      if (queryAction && body.action !== undefined && body.action !== queryAction) {
        throw new HttpError(400, 'conflicting_action', 'L’action JSON ne correspond pas à celle de l’URL.');
      }
      const requestedAction = queryAction ?? body.action;
      if (!isAction(requestedAction)) throw new HttpError(400, 'invalid_action', 'Une action upload, preview, create_purchase ou download est requise.');
      action = requestedAction;
      if (action === 'upload') throw new HttpError(415, 'binary_upload_required', 'Utilisez POST ?action=upload avec un corps binaire application/pdf.');
      if (action === 'preview') result = await preview(request, body, origin);
      else if (action === 'create_purchase') result = await createPurchase(request, body, origin);
      else result = await download(request, body, origin);
    }
    status = result.status;
    return result;
  } catch (error) {
    const failure = error instanceof HttpError ? error
      : new HttpError(500, 'internal_error', 'Une erreur interne empêche de traiter cette demande numérique.');
    status = failure.status;
    failureCode = failure.code;
    const result = jsonResponse({ error: failure.message, code: failure.code }, origin, status);
    if (status === 405) result.headers.set('Allow', 'POST, OPTIONS');
    // Cancel unread client data without logging bodies, filenames, URLs, tokens,
    // storage keys, payment references, customer details, or raw exceptions.
    if (request.body && !request.body.locked) void request.body.cancel().catch(() => {});
    return result;
  } finally {
    const elapsedMs = Date.now() - startedAt;
    console.info('digital_books_request', {
      action,
      status,
      ...(failureCode ? { code: failureCode } : {}),
      elapsed_ms: elapsedMs,
    });
    if (request.method === 'POST' && action !== 'unknown') {
      const audit = auditDigitalBookEvent(action, status, failureCode, elapsedMs, auditProductId);
      try { EdgeRuntime.waitUntil(audit); } catch { void audit; }
    }
  }
}

Deno.serve(handleRequest);
