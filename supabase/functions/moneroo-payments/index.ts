const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
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
const MONEROO_SECRET_KEY = Deno.env.get('MONEROO_SECRET_KEY') ?? '';
const MONEROO_WEBHOOK_SECRET = Deno.env.get('MONEROO_WEBHOOK_SECRET') ?? '';
const SITE_URL = (Deno.env.get('ZANDO_SITE_URL') ?? '').replace(/\/$/, '');
const DEFAULT_CURRENCY = (Deno.env.get('MONEROO_DEFAULT_CURRENCY') ?? 'XAF').toUpperCase();
const ALLOWED_ORIGINS = new Set([
  ...((Deno.env.get('ZANDO_ALLOWED_ORIGINS') ?? '').split(',').map((value) => value.trim()).filter(Boolean)),
  ...(SITE_URL ? [new URL(SITE_URL).origin] : []),
  'http://localhost:5173',
]);
console.info('moneroo_runtime_config_presence', {
  supabaseUrl: Boolean(SUPABASE_URL),
  serviceRoleKey: Boolean(SERVICE_ROLE_KEY),
  monerooSecretKey: Boolean(MONEROO_SECRET_KEY),
  monerooWebhookSecret: Boolean(MONEROO_WEBHOOK_SECRET),
  siteUrl: Boolean(SITE_URL),
});
const MONEROO_API = 'https://api.moneroo.io';
const MAX_BODY_BYTES = 64 * 1024;

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };

type JsonRecord = Record<string, unknown>;
type Tx = {
  id: string;
  reference: string;
  type: string;
  item_id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  provider_reference: string | null;
  checkout_url: string | null;
  checkout_state: string;
  customer_email: string | null;
  customer_first_name: string | null;
  customer_last_name: string | null;
  customer_phone: string | null;
  created_at: string;
  updated_at?: string;
  verified_at: string | null;
};

function response(body: JsonRecord, status = 200, origin?: string | null): Response {
  const headers = new Headers({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers.set('access-control-allow-origin', origin);
    headers.set('vary', 'Origin');
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function errorResponse(message: string, status = 400, origin?: string | null): Response {
  return response({ error: message }, status, origin);
}

function requireServerConfig(): void {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !MONEROO_SECRET_KEY) throw new Error('payment_backend_not_configured');
}

async function parseJson(request: Request): Promise<JsonRecord> {
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) throw new Error('request_too_large');
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid_json');
    return value as JsonRecord;
  } catch {
    throw new Error('invalid_json');
  }
}

async function rpc<T>(name: string, args: JsonRecord): Promise<T> {
  const result = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(8000),
  });
  if (!result.ok) throw new Error(`database_rpc_${result.status}`);
  return await result.json() as T;
}

async function readTransaction(reference: string): Promise<Tx | null> {
  const query = new URLSearchParams({
    select: 'id,reference,type,item_id,amount,currency,status,payment_method,provider_reference,checkout_url,checkout_state,customer_email,customer_first_name,customer_last_name,customer_phone,created_at,verified_at',
    reference: `eq.${reference}`,
    payment_method: 'eq.Moneroo',
    limit: '1',
  });
  const result = await fetch(`${SUPABASE_URL}/rest/v1/transactions?${query}`, {
    headers: { apikey: SERVICE_ROLE_KEY, authorization: `Bearer ${SERVICE_ROLE_KEY}`, accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  if (!result.ok) throw new Error(`database_read_${result.status}`);
  const rows = await result.json() as Tx[];
  return rows[0] ?? null;
}

async function readByProviderReference(providerReference: string): Promise<Tx | null> {
  const query = new URLSearchParams({
    select: 'id,reference,type,item_id,amount,currency,status,payment_method,provider_reference,checkout_url,checkout_state,customer_email,customer_first_name,customer_last_name,customer_phone,created_at,verified_at',
    provider_reference: `eq.${providerReference}`,
    payment_method: 'eq.Moneroo',
    limit: '1',
  });
  const result = await fetch(`${SUPABASE_URL}/rest/v1/transactions?${query}`, {
    headers: { apikey: SERVICE_ROLE_KEY, authorization: `Bearer ${SERVICE_ROLE_KEY}`, accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  if (!result.ok) throw new Error(`database_read_${result.status}`);
  const rows = await result.json() as Tx[];
  return rows[0] ?? null;
}

async function readPendingTransactions(): Promise<Tx[]> {
  const cutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const query = new URLSearchParams({
    select: 'id,reference,type,item_id,amount,currency,status,payment_method,provider_reference,checkout_url,checkout_state,customer_email,customer_first_name,customer_last_name,customer_phone,created_at,updated_at,verified_at',
    payment_method: 'eq.Moneroo',
    status: 'eq.pending',
    provider_reference: 'not.is.null',
    updated_at: `lt.${cutoff}`,
    order: 'updated_at.asc',
    limit: '10',
  });
  const result = await fetch(`${SUPABASE_URL}/rest/v1/transactions?${query}`, {
    headers: { apikey: SERVICE_ROLE_KEY, authorization: `Bearer ${SERVICE_ROLE_KEY}`, accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  if (!result.ok) throw new Error(`database_read_${result.status}`);
  return await result.json() as Tx[];
}

function getRemoteCurrency(data: JsonRecord): string {
  const currency = data.currency;
  if (typeof currency === 'string') return currency.toUpperCase();
  if (currency && typeof currency === 'object' && !Array.isArray(currency)) {
    return String((currency as JsonRecord).code ?? '').toUpperCase();
  }
  return '';
}

async function monerooRequest(path: string, init?: RequestInit): Promise<{ response: Response; json: JsonRecord }> {
  const result = await fetch(`${MONEROO_API}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${MONEROO_SECRET_KEY}`,
      accept: 'application/json',
      ...(init?.body ? { 'content-type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(10000),
  });
  let json: JsonRecord = {};
  try {
    const parsed = await result.json();
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) json = parsed as JsonRecord;
  } catch {
    // Keep the error private; do not log the provider response body.
  }
  return { response: result, json };
}

async function verifyWithMoneroo(providerReference: string): Promise<JsonRecord> {
  const { response: remoteResponse, json } = await monerooRequest(
    `/v1/payments/${encodeURIComponent(providerReference)}/verify`,
    { method: 'GET' },
  );
  if (!remoteResponse.ok) throw new Error(`moneroo_verification_${remoteResponse.status}`);
  const data = json.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('moneroo_invalid_verification');
  const payment = data as JsonRecord;
  if (String(payment.id ?? '') !== providerReference) throw new Error('moneroo_reference_mismatch');
  return payment;
}

function safeTransaction(tx: Tx): JsonRecord {
  return {
    reference: tx.reference,
    type: tx.type,
    amount: tx.amount,
    currency: tx.currency,
    status: tx.status,
    checkout_state: tx.checkout_state,
    created_at: tx.created_at,
    verified_at: tx.verified_at,
  };
}

function validReference(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function safeCheckoutUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'checkout.moneroo.io';
  } catch {
    return false;
  }
}

function getMetadataReference(data: JsonRecord): string | null {
  const metadata = data.metadata;
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const ref = (metadata as JsonRecord).zando_transaction_reference;
  return typeof ref === 'string' ? ref : null;
}

async function applyVerified(payment: JsonRecord, transactionReference: string, eventKey: string, eventName: string): Promise<JsonRecord> {
  const providerReference = String(payment.id ?? '');
  const remoteStatus = String(payment.status ?? '').toLowerCase();
  const amount = Number(payment.amount);
  const currency = getRemoteCurrency(payment);
  if (!providerReference || !Number.isFinite(amount) || !currency) throw new Error('moneroo_invalid_verification');
  return await rpc<JsonRecord>('apply_moneroo_verified_payment', {
    p_reference: transactionReference,
    p_provider_reference: providerReference,
    p_remote_status: remoteStatus,
    p_amount: amount,
    p_currency: currency,
    p_event_key: eventKey,
    p_event_name: eventName,
  });
}

async function reconcilePendingPayments(): Promise<JsonRecord> {
  requireServerConfig();
  const transactions = await readPendingTransactions();
  const summary = { checked: 0, completed: 0, failed: 0, cancelled: 0, still_pending: 0, rejected: 0, errors: 0 };
  for (let offset = 0; offset < transactions.length; offset += 5) {
    const batch = transactions.slice(offset, offset + 5);
    const results = await Promise.allSettled(batch.map(async (tx) => {
      if (!tx.provider_reference) return { result: 'missing_provider_reference' };
      const remote = await verifyWithMoneroo(tx.provider_reference);
      const metadataReference = getMetadataReference(remote);
      if (metadataReference && metadataReference !== tx.reference) return { result: 'reference_mismatch' };
      return await applyVerified(
        remote,
        tx.reference,
        `reconcile:${tx.provider_reference}:${String(remote.status ?? 'unknown')}`,
        'payment.periodic.reconciliation',
      );
    }));
    for (const result of results) {
      summary.checked += 1;
      if (result.status === 'rejected') {
        summary.errors += 1;
        continue;
      }
      const value = result.value as JsonRecord;
      if (value.result === 'amount_or_currency_mismatch' || value.result === 'provider_reference_mismatch' || value.result === 'reference_mismatch') {
        summary.rejected += 1;
      } else if (value.status === 'completed') {
        summary.completed += 1;
      } else if (value.status === 'failed') {
        summary.failed += 1;
      } else if (value.status === 'cancelled') {
        summary.cancelled += 1;
      } else {
        summary.still_pending += 1;
      }
    }
  }
  return summary;
}

async function createOrReuseCheckout(body: JsonRecord): Promise<JsonRecord> {
  requireServerConfig();
  if (!SITE_URL) throw new Error('site_return_url_not_configured');
  let txData: JsonRecord;
  if (body.action === 'retry') {
    if (!validReference(body.reference)) throw new Error('invalid_payment_reference');
    txData = await rpc<JsonRecord>('retry_moneroo_payment', {
      p_reference: body.reference,
      p_default_currency: DEFAULT_CURRENCY,
    });
  } else {
    const type = body.serviceType;
    const itemId = body.itemId;
    const customer = body.customer;
    if (!['product_listing', 'banner_ad', 'subscription'].includes(String(type)) || typeof itemId !== 'string' || itemId.length > 80) {
      throw new Error('invalid_service_reference');
    }
    if (!customer || typeof customer !== 'object' || Array.isArray(customer)) throw new Error('invalid_customer');
    txData = await rpc<JsonRecord>('prepare_moneroo_payment', {
      p_type: type,
      p_item_id: itemId,
      p_customer: customer,
      p_default_currency: DEFAULT_CURRENCY,
    });
  }

  const reference = String(txData.reference ?? '');
  if (!validReference(reference)) throw new Error('invalid_payment_reference');
  if (txData.status === 'completed') return { status: 'completed', reference };
  if (txData.checkout_url && safeCheckoutUrl(txData.checkout_url)) {
    return { status: 'pending', reference, checkout_url: txData.checkout_url };
  }
  if (txData.checkout_state !== 'created') return { status: 'pending', reference, checkout_url: null };

  const claimed = await rpc<boolean>('claim_moneroo_checkout', { p_reference: reference });
  if (!claimed) {
    const current = await readTransaction(reference);
    if (!current) throw new Error('transaction_not_found');
    return { status: current.status, reference, checkout_url: current.checkout_url && safeCheckoutUrl(current.checkout_url) ? current.checkout_url : null };
  }

  const amount = Number(txData.amount);
  const currency = String(txData.currency ?? '').toUpperCase();
  const customer = txData.customer as JsonRecord | undefined;
  if (!Number.isInteger(amount) || amount <= 0 || !['XAF', 'XOF', 'CDF'].includes(currency) || !customer) {
    await rpc('mark_moneroo_checkout_rejected', { p_reference: reference });
    throw new Error('invalid_server_payment_configuration');
  }
  const returnUrl = new URL('/paiement/resultat', SITE_URL);
  returnUrl.searchParams.set('reference', reference);
  const apiBody = {
    amount,
    currency,
    description: `Paiement ZandoAfrica – ${String(txData.type ?? 'service')}`,
    customer: {
      first_name: String(customer.first_name ?? ''),
      last_name: String(customer.last_name ?? ''),
      email: String(customer.email ?? ''),
      ...(customer.phone ? { phone: String(customer.phone) } : {}),
    },
    return_url: returnUrl.toString(),
    metadata: {
      zando_transaction_reference: reference,
      zando_transaction_id: String(txData.id ?? ''),
      service_type: String(txData.type ?? ''),
      service_item_id: String(txData.item_id ?? ''),
    },
  };

  let providerResult: { response: Response; json: JsonRecord };
  try {
    providerResult = await monerooRequest('/v1/payments/initialize', {
      method: 'POST',
      body: JSON.stringify(apiBody),
    });
  } catch {
    await rpc('mark_moneroo_checkout_uncertain', { p_reference: reference }).catch(() => undefined);
    return { status: 'pending', reference, checkout_url: null };
  }

  if (providerResult.response.status !== 201) {
    if (providerResult.response.status >= 400 && providerResult.response.status < 500 && ![408, 429].includes(providerResult.response.status)) {
      await rpc('mark_moneroo_checkout_rejected', { p_reference: reference });
      return { status: 'pending', checkout_state: 'rejected', reference, checkout_url: null };
    }
    await rpc('mark_moneroo_checkout_uncertain', { p_reference: reference }).catch(() => undefined);
    return { status: 'pending', reference, checkout_url: null };
  }

  const data = providerResult.json.data;
  const payment = data && typeof data === 'object' && !Array.isArray(data) ? data as JsonRecord : {};
  const providerReference = String(payment.id ?? '');
  const checkoutUrl = payment.checkout_url;
  if (!providerReference || !safeCheckoutUrl(checkoutUrl)) {
    await rpc('mark_moneroo_checkout_uncertain', { p_reference: reference }).catch(() => undefined);
    return { status: 'pending', reference, checkout_url: null };
  }
  const stored = await rpc<boolean>('complete_moneroo_checkout', {
    p_reference: reference,
    p_provider_reference: providerReference,
    p_checkout_url: checkoutUrl,
  }).catch(() => false);
  if (!stored) return { status: 'pending', reference, checkout_url: null };
  return { status: 'pending', reference, checkout_url: checkoutUrl };
}

async function checkPayment(body: JsonRecord): Promise<JsonRecord> {
  requireServerConfig();
  if (!validReference(body.reference)) throw new Error('invalid_payment_reference');
  const tx = await readTransaction(body.reference);
  if (!tx) throw new Error('transaction_not_found');
  if (tx.status === 'completed') return safeTransaction(tx);

  let providerReference = tx.provider_reference;
  if (!providerReference && typeof body.paymentId === 'string' && body.paymentId.length <= 128) {
    const remote = await verifyWithMoneroo(body.paymentId);
    if (getMetadataReference(remote) !== tx.reference) throw new Error('payment_reference_mismatch');
    providerReference = body.paymentId;
  }
  if (!providerReference) return { ...safeTransaction(tx), verification: 'not_yet_available' };

  const remote = await verifyWithMoneroo(providerReference);
  const metadataReference = getMetadataReference(remote);
  if (metadataReference && metadataReference !== tx.reference) throw new Error('payment_reference_mismatch');
  const applied = await applyVerified(remote, tx.reference, `verify:${providerReference}:${String(remote.status ?? 'unknown')}`, 'payment.status.verified');
  const updated = await readTransaction(tx.reference);
  if (!updated) throw new Error('transaction_not_found');
  if (applied.result === 'amount_or_currency_mismatch' || applied.result === 'provider_reference_mismatch') {
    return { ...safeTransaction(updated), verification: 'mismatch' };
  }
  return { ...safeTransaction(updated), verification: 'confirmed' };
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function verifyWebhookSignature(rawBody: string, signature: string): Promise<boolean> {
  if (!MONEROO_WEBHOOK_SECRET || !signature) return false;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(MONEROO_WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody)));
  const expected = bytesToHex(digest).toLowerCase();
  const received = signature.trim().toLowerCase();
  if (expected.length !== received.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i += 1) mismatch |= expected.charCodeAt(i) ^ received.charCodeAt(i);
  return mismatch === 0;
}

async function receiveWebhook(request: Request, rawBody: string): Promise<Response> {
  requireServerConfig();
  if (!MONEROO_WEBHOOK_SECRET) return errorResponse('Webhook non configuré', 503);
  const signature = request.headers.get('X-Moneroo-Signature') ?? '';
  if (!(await verifyWebhookSignature(rawBody, signature))) return errorResponse('Signature invalide', 403);

  let payload: JsonRecord;
  try {
    const parsed = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('invalid');
    payload = parsed as JsonRecord;
  } catch {
    return errorResponse('Notification invalide', 400);
  }
  const hookData = payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)
    ? payload.data as JsonRecord : {};
  const providerReference = String(hookData.id ?? '');
  if (!providerReference || providerReference.length > 128) return errorResponse('Référence invalide', 400);
  const eventName = String(payload.event ?? 'payment.unknown').slice(0, 100);
  if (!eventName.startsWith('payment.')) return response({ received: true, processed: false }, 200);

  const processing = processVerifiedWebhook(providerReference, eventName).catch((error) => {
    const message = error instanceof Error ? error.message : 'unknown_error';
    console.error('moneroo_webhook_processing_failed', { code: message.split('_').slice(0, 3).join('_') });
  });
  // Moneroo requires a 200 response within three seconds; keep provider verification off the ACK path.
  EdgeRuntime.waitUntil(processing);
  return response({ received: true }, 200);
}

async function processVerifiedWebhook(providerReference: string, eventName: string): Promise<void> {
  const remote = await verifyWithMoneroo(providerReference);
  if (String(remote.id ?? '') !== providerReference) throw new Error('moneroo_reference_mismatch');
  const transactionReference = getMetadataReference(remote);
  let tx: Tx | null = null;
  if (transactionReference && validReference(transactionReference)) tx = await readTransaction(transactionReference);
  if (!tx) tx = await readByProviderReference(providerReference);
  if (!tx) return; // A valid but uncorrelated webhook cannot activate any service.

  const result = await applyVerified(
    remote,
    tx.reference,
    `webhook:${providerReference}:${String(remote.status ?? 'unknown')}`,
    eventName,
  );
  if (result.result === 'amount_or_currency_mismatch' || result.result === 'provider_reference_mismatch') {
    console.error('moneroo_webhook_rejected_payment', { reason: result.result });
  }
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get('origin');
  const url = new URL(request.url);
  const webhookRoute = url.pathname.endsWith('/webhook');

  if (!webhookRoute && origin && !ALLOWED_ORIGINS.has(origin)) return errorResponse('Origine non autorisée', 403);
  if (!webhookRoute && request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'access-control-allow-origin': origin ?? '',
        'access-control-allow-methods': 'POST, OPTIONS',
        'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info',
        'access-control-max-age': '86400',
        vary: 'Origin',
      },
    });
  }

  try {
    if (webhookRoute) {
      if (request.method !== 'POST') return errorResponse('Méthode non autorisée', 405);
      const rawBody = await request.text();
      if (new TextEncoder().encode(rawBody).length > MAX_BODY_BYTES) return errorResponse('Notification trop volumineuse', 413);
      return await receiveWebhook(request, rawBody);
    }
    if (request.method !== 'POST') return errorResponse('Méthode non autorisée', 405, origin);

    const body = await parseJson(request);
    const action = String(body.action ?? 'create');
    if (action === 'reconcile') {
      const authorization = request.headers.get('authorization') ?? '';
      if (!MONEROO_SECRET_KEY || authorization !== `Bearer ${MONEROO_SECRET_KEY}`) {
        return errorResponse('Non autorisé', 403, origin);
      }
      return response(await reconcilePendingPayments(), 200, origin);
    }
    if (action === 'create' || action === 'retry') {
      const result = await createOrReuseCheckout({ ...body, action });
      return response(result, 200, origin);
    }
    if (action === 'verify') return response(await checkPayment(body), 200, origin);
    return errorResponse('Action non prise en charge', 400, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error';
    const status = message === 'payment_backend_not_configured' || message === 'site_return_url_not_configured' ? 503
      : message === 'transaction_not_found' ? 404
      : message === 'payment_reference_mismatch' ? 409
      : message === 'request_too_large' ? 413
      : 400;
    // Do not log provider responses, customer data, signatures, or secret values.
    console.error('moneroo_payment_request_failed', { code: message.split('_').slice(0, 3).join('_') });
    return errorResponse(status === 503 ? 'Le paiement en ligne n’est pas configuré.' : 'Impossible de traiter cette opération de paiement.', status, origin);
  }
});
