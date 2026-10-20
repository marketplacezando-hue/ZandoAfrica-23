import React, { useEffect, useState } from 'react';
import { useZando } from '@/contexts/ZandoContext';
import { zandoApi } from '@/services/zandoApi';
import {
  Palette,
  ToggleLeft,
  ToggleRight,
  Save,
  DollarSign,
  Megaphone,
  Users,
  FileText,
  ShieldCheck,
  RefreshCw,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import type { PlatformSettings } from '@/types/zando';

type DigitalBookEvent = {
  id: string;
  action: string;
  status: number;
  code: string | null;
  elapsed_ms: number | null;
  product_id: string | null;
  digital_book_id: string | null;
  transaction_id: string | null;
  created_at: string;
  total_count: number;
};

const defaultTheme: PlatformSettings['theme'] = {
  primary_color: '#00A651',
  secondary_color: '#FF8A00',
  button_color: '#2563EB',
  sidebar_color: '#092C22',
  card_style: 'rounded-xl',
  card_color: '#FFFFFF',
  surface_color: '#F3F6F8',
  border_color: '#E2E8F0'
};

const defaultDurations: PlatformSettings['pricing_durations'] = [
  { days: 30, price: 1000, currency: 'FCFA', label: '1 mois' },
  { days: 60, price: 2000, currency: 'FCFA', label: '2 mois' },
  { days: 90, price: 3000, currency: 'FCFA', label: '3 mois' }
];

const defaultAdPricing: PlatformSettings['ad_pricing'] = [
  { months: 1, price: 30000, currency: 'FCFA', name: 'Bannière VIP 1 Mois' },
  { months: 2, price: 55000, currency: 'FCFA', name: 'Bannière VIP 2 Mois' },
  { months: 3, price: 75000, currency: 'FCFA', name: 'Bannière VIP 3 Mois' }
];

const defaultPlans: PlatformSettings['subscription_plans'] = [
  { months: 1, price: 15000, currency: 'FCFA', limit: 30, name: 'Formule Starter (1 Mois)' },
  { months: 2, price: 28000, currency: 'FCFA', limit: 70, name: 'Formule Pro (2 Mois)' },
  { months: 3, price: 40000, currency: 'FCFA', limit: 120, name: 'Formule VIP (3 Mois)' }
];

const aboutDefault = "La plateforme moderne de petites annonces commerciales qui connecte acheteurs et vendeurs à travers toute l'Afrique.";
const securityDefault = 'Vérifiez les articles en personne avant tout paiement. Ne transférez jamais d’argent à l’avance à un vendeur que vous ne connaissez pas et signalez toute annonce suspecte.';
const isHexColor = (value: string) => /^#[\da-f]{6}$/i.test(value);

export const AdminSettings: React.FC = () => {
  const { settings, refreshSettings } = useZando();
  const [siteMode, setSiteMode] = useState<'free' | 'paid'>(settings.site_mode?.mode || 'paid');
  const [theme, setTheme] = useState<PlatformSettings['theme']>({ ...defaultTheme, ...settings.theme });
  const [durations, setDurations] = useState<PlatformSettings['pricing_durations']>(defaultDurations);
  const [adPricing, setAdPricing] = useState<PlatformSettings['ad_pricing']>(settings.ad_pricing || defaultAdPricing);
  const [subscriptionPlans, setSubscriptionPlans] = useState<PlatformSettings['subscription_plans']>(settings.subscription_plans || defaultPlans);
  const [aboutContent, setAboutContent] = useState(settings.about_content || aboutDefault);
  const [securityContent, setSecurityContent] = useState(settings.security_content || securityDefault);
  const [digitalPdfMaxMiB, setDigitalPdfMaxMiB] = useState(settings.digital_pdf_max_bytes / (1024 * 1024));
  const [digitalBookEvents, setDigitalBookEvents] = useState<DigitalBookEvent[]>([]);
  const [digitalEventsLoading, setDigitalEventsLoading] = useState(false);
  const [digitalEventsError, setDigitalEventsError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSiteMode(settings.site_mode?.mode || 'paid');
    setTheme({ ...defaultTheme, ...settings.theme });
    const configured = settings.pricing_durations?.filter(item => [30, 60, 90].includes(item.days)) || [];
    setDurations(configured.length === 3 ? configured : defaultDurations.map(item => ({
      ...item,
      price: settings.pricing_durations?.find(current => current.days === item.days)?.price ?? item.price
    })));
    setAdPricing(settings.ad_pricing?.length ? settings.ad_pricing : defaultAdPricing);
    setSubscriptionPlans(settings.subscription_plans?.length ? settings.subscription_plans : defaultPlans);
    setAboutContent(settings.about_content || aboutDefault);
    setSecurityContent(settings.security_content || securityDefault);
    setDigitalPdfMaxMiB(Math.min(20, Math.max(1, settings.digital_pdf_max_bytes / (1024 * 1024))));
  }, [settings]);

  const loadDigitalBookEvents = async () => {
    setDigitalEventsLoading(true);
    setDigitalEventsError(null);
    try {
      const { data, error } = await supabase.rpc('admin_list_digital_book_events', {
        p_limit: 25,
        p_offset: 0,
        p_product_id: null
      });
      if (error) throw error;
      setDigitalBookEvents((data || []) as DigitalBookEvent[]);
    } catch {
      setDigitalEventsError('Historique indisponible. Vérifiez les migrations numériques et les droits administrateur.');
      setDigitalBookEvents([]);
    } finally {
      setDigitalEventsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (Object.values(theme).some(value => typeof value === 'string' && value.startsWith('#') && !isHexColor(value))) {
      toast.error('Vérifiez le format hexadécimal des couleurs.');
      return;
    }
    if ([...durations, ...adPricing, ...subscriptionPlans].some(item => !Number.isFinite(item.price) || item.price < 0)) {
      toast.error('Les prix doivent être des nombres positifs ou nuls.');
      return;
    }
    if (subscriptionPlans.some(item => !Number.isInteger(item.limit) || item.limit < 0) || new Set(subscriptionPlans.map(item => item.months)).size !== subscriptionPlans.length) {
      toast.error('Vérifiez les limites et les durées des abonnements (durées uniques de 1 à 3 mois).');
      return;
    }
    if (!Number.isFinite(digitalPdfMaxMiB) || digitalPdfMaxMiB < 1 || digitalPdfMaxMiB > 20) {
      toast.error('La taille maximale du PDF doit être comprise entre 1 et 20 Mio.');
      return;
    }

    setSaving(true);
    try {
      const normalizedDurations = durations.map((item, index) => ({
        ...item,
        days: [30, 60, 90][index],
        label: `${index + 1} mois`,
        currency: 'FCFA'
      }));
      const updates: Array<[string, unknown]> = [
        ['site_mode', { mode: siteMode }],
        ['pricing_durations', normalizedDurations],
        ['theme', { ...theme }],
        ['ad_pricing', adPricing.map(item => ({ ...item, currency: 'FCFA' }))],
        ['subscription_plans', subscriptionPlans.map(item => ({ ...item, currency: 'FCFA' }))],
        ['about_content', aboutContent.trim()],
        ['security_content', securityContent.trim()],
        ['digital_pdf_max_bytes', Math.round(digitalPdfMaxMiB * 1024 * 1024)]
      ];
      const results = await Promise.all(updates.map(([key, value]) => zandoApi.updatePlatformSetting(key, value)));
      if (results.some(result => !result)) {
        throw new Error('Au moins un réglage n’a pas pu être enregistré par la base de données.');
      }
      await refreshSettings();
      toast.success('Les réglages du site ont été enregistrés.');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const updateTheme = (key: keyof PlatformSettings['theme'], value: string) => {
    setTheme(previous => ({ ...previous, [key]: value }));
  };

  const updateDurationPrice = (index: number, price: number) => {
    setDurations(previous => previous.map((item, itemIndex) => itemIndex === index ? { ...item, price } : item));
  };

  const updateAd = (index: number, patch: Partial<PlatformSettings['ad_pricing'][number]>) => {
    setAdPricing(previous => previous.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  };

  const updatePlan = (index: number, patch: Partial<PlatformSettings['subscription_plans'][number]>) => {
    setSubscriptionPlans(previous => previous.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  };

  const colorControls: Array<{ key: keyof PlatformSettings['theme']; label: string }> = [
    { key: 'primary_color', label: 'Couleur principale' },
    { key: 'secondary_color', label: 'Couleur d’accent' },
    { key: 'button_color', label: 'Boutons et actions' },
    { key: 'card_color', label: 'Cartes et encadrements' },
    { key: 'surface_color', label: 'Blocs et sections' },
    { key: 'border_color', label: 'Bordures' }
  ];

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">Paramètres du site</h1>
        <p className="text-sm text-muted-foreground">Les modifications sont enregistrées dans les réglages de la plateforme et appliquées au site public.</p>
      </div>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xs">
        <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h2 className="font-extrabold">Mode économique</h2>
            <p className="text-xs text-muted-foreground">Choisissez si les demandes de publication sont gratuites ou tarifées.</p>
          </div>
          <button type="button" onClick={() => setSiteMode(siteMode === 'free' ? 'paid' : 'free')} className="flex items-center gap-2 text-sm font-bold text-primary" aria-pressed={siteMode === 'free'}>
            {siteMode === 'free' ? <ToggleLeft className="h-8 w-8" /> : <ToggleRight className="h-8 w-8" />}
            {siteMode === 'free' ? 'Gratuit' : 'Payant'}
          </button>
        </div>
      </section>

      <section className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-xs">
        <h2 className="flex items-center gap-2 font-extrabold"><Palette className="h-5 w-5 text-primary" />Personnalisation des couleurs</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {colorControls.map(({ key, label }) => (
            <label key={key} className="space-y-2 text-xs font-bold">
              <span>{label}</span>
              <span className="flex items-center gap-3">
                <input type="color" value={theme[key]} onChange={event => updateTheme(key, event.target.value)} className="h-10 w-12 cursor-pointer rounded-lg border border-border bg-background p-1" aria-label={label} />
                <Input value={theme[key]} onChange={event => updateTheme(key, event.target.value)} className="font-mono text-xs uppercase" maxLength={7} />
              </span>
            </label>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 rounded-xl border p-4" style={{ backgroundColor: theme.surface_color, borderColor: theme.border_color }}>
          <div className="rounded-xl border p-4 text-sm font-semibold" style={{ backgroundColor: theme.card_color, borderColor: theme.border_color }}>Aperçu carte</div>
          <button type="button" className="rounded-xl px-4 py-2 text-sm font-bold text-white" style={{ backgroundColor: theme.button_color }}>Bouton</button>
          <span className="rounded-full px-3 py-2 text-sm font-bold text-white" style={{ backgroundColor: theme.primary_color }}>Couleur principale</span>
          <span className="rounded-full px-3 py-2 text-sm font-bold text-white" style={{ backgroundColor: theme.secondary_color }}>Accent</span>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xs">
        <h2 className="flex items-center gap-2 font-extrabold"><DollarSign className="h-5 w-5 text-emerald-600" />Tarifs de publication des annonces</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {durations.map((item, index) => (
            <label key={item.days} className="space-y-2 rounded-xl border border-border bg-muted/20 p-4 text-xs font-bold">
              <span>{index + 1} mois ({item.days} jours)</span>
              <Input type="number" min="0" step="1" value={item.price} onChange={event => updateDurationPrice(index, Number(event.target.value))} aria-label={`Tarif de publication ${index + 1} mois`} />
              <span className="text-muted-foreground">FCFA — période d’expiration correspondante</span>
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xs">
        <h2 className="flex items-center gap-2 font-extrabold"><FileText className="h-5 w-5 text-primary" />Limite des livres numériques</h2>
        <p className="text-xs text-muted-foreground">La limite du serveur s’applique à l’original et prévaut sur le contrôle du navigateur. Maximum technique actuel : 20 Mio.</p>
        <label className="block max-w-xs space-y-2 text-xs font-bold">
          <span>Taille maximale du PDF (Mio)</span>
          <Input type="number" min="1" max="20" step="1" value={digitalPdfMaxMiB} onChange={event => setDigitalPdfMaxMiB(Number(event.target.value))} aria-label="Taille maximale d’un livre PDF en Mio" />
        </label>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-extrabold"><AlertCircle className="h-5 w-5 text-amber-600" />Erreurs d’import et accès aux livres</h2>
            <p className="mt-1 text-xs text-muted-foreground">Journal privé des opérations; aucun fichier, email, jeton ni clé R2 n’est affiché.</p>
          </div>
          <Button type="button" variant="outline" onClick={() => void loadDigitalBookEvents()} disabled={digitalEventsLoading} className="gap-2 self-start">
            {digitalEventsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Charger l’historique
          </Button>
        </div>
        {digitalEventsError && <p role="status" className="text-sm text-amber-700">{digitalEventsError}</p>}
        {!digitalEventsError && digitalBookEvents.length === 0 && <p className="text-sm text-muted-foreground">Aucun événement chargé.</p>}
        {digitalBookEvents.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground"><tr>
                <th className="p-3">Date</th><th className="p-3">Opération</th><th className="p-3">Résultat</th><th className="p-3">Code</th><th className="p-3">Produit</th><th className="p-3">Durée</th>
              </tr></thead>
              <tbody>{digitalBookEvents.map(event => (
                <tr key={event.id} className="border-t border-border">
                  <td className="p-3 whitespace-nowrap">{new Date(event.created_at).toLocaleString('fr-FR')}</td>
                  <td className="p-3">{event.action}</td>
                  <td className={`p-3 font-semibold ${event.status >= 400 ? 'text-rose-600' : 'text-emerald-700'}`}>{event.status}</td>
                  <td className="p-3 font-mono">{event.code || '—'}</td>
                  <td className="p-3 font-mono">{event.product_id ? `${event.product_id.slice(0, 8)}…` : '—'}</td>
                  <td className="p-3">{event.elapsed_ms ?? '—'} ms</td>
                </tr>
              ))}</tbody>
            </table>
            <p className="p-3 text-[11px] text-muted-foreground">Affichage des {digitalBookEvents.length} événements les plus récents.</p>
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xs">
        <h2 className="flex items-center gap-2 font-extrabold"><Megaphone className="h-5 w-5 text-blue-600" />Tarifs des publicités</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {adPricing.map((item, index) => (
            <div key={`ad-${index}`} className="space-y-2 rounded-xl border border-border bg-muted/20 p-4">
              <label className="block space-y-1 text-xs font-bold"><span>Nom de la formule</span><Input value={item.name} onChange={event => updateAd(index, { name: event.target.value })} /></label>
              <label className="block space-y-1 text-xs font-bold"><span>Durée (mois)</span><Input type="number" min="1" max="3" step="1" value={item.months} readOnly /></label>
              <label className="block space-y-1 text-xs font-bold"><span>Prix (FCFA)</span><Input type="number" min="0" step="1" value={item.price} onChange={event => updateAd(index, { price: Number(event.target.value) })} /></label>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xs">
        <h2 className="flex items-center gap-2 font-extrabold"><Users className="h-5 w-5 text-primary" />Tarifs et paramètres des abonnements</h2>
        <p className="text-xs text-muted-foreground">Les formules disponibles par le traitement actuel vont de 1 à 3 mois. Les nouvelles demandes utiliseront les valeurs enregistrées.</p>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {subscriptionPlans.map((plan, index) => (
            <div key={`plan-${index}`} className="space-y-2 rounded-xl border border-border bg-muted/20 p-4">
              <label className="block space-y-1 text-xs font-bold"><span>Nom de la formule</span><Input value={plan.name} onChange={event => updatePlan(index, { name: event.target.value })} /></label>
              <label className="block space-y-1 text-xs font-bold"><span>Durée</span><select value={plan.months} onChange={event => updatePlan(index, { months: Number(event.target.value) })} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"><option value={1}>1 mois</option><option value={2}>2 mois</option><option value={3}>3 mois</option></select></label>
              <label className="block space-y-1 text-xs font-bold"><span>Limite d’annonces</span><Input type="number" min="0" step="1" value={plan.limit} onChange={event => updatePlan(index, { limit: Number(event.target.value) })} /></label>
              <label className="block space-y-1 text-xs font-bold"><span>Prix (FCFA)</span><Input type="number" min="0" step="1" value={plan.price} onChange={event => updatePlan(index, { price: Number(event.target.value) })} /></label>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xs">
        <h2 className="flex items-center gap-2 font-extrabold"><FileText className="h-5 w-5 text-primary" />Contenu « À propos »</h2>
        <p className="text-xs text-muted-foreground">Ce texte est affiché sur la page publique « À propos ».</p>
        <Textarea value={aboutContent} onChange={event => setAboutContent(event.target.value)} rows={5} maxLength={5000} aria-label="Contenu À propos" />
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xs">
        <h2 className="flex items-center gap-2 font-extrabold"><ShieldCheck className="h-5 w-5 text-emerald-600" />Contenu « Sécurité »</h2>
        <p className="text-xs text-muted-foreground">Ces recommandations sont affichées sur la page publique « À propos ».</p>
        <Textarea value={securityContent} onChange={event => setSecurityContent(event.target.value)} rows={5} maxLength={5000} aria-label="Contenu Sécurité" />
      </section>

      <div className="flex justify-end">
        <Button onClick={handleSaveSettings} disabled={saving} className="h-11 rounded-full px-8 font-bold">
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
        </Button>
      </div>
    </div>
  );
};
