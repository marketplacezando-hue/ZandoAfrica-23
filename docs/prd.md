# Document d'exigences

## 1. Apercu de l'application

### 1.1. Nom de l'application
Zando Africa

### 1.2. Description de l'application
Zando Africa est une plateforme Web de petites annonces et de commerce en ligne pour les pays africains (Congo-Brazzaville, RDC, Cote d'Ivoire, Senegal, Benin, Cameroun, Burkina Faso, Mali, etc.). La plateforme permet aux acheteurs de consulter les annonces filtrees avec une repartition equilibree (75% de produits locaux et 25% de produits etrangers), de suivre les donnees en temps reel (produits, avis, publicites, vues dedupliquees par IP) et de contacter directement les vendeurs via WhatsApp ou appel securise. Les vendeurs publient leurs annonces avec visuels, videos locales et variantes. La plateforme comprend un accueil optimise avec carrousels vedettes et PUB VIP, des formulaires de publication et de campagne epures, et un portail d'administration pour la moderation et la gestion globale.

---

## 2. Utilisateurs et scenarios d'utilisation

### 2.1. Utilisateurs cibles
- **Acheteur / Visiteur** : Parcourt les annonces selon le pays selectionne avec un flux mixte (75% local / 25% etranger), consulte les fiches produits et avis mis a jour en temps reel, navigue dans les galeries medias et contacte le vendeur de maniere securisee.
- **Vendeur / Annonceur** : Publie des annonces avec photos et videos, active des campagnes publicitaires sans surcharge textuelle, souscrit aux encarts PUB VIP et suit les vues reelles dedupliquees de ses articles.
- **Administrateur** : Modere les annonces et les avis, supervise la diffusion des publicites VIP et parametre les devises et regles de la plateforme depuis l'espace de gestion.

### 2.2. Scenarios d'utilisation principaux
- **Consultation avec mix geographique** : L'utilisateur selectionne son pays et accede a un flux d'annonces compose de 75% d'articles issus de son pays et 25% d'articles issus d'autres pays avec des badges de provenance distincts.
- **Mise a jour en temps reel** : Les modifications de statut de produits, nouveaux avis, publicites VIP et compteurs de vues sont repercutes instantanement sur les ecrans des visiteurs actifs.
- **Comptabilisation unique des vues** : Chaque consultation d'une fiche produit incremente le compteur de vues uniquement si l'adresse IP du visiteur n'a pas deja ete enregistree pour ce produit.
- **Navigation epuree sans selecteur de devises** : L'utilisateur navigue sur toutes les interfaces publiques du site sans presence de bouton ou menu de selection de devises.

---

## 3. Structure des pages et specifications fonctionnelles

### 3.1. Structure du site

```
Zando Africa
├── Barre d'En-tete Globale
│   ├── Logo Zando Africa (Redirection Accueil)
│   ├── Selecteur de Pays
│   ├── Barre de Recherche
│   ├── Bouton « Publier »
│   └── Bouton d'Ouverture du Menu de Navigation
├── Menu de Navigation (Tiroir Mobile / Menu Deroulant)
│   ├── Bouton Accueil
│   ├── Bouton Favoris
│   ├── Bouton Publier une Annonce
│   ├── Bouton PUB VIP / Promotions
│   └── Acces Administrateur Discret
├── Page d'Accueil
│   ├── Premier Encadrement (Conteneur Vert Fonce)
│   │   ├── Carrousel Automatique Combine (Messages promotionnels + Images vedettes)
│   │   └── Bouton d'Action « Publier mon annonce »
│   ├── Deuxieme Encadrement Bleu (PUB VIP)
│   │   ├── Premiere Diapositive : Message Promotionnel VIP
│   │   ├── Rotation des Publicites VIP Actives
│   │   └── Declencheur d'Ouverture de Modale Detail PUB VIP
│   ├── Grille des Categories
│   ├── Section Produits Populaires
│   └── Flux Mixte d'Annonces (Ratio 75% Local / 25% Etranger avec badges)
├── Modal / Interface Detaillee PUB VIP
│   ├── Image Agrandie
│   ├── Titre et Description Complete
│   ├── Lien Externe Associe (si disponible)
│   ├── Coordonnees de l'Annonceur
│   └── Bouton de Fermeture
├── Page de Detail du Produit
│   ├── Galerie Medias Interactive (Swipe horizontal)
│   ├── Badge de Provenance (Local ou International)
│   ├── Compteur de Vues Uniques (Deduplication par IP)
│   ├── Colonne Vendeur & Certification
│   │   ├── Carte Vendeur avec Badge « Vendeur certifie ZandoAfrica »
│   │   ├── Message d'Avertissement Anti-Arnaque
│   │   ├── Bouton Marchand Conditionnel
│   │   └── Boutons WhatsApp et Appel Direct
│   ├── Caracteristiques & Variantes
│   └── Section Avis en Temps Reel
├── Formulaire de Publication d'Annonce
├── Interfaces de Souscription et Campagnes
│   ├── Bouton « Activer la campagne »
│   └── Bouton « Obtenir mon promo »
├── Page des Favoris
├── Pied de Page Global
│   ├── Informations Generales
│   ├── Liens Institutionnels et Mentions Legales
│   └── Acces Admin Discret
└── Modal et Espace d'Administration
    ├── Moderation des Annonces
    ├── Gestion des Avis
    ├── File de Diffusion PUB VIP
    └── Parametres Generaux et Devises
```

---

### 3.2. Specifications fonctionnelles publiques

#### 3.2.1. Barre d'En-tete et Navigation Globale
- **Logo Zando Africa** : Redirige vers le haut de la page d'accueil au clic depuis l'ensemble des pages.
- **Suppression Totale du Selecteur de Devises** : Le selecteur de devises est retire de l'integralite des interfaces publiques (en-tete, pages produits, formulaires, pied de page). Aucun menu deroulant ou bouton de devise n'est visible pour les visiteurs publics.
- **Selecteur de Pays** : Permet au visiteur de definir le pays de reference servant a la distribution geographique des annonces.
- **Bouton « Publier »** : Donne un acces direct au formulaire de publication avec alignement stable.
- **Menu de Navigation** : Propose les acces Accueil, Favoris, Publier une annonce, PUB VIP et acces administrateur.

#### 3.2.2. Page d'Accueil
- **Premier Encadrement (Vert Fonce)** :
  - Carrousel combine faisant defiler de facon alternee les messages textuels promotionnels et les images des articles vedettes sans chevauchement.
  - Bouton d'action « Publier mon annonce » integre dans le cadre.
- **Deuxieme Encadrement Bleu (Publicites VIP)** :
  - Premiere diapositive avec message promotionnel dedie (« PUB VIP », « Votre site ici ! Boostez votre visibilite », « Touchez plus de 50 000 acheteurs potentiels par jour a travers 8 pays d'Afrique. », « Emplacement VIP en tete d'accueil. »).
  - Rotation automatique des publicites VIP actives synchronisees en temps reel.
  - Clic sur une publicite ouvrant la modale detaillee (image, texte, lien et contacts).
- **Flux d'Annonces avec Mix 75% Local / 25% Etranger** :
  - Affichage selon un ratio structure de 3 annonces locales (du pays choisi) pour 1 annonce etrangere (autres pays africains ou international).
  - Chaque carte de produit affiche un badge visuel distinct indiquant son origine (« Produit Local » ou nom du pays d'origine pour les articles etrangers).

#### 3.2.3. Page de Detail du Produit
- **Galerie Medias** : Navigation horizontale fluide entre les photos et videos locales.
- **Comptabilisation des Vues par IP** :
  - Enregistrement de l'adresse IP a l'ouverture de la fiche.
  - Increment unique du compteur de vues par adresse IP pour chaque produit.
  - Affichage du nombre total de vues dedupliquees.
- **Bloc Vendeur et Actions** : Badge « Vendeur certifie ZandoAfrica », alerte anti-arnaque, bouton marchand conditionnel et boutons d'appel/WhatsApp sans exposition publique du numero.
- **Section Avis** : Affichage et ajout d'avis mis a jour en direct.

#### 3.2.4. Synchronisation en Temps Reel
- Integration d'un canal de mise a jour continue (Supabase Realtime) permettant d'actualiser sans rechargement de page :
  - L'apparition, la modification ou la suppression des annonces produits.
  - Les nouveaux avis publies.
  - Les publicites VIP actives dans le carrousel bleu.
  - L'incrementation du compteur de vues.

#### 3.2.5. Formulaires et Actions Simplifiees
- **Bouton d'Activation de Campagne** : Libelle « Activer la campagne » centre.
- **Bouton de Code Promotionnel** : Libelle « Obtenir mon promo » centre.

#### 3.2.6. Pied de Page (Footer)
- Fond vert fonce harmonise avec mentions legales, contacts et acces administrateur discret, sans composant de selection de devises.

---

### 3.3. Specifications du Portail d'Administration

#### 3.3.1. Authentification Administrateur
- Formulaire de connexion securise par identifiant et mot de passe accessible via lien discret.

#### 3.3.2. Gestion et Configuration
- Moderation et validation des annonces soumises.
- Gestion des avis clients (approbation / suppression).
- Gestion de la file de diffusion PUB VIP (activation, visuels, liens externes, dates de validite).
- Configuration administrative des pays et de la devise de reference appliquee par defaut aux transactions.

---

## 4. Regles de gestion et logique metier

1. **Absence de Selecteur Public de Devises** : Le choix de devise est masque a l'utilisateur public sur toutes les pages ; la plateforme utilise la devise de reference definie en administration pour le pays concerne.
2. **Distribution 75/25 des Annonces** : Le moteur de rendu des listes de produits selectionne 75% d'annonces correspondant au pays actif de l'utilisateur et 25% d'annonces provenant d'autres pays enregistres. En cas de volume insuffisant d'un cote, les annonces disponibles sont affichees avec leur badge de provenance respectif.
3. **Deduplication des Vues par IP** : Une vue n'est incrementee que si l'adresse IP source n'est pas deja associee a l'identifiant du produit dans le registre des consultations.
4. **Propagation Realtime** : Tout evenement d'insertion, modification ou suppression concernant les produits, avis, vues et publicites VIP est transmis immediatement aux clients connectes.
5. **Redirection Logo** : Tout clic sur le logo ramene au sommet de la page d'accueil.
6. **Ordre du Carrousel VIP** : Le message introductif VIP s'affiche en premiere position avant la sequence des publicites VIP actives.
7. **Filtrage des Publicites VIP** : Seules les annonces publicitaires ayant le statut actif et non expire participent a la diffusion.
8. **Libelles Fixes des Boutons** : Les boutons promotionnels conservent strictement les libelles « Activer la campagne » et « Obtenir mon promo ».

---

## 5. Exceptions et cas limites

| Cas limite | Comportement attendu |
| :--- | :--- |
| Visiteur sans adresse IP identifiable ou masquee | La fiche produit est consultee normalement ; l'incrementation de la vue est neutralisee pour eviter les doublons errones. |
| Moins de 75% d'annonces locales disponibles | La plateforme affiche toutes les annonces locales existantes et complete l'espace restant avec les annonces etrangeres en conservant les badges distincts. |
| Moins de 25% d'annonces etrangeres disponibles | La plateforme complete la liste avec l'ensemble des annonces locales disponibles sans laisser de zone vide. |
| Perte temporaire de connexion Realtime | L'application affiche les dernieres donnees en cache local et retablit automatiquement l'ecoute des flux des le retour de la connexion. |
| Aucune publicite VIP active | Le deuxieme encadrement bleu maintient en continu le panneau d'information promotionnel VIP d'accueil. |
| Clic sur publicite VIP sans lien externe | La modale detaillee affiche les coordonnees et le texte en masquant le bouton de redirection externe. |

---

## 6. Criteres d'acceptation

1. **Suppression Complete du Selecteur de Devises** : Aucun selecteur ou bouton de changement de devise n'apparait sur l'en-tete, l'accueil, les fiches produits, les formulaires ou le pied de page du site public.
2. **Mixite Geographique 75/25** : Le flux principal d'annonces presente 75% d'articles issus du pays selectionne et 25% d'articles etrangers, chacun dote d'un badge explicite d'origine.
3. **Comptabilisation Unique par IP** : Les consultations repetees d'un meme produit depuis une meme adresse IP ne comptabilisent qu'une seule vue unique.
4. **Actualisation en Temps Reel** : L'ajout d'une annonce, la publication d'un avis, l'activation d'une PUB VIP et l'increment de vue se mettent a jour sans rechargement manuel de la page via Supabase Realtime.
5. **Fonctionnement du Premier Encadrement** : Le carrousel vert fonce alterne messages promotionnels et images vedettes sans chevauchement avec bouton d'action maintenu.
6. **Fonctionnement du Deuxieme Encadrement (PUB VIP)** : La diapositive introductive s'affiche en premier, suivie par les publicites actives ouvrant leur modale detaillee au clic.
7. **Formulaires et Intitules** : Les boutons affichent strictement « Activer la campagne » et « Obtenir mon promo » avec centrage et execution complete.
8. **Fluidite et Responsive** : L'ensemble de la navigation et de la galerie produit fonctionne sans debordement horizontal sur mobiles, tablettes et ordinateurs.

---

## 7. Fonctionnalites non retenues pour le MVP

1. Module de paiement bancaire ou wallet integre directement dans l'interface.
2. Messagerie instantanee interne proprietaire.
3. Systeme d'encheres en direct sur les annonces.
4. Geotracking cartographique automatise des transporteurs.