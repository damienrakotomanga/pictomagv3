<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md

## Objectif du projet
Transformer ce repo en une application web dynamique de type réseau social avec :
- authentification utilisateur
- profils utilisateur
- publication de posts texte + image
- messagerie privée entre utilisateurs
- marketplace de gigs
- live shopping

Le design visuel existant doit être conservé autant que possible.
Priorité absolue à la logique fonctionnelle, à la persistance des données et à la stabilité.

---

## Règles de travail
- Toujours commencer par analyser l’existant avant de coder.
- Toujours proposer un mini-plan avant une implémentation complexe.
- Travailler sur une seule fonctionnalité à la fois.
- Ne jamais mélanger plusieurs domaines métier dans une même tâche :
  - auth
  - posts
  - messaging
  - gigs marketplace
  - live shopping
- Ne pas refactoriser massivement sans nécessité.
- Ne pas casser le design existant sans raison claire.
- Préférer des changements petits, lisibles et testables.
- Garder les composants UI séparés de la logique métier.
- Centraliser les appels API/services.
- Toute logique de permission doit être validée côté serveur.
- Toute donnée critique doit être persistée en base.
- Toute fonctionnalité doit gérer les erreurs minimales.

---

## Ce qu’il faut éviter
- Ne pas simuler une fonctionnalité avec des données mockées si l’objectif est de la rendre réelle.
- Ne pas laisser une page “fonctionnelle en apparence” sans backend réel.
- Ne pas créer de fonctionnalités partielles sans le signaler clairement.
- Ne pas implémenter le live shopping tant que les fondations auth + données + posts ne sont pas stables.
- Ne pas inventer une architecture compliquée si une solution simple suffit.

---

## Définition de “terminé”
Une fonctionnalité est considérée comme terminée seulement si :
- le code compile
- les routes/API répondent correctement
- les données sont enregistrées en base
- les erreurs principales sont gérées
- le frontend est branché à la vraie donnée
- les écrans ne reposent plus sur des mocks pour cette fonctionnalité
- un test manuel est possible et documenté

---

## Format de réponse attendu pour chaque tâche
Avant de coder :
1. Résumer l’état actuel
2. Expliquer ce qui manque
3. Donner un plan court
4. Lister les fichiers à créer/modifier

Après avoir codé :
1. Résumer ce qui a été implémenté
2. Lister les fichiers modifiés
3. Lister les commandes à lancer
4. Donner les tests manuels à faire
5. Signaler explicitement ce qui reste statique ou non terminé

---

## Architecture cible minimale
L’application doit à terme contenir au minimum les entités suivantes :
- User
- Profile
- Post
- PostImage
- Conversation
- Message
- Gig
- LiveSession

Relations minimales :
- un User peut créer plusieurs Post
- un User peut créer plusieurs Gig
- une Conversation contient plusieurs Message
- un LiveSession appartient à un User

---

## Priorité MVP
Ordre d’implémentation recommandé :
1. Authentification + utilisateurs
2. Posts + upload photo + feed
3. Messagerie privée
4. Marketplace / gigs
5. Live shopping

Le live shopping est une fonctionnalité avancée.
Ne pas commencer cette partie avant la stabilité des 4 blocs précédents.

---

## Contraintes UX
- Conserver au maximum les écrans existants
- Remplacer les données statiques par de vraies données progressivement
- Ne pas dégrader le rendu visuel actuel
- Préserver les composants existants quand ils sont réutilisables

---

## En cas d’ambiguïté
- Faire l’hypothèse la plus simple et la plus réaliste
- L’expliquer brièvement
- Ne pas bloquer toute l’implémentation pour un détail secondaire