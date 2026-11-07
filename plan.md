
## Mise à jour demandée — interface compacte, aperçu sécurisé et URLs courtes

Les changements réutilisent l’architecture React/Vite, les composants existants et les fonctions Supabase/Vercel en place. L’identité visuelle est conservée, avec une densité légèrement réduite : logo d’en-tête, tuiles de catégories, icônes et boutons sont plus compacts et restent adaptatifs sur mobile, tablette et ordinateur.

Le lecteur PDF conserve son parcours d’achat et de téléchargement complet, mais l’aperçu public est borné à 20 pages côté client et côté génération serveur. Les descriptions détaillées sont affichées dans un cadre à hauteur limitée avec défilement vertical interne.

Les nouvelles navigations utilisent `/p/:id`, un identifiant URL-safe court et réversible dérivé de l’UUID existant, sans migration ni modification des produits. Les anciennes routes `/produit/:id` restent déclarées et fonctionnelles. Les métadonnées sociales, le sitemap et la réécriture Vercel suivent le nouveau chemin court.
