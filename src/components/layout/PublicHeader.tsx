import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useZando } from '@/contexts/ZandoContext';
import { BRAND_ASSETS } from '@/constants/brand';
import { ADMIN_LOGIN_GESTURE_EVENT, handleZandoLogoClick } from '@/lib/zandoLogoGesture';
import { CountryFlag } from '@/components/common/CountryFlag';
import { countryCodeToFlag } from '@/lib/locale';
import { DISPLAY_CURRENCIES } from '@/lib/currency';
import {
  Menu,
  X,
  ShoppingBag,
  Megaphone,
  CreditCard,
  KeyRound,
  Heart,
  Info,
  ShieldCheck,
  ChevronDown,
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
    visitorCountry,
    favorites,
    loginAdmin
  } = useZando();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  const navigate = useNavigate();
  const displayCountryCode = visitorCountry?.code || selectedCountry?.id;
  const displayCountryName = visitorCountry?.name || selectedCountry?.name || 'Pays';

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
                  {visitorCountry ? <span className="text-base leading-none" aria-label={`Drapeau de ${visitorCountry.name}`}>{countryCodeToFlag(visitorCountry.code)}</span> : displayCountryCode ? <CountryFlag countryId={displayCountryCode} className="h-[18px] w-[27px]" /> : <span aria-hidden="true">🌍</span>}
                  <span className="hidden sm:inline max-w-[120px] truncate text-foreground">{displayCountryName}</span>
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-muted text-xs sm:text-sm font-bold text-foreground" aria-label="Choisir la devise d’affichage">
                  <span>{selectedCurrency}</span><ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36 p-1">
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Devise d’affichage</div>
                {DISPLAY_CURRENCIES.map(currency => <DropdownMenuItem key={currency} onClick={() => setSelectedCurrency(currency)} className="cursor-pointer">{currency}</DropdownMenuItem>)}
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
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-emerald-700 bg-emerald-700/10 hover:bg-emerald-700/20 text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm font-extrabold cursor-pointer transition-all shadow-xs active:scale-95"
                >
                  <Menu className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                  <span className="hidden sm:inline">Menu</span>
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[350px] p-0 flex flex-col justify-between">
                <div>
                  <SheetHeader className="p-4 border-b text-left">
                    <div className="flex items-center justify-between">
                      <Link
                        to="/"
                        onClick={event => {
                          setMobileMenuOpen(false);
                          handleLogoClick(event);
                        }}
                        aria-label="Zando Africa — Retour à l'accueil"
                        className="inline-flex"
                      >
                        <img src={BRAND_ASSETS.logoUrl} alt="Zando Africa" className="h-8 object-contain" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => setMobileMenuOpen(false)}
                        className="p-1 rounded-md text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <SheetTitle className="text-xs text-muted-foreground font-normal mt-1">
                      Menu de navigation Zando Africa
                    </SheetTitle>
                  </SheetHeader>

                  {/* Framed Menu Items with DEEP, PRONOUNCED, HIGH-CONTRAST COLORS (Requirement 4 & 1) */}
                  <nav className="p-4 space-y-3">
                    {/* Item 1: Publier */}
                    <Link
                      to="/publier"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 p-3 rounded-xl border-2 border-amber-600 bg-amber-500/10 hover:bg-amber-500/20 text-amber-950 dark:text-amber-100 text-sm font-bold transition-all shadow-xs"
                    >
                      <ShoppingBag className="w-5 h-5 text-amber-600 shrink-0" />
                      <span>1. Publier un produit</span>
                    </Link>

                    {/* Item 2: PUB VIP */}
                    <Link
                      to="/passer-pub"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 p-3 rounded-xl border-2 border-blue-600 bg-blue-500/10 hover:bg-blue-500/20 text-blue-950 dark:text-blue-100 text-sm font-bold transition-all shadow-xs"
                    >
                      <Megaphone className="w-5 h-5 text-blue-600 shrink-0" />
                      <span>2. Passer une PUB VIP</span>
                    </Link>

                    {/* Item 3: Favoris - Accessible UNIQUEMENT depuis le menu (Requirement 1 & 4) */}
                    <Link
                      to="/favoris"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between p-3 rounded-xl border-2 border-rose-600 bg-rose-500/10 hover:bg-rose-500/20 text-rose-950 dark:text-rose-100 text-sm font-bold transition-all shadow-xs"
                    >
                      <div className="flex items-center gap-3">
                        <Heart className="w-5 h-5 text-rose-600 fill-rose-600/30 shrink-0" />
                        <span>3. Mes Favoris</span>
                      </div>
                      {favorites.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-black bg-rose-600 text-white">
                          {favorites.length}
                        </span>
                      )}
                    </Link>

                    {/* Item 4: Abonnement vendeur */}
                    <Link
                      to="/abonnement"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 p-3 rounded-xl border-2 border-emerald-700 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-950 dark:text-emerald-100 text-sm font-bold transition-all shadow-xs"
                    >
                      <CreditCard className="w-5 h-5 text-emerald-700 shrink-0" />
                      <span>4. Abonnement Vendeur</span>
                    </Link>

                    {/* Item 5: Code Promo */}
                    <Link
                      to="/verifier-code"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 p-3 rounded-xl border-2 border-purple-600 bg-purple-500/10 hover:bg-purple-500/20 text-purple-950 dark:text-purple-100 text-sm font-bold transition-all shadow-xs"
                    >
                      <KeyRound className="w-5 h-5 text-purple-600 shrink-0" />
                      <span>5. Vérifier mon Code Promo</span>
                    </Link>

                    {/* Item 6: A propos */}
                    <Link
                      to="/a-propos"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 p-3 rounded-xl border-2 border-teal-700 bg-teal-600/10 hover:bg-teal-600/20 text-teal-950 dark:text-teal-100 text-sm font-bold transition-all shadow-xs"
                    >
                      <Info className="w-5 h-5 text-teal-700 shrink-0" />
                      <span>6. À propos & Sécurité</span>
                    </Link>
                  </nav>
                </div>

                <div className="p-4 border-t bg-muted/30 text-center">
                  <div className="text-xs text-muted-foreground font-medium">
                    Zando Africa • Marketplace panafricaine
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
