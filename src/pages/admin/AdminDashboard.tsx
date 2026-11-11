import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { zandoApi } from '@/services/zandoApi';
import type { Product, TrafficEvent, AdminDashboardStats } from '@/types/zando';
import {
  Package,
  Megaphone,
  CreditCard,
  DollarSign,
  TrendingUp,
  Users,
  Eye,
  MessageCircle,
  PlusCircle,
  KeyRound,
  Settings,
  ArrowUpRight,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CountryFlag } from '@/components/common/CountryFlag';

export const AdminDashboard: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [trafficEvents, setTrafficEvents] = useState<TrafficEvent[]>([]);
  const [dashboardStats, setDashboardStats] = useState<AdminDashboardStats | null>(null);
  const [dashboardError, setDashboardError] = useState(false);
  const [loading, setLoading] = useState(true);

  const [revenuePeriod, setRevenuePeriod] = useState<'7d' | '30d' | 'year'>('30d');

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [prods, stats, events] = await Promise.all([
          zandoApi.getProducts({ status: 'published', limit: 5 }),
          zandoApi.getAdminDashboardStats(),
          zandoApi.getTrafficEvents(100)
        ]);

        setProducts(prods);
        setDashboardStats(stats);
        setTrafficEvents(events);
        setDashboardError(false);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setDashboardError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const totalProductsCount = dashboardStats?.publishedProducts ?? 0;
  const activeBannersCount = dashboardStats?.activeBanners ?? 0;
  const activeSubscriptionsCount = dashboardStats?.activeSubscriptions ?? 0;
  const successfulPaymentsCount = dashboardStats?.successfulPayments ?? 0;
  const totalRevenue = dashboardStats?.completedRevenue ?? 0;
  const transactions = dashboardStats?.completedTransactions ?? [];

  const periodDays = revenuePeriod === '7d' ? 7 : 30;
  const periodStart = Date.now() - periodDays * 24 * 60 * 60 * 1000;
  const revenueData = revenuePeriod === '7d'
    ? Array.from({ length: 7 }, (_, index) => {
        const date = new Date(Date.now() - (6 - index) * 24 * 60 * 60 * 1000);
        const key = date.toISOString().slice(0, 10);
        return { label: date.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', ''), amount: transactions.filter(t => t.created_at.slice(0, 10) === key).reduce((sum, t) => sum + Number(t.amount || 0), 0) };
      })
    : Array.from({ length: 4 }, (_, index) => {
        const start = periodStart + index * 7 * 24 * 60 * 60 * 1000;
        const end = index === 3 ? Date.now() : start + 7 * 24 * 60 * 60 * 1000;
        return { label: `Sem. ${index + 1}`, amount: transactions.filter(t => { const time = new Date(t.created_at).getTime(); return time >= start && time < end; }).reduce((sum, t) => sum + Number(t.amount || 0), 0) };
      });

  const maxRevenue = Math.max(1, ...revenueData.map(d => d.amount));

  const countryDistribution = dashboardStats?.countryDistribution ?? [];
  const eventLabel = (eventType: string) => ({
    whatsapp_click: 'Clic Contact WhatsApp',
    call_click: 'Appel téléphonique',
    product_view: 'Consultation d’une annonce',
    product_publish: 'Nouvelle annonce publiée'
  }[eventType] || 'Interaction enregistrée');

  return (
    <div className="space-y-8">
      {dashboardError && (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Certaines statistiques ne sont pas disponibles pour le moment. Les données affichées correspondent uniquement aux résultats confirmés par le serveur.
        </div>
      )}
      {/* Top Welcome Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Tableau de bord
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Aperçu en temps réel des performances, annonces, paiements et utilisateurs de Zando Africa.
          </p>
        </div>

        {/* Action Shortcuts */}
        <div className="flex items-center gap-2">
          <Link to="/publier" target="_blank">
            <Button size="sm" className="rounded-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold gap-1.5 text-xs">
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Publier annonce</span>
            </Button>
          </Link>
          <Link to="/admin/codes-promo">
            <Button size="sm" variant="outline" className="rounded-full font-bold gap-1.5 text-xs">
              <KeyRound className="w-3.5 h-3.5 text-amber-500" />
              <span>Nouveau code promo</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Row matching Image 3 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Produits */}
        <div className="bg-card rounded-2xl border border-border p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Produits publiés
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-foreground">
              {loading ? '…' : totalProductsCount.toLocaleString('fr-FR')}
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Résultat réel en base de données
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <Package className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Publicités */}
        <div className="bg-card rounded-2xl border border-border p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Publicités actives
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-foreground">
              {loading ? '…' : activeBannersCount.toLocaleString('fr-FR')}
            </div>
            <span className="text-[11px] text-blue-600 font-semibold flex items-center gap-1">
              <Eye className="w-3 h-3" />
              Bannières VIP en tête
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <Megaphone className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Abonnements */}
        <div className="bg-card rounded-2xl border border-border p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Abonnements actifs
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-foreground">
              {loading ? '…' : activeSubscriptionsCount.toLocaleString('fr-FR')}
            </div>
            <span className="text-[11px] text-purple-600 font-semibold flex items-center gap-1">
              <Users className="w-3 h-3" />
              Formules 1, 2 et 3 mois
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Paiements */}
        <div className="bg-card rounded-2xl border border-border p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Paiements réussis
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-emerald-600">
              {loading ? '…' : successfulPaymentsCount.toLocaleString('fr-FR')}
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {new Intl.NumberFormat('fr-FR').format(totalRevenue)} FCFA encaissés
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Charts Section matching Image 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Chart: Évolution des revenus */}
        <div className="lg:col-span-8 bg-card rounded-2xl border border-border p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4">
            <div>
              <h3 className="font-extrabold text-base text-foreground">
                Évolution des revenus (FCFA)
              </h3>
              <p className="text-xs text-muted-foreground">
                Revenus des publications payantes, abonnements et bannières publicitaires
              </p>
            </div>
            {/* Period Selector */}
            <div className="flex items-center gap-1 bg-muted p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setRevenuePeriod('7d')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  revenuePeriod === '7d' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                7 jours
              </button>
              <button
                type="button"
                onClick={() => setRevenuePeriod('30d')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  revenuePeriod === '30d' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                30 jours
              </button>
            </div>
          </div>

          {/* Bar Chart Visualizer */}
          <div className="h-64 flex items-end gap-3 sm:gap-6 pt-6 px-2">
            {revenueData.map((d, i) => {
              const heightPercent = Math.round((d.amount / maxRevenue) * 100);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="text-[10px] font-bold text-muted-foreground group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100 truncate">
                    {Math.round(d.amount / 1000)}k
                  </div>
                  <div
                    style={{ height: `${Math.max(15, heightPercent)}%` }}
                    className="w-full max-w-[48px] bg-gradient-to-t from-primary/80 to-primary rounded-t-xl group-hover:from-emerald-500 group-hover:to-emerald-400 transition-all shadow-xs"
                  />
                  <span className="text-xs font-semibold text-muted-foreground">
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Chart: Répartition par pays matching Image 3 */}
        <div className="lg:col-span-4 bg-card rounded-2xl border border-border p-6 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-base text-foreground">
              Répartition par pays
            </h3>
            <p className="text-xs text-muted-foreground">
              Produits publiés par pays
            </p>
          </div>

          {/* Donut / Stacked Progress Indicator */}
          <div className="space-y-3 py-2">
            {countryDistribution.length > 0 ? countryDistribution.map(c => (
              <div key={c.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5">
                    <span>{c.flag}</span>
                    <span className="text-foreground">{c.name}</span>
                  </span>
                  <span className="font-bold" style={{ color: c.color }}>{c.percent}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${c.percent}%`, backgroundColor: c.color }}
                  />
                </div>
              </div>
            )) : <p className="py-8 text-center text-xs text-muted-foreground">Aucune annonce publiée avec un pays renseigné.</p>}
          </div>

          <div className="p-3 rounded-xl bg-muted/40 border text-[11px] text-muted-foreground flex items-center justify-between">
            <span>Marché principal : <strong>Afrique Centrale & Ouest</strong></span>
            <Link to="/admin/parametres" className="text-primary font-bold hover:underline">
              Gérer les pays →
            </Link>
          </div>
        </div>
      </div>

      {/* Lower Section Grid: Produits récents & Traçabilité */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Produits Récents (7 cols) */}
        <div className="lg:col-span-7 bg-card rounded-2xl border border-border p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-extrabold text-base text-foreground">
              Derniers produits soumis
            </h3>
            <Link to="/admin/produits" className="text-xs font-bold text-primary hover:underline">
              Tout voir ({totalProductsCount.toLocaleString('fr-FR')})
            </Link>
          </div>

          <div className="divide-y divide-border/60">
            {products.slice(0, 5).map(p => (
              <div key={p.id} className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={p.photos?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200'}
                    alt={p.title}
                    className="w-12 h-12 rounded-xl object-cover bg-muted shrink-0"
                  />
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs sm:text-sm text-foreground truncate">{p.title}</h4>
                    <p className="text-[11px] text-muted-foreground">
                      {p.seller_name} • {p.city} {p.countries?.id && <CountryFlag countryId={p.countries.id} className="ml-1 align-middle" />}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs sm:text-sm font-extrabold text-rose-600">
                    {new Intl.NumberFormat('fr-FR').format(p.price)} {p.currency}
                  </div>
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    En ligne
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Activité récente & Traçabilité (5 cols) */}
        <div className="lg:col-span-5 bg-card rounded-2xl border border-border p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-extrabold text-base text-foreground">Interactions récentes</h3>
            <Link to="/admin/tracabilite" className="text-xs font-bold text-primary hover:underline">
              Traçabilité →
            </Link>
          </div>

          <div className="space-y-3">
            {trafficEvents.slice(0, 3).map(event => (
              <div key={event.id} className="p-3 rounded-xl bg-muted/40 border border-border flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-foreground">{eventLabel(event.event_type)}</div>
                  <div className="text-[11px] text-muted-foreground">{new Date(event.created_at).toLocaleString('fr-FR')}</div>
                </div>
              </div>
            ))}
            {!trafficEvents.length && <p className="py-8 text-center text-xs text-muted-foreground">Aucune interaction enregistrée.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};
