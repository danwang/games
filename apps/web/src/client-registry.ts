import { type GameClientModule, type GameDefinition } from '@games/game-sdk';
import { lostCitiesGameDefinition } from '@games/lost-cities';
import { lostCitiesClientModule } from '@games/lost-cities/ui';
import { splendorGameDefinition } from '@games/splendor';
import { splendorClientModule } from '@games/splendor/ui';

const registeredGameClients: readonly {
  readonly definition: GameDefinition<any, any, any, any, any>;
  readonly client: GameClientModule<any, any, any>;
}[] = [
  {
    definition: lostCitiesGameDefinition,
    client: lostCitiesClientModule,
  },
  {
    definition: splendorGameDefinition,
    client: splendorClientModule,
  },
] as const;

export const getRegisteredGameClient = (gameId: string) =>
  registeredGameClients.find((registeredGame) => registeredGame.definition.id === gameId) ?? null;
