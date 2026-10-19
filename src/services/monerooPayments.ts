import { supabase } from '@/db/supabase';

export type MonerooServiceType = 'product_listing' | 'banner_ad' | 'subscription';
export type MonerooCustomer = {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
};
export type MonerooPaymentResult = {
  reference: string;
  type?: MonerooServiceType;
  amount?: number;
  currency?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  checkout_url?: string | null;
  checkout_state?: string;
  created_at?: string;
  verification?: string;
};

type PaymentResponse = {
  data: MonerooPaymentResult | null;
  error?: string;
};

async function invokePayment(body: Record<string, unknown>): Promise<PaymentResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('moneroo-payments', { body });
    if (error || !data || typeof data !== 'object') {
      return { data: null, error: 'Le service de paiement est momentanément indisponible.' };
    }
    if (typeof data.error === 'string') {
      return { data: null, error: data.error };
    }
    return { data: data as MonerooPaymentResult };
  } catch {
    return { data: null, error: 'Impossible de joindre le service de paiement. Votre demande reste enregistrée.' };
  }
}

export function createMonerooPayment(input: {
  serviceType: MonerooServiceType;
  itemId: string;
  customer: MonerooCustomer;
}): Promise<PaymentResponse> {
  return invokePayment({ action: 'create', ...input });
}

export function verifyMonerooPayment(reference: string, paymentId?: string | null): Promise<PaymentResponse> {
  return invokePayment({ action: 'verify', reference, ...(paymentId ? { paymentId } : {}) });
}

export function retryMonerooPayment(reference: string): Promise<PaymentResponse> {
  return invokePayment({ action: 'retry', reference });
}
