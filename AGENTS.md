# This is NOT the Next.js you know

This repo uses Next 16.x. APIs, conventions and runtime details may differ from older habits.
Before changing architecture-sensitive code, check the relevant docs in `node_modules/next/dist/docs/`.

# AGENTS.md

## Mission réelle du repo
Transformer Pictomag v3 en application dynamique exploitable en gardant l’UI existante.

Surfaces déjà présentes :
- home / feed
- marketplace gigs
- live shopping
- profile

Le repo n’est pas à reconstruire de zéro.
Il faut conserver ce qui est solide et remplacer progressivement ce qui est encore mocké ou prototype.

## Ce qu’il faut préserver
- la structure App Router actuelle
- le design et les composants visuels existants
- l’infrastructure live shopping realtime déjà en place
- la couche `src/lib/server/*`
- la persistance SQLite existante comme base de reprise court terme
- les tests E2E live existants

## Ce qu’il faut remplacer progressivement
- l’auth prototype basée sur `userId` + `role`
- les identités invitées comme flux principal produit
- les données mockées du feed
- les données seedées métier de la marketplace
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

## Règles absolues
- Toujours travailler sur une seule phase à la fois.
- Toujours analyser l’existant avant de modifier du code.
- Ne jamais mélanger auth, posts, marketplace, messaging et live shopping dans une seule tâche.
- Ne pas refaire le design si le besoin est purement métier.
- Ne pas introduire une nouvelle stack backend tant que SQLite suffit pour stabiliser le MVP.
- Ne pas remplacer brutalement une couche existante sans plan de migration.
- Toute donnée critique doit être persistée.
- Toute permission sensible doit être vérifiée côté serveur.
- Toute fonctionnalité nouvelle doit être testée manuellement, et testée automatiquement si elle touche un flux critique.

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
- live bids / cart / checkout si nécessaire

### Moyen terme
Unifier les routes API autour de domaines métier cohérents :
- `/api/auth/*`
- `/api/profile/*`
- `/api/posts/*`
- `/api/gigs/*`
- `/api/orders/*`
- `/api/conversations/*`
- `/api/messages/*`
- `/api/live-shopping/*`

## Priorités produit
Ordre obligatoire :
1. vraie auth + users + profiles
2. feed + posts + profil réel
3. marketplace réelle + messagerie minimale
4. live shopping relié au vrai produit + durcissement tests

## Définition de terminé
Une phase est terminée seulement si :
- le code compile
- les routes répondent
- les données sont réellement persistées
- l’UI existante est branchée à de vraies données
- les placeholders critiques de la phase sont retirés
- les erreurs principales sont gérées
- les tests manuels sont documentés
- les tests automatiques critiques passent

## Format de réponse obligatoire pour chaque tâche
### Avant de coder
1. État actuel
2. Ce qui est mocké ou incomplet
3. Plan court
4. Fichiers exacts à modifier
5. Risques de régression

### Après avoir codé
1. Résumé de ce qui a été implémenté
2. Liste des fichiers modifiés
3. Commandes à lancer
4. Tests manuels
5. Tests automatiques
6. Ce qui reste provisoire
7. Dette technique éventuelle

## Interdictions
- Ne pas laisser une feature “fonctionnelle en apparence” si elle repose encore sur des mocks.
- Ne pas créer une nouvelle base de données ou un ORM juste pour faire moderne.
- Ne pas casser le live shopping existant pendant les phases 1 à 3.
- Ne pas supprimer les chemins de compatibilité tant que le front existant dépend encore d’eux.
- Ne pas faire de refonte générale quand une migration locale suffit.

## Stratégie de migration
- Garder les composants visuels
- Remplacer d’abord les sources de données
- Introduire les nouvelles tables
- Créer les routes API
- Brancher l’UI
- Supprimer ensuite les mocks et compatibilités devenus inutiles