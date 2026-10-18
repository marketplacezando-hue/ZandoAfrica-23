# Audit technique et déploiement — ZandoAfrica-23

Date : 18 octobre 2026

## Résumé

ZandoAfrica-23 est une marketplace React 18 / TypeScript / Vite avec accueil, recherche, fiches produit, publication, publicité, abonnements, avis, favoris et administration. L’archive initiale n’était pas prête pour la production : connexion admin simulée côté navigateur, faux succès de paiement côté client, médias sans stockage Cloudflare et scripts Vite incorrects.

Le projet Supabase `ciwmebbkstdewbolwdyo` est configuré avec deux migrations (schéma/RLS/RPC et optimisation ciblée). Le bucket R2 privé et son Worker d’upload/diffusion sont opérationnels pour les images et vidéos. Le site est maintenant publié sur **GitHub Pages** à `https://marketplacezando-hue.github.io/ZandoAfrica-23/`; aucun site Cloudflare Pages n’a été créé.

## Architecture et capacités

- **Frontend** : React, TypeScript, Vite, Tailwind, Radix/shadcn; client Supabase côté navigateur.
- **Données** : `src/services/zandoApi.ts` lit pays, catégories, réglages, produits, annonces, abonnements et avis; les écritures publiques sensibles passent par des RPC validées côté serveur.
- **Administration** : Supabase Auth et rôle admin en base remplacent le mot de passe et l’état simulés côté client.
- **Médias** : navigateur → Worker Cloudflare → bucket R2 privé; contrôles d’origine, MIME, signature binaire, taille (10 MiB/image, 50 MiB/vidéo) et quota via KV.
- **Paiements** : aucun prestataire ni webhook de paiement vérifié n’est intégré. Les demandes payantes restent `pending_payment`; aucune transaction n’est simulée comme réussie.

## Supabase

Le projet était vide avant son initialisation. Les migrations créent les tables applicatives, notamment produits, champs privés, pays, catégories, réglages, utilisateurs admin, bannières, abonnements, codes promo, transactions, retraits, trafic, journaux admin, avis, vues et métadonnées médias. RLS est activé sur les tables. Les données initiales sont limitées aux réglages publics, 8 pays et 8 catégories; aucun produit, compte admin, code promo ou paiement fictif n’a été inséré.

Les formulaires payants passent par des RPC et demeurent en attente; les données tarifaires et financières sont séparées des champs publics. Les tables financières et administratives sont interdites à la clé publique. Les tests ont confirmé la lecture des pays/réglages, une écriture RPC puis le nettoyage de données de test, et le refus d’accès direct à `transactions` (`42501`). Les avis Supabase sur certaines RPC `SECURITY DEFINER` accessibles à anon/authenticated restent à surveiller; leurs validations serveur et l’absence de droit d’écriture direct sont nécessaires.

## Cloudflare — uniquement les médias

- Bucket R2 privé : `zandoafrica-media`.
- Worker média : `https://zandoafrica-media.marketplacezando-zandoafrica23.workers.dev`.
- Le Worker utilise R2 et KV via les bindings décrits dans `cloudflare/wrangler.toml`; les médias sont diffusés avec cache immuable et support des requêtes partielles `Range`.
- Tests antérieurs : upload PNG et MP4 `201`, lecture `200`, `Range` `206`; les objets temporaires ont été supprimés.
- Le CORS du Worker autorise désormais `https://marketplacezando-hue.github.io`; le prévol depuis cette origine répond `204`.
- Aucun site Cloudflare Pages n’a été créé.

## Corrections et validation

- Scripts `dev`, `build` et `preview` corrigés; `.env` exclu de Git et `.env.example` sans valeur réelle.
- Fausses authentification admin et confirmations de paiement supprimées; upload frontal dirigé vers le Worker R2.
- Workflow GitHub Pages présent sur `main`; Vite produit les assets sous `/ZandoAfrica-23/`, React Router reçoit le `basename` correspondant et `dist/404.html` fournit le fallback SPA.
- **Build** : `GITHUB_PAGES=true pnpm build` réussi; le chemin `/ZandoAfrica-23/assets/` a été vérifié; `tsgo` passe. Avertissement non bloquant : bundle JS principal d’environ 857 kB minifié (environ 240 kB gzip).
- **GitHub Actions** : le run `39092197256` a réussi, y compris la configuration Pages, la génération de l’artifact et le déploiement.
- **Site en ligne** : la page et le bundle renvoient HTTP `200`; les chemins sous `/ZandoAfrica-23/`, l’URL Supabase, l’URL Worker et la configuration publishable sont présents dans le bundle. Aucun marqueur `service_role` n’a été trouvé.
- **Configuration publique** : la clé `sb_publishable_` est une clé publique destinée au navigateur; elle est utilisée comme configuration du build. Aucune clé `service_role` ni aucun PAT n’est inclus dans le code. Les API Actions secrets/variables ne sont pas accessibles à l’intégration, ce qui n’empêche pas l’usage de cette clé publishable.
- Les logs signalent des avertissements non bloquants concernant la version Node utilisée par certaines actions et la migration prochaine de `ubuntu-latest`.
- Aucun test automatisé applicatif n’était fourni; `pnpm lint` dépend d’un outil `ast-grep` absent de l’environnement.

## Étapes restantes

1. Effectuer un test d’acceptation dans un navigateur réel des parcours de lecture/écriture Supabase et d’upload/affichage des images/vidéos depuis le site publié.
2. Créer un utilisateur Supabase Auth puis l’inscrire dans `public.admin_users` pour activer l’administration; aucun compte admin n’est préconfiguré.
3. Avant tout encaissement, intégrer un prestataire de paiement mobile adapté aux pays ciblés et des webhooks vérifiés/idempotents. Ne pas activer les annonces payantes tant que ce flux n’existe pas.

Le projet ne doit pas être présenté comme prêt à encaisser des paiements avant l’intégration du prestataire et les tests de confirmation côté serveur.
