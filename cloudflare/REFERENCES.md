# Références Cloudflare

- [R2 Workers API – mise en route](https://developers.cloudflare.com/r2/get-started/workers-api/) : bucket R2 privé lié au Worker par un binding `r2_buckets`; le Worker effectue les lectures et écritures via l’API R2.
- [Utiliser R2 depuis Workers](https://developers.cloudflare.com/r2/api/workers/workers-api-usage/) : mise en place du bucket et du binding.
- [API R2 des Workers](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/) : lecture/écriture d’objets et métadonnées HTTP.
- [Métadonnées d’upload multipart des Workers](https://developers.cloudflare.com/workers/configuration/multipart-upload-metadata/) : le déploiement REST utilise une partie JSON `metadata` et un fichier module référencé par `main_module`.
- [Limites R2](https://developers.cloudflare.com/r2/platform/limits/) : limites des API de gestion et des opérations d’objets; le Worker applique une taille maximale applicative de 10 MiB pour les images et 50 MiB pour les vidéos.
- [Rate Limiting API des Workers](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/) : les compteurs locaux sont éventuellement cohérents et géographiques; le projet emploie donc KV pour un seuil applicatif simple, sans conserver l’adresse IP brute.
