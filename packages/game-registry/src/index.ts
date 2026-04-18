import { type GameDefinition } from '@games/game-sdk';
import { lostCitiesGameDefinition } from '@games/lost-cities';
import { splendorGameDefinition } from '@games/splendor';

export const registeredGames: readonly {
  readonly definition: GameDefinition<any, any, any, any, any>;
}[] = [
  {
    definition: lostCitiesGameDefinition,
  },
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
