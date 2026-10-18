import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useZando } from '@/contexts/ZandoContext';
import { BRAND_ASSETS } from '@/constants/brand';
import { ShieldCheck, Lock, Mail, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export const AdminLoginPage: React.FC = () => {
  const { loginAdmin, isAdminAuthenticated } = useZando();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect to /admin
  React.useEffect(() => {
    if (isAdminAuthenticated) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [isAdminAuthenticated, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!email.trim() || !password.trim()) {
      toast.error('Veuillez renseigner votre email et mot de passe administrateur.');
      setLoading(false);
      return;
    }

    try {
      const success = await loginAdmin(email, password);
      if (success) {
        toast.success('Connexion administrateur réussie !');
        navigate('/admin/dashboard', { replace: true });
      } else {
        toast.error('Identifiants invalides ou compte non autorisé.');
      }
    } catch {
      toast.error('Connexion impossible pour le moment. Réessayez plus tard.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#092C22] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl border border-white/10 p-8 space-y-6">
        <div className="text-center space-y-2">
          <img
            src={BRAND_ASSETS.logoUrl}
            alt="Zando Africa"
            className="h-10 mx-auto object-contain"
          />
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Espace d'Administration Sécurisé</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Accès réservé à l'équipe de gestion Zando Africa.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Adresse e-mail admin</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="pl-10 h-11 rounded-xl"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="pl-10 h-11 rounded-xl font-mono"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md cursor-pointer mt-4"
          >
            {loading ? 'Connexion en cours...' : 'Se connecter au Tableau de bord'}
          </Button>
        </form>

        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Retour au site public</span>
          </button>
        </div>
      </div>
    </div>
  );
};
