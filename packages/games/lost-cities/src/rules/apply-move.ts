import { type Card, type GameState, type Move, type PlayerState, type ReduceGameResult } from '../model/types.js';
import {
  drawFromDiscard,
  replacePlayer,
  resolveGameResult,
  scorePlayer,
  sortHand,
} from './helpers.js';
import { createNextRoundState } from './setup.js';
import { listLegalMoves } from './legal-moves.js';

const fail = (message: string): ReduceGameResult => ({
  ok: false,
  error: { message },
});

const removeHandCard = (
  player: PlayerState,
  cardId: string,
): { readonly player: PlayerState; readonly card: Card | null } => {
  const card = player.hand.find((entry) => entry.id === cardId) ?? null;

  if (!card) {
    return { player, card: null };
  }

  return {
    card,
    player: {
      ...player,
      hand: player.hand.filter((entry) => entry.id !== cardId),
    },
  };
};

const finishRound = (state: GameState): ReduceGameResult => {
  const roundScores = [
    scorePlayer(state.players[0]),
    scorePlayer(state.players[1]),
  ] as const;
  const cumulativeScores = [
    state.cumulativeScores[0] + roundScores[0],
    state.cumulativeScores[1] + roundScores[1],
  ] as const;
  const completedRounds = [
    ...state.completedRounds,
    {
      roundNumber: state.currentRound,
      startingPlayerIndex: state.startingPlayerIndex,
      scores: roundScores,
      cumulativeScores,
    },
  ] as const;

  if (state.currentRound >= state.config.matchLength) {
    return {
      ok: true,
      state: {
        ...state,
        status: 'finished',
        completedRounds,
        cumulativeScores,
        result: resolveGameResult(state.players, cumulativeScores),
      },
    };
  }

  const nextStartingPlayerIndex =
    cumulativeScores[0] === cumulativeScores[1]
      ? state.startingPlayerIndex
      : cumulativeScores[0] > cumulativeScores[1]
        ? 0
        : 1;

  return {
    ok: true,
    state: {
      ...createNextRoundState(
        {
          ...state,
          completedRounds,
          cumulativeScores,
        },
        nextStartingPlayerIndex,
      ),
    },
  };
};

export const reduceGame = (state: GameState, move: Move): ReduceGameResult => {
  if (state.status === 'finished') {
    return fail('The game is already finished.');
  }

  const legalMove = listLegalMoves(state).find(
    (candidate) => JSON.stringify(candidate) === JSON.stringify(move),
  );

  if (!legalMove) {
    return fail('The requested move is not legal in the current state.');
  }

  const activePlayerIndex = state.activePlayerIndex;
  const player = state.players[activePlayerIndex];

  if (!player) {
    return fail('The active player could not be resolved.');
  }

  const { player: handWithoutCard, card } = removeHandCard(player, move.cardId);

  if (!card) {
    return fail('The requested card is not in the active player hand.');
  }

  const updatedPlayer =
    move.type === 'play'
      ? {
          ...handWithoutCard,
          expeditions: {
            ...handWithoutCard.expeditions,
            [card.color]: [...handWithoutCard.expeditions[card.color], card],
          },
        }
      : handWithoutCard;
  const discardPiles =
    move.type === 'discard'
      ? {
          ...state.discardPiles,
          [card.color]: [...state.discardPiles[card.color], card],
        }
      : state.discardPiles;
  const drawResult =
    move.drawSource.type === 'deck'
      ? {
          card: state.drawPile[0] ?? null,
          drawPile: state.drawPile.slice(1),
          discardPiles,
        }
      : (() => {
          const result = drawFromDiscard(discardPiles, move.drawSource.color);

          return {
            card: result.card,
            drawPile: state.drawPile,
            discardPiles: result.discardPiles,
          };
        })();

  if (!drawResult.card) {
    return fail('The chosen draw source does not contain a card.');
  }

  const drawnPlayer: PlayerState = {
    ...updatedPlayer,
    hand: sortHand([...updatedPlayer.hand, drawResult.card]),
  };
  const nextPlayers = replacePlayer(state.players, activePlayerIndex, drawnPlayer);
  const nextState: GameState = {
    ...state,
    drawPile: drawResult.drawPile,
    discardPiles: drawResult.discardPiles,
    players: nextPlayers,
    activePlayerIndex: activePlayerIndex === 0 ? 1 : 0,
  };

  if (move.drawSource.type === 'deck' && drawResult.drawPile.length === 0) {
    return finishRound(nextState);
  }

  return {
    ok: true,
    state: nextState,
  };
};
