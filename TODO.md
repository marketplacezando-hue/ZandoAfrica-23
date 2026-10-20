# TODO — Produits digitaux

## Publication et validation

- [x] Le vendeur renseigne le titre, la couverture, la description, le PDF et un lien marchand obligatoire.
- [x] Le lien marchand accepte uniquement HTTP/HTTPS et est refusé s’il contient un schéma dangereux; la validation existe dans le navigateur et dans le trigger Supabase.
- [x] Le parcours ne facture que les frais de publication existants; aucun checkout livre n’est créé.

## PDF, aperçu et stockage

- [x] Les PDF valides jusqu’à 300 Mio sont acceptés; les fichiers non PDF, corrompus ou trop volumineux sont refusés côté client, Edge Function et Worker.
- [x] L’aperçu public est un document distinct contenant au maximum les dix premières pages.
- [x] L’original et l’aperçu sont stockés dans R2 privé; le navigateur public ne reçoit jamais l’original.
- [x] Aucun bouton d’achat ZandoAfrica ni téléchargement du PDF complet n’est proposé sur le site.

## Fiche publique et compatibilité

- [x] La fiche affiche l’aperçu gratuit, sa limite de dix pages et le bouton « Acheter vers le site marchand ».
- [x] Les paiements de publication, publicités, abonnements et les catégories non digitales restent inchangés.

## Validation exécutée

- [x] Tests unitaires de validation URL/PDF: 7 tests passés.
- [x] Build Vite et contrôle TypeScript passés.
- [x] Lint Biome et `git diff --check` passés; le script composite du dépôt reste partiellement indisponible car `ast-grep` n’est pas installé dans le sandbox.

## Déploiement

- [x] Migration `digital_products_external_sales` appliquée au projet Supabase `ciwmebbkstdewbolwdyo`.
- [x] Déploiement Vercel READY sur le commit `c5c2c7e`.
- [ ] Publier les versions mises à jour des Edge Functions et du Worker Cloudflare si le pipeline de déploiement ne les synchronise pas automatiquement.
