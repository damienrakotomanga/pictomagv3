# This is NOT the Next.js you know

This repo uses Next 16.x. APIs, conventions and runtime details may differ from older habits.
Before changing architecture-sensitive code, check the relevant docs in `node_modules/next/dist/docs/`.

# AGENTS.md

## Mission reelle du repo
Transformer Pictomag v3 en application dynamique exploitable en gardant l'UI existante.

Surfaces deja presentes :
- home / feed
- marketplace gigs
- live shopping
- profile

Le repo n'est pas a reconstruire de zero.
Il faut conserver ce qui est solide et remplacer progressivement ce qui est encore mocke ou prototype.

## Ce qu'il faut preserver
- la structure App Router actuelle
- le design et les composants visuels existants
- l'infrastructure live shopping realtime deja en place
- la couche `src/lib/server/*`
- la persistance SQLite existante comme base de reprise court terme
- les tests E2E live existants

## Ce qu'il faut remplacer progressivement
- l'auth prototype basee sur `userId` + `role`
- les identites invitees comme flux principal produit
- les donnees mockees du feed
- les donnees seedees metier de la marketplace
- les placeholders du profil
- les domaines absents ou incomplets:
  - User
  - Profile
  - Post
  - PostMedia
  - Gig
  - Order
  - Conversation
  - Message
  - LiveSession

## Regles absolues
- Toujours travailler sur une seule phase a la fois.
- Toujours analyser l'existant avant de modifier du code.
- Ne jamais melanger auth, posts, marketplace, messaging et live shopping dans une seule tache.
- Ne pas refaire le design si le besoin est purement metier.
- Ne pas introduire une nouvelle stack backend tant que SQLite suffit pour stabiliser le MVP.
- Ne pas remplacer brutalement une couche existante sans plan de migration.
- Toute donnee critique doit etre persistee.
- Toute permission sensible doit etre verifiee cote serveur.
- Toute fonctionnalite nouvelle doit etre testee manuellement, et testee automatiquement si elle touche un flux critique.

## Architecture de reprise
### Court terme
Conserver SQLite et `src/lib/server/sqlite-store.ts` comme stockage principal pour :
- users
- profiles
- posts
- post_media
- gigs
- orders
- conversations
- messages
- live_sessions
- live bids / cart / checkout si necessaire

### Moyen terme
Unifier les routes API autour de domaines metier coherents :
- `/api/auth/*`
- `/api/profile/*`
- `/api/posts/*`
- `/api/gigs/*`
- `/api/orders/*`
- `/api/conversations/*`
- `/api/messages/*`
- `/api/live-shopping/*`

## Priorites produit
Ordre obligatoire :
1. vraie auth + users + profiles
2. feed + posts + profil reel
3. marketplace reelle + messagerie minimale
4. live shopping relie au vrai produit + durcissement tests

## Definition de termine
Une phase est terminee seulement si :
- le code compile
- les routes repondent
- les donnees sont reellement persistees
- l'UI existante est branchee a de vraies donnees
- les placeholders critiques de la phase sont retires
- les erreurs principales sont gerees
- les tests manuels sont documentes
- les tests automatiques critiques passent

## Format de reponse obligatoire pour chaque tache
### Avant de coder
1. Etat actuel
2. Ce qui est mocke ou incomplet
3. Plan court
4. Fichiers exacts a modifier
5. Risques de regression

### Apres avoir code
1. Resume de ce qui a ete implemente
2. Liste des fichiers modifies
3. Commandes a lancer
4. Tests manuels
5. Tests automatiques
6. Ce qui reste provisoire
7. Dette technique eventuelle

## Interdictions
- Ne pas laisser une feature "fonctionnelle en apparence" si elle repose encore sur des mocks.
- Ne pas creer une nouvelle base de donnees ou un ORM juste pour faire moderne.
- Ne pas casser le live shopping existant pendant les phases 1 a 3.
- Ne pas supprimer les chemins de compatibilite tant que le front existant depend encore d'eux.
- Ne pas faire de refonte generale quand une migration locale suffit.

## Strategie de migration
- Garder les composants visuels
- Remplacer d'abord les sources de donnees
- Introduire les nouvelles tables
- Creer les routes API
- Brancher l'UI
- Supprimer ensuite les mocks et compatibilites devenus inutiles
