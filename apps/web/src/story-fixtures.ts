import { splendorGameDefinition } from '@games/splendor';
import { type LobbySnapshot, type PlayerSeat, type RoomSnapshot } from '@games/game-sdk';

const targetScores = [15, 16, 17, 18] as const;

const waitingSeats: readonly PlayerSeat[] = [
  {
    id: 'seat-1',
    playerId: 'player-ada',
    displayName: 'Ada',
  },
  {
    id: 'seat-2',
    playerId: 'player-grace',
    displayName: 'Grace',
  },
] as const;

const activeSeats: readonly PlayerSeat[] = [
  {
    id: 'seat-1',
    playerId: 'player-ada',
    displayName: 'Ada',
  },
  {
    id: 'seat-2',
    playerId: 'player-grace',
    displayName: 'Grace',
  },
  {
    id: 'seat-3',
    playerId: 'player-margaret',
    displayName: 'Margaret',
  },
  {
    id: 'seat-4',
    playerId: 'player-edsger',
    displayName: 'Edsger',
  },
] as const;

const waitingConfig = splendorGameDefinition.normalizeConfig({
  seatCount: 4,
  targetScore: 21,
});

const activeConfig = splendorGameDefinition.normalizeConfig({
  seatCount: 4,
  targetScore: 21,
});

const activeState = splendorGameDefinition.createInitialState(activeConfig, activeSeats, 'storybook-seed');

export const storyPlayerId = 'player-ada';
export const storyGuestPlayerId = 'player-grace';

export const waitingRoomSnapshot: RoomSnapshot = {
  id: 'room-waiting-1',
  gameId: splendorGameDefinition.id,
  config: splendorGameDefinition.serializeConfig(waitingConfig),
  stateVersion: 0,
  seats: waitingSeats,
  state: null,
  status: 'waiting',
};

export const activeRoomSnapshot: RoomSnapshot = {
  id: 'room-active-1',
  gameId: splendorGameDefinition.id,
  config: splendorGameDefinition.serializeConfig(activeConfig),
  stateVersion: 3,
  seats: activeSeats,
  state: splendorGameDefinition.serializeState(activeState),
  status: 'in_progress',
};

export const emptyLobbySnapshot: LobbySnapshot = {
  rooms: [],
};

export const populatedLobbySnapshot: LobbySnapshot = {
  rooms: [
    {
      id: waitingRoomSnapshot.id,
      gameId: waitingRoomSnapshot.gameId,
      status: waitingRoomSnapshot.status,
      stateVersion: waitingRoomSnapshot.stateVersion,
      config: waitingRoomSnapshot.config,
      seatCount: 4,
      occupiedSeatCount: 2,
    },
    {
      id: activeRoomSnapshot.id,
      gameId: activeRoomSnapshot.gameId,
      status: activeRoomSnapshot.status,
      stateVersion: activeRoomSnapshot.stateVersion,
      config: activeRoomSnapshot.config,
      seatCount: 4,
      occupiedSeatCount: 4,
    },
  ],
};

export const crowdedLobbySnapshot: LobbySnapshot = {
  rooms: Array.from({ length: 10 }, (_, index) => {
    const roomNumber = index + 1;
    const isWaitingRoom = index % 3 !== 1;
    const seatCount = roomNumber % 2 === 0 ? 4 : 3;
    const occupiedSeatCount = isWaitingRoom ? Math.max(1, seatCount - 1) : seatCount;
    const targetScore = targetScores[index % targetScores.length] ?? targetScores[0];

    return {
      id: `room-${roomNumber.toString().padStart(2, '0')}`,
      gameId: splendorGameDefinition.id,
      status: isWaitingRoom ? 'waiting' : 'in_progress',
      stateVersion: roomNumber,
      config: splendorGameDefinition.serializeConfig({
        seatCount,
        targetScore,
      }),
      seatCount,
      occupiedSeatCount,
    };
  }),
};

export const availableStoryGames = [
  {
    id: splendorGameDefinition.id,
    displayName: splendorGameDefinition.displayName,
    description: splendorGameDefinition.description,
    defaultConfig: splendorGameDefinition.serializeConfig(splendorGameDefinition.defaultConfig),
    configFields: splendorGameDefinition.configFields,
  },
] as const;
