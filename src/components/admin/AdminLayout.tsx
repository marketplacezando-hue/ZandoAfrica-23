import React, { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useZando } from '@/contexts/ZandoContext';
import { BRAND_ASSETS } from '@/constants/brand';
import { zandoApi } from '@/services/zandoApi';
import {
  LayoutDashboard,
  Package,
  Megaphone,
  CreditCard,
  KeyRound,
  DollarSign,
  BarChart3,
  Activity,
  FileText,
  Settings,
  LogOut,
  ExternalLink,
  ShieldCheck,
  Menu,
  X,
  ToggleLeft,
  ToggleRight,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export const AdminLayout: React.FC = () => {
  const { isAdminAuthenticated, logoutAdmin, adminUserEmail, settings, refreshSettings } = useZando();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [togglingMode, setTogglingMode] = useState(false);

  // If not authenticated, redirect to /admin/login
  React.useEffect(() => {
    if (!isAdminAuthenticated) {
      navigate('/admin/login', { replace: true });
    }
  }, [isAdminAuthenticated, navigate]);

  const navItems = [
    { label: 'Tableau de bord', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Gestion des Produits', path: '/admin/produits', icon: Package },
    { label: 'Avis Clients (Modération)', path: '/admin/avis', icon: FileText },
    { label: 'Publicités VIP', path: '/admin/publicites', icon: Megaphone },
    { label: 'Abonnements', path: '/admin/abonnements', icon: CreditCard },
    { label: 'Codes Promotionnels', path: '/admin/codes-promo', icon: KeyRound },
    { label: 'Finances & Retraits', path: '/admin/finances', icon: DollarSign },
    { label: 'Visiteurs & Trafic', path: '/admin/visiteurs', icon: BarChart3 },
    { label: 'Traçabilité des Clics', path: '/admin/tracabilite', icon: Activity },
    { label: 'Journal d\'Audit', path: '/admin/audit', icon: FileText },
    { label: 'Paramètres du Thème', path: '/admin/parametres', icon: Settings },
  ];

  const isFreeMode = settings.site_mode?.mode === 'free';

  const handleToggleSiteMode = async () => {
    setTogglingMode(true);
    const newMode = isFreeMode ? 'paid' : 'free';
    const ok = await zandoApi.updatePlatformSetting('site_mode', { mode: newMode });
    if (ok) {
      await refreshSettings();
      toast.success(`Mode du site basculé vers : ${newMode === 'free' ? 'Mode Gratuit' : 'Mode Payant'}`);
    } else {
      toast.error('Erreur lors du changement de mode.');
    }
    setTogglingMode(false);
  };

  const handleLogout = () => {
    logoutAdmin();
    toast.info('Déconnexion effectuée.');
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row w-full">
      {/* Desktop Sidebar matching Image 3 (Deep green background) */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 bg-[#092C22] text-white border-r border-emerald-950/40 select-none">
        {/* Brand Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <Link to="/admin/dashboard" className="flex items-center gap-2">
            <img
              src={BRAND_ASSETS.logoUrl}
              alt="Zando Africa"
              className="h-9 w-auto object-contain brightness-125"
            />
          </Link>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
            ADMIN
          </span>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path === '/admin/dashboard' && location.pathname === '/admin');

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-primary text-white shadow-sm font-bold'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-emerald-400'}`} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Admin User info & logout */}
        <div className="p-4 border-t border-white/10 bg-black/20 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/30 border border-primary/50 flex items-center justify-center font-bold text-primary text-xs">
              AD
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-xs font-bold text-white truncate">
                {adminUserEmail || 'immocongo@idriss.com'}
              </div>
              <div className="text-[10px] text-emerald-400">Super Administrateur</div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg bg-white/5 hover:bg-rose-950/40 text-rose-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header / Navigation */}
      <div className="md:hidden sticky top-0 z-40 bg-[#092C22] text-white p-3.5 flex items-center justify-between border-b border-white/10">
        <Link to="/admin/dashboard" className="flex items-center gap-2">
          <img src={BRAND_ASSETS.logoUrl} alt="Zando" className="h-7 brightness-125" />
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Administration</span>
        </Link>
        <button
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 rounded-lg bg-white/10 text-white"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex">
          <div className="w-4/5 max-w-xs bg-[#092C22] text-white h-full p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                <img src={BRAND_ASSETS.logoUrl} alt="Zando" className="h-8 brightness-125" />
                <button type="button" onClick={() => setSidebarOpen(false)}>
                  <X className="w-5 h-5 text-gray-300" />
                </button>
              </div>
              <nav className="space-y-1">
                {navItems.map(item => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium ${
                        isActive ? 'bg-primary text-white font-bold' : 'text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-white/10 space-y-3">
              <Button
                size="sm"
                variant="destructive"
                onClick={handleLogout}
                className="w-full text-xs font-semibold"
              >
                <LogOut className="w-3.5 h-3.5 mr-2" />
                Déconnexion
              </Button>
            </div>
          </div>
          <div className="flex-1" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 overflow-x-hidden flex flex-col bg-background">
        {/* Top Header Bar matching Image 3 */}
        <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-xs border-b border-border px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-sm sm:text-base font-extrabold text-foreground tracking-tight">
              Espace d'Administration Zando Africa
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Global Site Mode Switcher matching Image 3: Mode Payant vs Gratuit */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-background shadow-xs text-xs font-semibold">
              <span className="text-muted-foreground hidden sm:inline">Mode du site :</span>
              <span className={isFreeMode ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                {isFreeMode ? 'Mode Gratuit' : 'Mode Payant'}
              </span>
              <button
                type="button"
                onClick={handleToggleSiteMode}
                disabled={togglingMode}
                className="ml-1 cursor-pointer text-primary hover:opacity-80"
                title="Basculer entre Mode Gratuit et Mode Payant"
              >
                {isFreeMode ? (
                  <ToggleLeft className="w-6 h-6 text-muted-foreground" />
                ) : (
                  <ToggleRight className="w-6 h-6 text-primary" />
                )}
              </button>
            </div>

            {/* View Public Website */}
            <Link
              to="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold border transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">Voir le site</span>
            </Link>
          </div>
        </header>

        {/* Child Page Rendering */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
