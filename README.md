# Games Workspace

This repo is a TypeScript monorepo for a reusable turn-based game platform.

It currently contains shared platform packages, a live WebSocket-driven web shell, an in-memory server runtime, and one reference game integration for Splendor.

## Layout

- `apps/server`
  Shared backend ownership for rooms, game lifecycle, and transport-facing orchestration.
- `apps/web`
  Shared frontend shell that mounts a registered game's UI inside common room chrome.
- `packages/game-sdk`
  Shared contracts for game definitions, room snapshots, and transport envelopes.
- `packages/game-registry`
  Build-time registration of installed games.
- `packages/games/<game-id>/core`
  Pure game logic and types.
- `packages/games/<game-id>/ui`
  Game-specific rendering and input mapping.

## Current State

- Splendor is the only integrated game today.
- `packages/games/splendor` is a single package with `model`, `rules`, `platform`, and `ui` folders under `src/`.
- `src/platform/definition.ts` adapts the Splendor rules to the shared `GameDefinition` contract.
- `src/ui/index.tsx` is a minimal React client used to prove the registry and rendering boundary.
- `apps/web` opens a single WebSocket connection, subscribes to the live lobby, and joins a room over the same socket.
- `apps/server` runs an in-memory lobby/room runtime over WebSockets. Room storage is still ephemeral and resets on restart.

## Typechecking

The Splendor rules engine now lives directly inside `packages/games/splendor/src/rules` and `src/model`.

## Running The Demo

Install dependencies from the repo root:

    pnpm install

Start the server and web app together:

    pnpm dev

Then open `http://localhost:5173`.

Notes:

- `pnpm dev` starts both `apps/server` and `apps/web`.
- In local development, the client connects to `ws://127.0.0.1:3001`.
- The lobby stays subscribed while the user is inside a room.
- Room data is in-memory only; restarting the server clears all rooms.

## Render Deployment

This repo is now set up to deploy as a single Render web service.

The Node server in `apps/server` serves both:

- the WebSocket / room backend
- the built frontend assets from `apps/web/dist`

The included [render.yaml](/Users/danwang/workspace/games/render.yaml) defines the service.

Use these commands on Render:

- Build Command:

      pnpm install --frozen-lockfile && pnpm build

- Start Command:

      pnpm --filter @games/platform-server start

The server reads `PORT` automatically and exposes a health check at:

    /healthz

### URL Resolution

The web client resolves its WebSocket URL like this:

- `VITE_SERVER_URL`, if set
- otherwise `ws://127.0.0.1:3001` for localhost
- otherwise same-origin host as a fallback

For the single-service Render setup, you usually do not need `VITE_SERVER_URL`, because the browser can connect back to the same host that served the page.

## Design Rules

- Game cores remain pure, framework-free, and deterministic.
- Platform code owns rooms, websocket flow, state versioning, and player/session concerns.
- Game UIs render game state and submit moves through shared callbacks, but do not own transport.
- Per-room parameters such as seat count and target score are stored in room config and passed into game setup, not embedded in the static game definition.
