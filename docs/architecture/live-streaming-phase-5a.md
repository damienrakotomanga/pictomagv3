# Live Streaming Phase 5A

## Statut
Document d'architecture cible pour le streaming live de niveau produit.

Phase 5A est **strictement documentaire** :
- aucun serveur video n'est implemente ici
- aucune nouvelle UI lourde n'est ajoutee
- le live shopping actuel n'est pas casse
- l'infrastructure Redis / WebSocket / SSE existante est conservee

---

## 1. Etat actuel du live

Le live actuel a deja une base solide cote logique metier et temps reel :

### Endpoints live existants
- `/api/live-shopping/actions`
- `/api/live-shopping/chat`
- `/api/live-shopping/presence`
- `/api/live-shopping/realtime`
- `/api/live-shopping/stream`
- `/api/state/live-shopping-inventory`
- `/api/state/live-shopping-orders`
- `/api/state/live-shopping-schedule`

### Infrastructure temps reel existante
- Redis
- WebSocket
- SSE

### Persistance SQLite deja en place
- `live_sessions`
- `live_inventory_products`
- `live_schedule_entries`
- `live_room_state`
- `orders` avec `source = "live-shopping"`
- `audit_logs`

### Etat fonctionnel actuel
- des actions sensibles live sont deja partiellement reliees aux vrais users via `resolveAuthenticatedAppUser()`
- le checkout live produit deja de vraies commandes persistantes
- les lots, le chat et la salle vivent encore partiellement dans des structures seed / blob runtime

---

## 2. Limites de l'architecture actuelle

### Limites media
- il n'existe pas de vrai media plane
- pas d'ingest OBS
- pas de publication mobile WebRTC
- pas de lecture viewer production-grade

### Limites metier
- le live repose encore sur des evenements seedes dans `live-shopping-data.ts` pour une partie de la decouverte et du catalogue
- le `chat` est encore stocke dans le blob `live_room_state`, pas dans un journal dedie
- le `timer` d'enchere n'est pas encore un timer officiel serveur explicite
- le checkout live cree encore parfois un `gig` synthetique pour certains lots
- la lecture publique et la presence tolerent encore des identites de compatibilite

### Limites de separation
- le repo principal melange encore :
  - etat live metier
  - presentation UI
  - simulation de lecture media
- il faut separer clairement :
  - **Pictomag control plane**
  - **media plane**

---

## 3. Cartographie des dependances metier

### users / profiles
- seller publie le live
- buyer regarde, chat, encherit, checkout
- admin / moderator moderent

### gigs
- aujourd'hui le live peut encore creer un gig synthetique au checkout
- cible 5B : un lot live doit pointer vers un vrai produit existant via `gig_id`

### orders
- deja utilises pour transformer un achat live en vraie commande persistante
- restent la source metier pour le checkout live

### conversations / messages
- utiles pour le support post-achat ou le contact vendeur
- ne sont **pas** la source de verite du chat live

### live_sessions
- deja au centre des sessions live
- doivent etre enrichies pour porter le lien vers le media plane et l'etat officiel d'enchere

### Flux encore provisoires ou isoles
- `liveShoppingEvents` / `live-shopping-data.ts` pilotent encore la decouverte et certains fallback live
- `live_room_state` melange :
  - chat
  - bid state
  - etat courant de salle
- les viewers publics passent encore par des identites de compatibilite pour presence / lecture

---

## 4. Decision d'architecture

## 4.1 Pictomag = control plane

Pictomag reste le **control plane** et garde la responsabilite de :
- auth et permissions
- creation et planification des live sessions
- selection des lots mis en avant
- source de verite des encheres
- timer officiel
- checkout
- orders
- audit logs
- emission des credentials d'ingest et de lecture
- traitement des webhooks entrants du media plane
- diffusion temps reel metier via Redis + WebSocket + SSE

## 4.2 Media plane separe

Le **media plane** est un service dedie, hors repo principal. Il porte :
- ingest video/audio
- publication desktop OBS
- publication mobile WebRTC
- lecture viewer
- rooms / participants
- eventuel recording / replay plus tard

Le media plane **ne porte pas** :
- la logique d'enchere
- le timer officiel
- le checkout
- les permissions metier finales

---

## 5. Comparaison media plane

## Option A - LiveKit

### Forces
- tres bon fit pour un usage Whatnot-like avec mobile WebRTC natif
- gere des tokens / permissions de participant propres
- supporte RTMP et WHIP en ingress officiel
- architecture room / participant coherente avec seller / viewer / admin
- bon fit avec un control plane Node qui doit mint des tokens courts
- documentation officielle claire sur ingress RTMP / WHIP et auth room / token

### Faiblesses
- plus oriente temps reel WebRTC que diffusion massive low-cost style HLS only
- cout operationnel potentiellement plus eleve si l'audience devient tres large
- necessite un service ingress separe quand on self-host

## Option B - SRS

### Forces
- tres bon serveur media generaliste pour RTMP / WebRTC / HTTP-FLV / HLS
- plus simple si la priorite absolue est la diffusion video multi-protocoles
- peut bien convenir a un modele "OBS + viewers nombreux"

### Faiblesses
- moins produit-ready pour la logique rooms / participants / permissions applicatives
- plus de logique custom cote Pictomag pour auth, acces viewer et publication mobile
- la partie interactive type mobile seller + tokens + presence fine demande plus d'integration maison
- les docs SRS mentionnent encore des limites pratiques WebRTC selon les environnements

## Recommandation par defaut

**Choix recommande : LiveKit**

### Pourquoi
- meilleur fit pour un live shopping interactif type Whatnot
- meilleur alignement avec une future app mobile vendeur
- modele de securite / token plus propre pour separer control plane et media plane
- permet de conserver Redis / WS / SSE cote metier sans faire porter l'enchere au media
- permet un chemin de migration propre :
  - OBS desktop maintenant
  - mobile WebRTC ensuite
  - viewer temps reel sans reecrire la logique metier

**SRS** reste acceptable si l'objectif evolue vers une diffusion plus broadcast / CDN oriented, mais ce n'est pas le meilleur choix par defaut pour Pictomag.

---

## 6. Flux desktop seller

### Decision
L'architecture cible supporte **RTMP et WHIP**.

### Priorite produit
- **OBS via RTMP en premier**
- **OBS via WHIP en second**

### Pourquoi
- RTMP est le chemin le plus simple pour OBS et le moins risque pour un premier cutover
- WHIP reste la bonne cible moderne, mais ne doit pas bloquer la premiere mise en production

### Regle de migration
- 5B / 5C exposent un modele d'ingest qui sait declarer `rtmp` ou `whip`
- premiere integration fonctionnelle : `rtmp`
- `whip` arrive comme mode additionnel, pas comme prerequis

---

## 7. Flux mobile vendeur

### Decision
Le vendeur mobile publie via **WebRTC** vers le media plane.

### Role du futur client mobile
- login seller
- preflight camera / micro / reseau
- recuperation d'un publish token ephemere depuis Pictomag
- publication du flux au media plane
- commandes metier vers Pictomag :
  - demarrer / arreter le live
  - changer le lot courant
  - ouvrir / fermer une enchere
  - moderer le chat
  - mettre un lot en achat direct

Le client mobile ne doit pas parler directement a SQLite ni a Redis.

---

## 8. Flux viewer

### Decision
- lecture guest autorisee pour les lives publics
- auth requise pour :
  - chat
  - encherir
  - checkout
  - wallet
  - save / follow sensibles
- lives prives ou unlisted : auth + entitlement requis

### Permissions
- **seller**
  - publier le media
  - demarrer / stopper le live
  - choisir le lot courant
  - ouvrir / fermer enchere
  - moderer sa salle
- **buyer**
  - regarder
  - chatter
  - encherir
  - checkout
- **viewer guest**
  - regarder
  - consulter les lots publics
  - pas de chat
  - pas d'enchere
  - pas de checkout
- **admin**
  - override session
  - cloture forcee
  - moderation
  - audit

---

## 9. Architecture des encheres

### Source de verite
**Pictomag control plane** reste la source de verite.

Ni Redis, ni le media plane, ni le navigateur ne sont sources de verite.

### Diffusion temps reel
- Redis = bus de diffusion
- WebSocket / SSE existants = transport client
- le media plane ne diffuse pas les evenements d'enchere comme voie canonique

### Journal d'evenements
Ajouter un journal append-only de bids :
- `live_bid_events`

Chaque enchere acceptee :
- s'ecrit en DB
- ecrit un audit log
- met a jour l'etat courant du lot / de la session
- publie l'evenement vers Redis
- devient visible via WS / SSE

### Timer officiel
Le timer officiel doit devenir **serveur** :
- `auction_ends_at` persistant
- extension anti-sniping appliquee cote serveur
- un seul lease holder par enchere via Redis lock / lease
- le client affiche seulement le temps restant
- le media plane n'a aucune responsabilite sur ce timer

---

## 10. Services et responsabilites

### Service 1 - Pictomag API / Control Plane
- auth seller / buyer / viewer / admin
- session live CRUD
- lots live et lot courant
- liens avec gigs / orders
- bid validation
- timer officiel
- checkout
- audit
- token minting pour media plane
- webhooks entrants du media plane

### Service 2 - Redis Realtime Bus
- fanout des evenements live
- presence
- lease de timer / auction close
- coordination multi-instance

### Service 3 - SQLite metier
- persistance sessions / lots / bids / orders / audit
- source de verite MVP court terme

### Service 4 - Media Plane
- ingest RTMP / WHIP
- publish WebRTC mobile
- viewer playback
- remontee d'etat media au control plane

---

## 11. Schema textuel des flux

### Seller desktop
`Seller OBS -> Pictomag API (create ingest) -> Media Plane RTMP ingress -> Viewers`

### Seller mobile
`Seller mobile app -> Pictomag API (publish token) -> Media Plane WebRTC publish -> Viewers`

### Viewer
`Viewer web/mobile -> Pictomag API (viewer descriptor/token) -> Media Plane playback`

`Viewer actions (chat/bid/checkout) -> Pictomag API -> SQLite + Audit + Redis -> WS/SSE -> UI`

### Enchere
`Bid request -> Pictomag API -> validate auth/permission -> DB transaction -> live_bid_events + live_sessions/live lot state -> Redis publish -> WS/SSE update -> client rerender`

---

## 12. Nouveaux modeles de donnees minimaux

### Nouvelles tables

#### `live_media_streams`
- `id`
- `live_session_event_id`
- `provider`
- `room_name`
- `ingest_protocol`
- `provider_stream_id`
- `publisher_identity`
- `playback_hint`
- `state`
- `created_at`
- `updated_at`

#### `live_bid_events`
- `id`
- `live_session_event_id`
- `lot_id`
- `bidder_user_id`
- `amount`
- `max_proxy_amount`
- `status`
- `created_at`

### Extensions minimales des tables existantes

#### `live_sessions`
Ajouter :
- `media_provider`
- `media_room_name`
- `media_stream_id`
- `media_status`
- `publish_mode`
- `current_lot_id`
- `auction_status`
- `auction_ends_at`
- `started_at`
- `ended_at`

#### `live_inventory_products`
Ajouter :
- `gig_id`
- `live_session_event_id`
- `lot_order`

### Decision importante
Ne pas creer une nouvelle table pour le chat live en 5B tant que :
- le chat peut rester persiste dans `live_room_state`
- on n'a pas un besoin produit clair de recherche, moderation historique avancee ou replay detaille

---

## 13. Variables d'environnement probables

### Communes
- `PICTOMAG_LIVE_MEDIA_PROVIDER`
- `PICTOMAG_LIVE_REDIS_URL`
- `PICTOMAG_LIVE_SIGNING_SECRET`
- `PICTOMAG_LIVE_WEBHOOK_SECRET`
- `PICTOMAG_LIVE_PUBLIC_VIEWER_MODE`
- `PICTOMAG_LIVE_TIMER_LEASE_TTL_MS`

### Si LiveKit
- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `LIVEKIT_WS_URL`
- `LIVEKIT_INGRESS_BASE_URL`
- `LIVEKIT_RTMP_BASE_URL`
- `LIVEKIT_WHIP_BASE_URL`

### Si SRS
- `SRS_API_URL`
- `SRS_RTMP_BASE_URL`
- `SRS_WHIP_BASE_URL`
- `SRS_WHEP_BASE_URL`
- `SRS_SECRET`

---

## 14. Plan de migration minimal

### 5A
- documenter l'architecture
- documenter le decoupage control plane / media plane
- choisir LiveKit par defaut
- definir les modeles et contrats a venir
- ne changer aucun flux runtime

### 5B
- etendre SQLite avec `live_media_streams`, `live_bid_events` et les colonnes live minimales
- lier les lots live aux vrais gigs via `gig_id`
- arreter progressivement la creation de gigs synthetiques pour les nouveaux lots
- introduire le timer officiel serveur
- conserver les endpoints live existants autant que possible
- ajouter les webhooks / provider stubs cote control plane
- conserver l'infra Redis / WS / SSE existante

### 5C
- integrer le media plane choisi
- OBS RTMP fonctionnel
- viewer token / descriptor fonctionnel
- mobile seller publish WebRTC contractuellement pret
- webhooks provider -> Pictomag live session state

### 5D
- tests E2E et critiques renforces
- anti-sniping durci
- audit / replay operationnel
- suppression des compatibilites live devenues inutiles
- verification multi-instance avec Redis reellement actif

---

## 15. Risques de regression

- derive entre `live_room_state` et les nouveaux champs normalises si la migration n'est pas progressive
- rupture des lives publics si on verrouille trop tot la lecture a l'auth stricte
- duplication de la source de verite si Redis ou le media plane commencent a porter l'etat metier
- commandes live cassees si le fallback `gig` synthetique est retire avant que tous les lots referencent un vrai `gig_id`
- timer double si plusieurs instances cloturent la meme enchere sans lease Redis clair

---

## 16. Ce que Phase 5A ne code volontairement pas

- aucun serveur video
- aucune integration LiveKit ou SRS
- aucune nouvelle UI lourde
- aucun changement des endpoints live runtime existants
- aucun changement marketplace / feed / profile
- aucun client mobile
- aucune suppression brutale des compatibilites existantes

---

## 17. Checklist de demarrage pour la Phase 5B

- valider le provider par defaut : **LiveKit**
- valider la regle desktop : **RTMP d'abord, WHIP ensuite**
- valider la regle viewer : **guest watch, auth pour interagir**
- preparer les migrations SQLite minimales
- preparer les contrats control plane :
  - create ingest
  - create viewer token
  - media webhook update
  - open / close auction
- definir la strategie de migration du lot live :
  - nouveau lot -> vrai `gig_id`
  - ancien lot -> fallback compat tant que necessaire

---

## 18. Decisions prises

- **Control plane : Pictomag**
- **Media plane separe : oui**
- **Provider recommande par defaut : LiveKit**
- **Desktop seller : support RTMP + WHIP, RTMP en premier**
- **Mobile seller : WebRTC**
- **Viewer public : guest autorise en lecture**
- **Encheres : source de verite cote Pictomag + Redis pour fanout**
- **Journal d'encheres : table dediee**
- **Timer officiel : serveur**
- **Conversations/messages : hors chat live, a garder pour le support prive**
- **Infrastructure realtime existante : conservee**

---

## 19. References utiles

- [LiveKit ingress overview](https://docs.livekit.io/home/ingress/overview/)
- [LiveKit self-hosting ingress](https://docs.livekit.io/home/self-hosting/ingress/)
- [LiveKit authentication](https://docs.livekit.io/home/get-started/authentication/)
- [SRS WebRTC](https://ossrs.net/lts/en-us/docs/v7/doc/webrtc)
- [SRS origin cluster](https://ossrs.net/lts/en-us/docs/v7/doc/origin-cluster)

---

## 20. Hypotheses retenues

- Pictomag garde SQLite pour preparer 5B, sans migration de stack
- le live shopping actuel continue d'operer pendant toute la preparation 5A
- les viewers publics doivent continuer a pouvoir decouvrir un live sans compte
- la logique d'enchere ne doit jamais dependre du media plane
