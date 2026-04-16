import { type GameHistoryEntry } from '@games/game-sdk';

import { type GemColor } from '../model/types.js';
import { type SplendorState } from '../platform/definition.js';

import { cardTierOrder, gemOrder } from './game-ui.js';

export interface RoomActivityEntry {
  readonly accent: 'amber' | 'emerald' | 'sky';
  readonly afterStateVersion: number;
  readonly beforeStateVersion: number;
  readonly id: string;
  readonly message: string;
  readonly stateVersion: number;
}

const totalTokens = (tokens: SplendorState['bank']): number =>
  gemOrder.reduce((sum, color) => sum + tokens[color], 0);

const describeChipDelta = (
  previousTokens: SplendorState['bank'],
  nextTokens: SplendorState['bank'],
  direction: 'gain' | 'loss',
): string => {
  const parts = gemOrder.flatMap((color) => {
    const delta = nextTokens[color] - previousTokens[color];
    const normalizedDelta = direction === 'gain' ? delta : -delta;

    if (normalizedDelta <= 0) {
      return [];
    }

    return [`${normalizedDelta} ${color}`];
  });

  return parts.join(' • ');
};

const playerScore = (player: SplendorState['players'][number]): number =>
  player.purchasedCards.reduce((sum, card) => sum + card.points, 0) +
  player.nobles.reduce((sum, noble) => sum + noble.points, 0);

const hasCardInMarket = (game: SplendorState, cardId: string): boolean =>
  cardTierOrder.some((tier) => game.market[`tier${tier}`].some((card) => card.id === cardId));

const pushEntry = (
  entries: RoomActivityEntry[],
  previousEntry: GameHistoryEntry<SplendorState>,
  nextEntry: GameHistoryEntry<SplendorState>,
  message: string,
  accent: RoomActivityEntry['accent'],
): void => {
  entries.push({
    accent,
    afterStateVersion: nextEntry.stateVersion,
    beforeStateVersion: previousEntry.stateVersion,
    id: `${nextEntry.stateVersion}-${entries.length}-${message}`,
    message,
    stateVersion: nextEntry.stateVersion,
  });
};

export const deriveRoomActivityEntries = (
  previousEntry: GameHistoryEntry<SplendorState> | null,
  nextEntry: GameHistoryEntry<SplendorState> | null,
): readonly RoomActivityEntry[] => {
  if (!previousEntry || !nextEntry) {
    return [];
  }

  const previousGame = previousEntry.state;
  const nextGame = nextEntry.state;
  const entries: RoomActivityEntry[] = [];

  nextGame.players.forEach((nextPlayer, index) => {
    const previousPlayer = previousGame.players[index];

    if (!previousPlayer) {
      return;
    }

    const purchasedCards = nextPlayer.purchasedCards.filter(
      (card) => !previousPlayer.purchasedCards.some((entry) => entry.id === card.id),
    );
    const reservedCards = nextPlayer.reservedCards.filter(
      (card) => !previousPlayer.reservedCards.some((entry) => entry.id === card.id),
    );
    const claimedNobles = nextPlayer.nobles.filter(
      (noble) => !previousPlayer.nobles.some((entry) => entry.id === noble.id),
    );

    reservedCards.forEach((card) => {
      const message = hasCardInMarket(previousGame, card.id)
        ? `${nextPlayer.identity.displayName} reserved a market card.`
        : `${nextPlayer.identity.displayName} blind reserved tier ${card.tier}.`;

      pushEntry(entries, previousEntry, nextEntry, message, 'sky');
    });

    purchasedCards.forEach((card) => {
      const message = previousPlayer.reservedCards.some((entry) => entry.id === card.id)
        ? `${nextPlayer.identity.displayName} bought a reserved card.`
        : hasCardInMarket(previousGame, card.id)
          ? `${nextPlayer.identity.displayName} bought a market card.`
          : `${nextPlayer.identity.displayName} bought a card.`;

      pushEntry(entries, previousEntry, nextEntry, message, 'amber');
    });

    claimedNobles.forEach(() => {
      pushEntry(
        entries,
        previousEntry,
        nextEntry,
        `${nextPlayer.identity.displayName} claimed a noble.`,
        'emerald',
      );
    });
  });

  const previousActor = previousGame.players[previousGame.turn.activePlayerIndex];
  const nextActor = nextGame.players.find(
    (player) => player.identity.id === previousActor?.identity.id,
  );

  if (previousActor && nextActor) {
    const tokenDelta = totalTokens(nextActor.tokens) - totalTokens(previousActor.tokens);
    const boughtCard =
      nextActor.purchasedCards.length > previousActor.purchasedCards.length ||
      nextActor.reservedCards.length > previousActor.reservedCards.length;

    if (previousGame.turn.kind === 'main-action' && tokenDelta > 0 && !boughtCard) {
      const chipsTaken = describeChipDelta(previousActor.tokens, nextActor.tokens, 'gain');

      pushEntry(
        entries,
        previousEntry,
        nextEntry,
        `${previousActor.identity.displayName} took ${chipsTaken}.`,
        'sky',
      );
    }

    if (previousGame.turn.kind === 'discard' && tokenDelta < 0) {
      pushEntry(
        entries,
        previousEntry,
        nextEntry,
        `${previousActor.identity.displayName} discarded ${Math.abs(tokenDelta)} chip${tokenDelta === -1 ? '' : 's'}.`,
        'amber',
      );
    }

    if (
      previousGame.turn.kind === 'noble' &&
      nextActor.nobles.length === previousActor.nobles.length &&
      nextGame.turn.activePlayerIndex !== previousGame.turn.activePlayerIndex
    ) {
      pushEntry(
        entries,
        previousEntry,
        nextEntry,
        `${previousActor.identity.displayName} skipped a noble.`,
        'sky',
      );
    }
  }

  if (previousGame.status !== 'finished' && nextGame.status === 'finished') {
    const winnerNames = (nextGame.result?.winners ?? [])
      .map((winnerId) =>
        nextGame.players.find((player) => player.identity.id === winnerId)?.identity.displayName ?? winnerId,
      )
      .filter((winnerName) => winnerName.length > 0);

    if (winnerNames.length > 0) {
      pushEntry(
        entries,
        previousEntry,
        nextEntry,
        `${winnerNames.join(', ')} won the game.`,
        'emerald',
      );
    }
  }

  return entries;
};

export const deriveRoomHistoryEntries = (
  history: readonly GameHistoryEntry<SplendorState>[],
  limit = 18,
): readonly RoomActivityEntry[] => {
  const sortedHistory = [...history].sort((left, right) => left.stateVersion - right.stateVersion);
  const entries = sortedHistory.slice(1).flatMap((nextEntry, index) => {
    const previousEntry = sortedHistory[index] ?? null;

    return deriveRoomActivityEntries(previousEntry, nextEntry);
  });

  return [...entries].reverse().slice(0, limit);
};

export const latestRoomEntries = (
  previous: readonly RoomActivityEntry[],
  nextEntries: readonly RoomActivityEntry[],
  limit = 18,
): readonly RoomActivityEntry[] => [...[...nextEntries].reverse(), ...previous].slice(0, limit);
