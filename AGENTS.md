# Repository Guidance

This workspace is an early scaffold for a reusable multi-game platform. The current reference game is Splendor.

## Architecture

- `packages/game-sdk` defines the shared platform contract:
  `GameDefinition`, transport-safe room snapshots, move/state serialization hooks, and client render props.
- `packages/game-registry` is a compile-time registry of installed games.
  Server and web code both resolve games through it.
- `packages/animation-core` defines the shared game-transition animation DSL.
  Public API is recursive `Animation` values plus primitives/combinators; compiled timing plans stay internal to the runner.
- `packages/ui` contains shared React/web helpers, including the animation runner hook used by game UIs.
- `packages/games/splendor` is currently a single self-contained game package.
  Its `src/model`, `src/rules`, `src/platform`, and `src/ui` folders separate domain data, pure rules, shared-platform adaptation, and rendering.
- `apps/server` owns room lifecycle, lobby subscriptions, room subscriptions, and the WebSocket runtime.
- `apps/web` opens one app-level socket, keeps the lobby live, and mounts a registered game client inside common room chrome.
- `apps/web` uses Tailwind CSS v4 through the Vite plugin.
  Storybook shares the same Tailwind pipeline.

## Current Behavior

- The web app now renders a live lobby and joins rooms over a single WebSocket connection.
- The server keeps room storage in memory and broadcasts full lobby and room snapshots.
- Rooms start in `waiting` state and transition to a live game once the required seat count is reached.

## Engineering Constraints

- Keep runtime code in TypeScript with strict typing preserved end-to-end.
- Prefer explicit domain types and tagged unions over `any`, `unknown` passthroughs, and unchecked casts.
- Favor pure functional style:
  game logic should be deterministic, data-first, and free of input mutation or ambient state.
- Prefer Tailwind utility classes directly in JSX for UI work.
  Avoid bespoke CSS for static styling, but animation keyframes and motion helper classes are an explicit exception.
- Keep platform concerns separate from game concerns:
  room lifecycle, players, versions, and transport belong in platform code;
  rules and player views belong in game packages.
- New game packages should follow the same split:
  `core` for the `GameDefinition` adapter, `ui` for rendering only.

## Known Gaps

- Runtime state is still in-memory only.
  Restarting `apps/server` clears rooms and subscriptions.
- The room service remains a stateful orchestration layer.
  Keep domain transitions in pure helpers and avoid letting WebSocket handlers absorb game logic.
- Serialization/deserialization is still plain-data oriented.
  Treat all boundary values as untrusted and extend decoders rather than widening casts.

## Useful Commands

Run these from the repo root:

    npm run typecheck:sdk
    npm run typecheck:registry
    npm run typecheck:splendor
    npm run typecheck:server
    npm run typecheck:web

## Editing Guidance

- Before changing shared contracts, inspect impact across `game-sdk`, `game-registry`, `apps/server`, and `apps/web`.
- If you add a new game, update both the shared registry and the web client registry.
- Avoid introducing hidden framework coupling into `core` packages.
- Prefer adding narrow helper types instead of widening existing APIs.
- For visual changes, add or update Storybook stories in `apps/web/src/*.stories.tsx` so major UI states stay inspectable without the live server.
- For transition work, prefer adding stories under `Animation/*` or `Splendor/*` that exercise real before/after game states through the shared runner instead of faking DOM-only motion.
