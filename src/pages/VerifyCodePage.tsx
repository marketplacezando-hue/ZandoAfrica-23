import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { zandoApi } from '@/services/zandoApi';
import { KeyRound, Search, CheckCircle2, AlertCircle, ArrowLeft, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const VerifyCodePage: React.FC = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    tested: boolean;
    valid: boolean;
    promoCode?: { expires_at: string | null; uses_count: number; max_uses: number };
    reason?: string;
  }>({ tested: false, valid: false });

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !phone.trim()) return;

    setLoading(true);
    const res = await zandoApi.verifyPromoCode(code, phone);
    setResult({
      tested: true,
      valid: res.valid,
      promoCode: res.promoCode,
      reason: res.reason
    });
    setLoading(false);
  };

  return (
    <div className="max-w-xl mx-auto py-10 px-4 sm:px-6 space-y-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Retour</span>
      </button>

      <div className="space-y-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold uppercase">
          <KeyRound className="w-3.5 h-3.5 text-amber-600" />
          <span>Vérification de code</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">
          Vérifier mon code promo
        </h1>
        <p className="text-xs text-muted-foreground">
          Consultez le solde de publications restantes et la date de validité de votre code promotionnel.
        </p>
      </div>

      <form onSubmit={handleVerify} className="bg-card rounded-2xl border border-border p-6 space-y-4 shadow-sm">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">Code promotionnel *</label>
          <Input
            placeholder="Ex. : VIP-XXXXXX"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            className="h-11 rounded-xl font-mono uppercase font-bold"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">Votre numéro de téléphone lié *</label>
          <Input
            placeholder="Ex. : +242 06 123 4567"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            className="h-11 rounded-xl"
            required
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-2 cursor-pointer shadow-xs"
        >
          <Search className="w-4 h-4" />
          <span>{loading ? 'Vérification...' : 'Vérifier la validité'}</span>
        </Button>
      </form>

      {/* Result Card */}
      {result.tested && (
        <div className="space-y-4 animate-in fade-in">
          {result.valid && result.promoCode ? (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 rounded-2xl p-6 space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-base">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Code promotionnel Valide & Actif !</span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 text-xs text-emerald-900 dark:text-emerald-200">
                <div className="bg-white/60 dark:bg-emerald-900/40 p-3 rounded-xl">
                  <span className="text-muted-foreground block text-[11px]">Publications restantes</span>
                  <span className="text-lg font-bold text-emerald-700">
                    {result.promoCode.max_uses - result.promoCode.uses_count} / {result.promoCode.max_uses}
                  </span>
                </div>
                <div className="bg-white/60 dark:bg-emerald-900/40 p-3 rounded-xl">
                  <span className="text-muted-foreground block text-[11px]">Date d'expiration</span>
                  <span className="text-xs font-bold">
                    {result.promoCode.expires_at
                      ? new Date(result.promoCode.expires_at).toLocaleDateString('fr-FR')
                      : 'Sans expiration'}
                  </span>
                </div>
              </div>
              <Button
                onClick={() => navigate('/publier')}
                className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 mt-2"
              >
                Utiliser ce code pour publier une annonce
              </Button>
            </div>
          ) : (
            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 rounded-2xl p-6 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
              <h3 className="font-bold text-rose-900 dark:text-rose-200">Code Invalide ou Incompatible</h3>
              <p className="text-xs text-rose-700 dark:text-rose-300">{result.reason}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
