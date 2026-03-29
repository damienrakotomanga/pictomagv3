# PLANS.md

## Objectif
Stabiliser Pictomag v3 sans repartir de zéro, en gardant l’UI et l’infrastructure realtime déjà utiles, puis en remplaçant les couches prototype par de vrais flux métier.

---

## Phase 1 - Auth réelle + Users + Profiles

### Objectif
Remplacer l’auth prototype par une vraie authentification applicative minimale.

### À garder
- `src/lib/server/auth-user.ts`
- `src/lib/server/preference-user.ts`
- `src/lib/server/sqlite-store.ts`
- l’UI existante

### À créer ou étendre
- table `users`
- table `profiles`
- endpoints:
  - `/api/auth/register`
  - `/api/auth/login`
  - `/api/auth/logout`
  - `/api/profile/me`

### À migrer
- `api/auth/session` ne doit plus être le flux principal de connexion
- les identités `guest-*` et `userId` en query deviennent des compatibilités temporaires seulement

### Critères de validation
- un utilisateur peut créer un compte
- un utilisateur peut se connecter
- un utilisateur peut se déconnecter
- la session persiste au refresh
- une route privée refuse un visiteur non connecté
- le profil “me” est lu depuis la vraie base

### Livrables
- tables et helpers côté serveur
- endpoints auth
- protection des routes privées
- tests manuels documentés

---

## Phase 2 - Feed réel + Posts + Profile branché

### Objectif
Transformer le feed et le profil en surfaces réellement alimentées par les données.

### À garder
- `feed-page.tsx`
- `profile-page.tsx`
- la structure visuelle actuelle

### À créer ou étendre
- table `posts`
- table `post_media`
- endpoints:
  - `/api/posts`
  - `/api/posts/[postId]`
  - `/api/profile/[userId]`

### À retirer progressivement
- `mockVideos` comme source métier principale
- placeholders critiques du profil pour les actions de cette phase

### Critères de validation
- un utilisateur connecté peut créer un post
- le feed liste les vrais posts
- le profil affiche les vrais posts du user
- les médias de post sont reliés aux posts
- les données du feed principal ne viennent plus des mocks

### Livrables
- tables posts/media
- endpoints posts/profile
- feed branché
- profil branché

---

## Phase 3 - Marketplace réelle + Messagerie minimale

### Objectif
Remplacer les données marketplace seedées par de vraies données et ajouter une messagerie privée minimale.

### À garder
- l’UI marketplace
- les vues existantes
- les composants de navigation

### À créer ou étendre
- table `gigs`
- table `orders`
- table `conversations`
- table `messages`
- endpoints:
  - `/api/gigs`
  - `/api/gigs/[gigId]`
  - `/api/orders`
  - `/api/conversations`
  - `/api/messages`

### À retirer progressivement
- `serviceGigs`
- `seedOrders`
- `topNotifications`
- `topMessages`
comme source métier principale

### Critères de validation
- un utilisateur peut créer un gig
- la marketplace liste les vrais gigs
- une commande peut être créée et relue
- deux utilisateurs peuvent échanger des messages
- les messages sont persistés

### Livrables
- tables gigs/orders/conversations/messages
- endpoints marketplace et messaging
- marketplace branchée
- messagerie minimale branchée

---

## Phase 4 - Live shopping relié au vrai produit + durcissement

### Objectif
Conserver l’infrastructure live existante et la brancher aux vrais users, gigs, orders et permissions.

### À garder
- les endpoints live shopping existants
- Redis / WebSocket / SSE
- les tests E2E live existants
- les audit logs existants

### À créer ou étendre
- table `live_sessions`
- tables ou structures nécessaires pour bids / cart / checkout si absentes
- liens réels entre live, users, gigs, orders

### À retirer progressivement
- les chemins de compatibilité qui reposent sur des identités provisoires
- les données live isolées qui ne sont pas reliées aux vraies entités métier

### Critères de validation
- un utilisateur authentifié peut entrer dans un live
- les actions live sont reliées au vrai user
- les flux d’enchère / panier / checkout ne reposent plus sur une identité fictive
- les permissions serveur sont cohérentes
- les tests E2E critiques passent

### Livrables
- live relié aux vraies entités métier
- permissions renforcées
- tests E2E mis à jour
- nettoyage des compatibilités obsolètes

---

## Règles d’exécution
- Une seule phase active à la fois
- Ne pas démarrer la phase suivante si la précédente n’est pas validée
- Toujours fournir un plan avant le code
- Toujours lister les fichiers modifiés
- Toujours signaler ce qui reste mocké ou provisoire

---

## Journal de validation
À la fin de chaque phase, ajouter :
- date
- statut
- fichiers principaux touchés
- régressions éventuelles
- éléments encore provisoires