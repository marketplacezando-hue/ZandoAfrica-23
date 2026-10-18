# Audit technique et déploiement — ZandoAfrica-23

Date : 18 octobre 2026

## Résumé

ZandoAfrica-23 est une application marketplace React 18 / TypeScript / Vite. L’interface contient déjà l’accueil, la recherche et les filtres, les fiches produits, les formulaires de publication, les pages de publicité et d’abonnement, les avis, les favoris et un ensemble d’écrans d’administration. L’archive initiale n’était toutefois pas prête pour une mise en production : l’authentification admin était simulée dans le navigateur, les transactions pouvaient être marquées réussies côté client, les médias n’utilisaient pas Cloudflare et les scripts `dev`/`build` de `package.json` ne lançaient pas réellement Vite.

Les accès applicatifs sont alignés sur le projet Supabase `ciwmebbkstdewbolwdyo`. Deux migrations ont été appliquées : schéma/RLS/RPC et optimisation ciblée. Le Worker Cloudflare, son bucket R2 privé et son KV de limitation d’envoi sont actifs et testés pour les images et vidéos. La cible du site est **GitHub Pages**; aucun projet Cloudflare Pages n’a été créé. La configuration Vite, le `basename` React Router et le workflow GitHub Actions Pages ont été préparés localement et le build Pages est vérifié. Ils ne sont pas encore poussés : l’intégration GitHub renvoie `403 Resource not accessible by integration` sur les écritures.

## Architecture et capacités

- **Frontend** : React, TypeScript, Vite, Tailwind, Radix/shadcn; le client Supabase s’exécute dans le navigateur avec une clé publishable.
- **Données** : `src/services/zandoApi.ts` lit les pays, catégories, réglages, produits, annonces, abonnements et avis; les écritures publiques sensibles passent par des RPC Supabase avec validation serveur.
- **Authentification admin** : Supabase Auth et rôle vérifié en base remplacent le mot de passe codé dans le frontend et l’état admin stocké dans `localStorage`.
- **Médias** : upload du navigateur vers un Worker Cloudflare; bucket R2 privé; accès aux objets uniquement via le Worker. Le Worker vérifie l’origine, le type MIME et la signature binaire, applique une taille maximale de 10 MiB pour une image et 50 MiB pour une vidéo, et limite les envois via KV sans conserver l’adresse IP brute.
- **Paiement** : aucun prestataire de paiement ni webhook vérifié n’est configuré. Les demandes payantes restent donc `pending_payment`; aucune confirmation ni transaction réussie n’est simulée côté client.

## Base Supabase

Le projet `ciwmebbkstdewbolwdyo` était vide avant l’installation. Les migrations `20261018_zando_core_secure` et `20261018_zando_performance_tuning` créent les tables produits, champs privés, pays, catégories, réglages, utilisateurs admin, bannières, abonnements, codes promotionnels, transactions, retraits, événements de trafic, journaux admin, avis, compteurs de vues et métadonnées médias. RLS est activé sur les tables. Les seules données initiales sont les réglages publics, 8 pays et 8 catégories; aucun compte admin, code promo, produit ou paiement fictif n’a été inséré.

Les annonces payantes, bannières payantes et abonnements sont soumis via RPC et restent en attente; les colonnes tarifaires et de paiement des annonces sont séparées des champs publics. Les tables financières et administratives sont interdites à la clé publique. Le test public a confirmé la lecture des pays/réglages, l’écriture autorisée d’un événement de test puis son nettoyage, et le refus d’accès direct à `transactions` (`42501`). Les RPC de création de produit et d’abonnement ont également créé des entrées en attente de test; ces entrées ont ensuite été supprimées.

Les avis Supabase signalent encore des RPC `SECURITY DEFINER` accessibles aux rôles anon/authenticated. C’est intentionnel pour les formulaires publics et compteurs, qui n’ont pas de droit d’écriture direct sur leurs tables et appliquent des validations côté serveur; il faut conserver ces validations et surveiller les abus. La table `product_views_visitor` est volontairement inaccessible en accès direct (RLS sans policy); seul le RPC insère un hachage de l’identifiant opaque du visiteur. Supabase signale aussi plusieurs policies permissives combinées pour les vues publiques et admin, ce qui est fonctionnel mais peut être optimisé si le volume augmente.

## Cloudflare — uniquement les médias

- Bucket R2 privé : `zandoafrica-media`.
- Worker média : `https://zandoafrica-media.marketplacezando-zandoafrica23.workers.dev`.
- Binding KV pour le quota d’upload; bucket et namespace sont décrits dans `cloudflare/wrangler.toml`.
- Les objets sont servis avec cache immuable et prise en charge des requêtes partielles `Range`, nécessaire à la lecture vidéo.
- Les tests ont validé PNG et MP4; les trois fichiers temporaires ont été supprimés de R2.
- Le CORS du Worker a été mis à jour pour autoriser `https://marketplacezando-hue.github.io`; prévol depuis cette origine : `204` avec les en-têtes attendus.
- Aucun projet de site Cloudflare Pages n’a été créé.

## Corrections et vérifications

- Scripts Vite `dev`, `build` et `preview` rétablis dans `package.json`.
- `.env` exclu de Git; `.env.example` ne contient que des exemples et mentionne GitHub Actions.
- Clés admin codées en dur et faux succès client de paiement retirés.
- Upload frontal redirigé vers le Worker R2; les références d’URL blob locales ne sont plus persistées en cas d’échec.
- Configuration GitHub Pages ajoutée localement : base Vite `/ZandoAfrica-23/` au build, `basename` React Router, action Pages et fallback SPA `404.html`.
- **Build GitHub Pages** : `GITHUB_PAGES=true pnpm build` réussi; le chemin `/ZandoAfrica-23/assets/` a été vérifié dans l’HTML généré. Avertissement non bloquant sur un bundle JavaScript principal d’environ 857 kB minifié (environ 240 kB gzip).
- **TypeScript** : vérification `tsgo` réussie après adaptation au sous-chemin Pages.
- **Cloudflare Worker** : santé `200`; prévol CORS depuis l’origine GitHub Pages `204`; précédemment, upload PNG et MP4 `201`, lecture `200`, requête `Range` `206`, empreintes SHA-256 identiques avant/après lecture.
- **Supabase** : lectures publiques et écritures RPC testées; enregistrements de test supprimés; RLS activé sur toutes les tables applicatives.
- **GitHub** : le compte propriétaire affiche le droit `push`, mais le jeton du connecteur reçoit `403` sur Git et l’API Git. La branche distante `main` n’existe pas; aucun fichier ni déploiement Pages n’a été publié. Le dépôt local a été scanné : aucun secret ou jeton détecté.
- Aucun test automatisé applicatif n’était fourni dans l’archive. `pnpm lint` dépend d’un outil `ast-grep` absent de l’environnement et reste à vérifier séparément; les avis Supabase décrits ci-dessus ne sont pas des échecs de compilation.

## Étapes restantes pour la mise en ligne GitHub Pages

1. Rendre effectivement le jeton de l’intégration apte à écrire dans `marketplacezando-hue/ZandoAfrica-23` (au minimum `Contents: Read and write`; le dépôt doit aussi autoriser GitHub Actions et Pages).
2. Pousser le code et le workflow préparés localement vers `main`.
3. Créer le secret Actions `VITE_SUPABASE_ANON_KEY` avec la clé publishable Supabase — jamais `service_role` — puis définir GitHub Pages comme source `GitHub Actions`.
4. Vérifier l’exécution du workflow et le site à `https://marketplacezando-hue.github.io/ZandoAfrica-23/`; tester lecture/écriture Supabase et uploads médias depuis le navigateur réel.
5. Créer un utilisateur dans Supabase Auth puis l’inscrire dans `public.admin_users` pour activer l’administration; aucun compte ou mot de passe admin n’est préconfiguré.
6. Avant d’encaisser, intégrer un prestataire de paiement mobile adapté aux pays ciblés (et ses webhooks vérifiés/idempotents). Ne pas activer les annonces payantes tant que ce flux n’existe pas.
7. Configurer ultérieurement une politique de rétention/nettoyage des médias et des tâches d’expiration si une suppression automatique est requise.

Le projet ne doit pas être présenté comme prêt à encaisser des paiements avant l’intégration du prestataire et les tests de confirmation serveur. Les performances devront aussi être suivies après la mise en ligne réelle et lorsque les index auront un trafic suffisant.
