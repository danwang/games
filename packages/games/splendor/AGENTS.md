# Splendor Package Guidance

This directory contains the reference implementation for how a game plugs into the platform.

## Package Roles

- `src/model` contains core domain types and static card / noble data.
- `src/rules` contains the pure game engine.
- `src/platform/definition.ts` wraps the rules in the shared `GameDefinition` interface.
- `src/ui/index.tsx` is intentionally thin.
  It renders state, delegates transitions to `src/ui/animations.ts`, and submits selected moves back through the shared callback.
- `src/ui/animation-targets.ts` owns stable target ids for the board.
- `src/ui/animations.ts` is the Splendor recipe layer over `@games/animation-core`.
  Keep move choreography here rather than baking it into the React tree.

## Core Expectations

- Keep `src/platform` as a pure adapter layer.
  It should normalize config, create state, list legal moves, apply moves, and derive player views without platform or React concerns.
- Preserve the engine's determinism.
  Seed handling, seat mapping, and move application should stay explicit.
- Replace unchecked casts with decoding or validation wherever practical.
  The current `deserializeState` and `deserializeMove` implementations are trust-based.
- Keep player authorization logic explicit.
  `listMovesForPlayer` and `applyMoveForPlayer` currently guard on the active player only.

## UI Expectations

- Keep UI logic presentation-only.
  Do not move rules, authorization, or transport state into `ui`.
- Preserve the split between authored animation recipes and execution.
  `animateTransition(move, beforeState, afterState)` should return shared `Animation` values;
  compilation/scheduling stays in the shared animation package.
- Preserve concrete move and state types in props.
  Avoid widening to `unknown` or `any` inside the view layer.
- Use Tailwind utility classes in JSX for layout and surface styling.
  Motion-specific CSS classes/keyframes live in the app stylesheet and are allowed when needed for animation parity.
- If the UI gets richer, derive display-specific values locally from typed state instead of reshaping platform contracts.

## Current Caveats

- The current UI only labels moves by `move.type`, so distinct moves of the same type are visually ambiguous.
- The adapter assumes the rules `state.status` shape matches platform room status strings.
  If that stops being true, the platform should introduce an explicit mapper instead of structural probing.
- Replay and live transitions should share the same animation path.
  If you add a new move family, update both Storybook transition stories and the recipe layer.
