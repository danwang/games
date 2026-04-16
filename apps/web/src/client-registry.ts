import { splendorGameDefinition } from '@games/splendor';
import { splendorClientModule } from '@games/splendor/ui';

const registeredGameClients = [
  {
    definition: splendorGameDefinition,
    client: splendorClientModule,
  },
] as const;

export const getRegisteredGameClient = (gameId: string) =>
  registeredGameClients.find((registeredGame) => registeredGame.definition.id === gameId) ?? null;
