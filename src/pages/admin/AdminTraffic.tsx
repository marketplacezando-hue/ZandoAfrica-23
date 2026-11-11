import React, { useEffect, useMemo, useState } from 'react';
import { zandoApi } from '@/services/zandoApi';
import type { Country, TrafficEvent } from '@/types/zando';
import { Globe, Smartphone, Users } from 'lucide-react';

type CountryRow = { name: string; flag: string; count: number };
type DeviceRow = { name: string; count: number; color: string };

const percentage = (value: number, total: number) => total ? Math.round((value / total) * 100) : 0;

export const AdminTraffic: React.FC = () => {
  const [events, setEvents] = useState<TrafficEvent[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const fetchTraffic = async () => {
      setLoading(true);
      try {
        const [trafficEvents, countryCatalog] = await Promise.all([
          zandoApi.getTrafficEvents(5000),
          zandoApi.getCountries()
        ]);
        setEvents(trafficEvents);
        setCountries(countryCatalog);
        setLoadError(false);
      } catch (error) {
        console.error('Error fetching traffic data:', error);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };
    void fetchTraffic();
  }, []);

  const pageViews = useMemo(() => events.filter(event => event.event_type === 'page_view'), [events]);
  const measuredEvents = pageViews.length ? pageViews : events;
  const visitorIds = useMemo(() => new Set(
    events
      .map(event => event.metadata?.visitor_id)
      .filter((visitorId): visitorId is string => typeof visitorId === 'string' && visitorId.length > 0)
  ), [events]);
  const countryCatalog = useMemo(() => new Map(countries.map(country => [country.id.toUpperCase(), country])), [countries]);

  const countriesBreakdown = useMemo<CountryRow[]>(() => {
    const counts = new Map<string, CountryRow>();
    measuredEvents.forEach(event => {
      const code = event.country_code?.trim().toUpperCase() || 'UNKNOWN';
      const catalogCountry = countryCatalog.get(code);
      const name = catalogCountry?.name || (code === 'UNKNOWN' ? 'Pays non renseigné' : code);
      const current = counts.get(code) || { name, flag: catalogCountry?.flag_emoji || '🌍', count: 0 };
      current.count += 1;
      counts.set(code, current);
    });
    return Array.from(counts.values()).sort((a, b) => b.count - a.count);
  }, [countryCatalog, measuredEvents]);

  const devicesBreakdown = useMemo<DeviceRow[]>(() => {
    const definitions = [
      { key: 'mobile', name: 'Smartphones mobiles', color: 'bg-blue-600' },
      { key: 'desktop', name: 'Ordinateurs et PC', color: 'bg-emerald-600' },
      { key: 'tablet', name: 'Tablettes', color: 'bg-purple-600' }
    ];
    return definitions.map(definition => ({
      name: definition.name,
      count: measuredEvents.filter(event => (event.device_type || 'desktop').toLowerCase() === definition.key).length,
      color: definition.color
    }));
  }, [measuredEvents]);

  const totalPageViews = pageViews.length;
  const totalMeasuredEvents = measuredEvents.length;
  const mobileRate = percentage(devicesBreakdown.find(device => device.name === 'Smartphones mobiles')?.count || 0, totalMeasuredEvents);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">Visiteurs & Trafic Réel</h1>
        <p className="text-xs text-muted-foreground">
          Données calculées à partir des événements réellement enregistrés sur la plateforme.
        </p>
      </div>

      {loadError && (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Les données de trafic ne sont pas disponibles pour le moment.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-card rounded-2xl border p-5 space-y-1 shadow-xs">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Visiteurs uniques identifiés</span>
          <div className="text-3xl font-extrabold text-foreground">{loading ? '…' : visitorIds.size.toLocaleString('fr-FR')}</div>
          <span className="text-[11px] text-muted-foreground">Identifiants disponibles dans les événements</span>
        </div>

        <div className="bg-card rounded-2xl border p-5 space-y-1 shadow-xs">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Pages vues réelles</span>
          <div className="text-3xl font-extrabold text-primary">{loading ? '…' : totalPageViews.toLocaleString('fr-FR')}</div>
          <span className="text-[11px] text-muted-foreground">{events.length.toLocaleString('fr-FR')} événements chargés</span>
        </div>

        <div className="bg-card rounded-2xl border p-5 space-y-1 shadow-xs">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Taux mobile réel</span>
          <div className="text-3xl font-extrabold text-blue-600">{loading ? '…' : `${mobileRate}%`}</div>
          <span className="text-[11px] text-muted-foreground">Sur les événements avec appareil détecté</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl border p-6 space-y-4 shadow-xs">
          <h3 className="font-extrabold text-base text-foreground flex items-center gap-2">
            <Globe className="w-5 h-5 text-emerald-600" />
            <span>Répartition Géographique Réelle</span>
          </h3>
          <p className="text-xs text-muted-foreground">Tous les pays présents dans les événements sont affichés, sans filtre géographique.</p>
          <div className="space-y-3">
            {!loading && countriesBreakdown.length === 0 && <p className="py-8 text-center text-xs text-muted-foreground">Aucun pays visiteur enregistré.</p>}
            {countriesBreakdown.map(country => (
              <div key={country.name} className="flex items-center justify-between text-xs gap-3">
                <span className="flex items-center gap-2 font-semibold min-w-0">
                  <span className="text-base">{country.flag}</span>
                  <span className="truncate">{country.name}</span>
                </span>
                <span className="font-bold text-foreground whitespace-nowrap">{country.count.toLocaleString('fr-FR')} visites · {percentage(country.count, totalMeasuredEvents)}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-2xl border p-6 space-y-4 shadow-xs">
          <h3 className="font-extrabold text-base text-foreground flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-blue-600" />
            <span>Appareils utilisés réellement</span>
          </h3>
          <div className="space-y-4 pt-2">
            {devicesBreakdown.map(device => (
              <div key={device.name} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span>{device.name}</span>
                  <span className="font-bold">{device.count.toLocaleString('fr-FR')} · {percentage(device.count, totalMeasuredEvents)}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full ${device.color}`} style={{ width: `${percentage(device.count, totalMeasuredEvents)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground flex items-center gap-2">
        <Users className="h-4 w-4 shrink-0" />
        Les anciens événements ne possèdent pas tous un identifiant visiteur. Les nouveaux événements enregistrés utilisent maintenant un identifiant anonyme pour calculer les visiteurs uniques sans collecter de données personnelles.
      </div>
    </div>
  );
};
