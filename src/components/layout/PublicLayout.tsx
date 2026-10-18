import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BRAND_ASSETS } from '@/constants/brand';
import { useZando } from '@/contexts/ZandoContext';
import { handleZandoLogoClick } from '@/lib/zandoLogoGesture';
import { CountryFlag } from '@/components/common/CountryFlag';
import { ShieldCheck, Phone, Mail, MapPin, Globe } from 'lucide-react';
import { PublicHeader } from './PublicHeader';

export interface PublicLayoutProps {
  children: React.ReactNode;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <PublicHeader />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
};

export const PublicFooter: React.FC = () => {
  const { countries, setSelectedCountry } = useZando();
  const navigate = useNavigate();

  return (
    <footer className="bg-[#0a2f24] border-t border-emerald-900/60 mt-12 text-white">
      {/* Countries Banner (Fond vert très sombre avec bordure émeraude) */}
      <div className="bg-[#07231a] border-b border-emerald-800/40 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-emerald-200">
            <span className="font-bold text-white flex items-center gap-1.5 shrink-0">
              <Globe className="w-4 h-4 text-emerald-400" />
              Pays disponibles en Afrique :
            </span>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {countries.map(c => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setSelectedCountry(c)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0d3b2d] border border-emerald-700/60 hover:border-emerald-400 text-emerald-100 hover:text-white transition-all cursor-pointer text-xs shadow-xs"
                >
                  <CountryFlag countryId={c.id} />
                  <span className="font-medium">{c.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 lg:gap-10">
          {/* Brand Info & Mission */}
          <div className="space-y-4 sm:col-span-2 md:col-span-1">
            <Link
              to="/"
              onClick={event => handleZandoLogoClick(event, navigate)}
              aria-label="Zando Africa — Retour à l'accueil"
              className="inline-block"
            >
              <img
                src={BRAND_ASSETS.logoUrl}
                alt="Zando Africa"
                className="h-10 w-auto object-contain brightness-110"
              />
            </Link>
            <p className="text-xs text-emerald-100/90 leading-relaxed">
              La plateforme moderne panafricaine de petites annonces commerciales. Nous connectons directement acheteurs et vendeurs à travers l'Afrique via WhatsApp et appel téléphonique sécurisé.
            </p>
            <div className="space-y-1 text-xs text-emerald-200/90 pt-1">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Brazzaville, Kinshasa, Abidjan & Panafrique</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>contact@zandoafrica.com</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-sm font-black text-white uppercase tracking-wider">Navigation</h4>
            <ul className="space-y-2 text-xs text-emerald-200/90">
              <li><Link to="/" className="hover:text-white hover:underline transition-colors">Accueil</Link></li>
              <li><Link to="/publier" className="hover:text-white hover:underline transition-colors">Publier un produit</Link></li>
              <li><Link to="/passer-pub" className="hover:text-white hover:underline transition-colors">Passer une publicité VIP</Link></li>
              <li><Link to="/abonnement" className="hover:text-white hover:underline transition-colors">Formules d'abonnement</Link></li>
              <li><Link to="/verifier-code" className="hover:text-white hover:underline transition-colors">Vérifier mon code promo</Link></li>
              <li><Link to="/favoris" className="hover:text-white hover:underline transition-colors">Mes annonces favorites</Link></li>
            </ul>
          </div>

          {/* Categories */}
          <div className="space-y-3">
            <h4 className="text-sm font-black text-white uppercase tracking-wider">Catégories phares</h4>
            <ul className="space-y-2 text-xs text-emerald-200/90">
              <li><Link to="/?category=telephones-tablettes" className="hover:text-white hover:underline transition-colors">Téléphones & Tablettes</Link></li>
              <li><Link to="/?category=informatique-ordinateurs" className="hover:text-white hover:underline transition-colors">Informatique & PC</Link></li>
              <li><Link to="/?category=mode-chaussures" className="hover:text-white hover:underline transition-colors">Mode & Chaussures</Link></li>
              <li><Link to="/?category=electromenager" className="hover:text-white hover:underline transition-colors">Électroménager</Link></li>
              <li><Link to="/?category=vehicules" className="hover:text-white hover:underline transition-colors">Véhicules & Auto</Link></li>
              <li><Link to="/?category=immobilier" className="hover:text-white hover:underline transition-colors">Immobilier</Link></li>
            </ul>
          </div>

          {/* Legal & Security */}
          <div className="space-y-3">
            <h4 className="text-sm font-black text-white uppercase tracking-wider">Sécurité & Confiance</h4>
            <p className="text-xs text-emerald-100/90 leading-relaxed">
              Plateforme africaine vérifiée. Modération active des annonces et conseils de sécurité stricts pour toutes vos transactions directes.
            </p>
            <div className="pt-2 text-xs text-emerald-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold text-white">Zando Africa certifié & sécurisé</span>
            </div>
            <div className="pt-2">
              <Link
                to="/a-propos"
                className="inline-flex items-center gap-1.5 text-xs text-emerald-300 hover:text-white font-medium underline"
              >
                <span>En savoir plus sur nos garanties</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom copyright and legal notices */}
        <div className="border-t border-emerald-900/60 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-emerald-300/80">
          <p className="text-center sm:text-left">
            © {new Date().getFullYear()} Zando Africa — Achetez • Vendez • Évoluez. Tous droits réservés.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-emerald-200">
            <Link to="/a-propos" className="hover:text-white hover:underline transition-colors">Conditions Générales</Link>
            <span>•</span>
            <Link to="/a-propos" className="hover:text-white hover:underline transition-colors">Confidentialité</Link>
            <span>•</span>
            <Link to="/a-propos" className="hover:text-white hover:underline transition-colors">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
