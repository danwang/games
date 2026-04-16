import { splendorGameDefinition } from '@games/splendor';

export const registeredGames = [
  {
    definition: splendorGameDefinition,
  },
] as const;

export const gameRegistry = new Map(
  registeredGames.map((game) => [game.definition.id, game] as const),
);

export const getGameDefinition = (gameId: string) => {
  return gameRegistry.get(gameId)?.definition ?? null;
};
