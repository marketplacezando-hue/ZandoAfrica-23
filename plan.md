# Plan — Produits digitaux ZandoAfrica

## Approche

Conserver le parcours de publication existant et isoler les changements à la catégorie `digital-products`. Le vendeur téléverse un PDF contrôlé côté navigateur puis côté Edge Function; le serveur génère un document d’aperçu autonome de dix pages maximum et stocke l’original et l’aperçu dans le bucket R2 privé via le Worker Cloudflare. Supabase conserve uniquement les métadonnées, les références R2 et les réglages structurés.

Le parcours d’achat de livre sera supprimé de l’interface et rendu indisponible côté serveur. La fiche digitale affichera uniquement l’aperçu gratuit et un lien marchand HTTPS/HTTP validé. Le paiement existant restera utilisé uniquement pour les frais de publication de l’annonce.

## Structure concernée

- `src/pages/PublishProductPage.tsx` : champ marchand obligatoire et limite 300 Mio.
- `src/pages/ProductDetailPage.tsx` : aperçu de 10 pages et redirection externe, sans achat/téléchargement.
- `src/services/digitalBooks.ts` : validation et consultation de l’aperçu.
- `supabase/functions/digital-books/index.ts` : contrôle serveur PDF/R2 et suppression des actions d’achat/téléchargement.
- `cloudflare/media-worker.js` : limite R2 digitale à 300 Mio et stockage privé.
- `supabase/migrations/20261022_digital_products_external_sales.sql` : réglage de taille et validation serveur du lien marchand.
- `public/manus-routes.json` : manifeste des routes publiques.

## Design

Styles envisagés : **Marketplace éditoriale sobre** (0,06), **Bibliothèque chaleureuse** (0,05), **Commerce mobile direct** (0,04). Choix : Marketplace éditoriale sobre.

- Mouvement : fiche produit éditoriale, bouton d’action net et informations de confiance.
- Principes : lisibilité, transparence sur l’aperçu, action externe explicite, responsive.
- Couleurs : conserver la marque existante; orange pour l’action externe, vert pour la confiance.
- Mise en page : aperçu au centre de la fiche, CTA marchand immédiatement adjacent.
- Éléments signature : mention « aperçu gratuit limité à 10 pages », badge R2 privé côté serveur, bouton externe unique.
- Interaction : états de chargement et d’erreur visibles; aucun faux checkout.
- Animation : transitions discrètes, aucun mouvement décoratif pendant le chargement PDF.
- Typographie : conserver la hiérarchie existante et les composants UI actuels.
- Voix : directe et transparente (« Consulter l’aperçu gratuit », « Acheter vers le site marchand »).
- Marque : ZandoAfrica connecte la découverte locale à l’achat chez le vendeur.
