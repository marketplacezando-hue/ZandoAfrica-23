import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import IntersectObserver from '@/components/common/IntersectObserver';
import { ScrollToTop } from '@/components/common/ScrollToTop';
import { Toaster } from '@/components/ui/sonner';
import { ZandoProvider } from '@/contexts/ZandoContext';

// Keep the home route in the initial bundle; defer heavy and infrequently visited pages.
import { PublicLayout } from '@/components/layout/PublicLayout';
import { HomePage } from '@/pages/HomePage';
import { AboutPage } from '@/pages/AboutPage';
import { AdminLayout } from '@/components/admin/AdminLayout';

const lazyNamed = (loader: () => Promise<Record<string, unknown>>, exportName: string) => lazy(async () => ({
  default: (await loader())[exportName] as React.ComponentType
}));

const ProductDetailPage = lazyNamed(() => import('@/pages/ProductDetailPage'), 'ProductDetailPage');
const PublishProductPage = lazyNamed(() => import('@/pages/PublishProductPage'), 'PublishProductPage');
const BannerAdPage = lazyNamed(() => import('@/pages/BannerAdPage'), 'BannerAdPage');
const SubscriptionPage = lazyNamed(() => import('@/pages/SubscriptionPage'), 'SubscriptionPage');
const PaymentReturnPage = lazyNamed(() => import('@/pages/PaymentReturnPage'), 'PaymentReturnPage');
const VerifyCodePage = lazyNamed(() => import('@/pages/VerifyCodePage'), 'VerifyCodePage');
const FavoritesPage = lazyNamed(() => import('@/pages/FavoritesPage'), 'FavoritesPage');
const AdminDashboard = lazyNamed(() => import('@/pages/admin/AdminDashboard'), 'AdminDashboard');
const AdminProducts = lazyNamed(() => import('@/pages/admin/AdminProducts'), 'AdminProducts');
const AdminReviews = lazyNamed(() => import('@/pages/admin/AdminReviews'), 'AdminReviews');
const AdminBanners = lazyNamed(() => import('@/pages/admin/AdminBanners'), 'AdminBanners');
const AdminSubscriptions = lazyNamed(() => import('@/pages/admin/AdminSubscriptions'), 'AdminSubscriptions');
const AdminPromoCodes = lazyNamed(() => import('@/pages/admin/AdminPromoCodes'), 'AdminPromoCodes');
const AdminFinances = lazyNamed(() => import('@/pages/admin/AdminFinances'), 'AdminFinances');
const AdminTraffic = lazyNamed(() => import('@/pages/admin/AdminTraffic'), 'AdminTraffic');
const AdminTraceability = lazyNamed(() => import('@/pages/admin/AdminTraceability'), 'AdminTraceability');
const AdminAuditLogs = lazyNamed(() => import('@/pages/admin/AdminAuditLogs'), 'AdminAuditLogs');
const AdminSettings = lazyNamed(() => import('@/pages/admin/AdminSettings'), 'AdminSettings');

const PageLoading = () => (
  <div className="flex min-h-[40vh] items-center justify-center p-6 text-sm text-muted-foreground" role="status">
    Chargement…
  </div>
);

const App: React.FC = () => (
  <Router basename={import.meta.env.BASE_URL}>
    <ZandoProvider>
      <ScrollToTop />
      <IntersectObserver />
      <div className="flex min-h-screen flex-col">
        <main className="flex-grow">
          <Suspense fallback={<PageLoading />}>
            <Routes>
              <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
              <Route path="/produit/:id" element={<PublicLayout><ProductDetailPage /></PublicLayout>} />
              <Route path="/publier" element={<PublicLayout><PublishProductPage /></PublicLayout>} />
              <Route path="/passer-pub" element={<PublicLayout><BannerAdPage /></PublicLayout>} />
              <Route path="/abonnement" element={<PublicLayout><SubscriptionPage /></PublicLayout>} />
              <Route path="/paiement/resultat" element={<PublicLayout><PaymentReturnPage /></PublicLayout>} />
              <Route path="/verifier-code" element={<PublicLayout><VerifyCodePage /></PublicLayout>} />
              <Route path="/favoris" element={<PublicLayout><FavoritesPage /></PublicLayout>} />
              <Route path="/a-propos" element={<PublicLayout><AboutPage /></PublicLayout>} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="produits" element={<AdminProducts />} />
                <Route path="avis" element={<AdminReviews />} />
                <Route path="publicites" element={<AdminBanners />} />
                <Route path="abonnements" element={<AdminSubscriptions />} />
                <Route path="codes-promo" element={<AdminPromoCodes />} />
                <Route path="finances" element={<AdminFinances />} />
                <Route path="visiteurs" element={<AdminTraffic />} />
                <Route path="tracabilite" element={<AdminTraceability />} />
                <Route path="audit" element={<AdminAuditLogs />} />
                <Route path="parametres" element={<AdminSettings />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
      <Toaster position="top-right" richColors />
    </ZandoProvider>
  </Router>
);

export default App;
