import {
  CARD_TIERS,
  TOKEN_COLORS,
  type BonusMap,
  type CardTier,
  type GameState,
  type GemColor,
  type Move,
  type PaymentSelection,
  type TokenColor,
} from '../model/types.js';
import { listLegalMoves } from '../rules/legal-moves.js';

export const gemOrder: readonly GemColor[] = ['white', 'blue', 'green', 'red', 'black', 'gold'];
export const tokenColorOrder: readonly TokenColor[] = TOKEN_COLORS;
export const cardTierOrder: readonly CardTier[] = [...CARD_TIERS].reverse() as readonly CardTier[];

type PurchaseMove = Extract<Move, { readonly type: 'purchase-visible' | 'purchase-reserved' }>;
type ReserveVisibleMove = Extract<Move, { readonly type: 'reserve-visible' }>;
type ReserveDeckMove = Extract<Move, { readonly type: 'reserve-deck' }>;
type TakeDistinctMove = Extract<Move, { readonly type: 'take-distinct' }>;
type TakePairMove = Extract<Move, { readonly type: 'take-pair' }>;
type ClaimNobleMove = Extract<Move, { readonly type: 'claim-noble' }>;
type DiscardTokensMove = Extract<Move, { readonly type: 'discard-tokens' }>;

export interface InteractionModel {
  readonly activePlayerId: string;
  readonly activePlayerName: string;
  readonly claimNobleMoves: readonly ClaimNobleMove[];
  readonly deckMovesByTier: Readonly<Record<CardTier, ReserveDeckMove | undefined>>;
  readonly discardMoves: readonly DiscardTokensMove[];
  readonly distinctMoves: readonly TakeDistinctMove[];
  readonly isCurrentUsersTurn: boolean;
  readonly legalMoves: readonly Move[];
  readonly pairMovesByColor: Readonly<Record<TokenColor, TakePairMove | undefined>>;
  readonly purchaseReservedByCardId: Readonly<Record<string, PurchaseMove | undefined>>;
  readonly purchaseVisibleByCardId: Readonly<Record<string, PurchaseMove | undefined>>;
  readonly reserveVisibleByCardId: Readonly<Record<string, ReserveVisibleMove | undefined>>;
  readonly skipNobleMove: Extract<Move, { readonly type: 'skip-noble' }> | undefined;
}

export interface PlayerSummaryModel {
  readonly displayName: string;
  readonly id: string;
  readonly nobleIds: readonly string[];
  readonly reservedCards: GameState['players'][number]['reservedCards'];
  readonly reservedTiers: readonly CardTier[];
  readonly score: number;
  readonly tableauBonuses: BonusMap;
  readonly tokens: GameState['bank'];
}

const mapByCardId = <T extends { readonly cardId: string }>(
  moves: readonly T[],
): Readonly<Record<string, T | undefined>> =>
  moves.reduce<Record<string, T | undefined>>((result, move) => {
    return {
      ...result,
      [move.cardId]: move,
    };
  }, {});

export const deriveInteractionModel = (
  game: GameState,
  currentUserId: string | undefined,
): InteractionModel => {
  const activePlayer = game.players[game.turn.activePlayerIndex]!;
  const isCurrentUsersTurn = activePlayer.identity.id === currentUserId;
  const legalMoves = isCurrentUsersTurn ? listLegalMoves(game) : [];

  const purchaseVisibleMoves = legalMoves.filter(
    (move): move is Extract<Move, { readonly type: 'purchase-visible' }> =>
      move.type === 'purchase-visible',
  );
  const purchaseReservedMoves = legalMoves.filter(
    (move): move is Extract<Move, { readonly type: 'purchase-reserved' }> =>
      move.type === 'purchase-reserved',
  );
  const reserveVisibleMoves = legalMoves.filter(
    (move): move is ReserveVisibleMove => move.type === 'reserve-visible',
  );
  const reserveDeckMoves = legalMoves.filter(
    (move): move is ReserveDeckMove => move.type === 'reserve-deck',
  );
  const distinctMoves = legalMoves.filter(
    (move): move is TakeDistinctMove => move.type === 'take-distinct',
  );
  const pairMoves = legalMoves.filter(
    (move): move is TakePairMove => move.type === 'take-pair',
  );
  const discardMoves = legalMoves.filter(
    (move): move is DiscardTokensMove => move.type === 'discard-tokens',
  );
  const claimNobleMoves = legalMoves.filter(
    (move): move is ClaimNobleMove => move.type === 'claim-noble',
  );

  return {
    activePlayerId: activePlayer.identity.id,
    activePlayerName: activePlayer.identity.displayName,
    claimNobleMoves,
    deckMovesByTier: CARD_TIERS.reduce<Record<CardTier, ReserveDeckMove | undefined>>((result, tier) => {
      return {
        ...result,
        [tier]: reserveDeckMoves.find((move: ReserveDeckMove) => move.tier === tier),
      };
    }, {} as Record<CardTier, ReserveDeckMove | undefined>),
    discardMoves,
    distinctMoves,
    isCurrentUsersTurn,
    legalMoves,
    pairMovesByColor: TOKEN_COLORS.reduce<Record<TokenColor, TakePairMove | undefined>>((result, color) => {
      return {
        ...result,
        [color]: pairMoves.find((move: TakePairMove) => move.color === color),
      };
    }, {} as Record<TokenColor, TakePairMove | undefined>),
    purchaseReservedByCardId: mapByCardId(purchaseReservedMoves),
    purchaseVisibleByCardId: mapByCardId(purchaseVisibleMoves),
    reserveVisibleByCardId: mapByCardId(reserveVisibleMoves),
    skipNobleMove: legalMoves.find(
      (move: Move): move is Extract<Move, { readonly type: 'skip-noble' }> => move.type === 'skip-noble',
    ),
  };
};

export const countTableauBonuses = (
  purchasedCards: GameState['players'][number]['purchasedCards'],
): BonusMap =>
  TOKEN_COLORS.reduce<BonusMap>((result, color) => {
    return {
      ...result,
      [color]: purchasedCards.filter((card) => card.bonus === color).length,
    };
  }, {} as BonusMap);

export const derivePlayerSummaries = (game: GameState): readonly PlayerSummaryModel[] =>
  game.players.map((player) => ({
    displayName: player.identity.displayName,
    id: player.identity.id,
    nobleIds: player.nobles.map((noble) => noble.id),
    reservedCards: player.reservedCards,
    reservedTiers: player.reservedCards.map((card) => card.tier),
    score:
      player.purchasedCards.reduce((sum, card) => sum + card.points, 0) +
      player.nobles.reduce((sum, noble) => sum + noble.points, 0),
    tableauBonuses: countTableauBonuses(player.purchasedCards),
    tokens: player.tokens,
  }));

export const summarizePayment = (payment: PaymentSelection): string => {
  const tokenParts = tokenColorOrder
    .filter((color) => payment.tokens[color] > 0)
    .map((color) => `${payment.tokens[color]} ${color}`);
  const goldPart = payment.gold > 0 ? `${payment.gold} gold` : null;

  return [...tokenParts, goldPart].filter((part): part is string => part !== null).join(' · ');
};

export const summarizeDiscard = (tokens: readonly GemColor[]): string =>
  Object.entries(
    tokens.reduce<Record<string, number>>((summary, color) => {
      return {
        ...summary,
        [color]: (summary[color] ?? 0) + 1,
      };
    }, {}),
  )
    .map(([color, count]) => `${count} ${color}`)
    .join(' · ');

export const countGemSelection = (tokens: readonly GemColor[]): Readonly<Record<GemColor, number>> =>
  gemOrder.reduce<Record<GemColor, number>>((result, color) => {
    return {
      ...result,
      [color]: tokens.filter((token) => token === color).length,
    };
  }, {} as Record<GemColor, number>);

export const countTokenSelection = (
  tokens: readonly TokenColor[],
): Readonly<Record<TokenColor, number>> =>
  tokenColorOrder.reduce<Record<TokenColor, number>>((result, color) => {
    return {
      ...result,
      [color]: tokens.filter((token) => token === color).length,
    };
  }, {} as Record<TokenColor, number>);

export const moveLabel = (move: Move): string => {
  switch (move.type) {
    case 'take-distinct':
      return `Take ${move.colors.join(', ')}`;
    case 'take-pair':
      return `Take 2 ${move.color}`;
    case 'reserve-visible':
      return 'Reserve card';
    case 'reserve-deck':
      return `Reserve tier ${move.tier}`;
    case 'purchase-visible':
      return `Buy card · ${summarizePayment(move.payment)}`;
    case 'purchase-reserved':
      return `Buy reserved · ${summarizePayment(move.payment)}`;
    case 'claim-noble':
      return 'Claim noble';
    case 'skip-noble':
      return 'Skip noble';
    case 'discard-tokens':
      return `Discard ${summarizeDiscard(move.tokens)}`;
  }
};

export const normalizeTokenSelection = (
  colors: readonly TokenColor[],
): readonly TokenColor[] => {
  return [...colors].sort(
    (left, right) => tokenColorOrder.indexOf(left) - tokenColorOrder.indexOf(right),
  );
};

export const movesMatchDistinctSelection = (
  move: TakeDistinctMove,
  colors: readonly TokenColor[],
): boolean => {
  const left = normalizeTokenSelection(move.colors);
  const right = normalizeTokenSelection(colors);

  return left.length === right.length && left.every((color, index) => color === right[index]);
};
