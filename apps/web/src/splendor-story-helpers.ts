import {
  reduceGame,
  setupGameWithSeed,
  splendorGameDefinition,
  type Move as SplendorMove,
  type PlayerIdentity as SplendorPlayerIdentity,
  type SplendorPlayerView,
  type SplendorState,
} from '@games/splendor';
import { type ActiveRoomSnapshot, type PlayerSeat } from '@games/game-sdk';
import { splendorDiscardScenario, splendorPrimaryScenario, splendorRecordedConfig, splendorRecordedPlayers } from './splendor-recorded-fixtures.js';

const players = splendorRecordedPlayers satisfies readonly SplendorPlayerIdentity[];

const activeSeats: readonly PlayerSeat[] = players.map((player, index) => ({
  id: `seat-${index + 1}`,
  playerId: player.id,
  displayName: player.displayName,
}));

const config = splendorGameDefinition.normalizeConfig(splendorRecordedConfig);

const replayScenario = (
  setupSeed: string,
  moves: readonly SplendorMove[],
): readonly SplendorState[] => {
  const history: SplendorState[] = [setupGameWithSeed(players, config, setupSeed)];
  let currentState = history[0]!;

  for (const move of moves) {
    const result = reduceGame(currentState, move);

    if (!result.ok) {
      throw new Error(result.error.message);
    }

    currentState = result.state;
    history.push(currentState);
  }

  return history;
};

export const primaryHistory = replayScenario(
  splendorPrimaryScenario.setupSeed,
  splendorPrimaryScenario.moves,
);
export const discardHistory = replayScenario(
  splendorDiscardScenario.setupSeed,
  splendorDiscardScenario.moves,
);

export const baseSplendorState = primaryHistory[splendorPrimaryScenario.checkpoints.opening]!;
export const simulatedMidgameState = primaryHistory[splendorPrimaryScenario.checkpoints.midgame]!;
export const simulatedDiscardState = discardHistory[splendorDiscardScenario.checkpoints.discard]!;
export const simulatedNobleState = primaryHistory[splendorPrimaryScenario.checkpoints.nobleChoice]!;
export const simulatedFinishedState = primaryHistory[splendorPrimaryScenario.checkpoints.finished]!;

export const splendorStoryPlayerId = players[0].id;
export const splendorStoryGuestId = players[1].id;

export const createSplendorRoom = (
  state: SplendorState,
  overrides: Partial<ActiveRoomSnapshot> = {},
): ActiveRoomSnapshot => ({
  id: 'splendor-story-room',
  gameId: splendorGameDefinition.id,
  config: splendorGameDefinition.serializeConfig(config),
  seats: activeSeats,
  stateVersion: 1,
  state: splendorGameDefinition.serializeState(state),
  status: state.status,
  ...overrides,
});

export const createSplendorPlayerView = (
  state: SplendorState,
  playerId: string | null,
): SplendorPlayerView => splendorGameDefinition.selectPlayerView(state, playerId);

export const getSplendorActivePlayerId = (state: SplendorState): string =>
  state.players[state.turn.activePlayerIndex]!.identity.id;

export type SplendorStoryPerspective = 'active' | 'other';

export const getSplendorPerspectivePlayerId = (
  state: SplendorState,
  perspective: SplendorStoryPerspective,
): string => {
  const activePlayerId = getSplendorActivePlayerId(state);

  if (perspective === 'active') {
    return activePlayerId;
  }

  return state.players.find((player) => player.identity.id !== activePlayerId)?.identity.id ?? activePlayerId;
};

export const createReplayHistory = (): readonly ActiveRoomSnapshot[] => [
  createSplendorRoom(primaryHistory[splendorPrimaryScenario.checkpoints.replayBefore]!, {
    stateVersion: 30,
  }),
  createSplendorRoom(primaryHistory[splendorPrimaryScenario.checkpoints.replayAfter]!, {
    stateVersion: 31,
  }),
];

const createRoomHistoryThrough = (
  history: readonly SplendorState[],
  inclusiveIndex: number,
): readonly ActiveRoomSnapshot[] =>
  history.slice(0, inclusiveIndex + 1).map((state, index) =>
    createSplendorRoom(state, {
      stateVersion: index + 1,
    }),
  );

export const createPrimaryRoomHistoryThrough = (
  inclusiveIndex: number,
): readonly ActiveRoomSnapshot[] => createRoomHistoryThrough(primaryHistory, inclusiveIndex);

export const createDiscardRoomHistoryThrough = (
  inclusiveIndex: number,
): readonly ActiveRoomSnapshot[] => createRoomHistoryThrough(discardHistory, inclusiveIndex);

export const withDiscardPhase = (): SplendorState => simulatedDiscardState;

export const withNobleChoice = (): SplendorState => simulatedNobleState;

export const withReservedPressure = (): SplendorState => simulatedMidgameState;

export const withFinishedGame = (): SplendorState => simulatedFinishedState;
