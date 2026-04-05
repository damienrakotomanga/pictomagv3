# Pictomag v3

Pictomag regroupe plusieurs surfaces produit autour d'un meme noyau :

- home / feed
- marketplace gigs
- live shopping
- profile

Le repo garde l'UI existante et remplace progressivement les couches prototype par de vrais flux metier.

## Lancer le projet

1. Copier [`.env.example`](C:\Users\lordsadler\Desktop\pictomagv3\.env.example) vers `.env.local`.
2. Demarrer Redis pour le realtime multi-processus :

```bash
npm run redis:up
```

3. Lancer Next sur le port de travail du projet :

```bash
npm run dev:3005
```

Ouvrir ensuite [http://127.0.0.1:3005](http://127.0.0.1:3005).

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

Le transport realtime des salles live fonctionne ainsi :

- l'UI demande d'abord un descriptor via `/api/live-shopping/realtime`
- si WebSocket est disponible, elle reste sur WebSocket
- sinon elle reste sur SSE
- on ne bascule plus automatiquement d'un transport a l'autre dans une boucle cote client
- `PICTOMAG_LIVE_REDIS_URL` active la propagation inter-processus via Redis pub/sub

Pour le dev local, Redis est fourni par [docker-compose.yml](C:\Users\lordsadler\Desktop\pictomagv3\docker-compose.yml).

## Donnees locales

- `data/pictomag.db` est la snapshot locale actuellement utilisee par l'application.
- Ce fichier n'est pas une fixture officielle.
- Les artefacts runtime SQLite (`*.db-wal`, `*.db-shm`) sont locaux et ignores.
- Voir [data/README.md](C:\Users\lordsadler\Desktop\pictomagv3\data\README.md) pour le detail.

## Structure utile

- `src/` : application et logique produit
- `public/` : assets servis par Next
- `tests/` : tests E2E
- `scripts/` : scripts utilitaires
- `docs/architecture/` : documentation d'architecture
- `docs/assets/design-references/` : visuels de travail, captures et references de design

## Tests

Smoke tests critiques :

```bash
npm run test:critical
```

Tests E2E Playwright :

```bash
npm run test:e2e
```

## Verification build

```bash
npm run lint
npm run build
```

## Arreter Redis

```bash
npm run redis:down
```
