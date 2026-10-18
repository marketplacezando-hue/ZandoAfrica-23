import React from 'react';
import { BRAND_ASSETS } from '@/constants/brand';
import { ShieldCheck, Globe, Zap, Users, MessageCircle, Phone } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 space-y-10">
      {/* Hero header */}
      <div className="text-center space-y-3">
        <img
          src={BRAND_ASSETS.logoUrl}
          alt="Zando Africa"
          className="h-14 mx-auto object-contain"
        />
        <h1 className="text-2xl sm:text-4xl font-extrabold text-foreground">
          À propos de Zando Africa
        </h1>
        <p className="text-sm text-muted-foreground max-w-xl mx-auto">
          La plateforme moderne de petites annonces commerciales qui connecte acheteurs et vendeurs à travers toute l'Afrique.
        </p>
      </div>

      {/* Presentation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card rounded-2xl border p-6 space-y-3 shadow-xs">
          <div className="p-3 rounded-xl bg-primary/10 text-primary w-fit">
            <Zap className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-foreground">Simple & Instantané</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Pas d'inscription compliquée pour les acheteurs. Les vendeurs publient en 4 étapes simples et sont contactés immédiatement via WhatsApp et appel téléphonique direct.
          </p>
        </div>

        <div className="bg-card rounded-2xl border p-6 space-y-3 shadow-xs">
          <div className="p-3 rounded-xl bg-secondary/10 text-secondary w-fit">
            <Globe className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-foreground">Multi-pays Africain</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Présent au Congo-Brazzaville, RDC, Côte d'Ivoire, Bénin, Sénégal, Cameroun, Burkina Faso, Mali... avec détection automatique et devises locales (FCFA, CDF).
          </p>
        </div>

        <div className="bg-card rounded-2xl border p-6 space-y-3 shadow-xs">
          <div className="p-3 rounded-xl bg-accent/10 text-accent w-fit">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-foreground">Modération & Sécurité</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Contrôle rigoureux des annonces, protection contre les fraudes, codes promotionnels certifiés et statistiques réelles sans données artificielles.
          </p>
        </div>
      </div>

      {/* Conditions & Mentions */}
      <div className="bg-card rounded-2xl border p-6 sm:p-8 space-y-6">
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">Conditions Générales d'Utilisation</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Zando Africa est un intermédiaire technique mettant en relation les acheteurs et les vendeurs. Les transactions physiques ou financières entre les parties relèvent de leur entière responsabilité. Nous recommandons de toujours vérifier les articles en personne avant tout paiement et d'éviter les transferts d'argent d'avance.
          </p>
        </div>

        <div className="space-y-2 border-t pt-4">
          <h2 className="text-lg font-bold text-foreground">Contact & Assistance</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Pour toute demande d'assistance, partenariat ou signalement d'une annonce suspecte, notre équipe est à votre écoute :
          </p>
          <div className="text-xs font-semibold text-primary space-y-1">
            <p>📧 Email : contact@zando.africa / immocongo@idriss.com</p>
            <p>📱 WhatsApp : +242 06 999 0000</p>
          </div>
        </div>
      </div>
    </div>
  );
};
