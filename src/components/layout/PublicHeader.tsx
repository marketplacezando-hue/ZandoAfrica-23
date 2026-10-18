import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useZando } from '@/contexts/ZandoContext';
import { BRAND_ASSETS } from '@/constants/brand';
import { ADMIN_LOGIN_GESTURE_EVENT, handleZandoLogoClick } from '@/lib/zandoLogoGesture';
import { CountryFlag } from '@/components/common/CountryFlag';
import {
  Menu,
  ShoppingBag,
  Megaphone,
  CreditCard,
  KeyRound,
  Heart,
  Info,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Lock,
  Mail,
  Flame
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export const PublicHeader: React.FC = () => {
  const {
    countries,
    selectedCountry,
    setSelectedCountry,
    selectedCurrency,
    setSelectedCurrency,
    favorites,
    loginAdmin
  } = useZando();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  const navigate = useNavigate();
  const currencies = ['XAF', 'CDF', 'XOF'];

  React.useEffect(() => {
    const showAdminLogin = () => setAdminModalOpen(true);
    window.addEventListener(ADMIN_LOGIN_GESTURE_EVENT, showAdminLogin);
    return () => window.removeEventListener(ADMIN_LOGIN_GESTURE_EVENT, showAdminLogin);
  }, []);

  const handleLogoClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    handleZandoLogoClick(event, navigate);
  };

  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoading(true);

    if (!adminEmail.trim() || !adminPassword.trim()) {
      toast.error('Veuillez renseigner votre email et mot de passe administrateur.');
      setAdminLoading(false);
      return;
    }

    try {
      const success = await loginAdmin(adminEmail, adminPassword);
      if (success) {
        toast.success('Connexion administrateur réussie !');
        setAdminModalOpen(false);
        navigate('/admin/dashboard');
      } else {
        toast.error('Accès refusé. Identifiants administrateur non valides.');
      }
    } catch {
      toast.error('Connexion impossible pour le moment. Réessayez plus tard.');
    } finally {
      setAdminLoading(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b bg-card/95 backdrop-blur shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Le logo revient à l'accueil; quatre clics successifs ouvrent la connexion admin. */}
          <Link
            to="/"
            onClick={handleLogoClick}
            className="flex items-center shrink-0 cursor-pointer select-none transition-transform active:scale-95 group relative"
            title="Zando Africa — Retour à l'accueil"
          >
            <img
              src={BRAND_ASSETS.logoUrl}
              alt={BRAND_ASSETS.brandName}
              className="h-10 sm:h-12 w-auto object-contain"
            />
          </Link>

          {/* Center / Country & Currency Dropdowns (Sober original style without extra frames - Requirement 1) */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Country Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-muted text-xs sm:text-sm font-medium transition-colors cursor-pointer text-foreground"
                >
                  {selectedCountry ? <CountryFlag countryId={selectedCountry.id} className="h-[18px] w-[27px]" /> : <span aria-hidden="true">🌍</span>}
                  <span className="hidden sm:inline max-w-[120px] truncate text-foreground">{selectedCountry?.name || 'Pays'}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1">
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Sélectionner votre pays</div>
                {countries.map(c => (
                  <DropdownMenuItem
                    key={c.id}
                    onClick={() => setSelectedCountry(c)}
                    className={`flex items-center justify-between cursor-pointer py-2 px-2.5 rounded-md ${
                      selectedCountry?.id === c.id ? 'bg-primary/10 text-primary font-medium' : ''
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <CountryFlag countryId={c.id} className="h-[18px] w-[27px]" />
                      <span className="text-sm">{c.name}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">{c.currency}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Right Menu Navigation: Favorites removed from direct bar, deep vibrant frames - Requirements 1 & 4 */}
          <div className="flex items-center gap-2 sm:gap-3">

            {/* Bouton "Passer une pub VIP" (Deep Blue Frame) */}
            <Link
              to="/passer-pub"
              className="hidden lg:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border-2 border-blue-600 bg-blue-600/10 hover:bg-blue-600/20 text-blue-900 dark:text-blue-200 text-xs sm:text-sm font-bold transition-all shadow-xs active:scale-95"
            >
              <Megaphone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>PUB VIP</span>
            </Link>

            {/* Bouton "Publier mon annonce" (SANS bouton "+", Requirement 1) */}
            <Link
              to="/publier"
              className="inline-flex items-center justify-center px-3.5 py-2 sm:px-4 sm:py-2 rounded-xl border-2 border-orange-600 bg-orange-600 hover:bg-orange-700 text-white text-xs sm:text-sm font-extrabold shadow-sm transition-all hover:shadow-md active:scale-95 shrink-0"
            >
              <span>Publier</span>
              <span className="hidden md:inline">&nbsp;mon annonce</span>
            </Link>

            {/* Bouton Menu Principal / Tiroir (Deep Emerald Frame) */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border-2 border-emerald-700 bg-emerald-700/10 hover:bg-emerald-700/20 text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm font-extrabold cursor-pointer transition-all shadow-xs active:scale-95"
                >
                  <Menu className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                  <span className="hidden sm:inline">Menu</span>
                </button>
              </SheetTrigger>
              <SheetContent
                side="right"
                style={{ width: 'min(84vw, 780px)', maxWidth: 780 }}
                className="flex h-full flex-col gap-0 overflow-hidden border-l border-emerald-100/80 bg-[#fcfdfd] p-0 text-slate-900 shadow-2xl [&>button:first-of-type]:right-5 [&>button:first-of-type]:top-5 [&>button:first-of-type]:z-30 [&>button:first-of-type]:flex [&>button:first-of-type]:h-10 [&>button:first-of-type]:w-10 [&>button:first-of-type]:items-center [&>button:first-of-type]:justify-center [&>button:first-of-type]:rounded-full [&>button:first-of-type]:border-2 [&>button:first-of-type]:border-emerald-600 [&>button:first-of-type]:bg-white [&>button:first-of-type]:p-0 [&>button:first-of-type]:opacity-100 [&>button:first-of-type]:text-slate-900 [&>button:first-of-type]:shadow-sm [&>button:first-of-type>svg]:h-5 [&>button:first-of-type>svg]:w-5"
              >
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
                  <SheetHeader className="shrink-0 gap-0 border-b-0 px-6 pb-1 pt-6 text-left">
                    <div className="flex items-start">
                      <Link
                        to="/"
                        onClick={event => {
                          setMobileMenuOpen(false);
                          handleLogoClick(event);
                        }}
                        aria-label="Zando Africa — Retour à l'accueil"
                        className="inline-flex min-w-0 max-w-[calc(100%-4rem)] flex-1"
                      >
                        <img src={BRAND_ASSETS.logoUrl} alt="Zando Africa" className="h-12 max-w-full object-contain sm:h-14 lg:h-16" />
                      </Link>
                    </div>
                    <SheetTitle className="mt-4 flex min-w-0 items-center gap-3 text-sm font-medium text-slate-600 sm:mt-5 sm:text-base lg:text-lg">
                      <span aria-hidden="true" className="h-8 w-1 shrink-0 rounded-full bg-emerald-600" />
                      <span className="min-w-0 break-words">Menu de navigation Zando Africa</span>
                    </SheetTitle>
                  </SheetHeader>

                  <nav aria-label="Menu de navigation" className="space-y-2.5 px-4 pb-4 pt-4 sm:space-y-3.5 sm:px-6 sm:pb-5 sm:pt-5 lg:space-y-3 lg:px-7 lg:pb-4 lg:pt-4">
                    <Link
                      to="/publier"
                      onClick={() => setMobileMenuOpen(false)}
                      className="group relative flex min-h-[68px] items-center gap-2.5 overflow-hidden rounded-[18px] border border-amber-200 bg-[#fffaf1] px-3 py-2.5 shadow-[0_6px_18px_rgba(20,30,55,0.06)] transition-all duration-200 before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:bg-amber-500 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 sm:min-h-[76px] sm:gap-3 sm:px-4 sm:py-3 lg:min-h-[84px]"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md sm:h-11 sm:w-11 lg:h-12 lg:w-12">
                        <ShoppingBag className="h-5 w-5 lg:h-6 lg:w-6" />
                      </span>
                      <span className="min-w-0 flex-1 break-words text-sm font-bold leading-tight text-slate-900 sm:text-base lg:text-lg">1. Publier un produit</span>
                      <ChevronRight aria-hidden="true" className="h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200 group-hover:translate-x-1" />
                    </Link>

                    <Link
                      to="/passer-pub"
                      onClick={() => setMobileMenuOpen(false)}
                      className="group relative flex min-h-[68px] items-center gap-2.5 overflow-hidden rounded-[18px] border border-blue-200 bg-[#f4f9ff] px-3 py-2.5 shadow-[0_6px_18px_rgba(20,30,55,0.06)] transition-all duration-200 before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:bg-blue-600 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:min-h-[76px] sm:gap-3 sm:px-4 sm:py-3 lg:min-h-[84px]"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-md sm:h-11 sm:w-11 lg:h-12 lg:w-12">
                        <Megaphone className="h-5 w-5 lg:h-6 lg:w-6" />
                      </span>
                      <span className="min-w-0 flex-1 break-words text-sm font-bold leading-tight text-slate-900 sm:text-base lg:text-lg">2. Passer une PUB VIP</span>
                      <ChevronRight aria-hidden="true" className="h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200 group-hover:translate-x-1" />
                    </Link>

                    <Link
                      to="/favoris"
                      onClick={() => setMobileMenuOpen(false)}
                      className="group relative flex min-h-[68px] items-center gap-2.5 overflow-hidden rounded-[18px] border border-rose-200 bg-[#fff5f7] px-3 py-2.5 shadow-[0_6px_18px_rgba(20,30,55,0.06)] transition-all duration-200 before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:bg-rose-500 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 sm:min-h-[76px] sm:gap-3 sm:px-4 sm:py-3 lg:min-h-[84px]"
                    >
                      <span className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br from-pink-400 to-rose-600 text-white shadow-md sm:h-11 sm:w-11 lg:h-12 lg:w-12">
                          <Heart className="h-5 w-5 fill-white/15 lg:h-6 lg:w-6" />
                        </span>
                        <span className="min-w-0 break-words text-sm font-bold leading-tight text-slate-900 sm:text-base lg:text-lg">3. Mes Favoris</span>
                      </span>
                      {favorites.length > 0 && (
                        <span className="inline-flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full bg-rose-600 px-1.5 text-xs font-black tabular-nums text-white shadow-sm">
                          {favorites.length}
                        </span>
                      )}
                      <ChevronRight aria-hidden="true" className="h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200 group-hover:translate-x-1" />
                    </Link>

                    <Link
                      to="/abonnement"
                      onClick={() => setMobileMenuOpen(false)}
                      className="group relative flex min-h-[68px] items-center gap-2.5 overflow-hidden rounded-[18px] border border-emerald-200 bg-[#f1fbf6] px-3 py-2.5 shadow-[0_6px_18px_rgba(20,30,55,0.06)] transition-all duration-200 before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:bg-emerald-600 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 sm:min-h-[76px] sm:gap-3 sm:px-4 sm:py-3 lg:min-h-[84px]"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br from-emerald-400 to-emerald-700 text-white shadow-md sm:h-11 sm:w-11 lg:h-12 lg:w-12">
                        <CreditCard className="h-5 w-5 lg:h-6 lg:w-6" />
                      </span>
                      <span className="min-w-0 flex-1 break-words text-sm font-bold leading-tight text-slate-900 sm:text-base lg:text-lg">4. Abonnement Vendeur</span>
                      <ChevronRight aria-hidden="true" className="h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200 group-hover:translate-x-1" />
                    </Link>

                    <Link
                      to="/verifier-code"
                      onClick={() => setMobileMenuOpen(false)}
                      className="group relative flex min-h-[68px] items-center gap-2.5 overflow-hidden rounded-[18px] border border-violet-200 bg-[#f8f5ff] px-3 py-2.5 shadow-[0_6px_18px_rgba(20,30,55,0.06)] transition-all duration-200 before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:bg-violet-600 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 sm:min-h-[76px] sm:gap-3 sm:px-4 sm:py-3 lg:min-h-[84px]"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br from-purple-400 to-violet-700 text-white shadow-md sm:h-11 sm:w-11 lg:h-12 lg:w-12">
                        <KeyRound className="h-5 w-5 lg:h-6 lg:w-6" />
                      </span>
                      <span className="min-w-0 flex-1 break-words text-sm font-bold leading-tight text-slate-900 sm:text-base lg:text-lg">5. Vérifier mon Code Promo</span>
                      <ChevronRight aria-hidden="true" className="h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200 group-hover:translate-x-1" />
                    </Link>

                    <Link
                      to="/a-propos"
                      onClick={() => setMobileMenuOpen(false)}
                      className="group relative flex min-h-[68px] items-center gap-2.5 overflow-hidden rounded-[18px] border border-teal-200 bg-[#f0fbf9] px-3 py-2.5 shadow-[0_6px_18px_rgba(20,30,55,0.06)] transition-all duration-200 before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:bg-teal-500 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 sm:min-h-[76px] sm:gap-3 sm:px-4 sm:py-3 lg:min-h-[84px]"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br from-teal-400 to-teal-700 text-white shadow-md sm:h-11 sm:w-11 lg:h-12 lg:w-12">
                        <Info className="h-5 w-5 lg:h-6 lg:w-6" />
                      </span>
                      <span className="min-w-0 flex-1 break-words text-sm font-bold leading-tight text-slate-900 sm:text-base lg:text-lg">6. À propos &amp; Sécurité</span>
                      <ChevronRight aria-hidden="true" className="h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200 group-hover:translate-x-1" />
                    </Link>
                  </nav>
                </div>

                <div className="relative isolate shrink-0 overflow-hidden border-t border-emerald-100 bg-white px-5 pb-12 pt-4 sm:px-7 sm:pt-5">
                  <div className="relative z-10 mx-auto flex max-w-full items-center justify-center gap-2.5 text-center text-xs font-medium text-slate-600 sm:text-sm">
                    <ShieldCheck aria-hidden="true" className="h-5 w-5 shrink-0 text-emerald-600 sm:h-6 sm:w-6" />
                    <span className="min-w-0 break-words">Zando Africa <span className="px-1">•</span> Marketplace panafricaine</span>
                  </div>
                  <svg aria-hidden="true" viewBox="0 0 800 60" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-0 h-10 w-full">
                    <path d="M0 0 C145 18 235 48 390 42 C555 35 660 13 800 0 V60 H0 Z" fill="#F59E0B" />
                    <path d="M0 16 C150 38 250 58 400 48 C565 38 690 24 800 11 V60 H0 Z" fill="#16A34A" />
                  </svg>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* La connexion admin n'apparaît qu'après le geste secret sur le logo. */}
      <Dialog open={adminModalOpen} onOpenChange={setAdminModalOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md p-6 bg-card border border-border shadow-2xl rounded-2xl">
          <DialogHeader className="text-center space-y-2 relative">
            {/* Logo ZandoAfrica correctly displayed (Requirement 2) */}
            <div className="flex justify-center pb-1">
              <img
                src={BRAND_ASSETS.logoUrl}
                alt="Zando Africa"
                className="h-10 sm:h-12 w-auto object-contain"
              />
            </div>
            <div className="inline-flex items-center justify-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider mx-auto">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Portail d'Administration</span>
            </div>
            <DialogTitle className="text-lg sm:text-xl font-bold text-foreground text-center">
              Connexion Sécurisée
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground text-center">
              Veuillez saisir vos identifiants d'administration pour accéder au panneau de contrôle Zando Africa.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAdminLoginSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-primary" />
                Adresse Email Administrateur
              </label>
              <Input
                type="email"
                required
                placeholder="admin@zando.com"
                value={adminEmail}
                onChange={e => setAdminEmail(e.target.value)}
                className="h-11 text-sm bg-background rounded-xl"
                autoComplete="off"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-primary" />
                Mot de Passe
              </label>
              <Input
                type="password"
                required
                placeholder="••••••••••••"
                value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)}
                className="h-11 text-sm bg-background rounded-xl"
                autoComplete="off"
              />
            </div>

            {/* Requirement 2: Fermer button next to Se connecter REMOVED, only Se connecter kept */}
            <div className="pt-2">
              <Button
                type="submit"
                disabled={adminLoading}
                className="w-full h-11 text-sm bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold rounded-xl shadow-md cursor-pointer transition-transform active:scale-98"
              >
                {adminLoading ? 'Vérification en cours...' : 'Se connecter'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
