import { type DrawSource, type GameState, type Move } from '../model/types.js';
import { getActiveColors, getTopDiscard, isPlayableOnExpedition } from './helpers.js';

const listAvailableDrawSources = (
  state: GameState,
  disallowedDiscardColor: string | null,
): readonly DrawSource[] => [
  ...(state.drawPile.length > 0 ? [{ type: 'deck' as const }] : []),
  ...getActiveColors(state.config).flatMap((color) => {
    if (color === disallowedDiscardColor) {
      return [];
    }

    return getTopDiscard(state.discardPiles, color)
      ? [{ type: 'discard' as const, color }]
      : [];
  }),
];

export const listLegalMoves = (state: GameState): readonly Move[] => {
  if (state.status === 'finished') {
    return [];
  }

  const player = state.players[state.activePlayerIndex];

  if (!player) {
    return [];
  }

  return player.hand.flatMap((card) => {
    const drawAfterPlay = listAvailableDrawSources(state, null);
    const drawAfterDiscard = listAvailableDrawSources(state, card.color);
    const expedition = player.expeditions[card.color];

    return [
      ...(isPlayableOnExpedition(expedition, card)
        ? drawAfterPlay.map((drawSource) => ({
            type: 'play' as const,
            cardId: card.id,
            drawSource,
          }))
        : []),
      ...drawAfterDiscard.map((drawSource) => ({
        type: 'discard' as const,
        cardId: card.id,
        drawSource,
      })),
    ];
  });
};
