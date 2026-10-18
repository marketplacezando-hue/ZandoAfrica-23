import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import IntersectObserver from '@/components/common/IntersectObserver';
import { ScrollToTop } from '@/components/common/ScrollToTop';
import { Toaster } from '@/components/ui/sonner';
import { ZandoProvider } from '@/contexts/ZandoContext';

// Public Layout & Pages
import { PublicLayout } from '@/components/layout/PublicLayout';
import { HomePage } from '@/pages/HomePage';
import { ProductDetailPage } from '@/pages/ProductDetailPage';
import { PublishProductPage } from '@/pages/PublishProductPage';
import { BannerAdPage } from '@/pages/BannerAdPage';
import { SubscriptionPage } from '@/pages/SubscriptionPage';
import { VerifyCodePage } from '@/pages/VerifyCodePage';
import { FavoritesPage } from '@/pages/FavoritesPage';
import { AboutPage } from '@/pages/AboutPage';

// Admin
import { AdminLoginPage } from '@/pages/admin/AdminLoginPage';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { AdminProducts } from '@/pages/admin/AdminProducts';
import { AdminReviews } from '@/pages/admin/AdminReviews';
import { AdminBanners } from '@/pages/admin/AdminBanners';
import { AdminSubscriptions } from '@/pages/admin/AdminSubscriptions';
import { AdminPromoCodes } from '@/pages/admin/AdminPromoCodes';
import { AdminFinances } from '@/pages/admin/AdminFinances';
import { AdminTraffic } from '@/pages/admin/AdminTraffic';
import { AdminTraceability } from '@/pages/admin/AdminTraceability';
import { AdminAuditLogs } from '@/pages/admin/AdminAuditLogs';
import { AdminSettings } from '@/pages/admin/AdminSettings';

const App: React.FC = () => {
  return (
    <Router>
      <ZandoProvider>
        <ScrollToTop />
        <IntersectObserver />
        <div className="flex flex-col min-h-screen">
          <main className="flex-grow">
            <Routes>
              {/* Public Marketplace Routes */}
              <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
              <Route path="/produit/:id" element={<PublicLayout><ProductDetailPage /></PublicLayout>} />
              <Route path="/publier" element={<PublicLayout><PublishProductPage /></PublicLayout>} />
              <Route path="/passer-pub" element={<PublicLayout><BannerAdPage /></PublicLayout>} />
              <Route path="/abonnement" element={<PublicLayout><SubscriptionPage /></PublicLayout>} />
              <Route path="/verifier-code" element={<PublicLayout><VerifyCodePage /></PublicLayout>} />
              <Route path="/favoris" element={<PublicLayout><FavoritesPage /></PublicLayout>} />
              <Route path="/a-propos" element={<PublicLayout><AboutPage /></PublicLayout>} />

              {/* Admin Portal Authentication */}
              <Route path="/admin/login" element={<AdminLoginPage />} />

              {/* Admin Portal Nested Routes */}
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

              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
        <Toaster position="top-right" richColors />
      </ZandoProvider>
    </Router>
  );
};

export default App;
