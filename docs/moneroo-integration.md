# Intégration Moneroo — ZandoAfrica

Cette intégration utilise Moneroo Standard : le navigateur demande au serveur de créer un checkout, puis redirige vers la page hébergée par Moneroo. Les paiements sont vérifiés par l’API Moneroo, aussi bien après le retour du navigateur qu’à la réception d’un webhook. La page de retour du navigateur n’est jamais considérée comme une preuve de paiement.

## Parcours couverts

Les frais de publication, les campagnes publicitaires et les abonnements vendeurs utilisent la table `transactions` existante. Le montant vient des enregistrements et des tarifs conservés par Supabase, jamais d’un montant envoyé par le navigateur. Les annonces et prestations restent en attente jusqu’à une confirmation vérifiée.

Une transaction Moneroo en attente est réutilisée au rafraîchissement; le serveur ne crée pas une seconde initialisation pour la même prestation. Une réponse réseau incertaine reste en attente plutôt que d’être déclarée échouée ou d’entraîner automatiquement un second débit. Une nouvelle tentative n’est possible qu’après un statut Moneroo confirmé `failed` ou `cancelled`.

La fonction Edge `moneroo-payments` traite les appels `create`, `retry` et `verify`. Le webhook est reçu sur la même fonction avec le chemin `/webhook`. Sa signature est vérifiée sur le corps brut avec HMAC-SHA256 et `X-Moneroo-Signature`; après validation, la fonction répond immédiatement en HTTP 200 et confie la vérification auprès de l’API Moneroo à une tâche Edge en arrière-plan.

## Statuts

| Statut Moneroo vérifié | Statut interne `transactions` | État affiché |
|---|---|---|
| `initiated` ou `pending` | `pending` | Paiement en attente |
| `success` | `completed` | Paiement réussi |
| `failed` | `failed` | Paiement échoué |
| `cancelled` | `cancelled` | Paiement annulé |
| Toute valeur inconnue ou erreur de vérification | `pending` inchangé | Paiement en attente |

Une activation de service est réalisée par la fonction SQL `apply_moneroo_verified_payment`, dans la même transaction que le changement d’état. Un montant ou code devise qui ne correspond pas à la transaction bloque l’activation. Les traitements webhook répétés sont dédupliqués en base; une transaction déjà réussie n’est pas rétrogradée par une notification plus ancienne.

## Configuration requise

Les variables ci-dessous sont à ajouter dans les secrets des Supabase Edge Functions, pas dans les variables `VITE_*` du navigateur :

- `MONEROO_SECRET_KEY` : clé privée API Moneroo, jamais dans GitHub ou Vercel côté client.
- `MONEROO_WEBHOOK_SECRET` : secret de signature choisi pour le webhook et identique à celui saisi dans le tableau de bord Moneroo.
- `ZANDO_SITE_URL` : origine canonique HTTPS du site; elle reçoit `return_url`.
- `MONEROO_DEFAULT_CURRENCY` : code ISO pour les tarifs généraux qui sont conservés comme `FCFA` dans les paramètres; valeur par défaut `XAF`. Choisir `XOF` ou `CDF` si c’est la devise de règlement effectivement configurée pour ces prestations. Les frais de publication utilisent la devise ISO du pays de l’annonce.
- `ZANDO_ALLOWED_ORIGINS` (facultatif) : origines web additionnelles autorisées, séparées par des virgules. L’origine de `ZANDO_SITE_URL` et `http://localhost:5173` sont aussi acceptées.

Le runtime Supabase fournit `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` aux fonctions Edge. Ne jamais ajouter la clé `service_role` dans Vercel, le frontend ou un fichier versionné.

Configurer ensuite une URL de webhook Moneroo de la forme `https://<project-ref>.supabase.co/functions/v1/moneroo-payments/webhook`, choisir un secret de signature, et reporter ce même secret dans `MONEROO_WEBHOOK_SECRET` côté Supabase. Les événements de paiement documentés par Moneroo sont `payment.initiated`, `payment.success`, `payment.failed` et `payment.cancelled`.

Le frontend conserve ses variables actuelles `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`; aucune clé Moneroo ne lui est nécessaire.

## Déploiement prudent

1. Ajouter les secrets Edge Functions depuis le tableau de bord Supabase ou une session CLI autorisée.
2. Appliquer `supabase/migrations/20261019_moneroo_payments.sql`. Cette migration est additive et préserve l’historique existant.
3. Déployer `supabase/functions/moneroo-payments/index.ts` avec `verify_jwt = false`. Le endpoint accepte le public anonyme du site; son contrôle de sécurité repose sur des références opaques, des montants relus côté serveur, une validation des états et la signature HMAC pour les webhooks.
4. Configurer l’URL de webhook et son secret dans le tableau de bord Moneroo.
5. Valider d’abord les paiements de test Moneroo avant toute utilisation réelle.

Le paramètre `verify_jwt = false` est requis pour permettre à Moneroo d’appeler le webhook sans JWT. Les chemins de paiement public n’acceptent aucun montant fourni par le client et n’activent pas de service sans vérification serveur.

## Vérifications à effectuer avant la production

Après configuration des secrets et avant d’activer les paiements réels, tester avec le mode de test Moneroo : création valide, retour avec paiement en attente, succès confirmé, échec confirmé, annulation confirmée, webhook valide, signature falsifiée, webhook dupliqué, montant/devise incohérents, perte de réseau pendant l’initialisation, et reprise après retour interrompu. Vérifier également les parcours annonce, publicité et abonnement sur mobile et ordinateur, ainsi que l’absence de secret dans le build frontend.

Les contrôles statiques réellement exécutés sur cette livraison sont : `pnpm build`, le contrôle `tsgo`, le lint Biome des fichiers modifiés, `deno check` sur la fonction Edge et `git diff --check`; ils ont réussi. Le script composite `pnpm lint` ne termine pas dans cet environnement : `ast-grep` n’est pas installé et son script de build tente d’écrire dans `/workspace/.dist`, emplacement non accessible. Aucun test de paiement sandbox/live, aucune réception de webhook, aucune migration de production et aucun déploiement Vercel ne sont déclarés comme effectués.

La vérification d’un paiement encore en attente est disponible depuis la page de résultat avec « Vérifier le paiement ». Une réconciliation périodique automatisée des transactions qui n’ont jamais généré de webhook n’est pas activée dans cette version et doit être planifiée dans Supabase Cron ou un ordonnanceur équivalent avant de considérer cette intégration comme complète en production.

Pour activer cette réconciliation, planifier côté serveur un `POST` toutes les cinq minutes vers `https://<project-ref>.supabase.co/functions/v1/moneroo-payments` avec le JSON `{"action":"reconcile"}` et l’en-tête `Authorization: Bearer <MONEROO_SECRET_KEY>`. Conserver la clé dans le coffre de secrets de l’ordonnanceur; ne jamais l’intégrer dans le frontend. Chaque appel examine au plus dix transactions Moneroo encore en attente, dotées d’une référence fournisseur et non revérifiées depuis deux minutes. L’action vérifie le statut auprès de Moneroo et ne crée ni ne relance de paiement. Les transactions dont l’initialisation a expiré sans identifiant fournisseur ne peuvent pas être vérifiées par cette tâche; elles restent en attente et doivent être rapprochées via webhook ou contrôle manuel.

## Sources officielles Moneroo

- [Standard Integration](https://docs.moneroo.io/payments/standard-integration) — endpoint `POST https://api.moneroo.io/v1/payments/initialize`, champs client, lien `data.checkout_url` et retour navigateur.
- [Transaction verification](https://docs.moneroo.io/payments/transaction-verification) — endpoint `GET /v1/payments/{paymentId}/verify` et contrôles de référence, statut, devise et montant.
- [Webhooks](https://docs.moneroo.io/introduction/webhooks) — événements, `X-Moneroo-Signature`, HMAC-SHA256, réponses attendues et répétitions.
- [Payment status](https://docs.moneroo.io/payments/status) — statuts transitoires `initiated`/`pending` et statuts finaux `success`/`failed`/`cancelled`.
- [Available methods](https://docs.moneroo.io/payments/available-methods) — codes devise et pays supportés.
