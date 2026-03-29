# Pictomag v3

Pictomag regroupe plusieurs vues produit autour d'un meme noyau:

- home / feed
- marketplace gigs
- live shopping
- profile

## Lancer le projet

1. Copie [`.env.example`](C:/Users/lordsadler/Desktop/pictomagv3/.env.example) vers `.env.local`.
2. Démarre Redis pour le realtime multi-processus:

```bash
npm run redis:up
```

3. Lance Next sur le port de travail du projet:

```bash
npm run dev:3005
```

Ouvre ensuite [http://127.0.0.1:3005](http://127.0.0.1:3005).

## Variables utiles

```bash
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3005
PICTOMAG_BASE_URL=http://127.0.0.1:3005
PICTOMAG_TEST_USER_ID=critical-smoke-user
PICTOMAG_LIVE_WS_PORT=3011
PICTOMAG_LIVE_WS_SECRET=change-me
PICTOMAG_LIVE_WS_TTL_SECONDS=90
PICTOMAG_LIVE_REDIS_URL=redis://127.0.0.1:6379
PICTOMAG_ALLOW_QUERY_USER_ID=1
```

## Realtime live shopping

Le transport realtime des salles live fonctionne ainsi:

- l'UI demande d'abord un descriptor via `/api/live-shopping/realtime`
- si WebSocket est disponible, elle reste sur WebSocket
- sinon elle reste sur SSE
- on ne bascule plus automatiquement d'un transport à l'autre dans une boucle côté client
- `PICTOMAG_LIVE_REDIS_URL` active la propagation inter-processus via Redis pub/sub

Pour le dev local, Redis est fourni par [docker-compose.yml](C:/Users/lordsadler/Desktop/pictomagv3/docker-compose.yml).

## Tests

Smoke tests critiques:

```bash
npm run test:critical
```

Test E2E Playwright sur le flow live room:

```bash
npm run test:e2e
```

Le test E2E couvre:

- ouverture d'une salle live
- ouverture de la modale d'enchère
- confirmation d'une enchère
- envoi d'un message dans le chat

## Build

```bash
npm run lint
npm run build
```

## Arrêter Redis

```bash
npm run redis:down
```
