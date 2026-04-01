# PLANS.md

## Objectif
Stabiliser puis faire evoluer Pictomag v3 sans repartir de zero, en gardant l'UI et l'infrastructure utile deja en place, puis en remplacant progressivement les couches prototype par de vrais flux metier.

---

## Phase 1 - Auth reelle + Users + Profiles

### Objectif
Remplacer l'auth prototype par une vraie authentification applicative minimale.

### A garder
- `src/lib/server/auth-user.ts`
- `src/lib/server/preference-user.ts`
- `src/lib/server/sqlite-store.ts`
- l'UI existante

### A creer ou etendre
- table `users`
- table `profiles`
- endpoints :
  - `/api/auth/register`
  - `/api/auth/login`
  - `/api/auth/logout`
  - `/api/profile/me`

### A migrer
- `api/auth/session` ne doit plus etre le flux principal de connexion
- les identites `guest-*` et `userId` en query deviennent des compatibilites temporaires seulement

### Criteres de validation
- un utilisateur peut creer un compte
- un utilisateur peut se connecter
- un utilisateur peut se deconnecter
- la session persiste au refresh
- une route privee refuse un visiteur non connecte
- le profil "me" est lu depuis la vraie base

### Livrables
- tables et helpers cote serveur
- endpoints auth
- protection des routes privees
- tests manuels documentes

---

## Phase 2 - Feed reel + Posts + Profile branche

### Objectif
Transformer le feed et le profil en surfaces reellement alimentees par les donnees.

### A garder
- `feed-page.tsx`
- `profile-page.tsx`
- la structure visuelle actuelle

### A creer ou etendre
- table `posts`
- table `post_media`
- endpoints :
  - `/api/posts`
  - `/api/posts/[postId]`
  - `/api/profile/[userId]`

### A retirer progressivement
- `mockVideos` comme source metier principale
- placeholders critiques du profil pour les actions de cette phase

### Criteres de validation
- un utilisateur connecte peut creer un post
- le feed liste les vrais posts
- le profil affiche les vrais posts du user
- les medias de post sont relies aux posts
- les donnees du feed principal ne viennent plus des mocks

### Livrables
- tables posts/media
- endpoints posts/profile
- feed branche
- profil branche

---

## Phase 3 - Marketplace reelle + Messagerie minimale

### Objectif
Remplacer les donnees marketplace seedees par de vraies donnees et ajouter une messagerie privee minimale.

### A garder
- l'UI marketplace
- les vues existantes
- les composants de navigation

### A creer ou etendre
- table `gigs`
- table `orders`
- table `conversations`
- table `messages`
- endpoints :
  - `/api/gigs`
  - `/api/gigs/[gigId]`
  - `/api/orders`
  - `/api/conversations`
  - `/api/messages`

### A retirer progressivement
- `serviceGigs`
- `seedOrders`
- `topNotifications`
- `topMessages`
comme source metier principale

### Criteres de validation
- un utilisateur peut creer un gig
- la marketplace liste les vrais gigs
- une commande peut etre creee et relue
- deux utilisateurs peuvent echanger des messages
- les messages sont persistes

### Livrables
- tables gigs/orders/conversations/messages
- endpoints marketplace et messaging
- marketplace branchee
- messagerie minimale branchee

---

## Phase 4 - Live shopping relie au vrai produit + durcissement

### Objectif
Conserver l'infrastructure live existante et la brancher aux vrais users, gigs, orders et permissions.

### A garder
- les endpoints live shopping existants
- Redis / WebSocket / SSE
- les tests E2E live existants
- les audit logs existants

### A creer ou etendre
- table `live_sessions`
- tables ou structures necessaires pour bids / cart / checkout si absentes
- liens reels entre live, users, gigs, orders

### A retirer progressivement
- les chemins de compatibilite qui reposent sur des identites provisoires
- les donnees live isolees qui ne sont pas reliees aux vraies entites metier

### Criteres de validation
- un utilisateur authentifie peut entrer dans un live
- les actions live sont reliees au vrai user
- les flux d'enchere / panier / checkout ne reposent plus sur une identite fictive
- les permissions serveur sont coherentes
- les tests E2E critiques passent

### Livrables
- live relie aux vraies entites metier
- permissions renforcees
- tests E2E mis a jour
- nettoyage des compatibilites obsoletes

---

## Phase 5 - Streaming live de niveau produit

### Objectif global
Faire evoluer le live shopping actuel vers une architecture de streaming exploitable en production, avec :
- publication desktop via OBS
- publication mobile type Whatnot
- lecture temps reel cote viewers
- encheres temps reel robustes
- separation claire entre logique metier Pictomag et transport media

### Principe d'architecture
Pictomag reste le **control plane** :
- auth
- users
- profiles
- gigs
- orders
- auction state
- checkout
- permissions
- audit logs
- orchestration des live sessions
- emission des credentials d'ingest et de lecture

Un service separe devient le **media plane** :
- ingest OBS
- publication mobile
- lecture viewer
- rooms / participants
- eventuel recording / replay plus tard

### Choix cible par defaut
- provider media cible : **LiveKit**
- media plane separe du repo principal
- desktop seller : **RTMP d'abord**, **WHIP ensuite**
- mobile seller : **WebRTC**
- viewers : lecture guest autorisee sur les lives publics, auth obligatoire pour interagir
- Redis conserve pour la diffusion temps reel metier
- la base Pictomag reste la source de verite finale des encheres, lots, timers, checkout et orders

### Documentation de reference
- `docs/architecture/live-streaming-phase-5a.md`

---

## Phase 5A - Architecture streaming only

### Objectif
Prendre les decisions d'architecture sans coder de nouvelle feature produit lourde.

### Livrables attendus
- un document d'architecture dedie
- un schema textuel des flux
- une liste des services et responsabilites
- une liste des nouveaux modeles de donnees
- une liste des variables d'environnement probables
- un plan de migration minimal vers 5B

### Decisions a verrouiller
- Pictomag = control plane
- media plane separe
- comparaison LiveKit vs SRS
- recommandation par defaut
- flux desktop OBS
- flux mobile vendeur
- flux viewer
- architecture officielle des encheres
- dependances avec users / gigs / orders / conversations / live sessions

### Criteres de validation
- l'architecture cible est choisie et documentee
- le role exact de Pictomag vs media plane est documente
- le role exact de Redis est documente
- les flux OBS, mobile seller et viewer sont decrits
- les flux d'enchere sont decrits de bout en bout
- aucune implementation lourde n'est lancee tant que ce document n'est pas valide

---

## Phase 5B - Control plane prep

### Objectif
Preparer le control plane Pictomag pour accueillir un vrai media plane sans casser le live actuel.

### A implementer
- etendre SQLite avec les tables et colonnes live minimales
- relier les lots live aux vrais gigs via `gig_id`
- introduire un timer officiel serveur
- ajouter les contrats control plane necessaires :
  - create ingest
  - create viewer token
  - media webhook update
  - open / close auction
- conserver les endpoints live existants autant que possible

### Criteres de validation
- les nouvelles donnees live critiques sont persistees
- les lots live pointent vers de vraies entites produit pour les nouveaux flux
- le timer officiel appartient au serveur
- les permissions sensibles sont verifiees cote serveur

---

## Phase 5C - Media plane integration

### Objectif
Integrer le provider media retenu sans refaire l'architecture du repo principal.

### A implementer
- OBS RTMP fonctionnel
- viewer token / descriptor fonctionnel
- publication mobile WebRTC contractuellement prete
- webhooks provider -> Pictomag
- synchronisation propre de l'etat media vers les sessions live Pictomag

### Criteres de validation
- un vendeur peut publier depuis OBS
- un vendeur mobile peut publier via WebRTC
- un viewer peut regarder le live
- l'etat media est reflechi dans Pictomag

---

## Phase 5D - Hardening production

### Objectif
Durcir l'ensemble pour une exploitation produit.

### A traiter
- securite des tokens media
- TTL et rotation
- TURN / reseau / NAT si WebRTC
- monitoring et logs
- gestion des coupures stream
- strategie de reprise et fin de live
- tests critiques et E2E renforces
- suppression des compatibilites live devenues inutiles

### Criteres de validation
- les scenarios critiques passent
- les flux sensibles sont journalises
- les comportements en cas de coupure sont definis
- une release candidate peut etre preparee

---

## Regles d'execution Phase 5
- ne pas modifier l'UI plus que necessaire
- ne pas ajouter de nouvelles features sociales hors besoin direct du live
- ne pas casser les phases 1 a 4
- ne pas faire du media plane dans le repo principal si un service separe est retenu
- toute action d'enchere doit etre validee cote serveur
- le timer officiel d'enchere appartient au serveur, jamais au client
- la base applicative reste la source de verite finale des actions metier

---

## Regles d'execution globales
- Une seule phase active a la fois
- Ne pas demarrer la phase suivante si la precedente n'est pas validee
- Toujours fournir un plan avant le code
- Toujours lister les fichiers modifies
- Toujours signaler ce qui reste mocke, seede ou provisoire

---

## Journal de validation
A la fin de chaque phase, ajouter :
- date
- statut
- fichiers principaux touches
- regressions eventuelles
- elements encore provisoires
