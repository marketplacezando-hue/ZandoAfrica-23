# Audit technique et déploiement — ZandoAfrica-23

Date : 18 octobre 2026

## Résumé

ZandoAfrica-23 est une application marketplace React 18 / TypeScript / Vite. L’interface contient déjà l’accueil, la recherche et les filtres, les fiches produits, les formulaires de publication, les pages de publicité et d’abonnement, les avis, les favoris et un ensemble d’écrans d’administration. L’archive initiale n’était toutefois pas prête pour une mise en production : l’authentification admin était simulée dans le navigateur, les transactions pouvaient être marquées réussies côté client, les médias n’utilisaient pas Cloudflare et les scripts `dev`/`build` de `package.json` ne lançaient pas réellement Vite.

Les accès applicatifs ont maintenant été alignés sur le nouveau projet Supabase `ciwmebbkstdewbolwdyo`. Deux migrations ont été appliquées : schéma/RLS/RPC et optimisation ciblée. Le Worker Cloudflare de médias, son bucket R2 privé et son KV de limitation d’envoi sont actifs et testés. Le dépôt GitHub public existe; le code est préparé pour publication. La création du projet Pages et le premier déploiement restent à finaliser.

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

## Cloudflare

- Bucket R2 privé : `zandoafrica-media`.
- Worker média : `https://zandoafrica-media.marketplacezando-zandoafrica23.workers.dev`.
- Binding KV pour le quota d’upload; bucket et namespace sont décrits dans `cloudflare/wrangler.toml`.
- Les objets sont servis avec cache immuable et prise en charge des requêtes partielles `Range`, nécessaire à la lecture vidéo.
- Les trois fichiers de test ont été supprimés de R2 après validation.

## Corrections et vérifications

- Scripts Vite `dev`, `build` et `preview` rétablis dans `package.json`.
- `.env` exclu de Git; `.env.example` ne contient que des exemples; historiques et données de synchronisation locales sont ignorés.
- Clés admin codées en dur et faux succès client de paiement retirés.
- Upload frontal redirigé vers le Worker R2; les références d’URL blob locales ne sont plus persistées en cas d’échec.
- **Build Vite** : réussi; avertissement non bloquant sur un bundle JavaScript principal d’environ 857 kB minifié (environ 240 kB gzip), à découper ultérieurement si la performance mobile l’exige.
- **TypeScript** : vérification `tsgo` réussie.
- **Cloudflare** : santé Worker OK; upload PNG et MP4 `201`; lecture complète `200`; requête `Range` `206`; prévol CORS `204`; empreintes SHA-256 identiques avant/après lecture.
- **Supabase** : lecture publique et écritures RPC testées; les enregistrements de test ont été supprimés. RLS activé sur toutes les tables applicatives.
- Aucun test automatisé applicatif n’était fourni dans l’archive. `pnpm lint` dépend d’un outil `ast-grep` absent de l’environnement et reste à vérifier séparément; les avertissements advisors ci-dessus ne sont pas des échecs de compilation.

## Étapes restantes et limites de lancement

1. Pousser les fichiers contrôlés dans le dépôt public `marketplacezando-hue/ZandoAfrica-23`, sans `.env`, historique, dépendances ou fichiers de test locaux.
2. Créer le projet Cloudflare Pages lié à la branche `main`, avec `pnpm build`, répertoire de sortie `dist` et variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (clé publishable) et `VITE_MEDIA_WORKER_URL`.
3. Vérifier le site servi sur `https://zandoafrica-23.pages.dev` et le flux depuis le navigateur.
4. Créer un utilisateur dans Supabase Auth puis l’inscrire dans `public.admin_users` pour activer l’administration; aucun compte ou mot de passe admin n’est préconfiguré.
5. Avant d’encaisser, intégrer un prestataire de paiement mobile adapté aux pays ciblés (et ses webhooks vérifiés/idempotents). Ne pas activer les annonces payantes tant que ce flux n’existe pas.
6. Configurer ultérieurement une politique de rétention/nettoyage des médias et des tâches d’expiration si une suppression automatique est requise.

Le projet ne doit être présenté comme prêt à encaisser des paiements qu’après l’intégration du prestataire et les tests de confirmation serveur. Les résultats de performance devront aussi être suivis après la mise en ligne réelle et lorsque les index auront un trafic suffisant.
