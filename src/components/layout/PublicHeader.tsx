import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useZando } from '@/contexts/ZandoContext';
import { BRAND_ASSETS } from '@/constants/brand';
import { ADMIN_LOGIN_GESTURE_EVENT, handleZandoLogoClick } from '@/lib/zandoLogoGesture';
import { CountryFlag } from '@/components/common/CountryFlag';
import { countryCodeToFlag } from '@/lib/locale';
import {
  Menu,
  X,
  Home,
  ShoppingBag,
  Megaphone,
  CirclePlus,
  CreditCard,
  KeyRound,
  Heart,
  Info,
  ShieldCheck,
  ChevronDown,
  Search,
  Globe,
  MessageSquarePlus,
  Lock,
  Mail
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
    visitorCountry,
    favorites,
    loginAdmin
  } = useZando();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  const [manualCountrySelection, setManualCountrySelection] = useState(() => Boolean(localStorage.getItem('zando_selected_country')));
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const displayCountryCode = manualCountrySelection ? selectedCountry?.id : visitorCountry?.code || selectedCountry?.id;
  const displayCountryName = manualCountrySelection ? selectedCountry?.name || 'Pays' : visitorCountry?.name || selectedCountry?.name || 'Pays';

  React.useEffect(() => {
    const showAdminLogin = () => setAdminModalOpen(true);
    window.addEventListener(ADMIN_LOGIN_GESTURE_EVENT, showAdminLogin);
    return () => window.removeEventListener(ADMIN_LOGIN_GESTURE_EVENT, showAdminLogin);
  }, []);

  const handleLogoClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    handleZandoLogoClick(event, navigate);
  };

  const handleMenuSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = menuSearchQuery.trim();
    setMobileMenuOpen(false);
    setCountryPickerOpen(false);
    navigate(query ? `/?q=${encodeURIComponent(query)}#dernieres-annonces` : '/#dernieres-annonces');
  };

  const handleCountrySelect = (country: (typeof countries)[number]) => {
    setSelectedCountry(country);
    setManualCountrySelection(true);
    setCountryPickerOpen(false);
    setMobileMenuOpen(false);
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
      <header className="sticky top-0 z-40 w-full border-b border-emerald-100/70 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between gap-2 px-4 sm:h-20 sm:gap-4 sm:px-6 lg:px-8">
          
          {/* Le logo revient à l'accueil; quatre clics successifs ouvrent la connexion admin. */}
          <Link
            to="/"
            onClick={handleLogoClick}
              className="group relative flex shrink-0 cursor-pointer select-none items-center transition-transform active:scale-95"
            title="Zando Africa — Retour à l'accueil"
          >
            <img
              src={BRAND_ASSETS.logoUrl}
              alt={BRAND_ASSETS.brandName}
              className="h-9 w-auto object-contain sm:h-11"
            />
          </Link>

          {/* Sélecteur de pays */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Country Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-emerald-50 sm:px-2.5 sm:text-sm"
                >
                  {!manualCountrySelection && visitorCountry ? <span className="text-base leading-none" aria-label={`Drapeau de ${visitorCountry.name}`}>{countryCodeToFlag(visitorCountry.code)}</span> : displayCountryCode ? <CountryFlag countryId={displayCountryCode} className="h-[18px] w-[27px]" /> : <span aria-hidden="true">🌍</span>}
                  <span className="hidden sm:inline max-w-[120px] truncate text-foreground">{displayCountryName}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1">
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Sélectionner votre pays</div>
                {countries.map(c => (
                  <DropdownMenuItem
                    key={c.id}
                    onClick={() => { setSelectedCountry(c); setManualCountrySelection(true); }}
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
              className="inline-flex shrink-0 items-center justify-center rounded-full border-2 border-orange-500 bg-orange-500 px-4 py-2 text-xs font-extrabold text-white shadow-sm transition-all hover:bg-orange-600 hover:shadow-md active:scale-95 sm:px-6 sm:py-2.5 sm:text-sm"
            >
              <span>Publier</span>
              <span className="hidden md:inline">&nbsp;mon annonce</span>
            </Link>

            {/* Bouton Menu Principal / Tiroir (Deep Emerald Frame) */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  aria-label="Ouvrir le menu"
                  className="flex cursor-pointer items-center gap-1.5 rounded-full border-2 border-emerald-700 bg-white px-3 py-2 text-xs font-extrabold text-emerald-800 shadow-sm transition-all hover:bg-emerald-50 active:scale-95 sm:px-4 sm:text-sm"
                >
                  <Menu className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                  <span className="hidden sm:inline">Menu</span>
                </button>
              </SheetTrigger>
              <SheetContent side="right" hideClose className="h-dvh max-h-dvh w-[min(90vw,400px)] max-w-[90vw] overflow-hidden border-l border-slate-200 bg-white p-0 text-slate-900 shadow-2xl">
                <div className="flex h-full min-h-0 flex-col">
                  <SheetHeader className="shrink-0 border-b border-slate-200 px-5 py-4 text-left">
                    <div className="flex items-center justify-between gap-4">
                      <Link
                        to="/"
                        onClick={event => {
                          setMobileMenuOpen(false);
                          handleLogoClick(event);
                        }}
                        aria-label="Zando Africa — Retour à l'accueil"
                        className="inline-flex min-w-0"
                      >
                        <img src={BRAND_ASSETS.logoUrl} alt="Zando Africa" className="h-9 max-w-[190px] object-contain object-left" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => setMobileMenuOpen(false)}
                        aria-label="Fermer le menu"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-emerald-600 text-slate-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <SheetTitle className="sr-only">Menu de navigation Zando Africa</SheetTitle>
                  </SheetHeader>

                  <div className="shrink-0 space-y-4 border-b border-slate-200 px-5 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        {!manualCountrySelection && visitorCountry ? (
                          <span className="text-2xl leading-none" aria-label={`Drapeau de ${displayCountryName}`}>{countryCodeToFlag(displayCountryCode || '')}</span>
                        ) : displayCountryCode ? (
                          <CountryFlag countryId={displayCountryCode} className="h-6 w-9 shrink-0 rounded-sm" />
                        ) : (
                          <Globe className="h-6 w-6 shrink-0 text-slate-500" aria-hidden="true" />
                        )}
                        <div className="min-w-0">
                          <p className="text-xs text-slate-500">Pays actuel</p>
                          <p className="truncate text-sm font-bold text-slate-900">{displayCountryName}</p>
                        </div>
                      </div>
                      <DropdownMenu open={countryPickerOpen} onOpenChange={setCountryPickerOpen}>
                        <DropdownMenuTrigger asChild>
                          <button type="button" className="shrink-0 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">
                            Changer
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="z-[70] max-h-[60vh] w-64 overflow-y-auto p-1">
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Sélectionner votre pays</div>
                          {countries.map(country => (
                            <DropdownMenuItem
                              key={country.id}
                              onClick={() => handleCountrySelect(country)}
                              className={`flex cursor-pointer items-center justify-between gap-3 rounded-md px-2.5 py-2 ${selectedCountry?.id === country.id ? 'bg-primary/10 font-medium text-primary' : ''}`}
                            >
                              <span className="flex min-w-0 items-center gap-2">
                                <CountryFlag countryId={country.id} className="h-[18px] w-[27px] shrink-0" />
                                <span className="truncate text-sm">{country.name}</span>
                              </span>
                              <span className="shrink-0 text-xs text-muted-foreground">{country.currency}</span>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <form onSubmit={handleMenuSearch} className="relative">
                      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                      <Input
                        type="search"
                        aria-label="Rechercher un produit"
                        placeholder="Rechercher un produit…"
                        value={menuSearchQuery}
                        onChange={event => setMenuSearchQuery(event.target.value)}
                        className="h-12 rounded-2xl border border-slate-200 bg-white pl-11 text-sm text-slate-900 shadow-sm placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-emerald-600"
                      />
                    </form>
                  </div>

                  <nav aria-label="Navigation principale" className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-5">
                    <Link
                      to="/"
                      onClick={() => setMobileMenuOpen(false)}
                      aria-current={location.pathname === '/' && !location.hash ? 'page' : undefined}
                      className={`flex min-h-14 items-center gap-3 rounded-2xl px-4 py-3 text-base font-semibold transition-colors ${location.pathname === '/' && !location.hash ? 'bg-emerald-50 text-emerald-700' : 'text-slate-900 hover:bg-slate-50'}`}
                    >
                      <Home className="h-6 w-6 shrink-0" />
                      <span>Accueil</span>
                    </Link>
                    <Link
                      to="/#dernieres-annonces"
                      onClick={() => setMobileMenuOpen(false)}
                      aria-current={location.pathname === '/' && location.hash === '#dernieres-annonces' ? 'location' : undefined}
                      className={`flex min-h-14 items-center gap-3 rounded-2xl px-4 py-3 text-base font-semibold transition-colors ${location.pathname === '/' && location.hash === '#dernieres-annonces' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-900 hover:bg-slate-50'}`}
                    >
                      <ShoppingBag className="h-6 w-6 shrink-0" />
                      <span>Produits</span>
                    </Link>
                    <Link to="/passer-pub" onClick={() => setMobileMenuOpen(false)} className="flex min-h-14 items-center gap-3 rounded-2xl px-4 py-3 text-base font-semibold text-slate-900 transition-colors hover:bg-slate-50">
                      <Megaphone className="h-6 w-6 shrink-0" />
                      <span>Passez une pub</span>
                    </Link>
                    <Link to="/publier" onClick={() => setMobileMenuOpen(false)} className="flex min-h-16 items-center gap-3 rounded-2xl bg-red-600 px-4 py-3 text-base font-bold text-white shadow-sm transition-colors hover:bg-red-700">
                      <CirclePlus className="h-6 w-6 shrink-0" />
                      <span>Vendre un article</span>
                    </Link>
                    <Link to="/abonnement" onClick={() => setMobileMenuOpen(false)} className="flex min-h-14 items-center gap-3 rounded-2xl px-4 py-3 text-base font-semibold text-slate-900 transition-colors hover:bg-slate-50">
                      <CreditCard className="h-6 w-6 shrink-0" />
                      <span>Abonnement</span>
                    </Link>
                    <Link to="/a-propos" onClick={() => setMobileMenuOpen(false)} className="flex min-h-14 items-center gap-3 rounded-2xl px-4 py-3 text-base font-semibold text-slate-900 transition-colors hover:bg-slate-50">
                      <Info className="h-6 w-6 shrink-0" />
                      <span>À propos</span>
                    </Link>
                    <Link to="/a-propos#contact" onClick={() => setMobileMenuOpen(false)} className="flex min-h-14 items-center gap-3 rounded-2xl bg-orange-50 px-4 py-3 text-base font-semibold text-orange-600 transition-colors hover:bg-orange-100">
                      <MessageSquarePlus className="h-6 w-6 shrink-0" />
                      <span>Donner votre avis</span>
                    </Link>
                    <button type="button" onClick={() => setCountryPickerOpen(true)} className="flex min-h-14 w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-base font-semibold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800">
                      <Globe className="h-6 w-6 shrink-0" />
                      <span>Choisir le pays</span>
                    </button>

                    <div className="space-y-1 border-t border-slate-200 pt-3">
                      <p className="px-4 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Autres raccourcis</p>
                      <Link to="/favoris" onClick={() => setMobileMenuOpen(false)} className="flex min-h-11 items-center justify-between rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50">
                        <span className="flex items-center gap-3"><Heart className="h-5 w-5 shrink-0" />Mes favoris</span>
                        {favorites.length > 0 && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">{favorites.length}</span>}
                      </Link>
                      <Link to="/verifier-code" onClick={() => setMobileMenuOpen(false)} className="flex min-h-11 items-center gap-3 rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50">
                        <KeyRound className="h-5 w-5 shrink-0" />
                        Vérifier un code promo
                      </Link>
                    </div>
                  </nav>

                  <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-5 py-3 text-center text-xs font-medium text-slate-500">
                    Zando Africa · Marketplace panafricaine
                  </div>
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
