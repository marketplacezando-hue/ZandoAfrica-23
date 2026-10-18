import React, { useState } from 'react';
import { useZando } from '@/contexts/ZandoContext';
import { zandoApi } from '@/services/zandoApi';
import {
  Palette,
  ToggleLeft,
  ToggleRight,
  Save,
  CheckCircle2,
  DollarSign,
  Globe,
  Sliders
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export const AdminSettings: React.FC = () => {
  const { settings, refreshSettings, countries } = useZando();

  // Mode du site State
  const [siteMode, setSiteMode] = useState<'free' | 'paid'>(settings.site_mode?.mode || 'paid');

  // Custom Colors matching Image 4:
  // Couleur principale #00A651, Couleur secondaire #FF8A00, Boutons #2563EB
  const [primaryColor, setPrimaryColor] = useState('#00A651');
  const [secondaryColor, setSecondaryColor] = useState('#FF8A00');
  const [buttonColor, setButtonColor] = useState('#2563EB');
  const [saving, setSaving] = useState(false);

  // Pricing State
  const [durations, setDurations] = useState(settings.pricing_durations || [
    { days: 7, price: 250, currency: 'FCFA', label: '7 jours' },
    { days: 14, price: 500, currency: 'FCFA', label: '14 jours / 1 mois' },
    { days: 30, price: 1000, currency: 'FCFA', label: '30 jours / 2 mois' }
  ]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      // 1. Update site mode
      await zandoApi.updatePlatformSetting('site_mode', { mode: siteMode });

      // 2. Update pricing
      await zandoApi.updatePlatformSetting('pricing_durations', durations);

      // 3. Save Theme Colors
      await zandoApi.updatePlatformSetting('theme', {
        ...settings.theme,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        button_color: buttonColor
      });

      // Apply CSS variables dynamically to the document root
      document.documentElement.style.setProperty('--primary', primaryColor);
      document.documentElement.style.setProperty('--secondary', secondaryColor);

      await refreshSettings();
      toast.success('Paramètres et personnalisation enregistrés avec succès !');
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">Paramètres Généraux & Personnalisation</h1>
        <p className="text-xs text-muted-foreground">
          Gérez le mode économique du site, personnalisez les couleurs de la charte graphique et configurez les tarifs.
        </p>
      </div>

      {/* 1. Mode du Site matching Image 3 & 4 */}
      <div className="bg-card rounded-2xl border border-border p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h3 className="font-extrabold text-base text-foreground">Mode Économique du Site</h3>
            <p className="text-xs text-muted-foreground">
              Basculez entre le Mode Gratuit (toutes les publications offertes) et le Mode Payant standard.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-bold ${siteMode === 'free' ? 'text-emerald-600' : 'text-amber-600'}`}>
              {siteMode === 'free' ? 'Mode Gratuit Actif' : 'Mode Payant Actif'}
            </span>
            <button
              type="button"
              onClick={() => setSiteMode(siteMode === 'free' ? 'paid' : 'free')}
              className="cursor-pointer text-primary"
            >
              {siteMode === 'free' ? (
                <ToggleLeft className="w-8 h-8 text-muted-foreground" />
              ) : (
                <ToggleRight className="w-8 h-8 text-primary" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Personnalisation des Couleurs matching Image 4 */}
      <div className="bg-card rounded-2xl border border-border p-6 shadow-xs space-y-5">
        <h3 className="font-extrabold text-base text-foreground flex items-center gap-2">
          <Palette className="w-5 h-5 text-primary" />
          <span>Personnalisation de la Charte Graphique</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground">Couleur Principale</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={primaryColor}
                onChange={e => setPrimaryColor(e.target.value)}
                className="w-10 h-10 rounded-xl cursor-pointer border border-border p-0.5"
              />
              <Input
                value={primaryColor}
                onChange={e => setPrimaryColor(e.target.value)}
                className="font-mono text-xs uppercase"
              />
            </div>
            <span className="text-[10px] text-muted-foreground">Ex. : Vert Zando (#00A651)</span>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground">Couleur Secondaire (Accent)</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={secondaryColor}
                onChange={e => setSecondaryColor(e.target.value)}
                className="w-10 h-10 rounded-xl cursor-pointer border border-border p-0.5"
              />
              <Input
                value={secondaryColor}
                onChange={e => setSecondaryColor(e.target.value)}
                className="font-mono text-xs uppercase"
              />
            </div>
            <span className="text-[10px] text-muted-foreground">Ex. : Orange Chaud (#FF8A00)</span>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground">Boutons & Actions Spéciales</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={buttonColor}
                onChange={e => setButtonColor(e.target.value)}
                className="w-10 h-10 rounded-xl cursor-pointer border border-border p-0.5"
              />
              <Input
                value={buttonColor}
                onChange={e => setButtonColor(e.target.value)}
                className="font-mono text-xs uppercase"
              />
            </div>
            <span className="text-[10px] text-muted-foreground">Ex. : Bleu Interactif (#2563EB)</span>
          </div>
        </div>

        {/* Live Preview Card */}
        <div className="p-4 rounded-xl border bg-muted/30 space-y-2">
          <span className="text-xs font-bold text-muted-foreground">Aperçu en temps réel :</span>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              style={{ backgroundColor: primaryColor }}
              className="px-4 py-2 rounded-xl text-white text-xs font-bold shadow-xs"
            >
              Bouton Principal
            </button>
            <button
              type="button"
              style={{ backgroundColor: secondaryColor }}
              className="px-4 py-2 rounded-xl text-white text-xs font-bold shadow-xs"
            >
              Bouton Accent
            </button>
            <button
              type="button"
              style={{ backgroundColor: buttonColor }}
              className="px-4 py-2 rounded-xl text-white text-xs font-bold shadow-xs"
            >
              Action Spéciale
            </button>
          </div>
        </div>
      </div>

      {/* 3. Tarifs et Durées de publication */}
      <div className="bg-card rounded-2xl border border-border p-6 shadow-xs space-y-4">
        <h3 className="font-extrabold text-base text-foreground flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-emerald-600" />
          <span>Tarifs de Publication des Produits</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {durations.map((d, index) => (
            <div key={d.days} className="p-4 rounded-xl border space-y-2 bg-muted/20">
              <div className="font-bold text-xs text-foreground">{d.label}</div>
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">Prix (FCFA)</label>
                <Input
                  type="number"
                  value={d.price}
                  onChange={e => {
                    const newD = [...durations];
                    newD[index].price = Number(e.target.value);
                    setDurations(newD);
                  }}
                  className="h-9 font-bold"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSaveSettings}
          disabled={saving}
          className="h-11 px-8 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-2 cursor-pointer shadow-md"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Enregistrement...' : 'Enregistrer les modifications'}</span>
        </Button>
      </div>
    </div>
  );
};
