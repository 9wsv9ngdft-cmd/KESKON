# KESKON 💬 — la web app

**Qu'est-ce qu'on… mange, fait, regarde, joue, écoute, lit, met, offre, visite, commande ?**
Les parents proposent, toute la famille swipe, et on voit tout de suite ce qui plaît à tout le monde.

👉 **Ouvrir l'appli : https://9wsv9ngdft-cmd.github.io/KESKON/**

Sur iPhone : ouvre le lien dans Safari → bouton Partager → « Sur l'écran d'accueil », et KESKON s'ouvre comme une vraie appli.

## Ce qu'il y a dedans
- 10 rubriques, 240 cartes avec photo, résumé et fiche détaillée (recettes, films, règles des jeux, sorties…)
- Les parents proposent, les enfants swipent (OUI à droite, NON à gauche)
- La roue des rubriques, verticale et infinie
- L'éco-geste du jour, avec un aperçu des autres jours pour la démo
- « Où êtes-vous ? » pour visiter autour de chez soi (Wikipédia et OpenStreetMap)
- Amis, groupes, messages, sondages, jeux (morpion, pierre-feuille-ciseaux, dé, pile ou face, action ou vérité) et fonds de discussion
- QCM des goûts et allergies, sons et ambiances sonores, mode clair ou sombre, aide, intro animée
- KESKON Premium (paiement simulé en mode test)

## Technique
Site statique, sans dépendance ni étape de construction : `index.html`, `style.css`, `app.js` et un petit moteur d'affichage maison (`lib/mini.js`).
Les données restent sur l'appareil (mode démo).
