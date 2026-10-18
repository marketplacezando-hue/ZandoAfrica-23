import React, { useState, useEffect } from 'react';
import { zandoApi } from '@/services/zandoApi';
import type { TrafficEvent } from '@/types/zando';
import { Activity, MessageCircle, Phone, Megaphone, PlusCircle, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export const AdminTraceability: React.FC = () => {
  const [events, setEvents] = useState<TrafficEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('ALL');

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      const data = await zandoApi.getTrafficEvents(100);
      setEvents(data);
      setLoading(false);
    };
    fetchEvents();
  }, []);

  const filtered = typeFilter === 'ALL'
    ? events
    : events.filter(e => e.event_type === typeFilter);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'whatsapp_click':
        return <MessageCircle className="w-4 h-4 text-emerald-600" />;
      case 'call_click':
        return <Phone className="w-4 h-4 text-blue-600" />;
      case 'banner_click':
        return <Megaphone className="w-4 h-4 text-purple-600" />;
      case 'post_ad_start':
      case 'post_ad_complete':
        return <PlusCircle className="w-4 h-4 text-amber-600" />;
      default:
        return <Activity className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getEventLabel = (type: string) => {
    switch (type) {
      case 'whatsapp_click': return 'Clic Contact WhatsApp';
      case 'call_click': return 'Appel Téléphonique Direct';
      case 'banner_click': return 'Clic Bannière Publicitaire';
      case 'post_ad_start': return 'Début Publication Annonce';
      case 'post_ad_complete': return 'Annonce Publiée avec Succès';
      case 'page_view': return 'Consultation de Page';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">Traçabilité des Clics & Interactions</h1>
        <p className="text-xs text-muted-foreground">
          Journal d'événements en direct : mises en relation WhatsApp, appels déclenchés et parcours de publication.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex gap-2">
        {['ALL', 'whatsapp_click', 'call_click', 'post_ad_complete', 'banner_click'].map(t => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
              typeFilter === t
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-foreground hover:bg-muted'
            }`}
          >
            {t === 'ALL' ? 'Tous les événements' : getEventLabel(t)}
          </button>
        ))}
      </div>

      {/* Events Table */}
      <div className="bg-card rounded-2xl border border-border shadow-xs overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
              <tr>
                <th className="p-3.5 whitespace-nowrap">Événement</th>
                <th className="p-3.5 whitespace-nowrap">Type d'Action</th>
                <th className="p-3.5 whitespace-nowrap">Localisation</th>
                <th className="p-3.5 whitespace-nowrap">Page / Cible</th>
                <th className="p-3.5 whitespace-nowrap">Horodatage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">Chargement des données...</td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map(e => (
                  <tr key={e.id} className="hover:bg-muted/20">
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getEventIcon(e.event_type)}
                        <span className="font-bold text-foreground">{getEventLabel(e.event_type)}</span>
                      </div>
                    </td>
                    <td className="p-3.5 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                      {e.event_type}
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      {e.country_code || 'Afrique'} {e.city ? `• ${e.city}` : ''}
                    </td>
                    <td className="p-3.5 whitespace-nowrap text-muted-foreground">
                      {e.page_path || e.item_id || '/'}
                    </td>
                    <td className="p-3.5 whitespace-nowrap text-muted-foreground">
                      {new Date(e.created_at).toLocaleString('fr-FR')}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    Aucun événement enregistré pour ce filtre.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
