import React from 'react';
import type { ReactNode } from 'react';

// Public Layout & Pages
import { PublicLayout } from './components/layout/PublicLayout';
import { HomePage } from './pages/HomePage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { PublishProductPage } from './pages/PublishProductPage';
import { BannerAdPage } from './pages/BannerAdPage';
import { SubscriptionPage } from './pages/SubscriptionPage';
import { VerifyCodePage } from './pages/VerifyCodePage';
import { FavoritesPage } from './pages/FavoritesPage';
import { AboutPage } from './pages/AboutPage';

// Admin Layout & Pages
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminProducts } from './pages/admin/AdminProducts';
import { AdminReviews } from './pages/admin/AdminReviews';
import { AdminBanners } from './pages/admin/AdminBanners';
import { AdminSubscriptions } from './pages/admin/AdminSubscriptions';
import { AdminPromoCodes } from './pages/admin/AdminPromoCodes';
import { AdminFinances } from './pages/admin/AdminFinances';
import { AdminTraffic } from './pages/admin/AdminTraffic';
import { AdminTraceability } from './pages/admin/AdminTraceability';
import { AdminAuditLogs } from './pages/admin/AdminAuditLogs';
import { AdminSettings } from './pages/admin/AdminSettings';

export interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
  public?: boolean;
}

export const routes: RouteConfig[] = [
  // Public Market Interface
  {
    name: 'Accueil Zando Africa',
    path: '/',
    element: <PublicLayout><HomePage /></PublicLayout>,
    public: true,
  },
  {
    name: 'Détail de l\'Annonce',
    path: '/produit/:id',
    element: <PublicLayout><ProductDetailPage /></PublicLayout>,
    public: true,
  },
  {
    name: 'Publier un Produit',
    path: '/publier',
    element: <PublicLayout><PublishProductPage /></PublicLayout>,
    public: true,
  },
  {
    name: 'Passer une Publicité VIP',
    path: '/passer-pub',
    element: <PublicLayout><BannerAdPage /></PublicLayout>,
    public: true,
  },
  {
    name: 'Abonnement Vendeur',
    path: '/abonnement',
    element: <PublicLayout><SubscriptionPage /></PublicLayout>,
    public: true,
  },
  {
    name: 'Vérifier mon Code Promo',
    path: '/verifier-code',
    element: <PublicLayout><VerifyCodePage /></PublicLayout>,
    public: true,
  },
  {
    name: 'Mes Favoris',
    path: '/favoris',
    element: <PublicLayout><FavoritesPage /></PublicLayout>,
    public: true,
  },
  {
    name: 'À Propos',
    path: '/a-propos',
    element: <PublicLayout><AboutPage /></PublicLayout>,
    public: true,
  },

  // Admin Portal
  {
    name: 'Connexion Administration',
    path: '/admin/login',
    element: <AdminLoginPage />,
    public: true,
  },
  {
    name: 'Tableau de bord Admin',
    path: '/admin',
    element: <AdminLayout />,
  },
  {
    name: 'Tableau de bord Admin Dashboard',
    path: '/admin/dashboard',
    element: <AdminLayout />,
  },
  {
    name: 'Modération des Avis Clients',
    path: '/admin/avis',
    element: <AdminLayout />,
  },
];
