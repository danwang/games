import { type CardTier, type GemColor, type TokenColor } from '../model/types.js';

export type SplendorAnimationTargetId = string;

export const splendorAnimationTargets = {
  bankChip: (color: GemColor): SplendorAnimationTargetId => `bank:${color}`,
  deck: (tier: CardTier): SplendorAnimationTargetId => `deck:${tier}`,
  marketCard: (cardId: string): SplendorAnimationTargetId => `market:${cardId}`,
  marketSlot: (tier: CardTier, index: number): SplendorAnimationTargetId => `market-slot:${tier}:${index}`,
  nobleTile: (nobleId: string): SplendorAnimationTargetId => `noble:${nobleId}`,
  playerChip: (playerId: string, color: GemColor): SplendorAnimationTargetId =>
    `player:${playerId}:chips:${color}`,
  playerNobles: (playerId: string): SplendorAnimationTargetId => `player:${playerId}:nobles`,
  playerReserved: (playerId: string): SplendorAnimationTargetId => `player:${playerId}:reserved`,
  playerRow: (playerId: string): SplendorAnimationTargetId => `player:${playerId}:row`,
  playerScore: (playerId: string): SplendorAnimationTargetId => `player:${playerId}:score`,
  playerTableau: (playerId: string): SplendorAnimationTargetId => `player:${playerId}:tableau`,
  playerTableauBonus: (playerId: string, color: TokenColor): SplendorAnimationTargetId =>
    `player:${playerId}:tableau:${color}`,
  viewportNobleOrigin: (): SplendorAnimationTargetId => 'viewport:noble-origin',
} as const;
