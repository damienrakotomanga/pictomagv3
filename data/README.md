# `data/`

## Statut actuel

- `pictomag.db` est une **snapshot locale provisoire** utilisee par le projet aujourd'hui.
- Ce fichier **n'est pas** une fixture officielle ni un seed propre.
- Son contenu actuel inclut deja des donnees de dev, de test, des sessions locales et des traces runtime.

## Fichiers runtime locaux

- `pictomag.db-wal`
- `pictomag.db-shm`

Ces fichiers sont des artefacts SQLite locaux. Ils ne doivent pas polluer le repo et sont ignores via `.gitignore`.

## Fichiers legacy locaux

- `user-preferences.json`
- `user-runtime-state.json`

Ces fichiers correspondent a d'anciens artefacts runtime locaux. Ils ne sont plus la source de verite principale et doivent rester ignores.

## Suite prevue

L'extraction d'une vraie fixture SQLite propre sera traitee dans un sprint dedie, apres sanitation explicite des donnees.
