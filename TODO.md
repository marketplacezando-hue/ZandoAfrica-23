
## Ajustements compacts, aperçu PDF et liens produits

- [x] Réduire la taille du logo ZandoAfrica dans l’en-tête, réduire les icônes de catégories et les autres icônes ciblées, et réduire légèrement les boutons en conservant un rendu professionnel, moderne et responsive sur ordinateur, tablette et téléphone.
- [x] Afficher chaque description produit dans un cadre dédié à hauteur limitée avec une barre de défilement verticale interne, confortable sur mobile et ordinateur.
- [x] Limiter le mode aperçu des documents à 20 pages maximum côté interface et côté génération serveur, empêcher la navigation au-delà de cette limite, et conserver le document complet après achat selon les droits existants.
- [x] Générer les nouveaux liens produits sous la forme courte `/p/:id` à partir de l’identifiant existant, sans modifier les utilisateurs ni les produits enregistrés; conserver la compatibilité des anciens liens `/produit/:id`.
- [x] Vérifier TypeScript, la compilation Vite, le format du diff, l’encodage/décodage d’identifiant court et la cohérence du manifeste de routes. Le lint global reste limité par les outils sandbox préexistants (`ast-grep` absent et sortie `.dist` configurée vers `/workspace`).
- [ ] Pousser la branche `main` et confirmer le déploiement Vercel existant `zando-africa-23`.
