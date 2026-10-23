
## Refonte de l’accueil selon la capture fournie

- [x] L’accueil présente l’ordre visuel logo/pays/publication/menu, recherche, bannière marketplace, bannière PUB VIP et catégories colorées.
- [x] Les textes, CTA, flèches, indicateurs, sélection de pays, recherche et filtrage restent interactifs et pilotés par React.
- [x] Les visuels de fond des deux bannières sont intégrés dans `public/home/` et ne dépendent pas d’un CDN externe.
- [x] Les routes, les appels Supabase, les annonces, les publicités VIP, le temps réel et le menu mobile existants restent en place.
- [x] TypeScript, Biome et build Vite ciblés validés; le script global conserve les limitations préexistantes `ast-grep`/`/workspace` du sandbox.
- [x] Commit et déploiement de la branche `main` vers le projet Vercel `zando-africa-23`.
