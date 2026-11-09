import React, { useEffect, useState } from 'react';
import { Check, LayoutPanelTop, Palette, Save, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useZando } from '@/contexts/ZandoContext';
import { zandoApi } from '@/services/zandoApi';
import type { PlatformSettings } from '@/types/zando';

const defaultTheme: PlatformSettings['theme'] = {
  primary_color: '#00A651', secondary_color: '#FF8A00', button_color: '#2563EB',
  sidebar_color: '#092C22', card_style: 'rounded-xl', card_color: '#FFFFFF',
  surface_color: '#F3F6F8', border_color: '#E2E8F0', background_color: '#F8FAFC',
  text_color: '#0F172A', font_family: 'system', button_scale: 1, button_text_scale: 1,
  density: 'comfortable'
};

const fonts = [
  { value: 'system', label: 'Système (recommandée)' },
  { value: 'Inter', label: 'Inter' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Trebuchet MS', label: 'Trebuchet MS' }
];

const colorControls: Array<{ key: keyof PlatformSettings['theme']; label: string }> = [
  { key: 'primary_color', label: 'Couleur principale' },
  { key: 'secondary_color', label: 'Couleur secondaire' },
  { key: 'button_color', label: 'Couleur des boutons' },
  { key: 'sidebar_color', label: 'Menu d’administration' },
  { key: 'background_color', label: 'Arrière-plan général' },
  { key: 'text_color', label: 'Texte principal' },
  { key: 'card_color', label: 'Cartes et panneaux' },
  { key: 'surface_color', label: 'Sections et surfaces' },
  { key: 'border_color', label: 'Bordures' }
];

const isHexColor = (value: unknown): value is string => typeof value === 'string' && /^#[\da-f]{6}$/i.test(value);

export const AdminPersonalization: React.FC = () => {
  const { settings, refreshSettings } = useZando();
  const [theme, setTheme] = useState<PlatformSettings['theme']>({ ...defaultTheme, ...settings.theme });
  const [saving, setSaving] = useState(false);

  useEffect(() => setTheme({ ...defaultTheme, ...settings.theme }), [settings.theme]);

  const updateTheme = (key: keyof PlatformSettings['theme'], value: string | number) => {
    setTheme(previous => ({ ...previous, [key]: value }));
  };

  const save = async () => {
    if (colorControls.some(({ key }) => !isHexColor(theme[key]))) {
      toast.error('Vérifiez le format hexadécimal de toutes les couleurs.');
      return;
    }
    const buttonScale = Number(theme.button_scale ?? 1);
    const buttonTextScale = Number(theme.button_text_scale ?? 1);
    if (!Number.isFinite(buttonScale) || buttonScale < 0.8 || buttonScale > 1.25
      || !Number.isFinite(buttonTextScale) || buttonTextScale < 0.85 || buttonTextScale > 1.2) {
      toast.error('Les tailles doivent rester entre 80 % et 125 % pour préserver le responsive.');
      return;
    }
    setSaving(true);
    try {
      const ok = await zandoApi.updatePlatformSetting('theme', { ...theme });
      if (!ok) throw new Error('Les paramètres n’ont pas pu être enregistrés.');
      await refreshSettings();
      toast.success('Personnalisation enregistrée et appliquée immédiatement.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold text-foreground">Personnalisation</h1>
        <p className="mt-1 text-sm text-muted-foreground">Adaptez l’apparence générale de ZandoAfrica. Les réglages sont appliqués sur ordinateur, tablette et téléphone.</p>
      </header>

      <section className="space-y-5 rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-6">
        <h2 className="flex items-center gap-2 font-extrabold"><Palette className="h-5 w-5 text-primary" />Couleurs du site</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {colorControls.map(({ key, label }) => (
            <label key={key} className="space-y-2 text-xs font-bold">
              <span>{label}</span>
              <span className="flex min-w-0 items-center gap-2">
                <input type="color" value={isHexColor(theme[key]) ? theme[key] : '#000000'} onChange={event => updateTheme(key, event.target.value)} className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-border bg-background p-1" aria-label={label} />
                <Input value={String(theme[key] ?? '')} onChange={event => updateTheme(key, event.target.value)} className="min-w-0 font-mono text-xs uppercase" maxLength={7} />
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 font-extrabold"><Type className="h-5 w-5 text-primary" />Texte et police</h2>
          <label className="block space-y-2 text-xs font-bold">Police d’écriture
            <select value={theme.font_family} onChange={event => updateTheme('font_family', event.target.value)} className="mt-2 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm font-semibold">
              {fonts.map(font => <option key={font.value} value={font.value}>{font.label}</option>)}
            </select>
          </label>
          <label className="block space-y-2 text-xs font-bold">Densité de l’interface
            <select value={theme.density} onChange={event => updateTheme('density', event.target.value)} className="mt-2 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm font-semibold">
              <option value="compact">Compacte</option><option value="comfortable">Confortable</option><option value="spacious">Aérée</option>
            </select>
          </label>
        </div>
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 font-extrabold"><LayoutPanelTop className="h-5 w-5 text-primary" />Boutons et éléments</h2>
          <label className="block space-y-2 text-xs font-bold">Taille des boutons : {Math.round(Number(theme.button_scale) * 100)} %
            <input type="range" min="0.8" max="1.25" step="0.05" value={theme.button_scale} onChange={event => updateTheme('button_scale', Number(event.target.value))} className="mt-2 w-full accent-primary" />
          </label>
          <label className="block space-y-2 text-xs font-bold">Texte des boutons : {Math.round(Number(theme.button_text_scale) * 100)} %
            <input type="range" min="0.85" max="1.2" step="0.05" value={theme.button_text_scale} onChange={event => updateTheme('button_text_scale', Number(event.target.value))} className="mt-2 w-full accent-primary" />
          </label>
          <label className="block space-y-2 text-xs font-bold">Arrondi des cartes
            <select value={theme.card_style} onChange={event => updateTheme('card_style', event.target.value)} className="mt-2 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm font-semibold">
              <option value="rounded-none">Carré</option><option value="rounded-lg">Discret</option><option value="rounded-xl">Moderne</option><option value="rounded-2xl">Très arrondi</option>
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-6">
        <h2 className="mb-4 font-extrabold">Aperçu responsive</h2>
        <div className="rounded-xl border p-4 sm:p-6" style={{ backgroundColor: theme.surface_color, borderColor: theme.border_color, fontFamily: theme.font_family === 'system' ? 'system-ui, sans-serif' : theme.font_family }}>
          <div className="mx-auto flex max-w-xl flex-wrap items-center justify-between gap-3 rounded-xl p-4" style={{ backgroundColor: theme.card_color }}>
            <div><p className="text-xs font-bold" style={{ color: theme.text_color }}>Exemple d’élément</p><p className="text-xs opacity-70" style={{ color: theme.text_color }}>Proportion conservée sur mobile</p></div>
            <button type="button" className="zando-theme-button inline-flex items-center gap-2 rounded-xl font-bold text-white" style={{ backgroundColor: theme.button_color }}><Check className="h-4 w-4" />Action</button>
          </div>
        </div>
      </section>

      <div className="sticky bottom-3 z-10 flex justify-end rounded-xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur-sm">
        <Button type="button" onClick={() => void save()} disabled={saving} className="w-full gap-2 sm:w-auto"><Save className="h-4 w-4" />{saving ? 'Enregistrement…' : 'Enregistrer les modifications'}</Button>
      </div>
    </div>
  );
};
