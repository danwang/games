import {
  bulge,
  checkpoint,
  expand,
  fade,
  flip,
  highlight,
  hold,
  land,
  parallel,
  pulseNumber,
  serial,
  translate,
  wait,
  type Animation,
} from '@games/animation-core';

import { type Card, type CardTier, type GemColor, type Noble } from '../model/types.js';
import { type SplendorMove, type SplendorState } from '../platform/definition.js';
import { cardTierOrder, gemOrder } from './game-ui.js';
import { splendorAnimationTargets } from './animation-targets.js';

export interface SplendorAnimationTiming {
  readonly bulgeDurationMs: number;
  readonly cardArrivalDurationMs: number;
  readonly cardExpandDurationMs: number;
  readonly cardHoldPurchaseReservedMs: number;
  readonly cardHoldPurchaseVisibleMs: number;
  readonly cardHoldReserveVisibleMs: number;
  readonly flightDurationMs: number;
  readonly flipDurationMs: number;
  readonly purchaseCardStaggerMs: number;
  readonly purchaseReservedChipDelayMs: number;
  readonly settleDurationMs: number;
  readonly turnHandoffGapMs: number;
}

export const splendorAnimationTiming: SplendorAnimationTiming = {
  bulgeDurationMs: 320,
  cardArrivalDurationMs: 320,
  cardExpandDurationMs: 420,
  cardHoldPurchaseReservedMs: 400,
  cardHoldPurchaseVisibleMs: 100,
  cardHoldReserveVisibleMs: 100,
  flightDurationMs: 1200,
  flipDurationMs: 320,
  purchaseCardStaggerMs: 250,
  purchaseReservedChipDelayMs: 200,
  settleDurationMs: 900,
  turnHandoffGapMs: 200,
};

export const splendorAnimationCssVars = {
  '--anim-bulge-ms': `${splendorAnimationTiming.bulgeDurationMs}ms`,
  '--anim-card-arrival-ms': `${splendorAnimationTiming.cardArrivalDurationMs}ms`,
  '--anim-card-expand-ms': `${splendorAnimationTiming.cardExpandDurationMs}ms`,
  '--anim-flight-ms': `${splendorAnimationTiming.flightDurationMs}ms`,
  '--anim-flip-ms': `${splendorAnimationTiming.flipDurationMs}ms`,
  '--anim-score-flip-ms': `${splendorAnimationTiming.settleDurationMs}ms`,
  '--anim-settle-ms': `${splendorAnimationTiming.settleDurationMs}ms`,
} as const;

export type SplendorAnimationObject =
  | {
      readonly kind: 'chip';
      readonly color: GemColor;
    }
  | {
      readonly card: Card;
      readonly kind: 'card';
      readonly motion:
        | 'purchase-reserved'
        | 'purchase-visible'
        | 'reserve-deck'
        | 'reserve-visible';
      readonly tier: CardTier;
    }
  | {
      readonly kind: 'noble';
      readonly noble: Noble;
    };

type SplendorCardAnimationObject = Extract<SplendorAnimationObject, { readonly kind: 'card' }>;

const toGemRecord = (
  project: (color: GemColor) => number,
): Readonly<Record<GemColor, number>> => ({
  white: project('white'),
  blue: project('blue'),
  green: project('green'),
  red: project('red'),
  black: project('black'),
  gold: project('gold'),
});

const score = (player: SplendorState['players'][number]): number =>
  player.purchasedCards.reduce((sum, card) => sum + card.points, 0) +
  player.nobles.reduce((sum, noble) => sum + noble.points, 0);

const getActorPair = (
  previousGame: SplendorState,
  nextGame: SplendorState,
): {
  readonly nextActor: SplendorState['players'][number] | undefined;
  readonly previousActor: SplendorState['players'][number] | undefined;
} => {
  const previousActor = previousGame.players[previousGame.turn.activePlayerIndex];
  const nextActor = nextGame.players.find(
    (player) => player.identity.id === previousActor?.identity.id,
  );

  return { nextActor, previousActor };
};

const createChipTransferPresentation = (
  previousGame: SplendorState,
  nextGame: SplendorState,
): SplendorState => {
  const { nextActor, previousActor } = getActorPair(previousGame, nextGame);

  if (!previousActor || !nextActor) {
    return previousGame;
  }

  const actorDeltaByColor = gemOrder.reduce<Record<GemColor, number>>((result, color) => {
    return {
      ...result,
        [color]: nextActor.tokens[color] - previousActor.tokens[color],
      };
    }, {} as Record<GemColor, number>);

  return {
    ...previousGame,
    bank: toGemRecord((color) => {
      const delta = actorDeltaByColor[color] ?? 0;
      return delta > 0 ? previousGame.bank[color] : nextGame.bank[color];
    }),
    players: previousGame.players.map((player) =>
      player.identity.id !== previousActor.identity.id
        ? player
        : {
            ...player,
            tokens: toGemRecord((color) => {
              const delta = actorDeltaByColor[color] ?? 0;
              return delta < 0 ? nextActor.tokens[color] : previousActor.tokens[color];
            }),
          },
    ),
  };
};

const createChipArrivalPresentation = (
  baseGame: SplendorState,
  nextGame: SplendorState,
): SplendorState => {
  const { nextActor, previousActor } = getActorPair(baseGame, nextGame);

  if (!previousActor || !nextActor) {
    return baseGame;
  }

  return {
    ...baseGame,
    bank: nextGame.bank,
    players: baseGame.players.map((player) =>
      player.identity.id === previousActor.identity.id
        ? {
            ...player,
            tokens: nextActor.tokens,
          }
        : player,
    ),
  };
};

const createPostFlightPresentation = (
  previousGame: SplendorState,
  nextGame: SplendorState,
): SplendorState => ({
  ...nextGame,
  turn: previousGame.turn,
});

const createReservedPurchaseCardDeparturePresentation = (
  previousGame: SplendorState,
  nextGame: SplendorState,
): SplendorState => {
  const { nextActor, previousActor } = getActorPair(previousGame, nextGame);

  if (!previousActor || !nextActor) {
    return previousGame;
  }

  return {
    ...previousGame,
    players: previousGame.players.map((player) =>
      player.identity.id === previousActor.identity.id
        ? {
            ...player,
            reservedCards: nextActor.reservedCards,
          }
        : player,
    ),
  };
};

const createReservedPurchaseDeparturePresentation = (
  previousGame: SplendorState,
  nextGame: SplendorState,
): SplendorState => {
  const chipTransferGame = createChipTransferPresentation(previousGame, nextGame);
  const { nextActor, previousActor } = getActorPair(previousGame, nextGame);

  if (!previousActor || !nextActor) {
    return chipTransferGame;
  }

  return {
    ...chipTransferGame,
    players: chipTransferGame.players.map((player) =>
      player.identity.id === previousActor.identity.id
        ? {
            ...player,
            reservedCards: nextActor.reservedCards,
          }
        : player,
    ),
  };
};

const changedMarketCardIds = (
  previousGame: SplendorState,
  nextGame: SplendorState,
): readonly string[] =>
  cardTierOrder.flatMap((tier) =>
    nextGame.market[`tier${tier}`]
      .filter((card, index) => previousGame.market[`tier${tier}`][index]?.id !== card.id)
      .map((card) => card.id),
  );

const changedDeckTiers = (
  previousGame: SplendorState,
  nextGame: SplendorState,
): readonly CardTier[] =>
  cardTierOrder.filter(
    (tier) => previousGame.decks[`tier${tier}`].length !== nextGame.decks[`tier${tier}`].length,
  );

const arrivalAnimations = (
  previousGame: SplendorState,
  nextGame: SplendorState,
  actorId: string,
  extra: readonly Animation<SplendorState, SplendorAnimationObject>[],
): readonly Animation<SplendorState, SplendorAnimationObject>[] => [
  ...extra,
  ...changedMarketCardIds(previousGame, nextGame).map((cardId) =>
    fade<SplendorState, SplendorAnimationObject>(splendorAnimationTargets.marketCard(cardId), {
      durationMs: splendorAnimationTiming.settleDurationMs,
    }),
  ),
  ...changedDeckTiers(previousGame, nextGame).map((tier) =>
    bulge<SplendorState, SplendorAnimationObject>(splendorAnimationTargets.deck(tier), {
      durationMs: splendorAnimationTiming.bulgeDurationMs,
    }),
  ),
  highlight<SplendorState, SplendorAnimationObject>(splendorAnimationTargets.playerRow(actorId), {
    durationMs: splendorAnimationTiming.settleDurationMs,
  }),
];

const finalHandoff = (
  finalState: SplendorState,
): Animation<SplendorState, SplendorAnimationObject> =>
  serial([
    wait<SplendorState, SplendorAnimationObject>(splendorAnimationTiming.turnHandoffGapMs),
    checkpoint<SplendorState, SplendorAnimationObject>(finalState),
  ]);

const chipFlights = (
  previousGame: SplendorState,
  nextGame: SplendorState,
  options?: {
    readonly delayMs?: number;
  },
): readonly Animation<SplendorState, SplendorAnimationObject>[] => {
  const { nextActor, previousActor } = getActorPair(previousGame, nextGame);

  if (!previousActor || !nextActor) {
    return [];
  }

  return gemOrder.flatMap((color) => {
    const delta = nextActor.tokens[color] - previousActor.tokens[color];
    const count = Math.min(Math.abs(delta), 3);

    if (delta === 0) {
      return [];
    }

    return Array.from({ length: count }, () =>
      translate<SplendorState, SplendorAnimationObject>(
        { color, kind: 'chip' },
        delta > 0
          ? splendorAnimationTargets.bankChip(color)
          : splendorAnimationTargets.playerChip(previousActor.identity.id, color),
        delta > 0
          ? splendorAnimationTargets.playerChip(previousActor.identity.id, color)
          : splendorAnimationTargets.bankChip(color),
        {
          ...(options?.delayMs !== undefined ? { delayMs: options.delayMs } : {}),
          durationMs: splendorAnimationTiming.flightDurationMs,
        },
      ),
    );
  });
};

const purchaseCardObject = (
  card: Card,
  motion: SplendorCardAnimationObject['motion'],
): SplendorCardAnimationObject => ({
  card,
  kind: 'card',
  motion,
  tier: card.tier,
});

const deriveTransitionKind = (
  previousGame: SplendorState,
  nextGame: SplendorState,
): 'blind-reserve' | 'chip-take' | 'discard' | 'market-purchase' | 'noble-claim' | 'noble-skip' | 'purchase-reserved' | 'reserve-visible' | 'unknown' => {
  const { nextActor, previousActor } = getActorPair(previousGame, nextGame);

  if (!previousActor || !nextActor) {
    return 'unknown';
  }

  const addedReserved = nextActor.reservedCards.filter(
    (card) => !previousActor.reservedCards.some((entry) => entry.id === card.id),
  );
  if (addedReserved.length > 0) {
    const addedCard = addedReserved[0]!;
    const wasVisible = cardTierOrder.some((tier) =>
      previousGame.market[`tier${tier}`].some((card) => card.id === addedCard.id),
    );
    return wasVisible ? 'reserve-visible' : 'blind-reserve';
  }

  const addedPurchased = nextActor.purchasedCards.filter(
    (card) => !previousActor.purchasedCards.some((entry) => entry.id === card.id),
  );
  if (addedPurchased.length > 0) {
    const addedCard = addedPurchased[0]!;
    return previousActor.reservedCards.some((entry) => entry.id === addedCard.id)
      ? 'purchase-reserved'
      : 'market-purchase';
  }

  const addedNoble = nextActor.nobles.some(
    (noble) => !previousActor.nobles.some((entry) => entry.id === noble.id),
  );
  if (addedNoble) {
    return 'noble-claim';
  }

  if (
    previousGame.turn.kind === 'noble' &&
    nextGame.turn.activePlayerIndex !== previousGame.turn.activePlayerIndex
  ) {
    return 'noble-skip';
  }

  const tokenDelta = gemOrder.some(
    (color) => nextActor.tokens[color] !== previousActor.tokens[color],
  );

  if (previousGame.turn.kind === 'discard') {
    return 'discard';
  }

  if (previousGame.turn.kind === 'main-action' && tokenDelta) {
    return 'chip-take';
  }

  return 'unknown';
};

const animateChipTake = (
  previousGame: SplendorState,
  nextGame: SplendorState,
): Animation<SplendorState, SplendorAnimationObject> | null => {
  const departure = createChipTransferPresentation(previousGame, nextGame);
  const arrival = createChipArrivalPresentation(departure, nextGame);
  const { nextActor, previousActor } = getActorPair(previousGame, nextGame);

  if (!previousActor || !nextActor) {
    return null;
  }

  const sourceTargets = gemOrder
    .filter((color) => nextActor.tokens[color] > previousActor.tokens[color])
    .map((color) => splendorAnimationTargets.bankChip(color));
  const destinationTargets = gemOrder
    .filter((color) => nextActor.tokens[color] > previousActor.tokens[color])
    .map((color) => splendorAnimationTargets.playerChip(nextActor.identity.id, color));

  return serial([
    checkpoint(departure),
    parallel([
      ...sourceTargets.map((target) =>
        bulge<SplendorState, SplendorAnimationObject>(target, {
          durationMs: splendorAnimationTiming.bulgeDurationMs,
        }),
      ),
      ...chipFlights(previousGame, nextGame),
    ]),
    checkpoint(arrival),
    parallel(arrivalAnimations(previousGame, nextGame, nextActor.identity.id, destinationTargets.map((target) =>
      bulge<SplendorState, SplendorAnimationObject>(target, {
        durationMs: splendorAnimationTiming.bulgeDurationMs,
      }),
    ))),
    finalHandoff(nextGame),
  ]);
};

const animateDiscard = (
  previousGame: SplendorState,
  nextGame: SplendorState,
): Animation<SplendorState, SplendorAnimationObject> | null => {
  const departure = createChipTransferPresentation(previousGame, nextGame);
  const arrival = createChipArrivalPresentation(departure, nextGame);
  const { nextActor, previousActor } = getActorPair(previousGame, nextGame);

  if (!previousActor || !nextActor) {
    return null;
  }

  const sourceTargets = gemOrder
    .filter((color) => nextActor.tokens[color] < previousActor.tokens[color])
    .map((color) => splendorAnimationTargets.playerChip(nextActor.identity.id, color));
  const bankTargets = gemOrder
    .filter((color) => nextActor.tokens[color] < previousActor.tokens[color])
    .map((color) => splendorAnimationTargets.bankChip(color));

  return serial([
    checkpoint(departure),
    parallel([
      ...sourceTargets.map((target) =>
        bulge<SplendorState, SplendorAnimationObject>(target, {
          durationMs: splendorAnimationTiming.bulgeDurationMs,
        }),
      ),
      ...chipFlights(previousGame, nextGame),
    ]),
    checkpoint(arrival),
    parallel(arrivalAnimations(previousGame, nextGame, previousActor.identity.id, bankTargets.map((target) =>
      bulge<SplendorState, SplendorAnimationObject>(target, {
        durationMs: splendorAnimationTiming.bulgeDurationMs,
      }),
    ))),
    finalHandoff(nextGame),
  ]);
};

const animateReserveVisible = (
  previousGame: SplendorState,
  nextGame: SplendorState,
): Animation<SplendorState, SplendorAnimationObject> | null => {
  const departure = createChipTransferPresentation(previousGame, nextGame);
  const chipArrival = createChipArrivalPresentation(departure, nextGame);
  const arrival = createPostFlightPresentation(previousGame, nextGame);
  const { nextActor, previousActor } = getActorPair(previousGame, nextGame);

  if (!previousActor || !nextActor) {
    return null;
  }

  const reservedCard = nextActor.reservedCards.find(
    (card) => !previousActor.reservedCards.some((entry) => entry.id === card.id),
  );

  if (!reservedCard) {
    return null;
  }

  const sourceBankTargets = gemOrder
    .filter((color) => nextActor.tokens[color] > previousActor.tokens[color])
    .map((color) => splendorAnimationTargets.bankChip(color));
  const destinationChipTargets = gemOrder
    .filter((color) => nextActor.tokens[color] > previousActor.tokens[color])
    .map((color) => splendorAnimationTargets.playerChip(nextActor.identity.id, color));

  return serial([
    checkpoint(departure),
    parallel([
      ...sourceBankTargets.map((target) =>
        bulge<SplendorState, SplendorAnimationObject>(target, {
          durationMs: splendorAnimationTiming.bulgeDurationMs,
        }),
      ),
      ...chipFlights(previousGame, nextGame),
      fade<SplendorState, SplendorAnimationObject>(splendorAnimationTargets.marketCard(reservedCard.id), {
        durationMs: splendorAnimationTiming.flightDurationMs + (sourceBankTargets.length > 0 ? 250 : 0),
      }),
      translate(
        purchaseCardObject(reservedCard, 'reserve-visible'),
        splendorAnimationTargets.marketCard(reservedCard.id),
        splendorAnimationTargets.playerReserved(nextActor.identity.id),
        { durationMs: splendorAnimationTiming.flightDurationMs },
      ),
    ]),
    checkpoint(chipArrival),
    parallel([
      ...destinationChipTargets.map((target) =>
        bulge<SplendorState, SplendorAnimationObject>(target, {
          durationMs: splendorAnimationTiming.bulgeDurationMs,
        }),
      ),
      hold(
        purchaseCardObject(reservedCard, 'reserve-visible'),
        splendorAnimationTargets.playerReserved(nextActor.identity.id),
        { durationMs: splendorAnimationTiming.cardHoldReserveVisibleMs },
      ),
      fade<SplendorState, SplendorAnimationObject>(splendorAnimationTargets.marketCard(reservedCard.id), {
        durationMs: splendorAnimationTiming.cardHoldReserveVisibleMs,
      }),
    ]),
    parallel([
      flip(
        purchaseCardObject(reservedCard, 'reserve-visible'),
        splendorAnimationTargets.playerReserved(nextActor.identity.id),
        { durationMs: splendorAnimationTiming.flipDurationMs },
      ),
      fade<SplendorState, SplendorAnimationObject>(splendorAnimationTargets.marketCard(reservedCard.id), {
        durationMs: splendorAnimationTiming.flipDurationMs,
      }),
    ]),
    parallel([
      land(
        purchaseCardObject(reservedCard, 'reserve-visible'),
        splendorAnimationTargets.playerReserved(nextActor.identity.id),
        { durationMs: splendorAnimationTiming.cardArrivalDurationMs },
      ),
      fade<SplendorState, SplendorAnimationObject>(splendorAnimationTargets.marketCard(reservedCard.id), {
        durationMs: splendorAnimationTiming.cardArrivalDurationMs,
      }),
    ]),
    checkpoint(arrival),
    parallel(
      arrivalAnimations(previousGame, nextGame, nextActor.identity.id, [
        bulge<SplendorState, SplendorAnimationObject>(splendorAnimationTargets.playerReserved(nextActor.identity.id), {
          durationMs: splendorAnimationTiming.bulgeDurationMs,
        }),
        fade<SplendorState, SplendorAnimationObject>(splendorAnimationTargets.marketCard(reservedCard.id), {
          durationMs: splendorAnimationTiming.settleDurationMs,
        }),
      ]),
    ),
    finalHandoff(nextGame),
  ]);
};

const animateBlindReserve = (
  previousGame: SplendorState,
  nextGame: SplendorState,
): Animation<SplendorState, SplendorAnimationObject> | null => {
  const departure = createChipTransferPresentation(previousGame, nextGame);
  const chipArrival = createChipArrivalPresentation(departure, nextGame);
  const arrival = createPostFlightPresentation(previousGame, nextGame);
  const { nextActor, previousActor } = getActorPair(previousGame, nextGame);

  if (!previousActor || !nextActor) {
    return null;
  }

  const reservedCard = nextActor.reservedCards.find(
    (card) => !previousActor.reservedCards.some((entry) => entry.id === card.id),
  );

  if (!reservedCard) {
    return null;
  }

  const sourceBankTargets = gemOrder
    .filter((color) => nextActor.tokens[color] > previousActor.tokens[color])
    .map((color) => splendorAnimationTargets.bankChip(color));
  const destinationChipTargets = gemOrder
    .filter((color) => nextActor.tokens[color] > previousActor.tokens[color])
    .map((color) => splendorAnimationTargets.playerChip(nextActor.identity.id, color));

  return serial([
    checkpoint(departure),
    parallel([
      ...sourceBankTargets.map((target) =>
        bulge<SplendorState, SplendorAnimationObject>(target, {
          durationMs: splendorAnimationTiming.bulgeDurationMs,
        }),
      ),
      ...chipFlights(previousGame, nextGame),
      translate(
        purchaseCardObject(reservedCard, 'reserve-deck'),
        splendorAnimationTargets.deck(reservedCard.tier),
        splendorAnimationTargets.playerReserved(nextActor.identity.id),
        { durationMs: splendorAnimationTiming.flightDurationMs },
      ),
    ]),
    checkpoint(chipArrival),
    parallel([
      ...destinationChipTargets.map((target) =>
        bulge<SplendorState, SplendorAnimationObject>(target, {
          durationMs: splendorAnimationTiming.bulgeDurationMs,
        }),
      ),
      hold(
        purchaseCardObject(reservedCard, 'reserve-deck'),
        splendorAnimationTargets.playerReserved(nextActor.identity.id),
        { durationMs: splendorAnimationTiming.bulgeDurationMs },
      ),
    ]),
    land(
      purchaseCardObject(reservedCard, 'reserve-deck'),
      splendorAnimationTargets.playerReserved(nextActor.identity.id),
      { durationMs: splendorAnimationTiming.cardArrivalDurationMs },
    ),
    checkpoint(arrival),
    parallel(
      arrivalAnimations(previousGame, nextGame, nextActor.identity.id, [
        bulge<SplendorState, SplendorAnimationObject>(splendorAnimationTargets.playerReserved(nextActor.identity.id), {
          durationMs: splendorAnimationTiming.bulgeDurationMs,
        }),
      ]),
    ),
    finalHandoff(nextGame),
  ]);
};

const animateMarketPurchase = (
  previousGame: SplendorState,
  nextGame: SplendorState,
): Animation<SplendorState, SplendorAnimationObject> | null => {
  const departure = createChipTransferPresentation(previousGame, nextGame);
  const chipArrival = createChipArrivalPresentation(departure, nextGame);
  const { nextActor, previousActor } = getActorPair(previousGame, nextGame);

  if (!previousActor || !nextActor) {
    return null;
  }

  const purchasedCard = nextActor.purchasedCards.find(
    (card) => !previousActor.purchasedCards.some((entry) => entry.id === card.id),
  );

  if (!purchasedCard) {
    return null;
  }

  const sourcePlayerChipTargets = gemOrder
    .filter((color) => nextActor.tokens[color] < previousActor.tokens[color])
    .map((color) => splendorAnimationTargets.playerChip(nextActor.identity.id, color));
  const bankTargets = gemOrder
    .filter((color) => nextActor.tokens[color] < previousActor.tokens[color])
    .map((color) => splendorAnimationTargets.bankChip(color));

  return serial([
    checkpoint(departure),
    parallel([
      ...sourcePlayerChipTargets.map((target) =>
        bulge<SplendorState, SplendorAnimationObject>(target, {
          durationMs: splendorAnimationTiming.bulgeDurationMs,
        }),
      ),
      ...chipFlights(previousGame, nextGame),
      fade<SplendorState, SplendorAnimationObject>(splendorAnimationTargets.marketCard(purchasedCard.id), {
        durationMs: splendorAnimationTiming.flightDurationMs + splendorAnimationTiming.purchaseCardStaggerMs,
      }),
      translate(
        purchaseCardObject(purchasedCard, 'purchase-visible'),
        splendorAnimationTargets.marketCard(purchasedCard.id),
        splendorAnimationTargets.playerTableau(nextActor.identity.id),
        {
          delayMs: splendorAnimationTiming.purchaseCardStaggerMs,
          durationMs: splendorAnimationTiming.flightDurationMs,
        },
      ),
    ]),
    checkpoint(chipArrival),
    parallel([
      ...bankTargets.map((target) =>
        bulge<SplendorState, SplendorAnimationObject>(target, {
          durationMs: splendorAnimationTiming.bulgeDurationMs,
        }),
      ),
      hold(
        purchaseCardObject(purchasedCard, 'purchase-visible'),
        splendorAnimationTargets.playerTableau(nextActor.identity.id),
        { durationMs: splendorAnimationTiming.cardHoldPurchaseVisibleMs },
      ),
      fade<SplendorState, SplendorAnimationObject>(splendorAnimationTargets.marketCard(purchasedCard.id), {
        durationMs: splendorAnimationTiming.cardHoldPurchaseVisibleMs,
      }),
    ]),
    parallel(
      arrivalAnimations(previousGame, nextGame, nextActor.identity.id, [
        land(
          purchaseCardObject(purchasedCard, 'purchase-visible'),
          splendorAnimationTargets.playerTableau(nextActor.identity.id),
          { durationMs: splendorAnimationTiming.settleDurationMs },
        ),
        bulge<SplendorState, SplendorAnimationObject>(splendorAnimationTargets.playerTableau(nextActor.identity.id), {
          durationMs: splendorAnimationTiming.bulgeDurationMs,
        }),
        bulge<SplendorState, SplendorAnimationObject>(
          splendorAnimationTargets.playerTableauBonus(nextActor.identity.id, purchasedCard.bonus),
          { durationMs: splendorAnimationTiming.bulgeDurationMs },
        ),
        pulseNumber<SplendorState, SplendorAnimationObject>(splendorAnimationTargets.playerScore(nextActor.identity.id), {
          durationMs: splendorAnimationTiming.settleDurationMs,
        }),
        fade<SplendorState, SplendorAnimationObject>(splendorAnimationTargets.marketCard(purchasedCard.id), {
          durationMs: splendorAnimationTiming.settleDurationMs,
        }),
      ]),
    ),
    checkpoint(chipArrival),
    finalHandoff(nextGame),
  ]);
};

const animatePurchaseReserved = (
  previousGame: SplendorState,
  nextGame: SplendorState,
): Animation<SplendorState, SplendorAnimationObject> | null => {
  const cardDeparture = createReservedPurchaseCardDeparturePresentation(previousGame, nextGame);
  const departure = createReservedPurchaseDeparturePresentation(previousGame, nextGame);
  const chipArrival = createChipArrivalPresentation(departure, nextGame);
  const arrival = createPostFlightPresentation(previousGame, nextGame);
  const { nextActor, previousActor } = getActorPair(previousGame, nextGame);

  if (!previousActor || !nextActor) {
    return null;
  }

  const purchasedCard = nextActor.purchasedCards.find(
    (card) => !previousActor.purchasedCards.some((entry) => entry.id === card.id),
  );

  if (!purchasedCard) {
    return null;
  }

  const sourcePlayerChipTargets = gemOrder
    .filter((color) => nextActor.tokens[color] < previousActor.tokens[color])
    .map((color) => splendorAnimationTargets.playerChip(nextActor.identity.id, color));
  const bankTargets = gemOrder
    .filter((color) => nextActor.tokens[color] < previousActor.tokens[color])
    .map((color) => splendorAnimationTargets.bankChip(color));
  const cardObject = purchaseCardObject(purchasedCard, 'purchase-reserved');

  return serial<SplendorState, SplendorAnimationObject>([
    checkpoint<SplendorState, SplendorAnimationObject>(cardDeparture),
    expand(cardObject, splendorAnimationTargets.playerReserved(nextActor.identity.id), {
      durationMs: splendorAnimationTiming.cardExpandDurationMs,
    }),
    flip(cardObject, splendorAnimationTargets.playerReserved(nextActor.identity.id), {
      durationMs: splendorAnimationTiming.flipDurationMs,
    }),
    hold(cardObject, splendorAnimationTargets.playerReserved(nextActor.identity.id), {
      durationMs: splendorAnimationTiming.cardHoldPurchaseReservedMs,
    }),
    checkpoint<SplendorState, SplendorAnimationObject>(departure),
    parallel([
      ...sourcePlayerChipTargets.map((target) =>
        bulge<SplendorState, SplendorAnimationObject>(target, {
          durationMs: splendorAnimationTiming.bulgeDurationMs,
        }),
      ),
      ...chipFlights(previousGame, nextGame, {
        delayMs: splendorAnimationTiming.purchaseReservedChipDelayMs,
      }),
      translate(
        cardObject,
        splendorAnimationTargets.playerReserved(nextActor.identity.id),
        splendorAnimationTargets.playerTableau(nextActor.identity.id),
        { durationMs: splendorAnimationTiming.flightDurationMs },
      ),
    ]),
    checkpoint(bankTargets.length > 0 ? chipArrival : arrival),
    parallel([
      ...bankTargets.map((target) =>
        bulge<SplendorState, SplendorAnimationObject>(target, {
          durationMs: splendorAnimationTiming.bulgeDurationMs,
        }),
      ),
      hold(cardObject, splendorAnimationTargets.playerTableau(nextActor.identity.id), {
        durationMs: bankTargets.length > 0 ? splendorAnimationTiming.bulgeDurationMs : splendorAnimationTiming.settleDurationMs,
      }),
      ...(bankTargets.length === 0
        ? arrivalAnimations(previousGame, nextGame, nextActor.identity.id, [
            land(cardObject, splendorAnimationTargets.playerTableau(nextActor.identity.id), {
              durationMs: splendorAnimationTiming.settleDurationMs,
            }),
            bulge<SplendorState, SplendorAnimationObject>(splendorAnimationTargets.playerTableau(nextActor.identity.id), {
              durationMs: splendorAnimationTiming.bulgeDurationMs,
            }),
            bulge<SplendorState, SplendorAnimationObject>(
              splendorAnimationTargets.playerTableauBonus(nextActor.identity.id, purchasedCard.bonus),
              { durationMs: splendorAnimationTiming.bulgeDurationMs },
            ),
            pulseNumber<SplendorState, SplendorAnimationObject>(splendorAnimationTargets.playerScore(nextActor.identity.id), {
              durationMs: splendorAnimationTiming.settleDurationMs,
            }),
          ])
        : []),
    ]),
    ...(bankTargets.length > 0
      ? [
          checkpoint<SplendorState, SplendorAnimationObject>(arrival),
          parallel(
            arrivalAnimations(previousGame, nextGame, nextActor.identity.id, [
              land(cardObject, splendorAnimationTargets.playerTableau(nextActor.identity.id), {
                durationMs: splendorAnimationTiming.settleDurationMs,
              }),
              bulge<SplendorState, SplendorAnimationObject>(splendorAnimationTargets.playerTableau(nextActor.identity.id), {
                durationMs: splendorAnimationTiming.bulgeDurationMs,
              }),
              bulge<SplendorState, SplendorAnimationObject>(
                splendorAnimationTargets.playerTableauBonus(nextActor.identity.id, purchasedCard.bonus),
                { durationMs: splendorAnimationTiming.bulgeDurationMs },
              ),
              pulseNumber<SplendorState, SplendorAnimationObject>(splendorAnimationTargets.playerScore(nextActor.identity.id), {
                durationMs: splendorAnimationTiming.settleDurationMs,
              }),
            ]),
          ),
        ]
      : []),
    finalHandoff(nextGame),
  ]);
};

const animateNobleClaim = (
  previousGame: SplendorState,
  nextGame: SplendorState,
): Animation<SplendorState, SplendorAnimationObject> | null => {
  const arrival = createPostFlightPresentation(previousGame, nextGame);
  const { nextActor, previousActor } = getActorPair(previousGame, nextGame);

  if (!previousActor || !nextActor) {
    return null;
  }

  const noble = nextActor.nobles.find(
    (entry) => !previousActor.nobles.some((previous) => previous.id === entry.id),
  );

  if (!noble) {
    return null;
  }

  return serial([
    checkpoint(previousGame),
    translate<SplendorState, SplendorAnimationObject>(
      { kind: 'noble', noble },
      splendorAnimationTargets.viewportNobleOrigin(),
      splendorAnimationTargets.playerNobles(nextActor.identity.id),
      { durationMs: splendorAnimationTiming.flightDurationMs },
    ),
    checkpoint(arrival),
    parallel(
      arrivalAnimations(previousGame, nextGame, nextActor.identity.id, [
        bulge<SplendorState, SplendorAnimationObject>(splendorAnimationTargets.playerNobles(nextActor.identity.id), {
          durationMs: splendorAnimationTiming.bulgeDurationMs,
        }),
        pulseNumber<SplendorState, SplendorAnimationObject>(splendorAnimationTargets.playerScore(nextActor.identity.id), {
          durationMs: splendorAnimationTiming.settleDurationMs,
        }),
      ]),
    ),
    finalHandoff(nextGame),
  ]);
};

const animateNobleSkip = (
  previousGame: SplendorState,
  nextGame: SplendorState,
): Animation<SplendorState, SplendorAnimationObject> =>
  serial<SplendorState, SplendorAnimationObject>([
    checkpoint<SplendorState, SplendorAnimationObject>(previousGame),
    wait<SplendorState, SplendorAnimationObject>(splendorAnimationTiming.turnHandoffGapMs),
    checkpoint<SplendorState, SplendorAnimationObject>(nextGame),
  ]);

export const animateTransition = (
  move: SplendorMove | null | undefined,
  previousGame: SplendorState | null,
  nextGame: SplendorState | null,
): Animation<SplendorState, SplendorAnimationObject> | null => {
  if (!previousGame || !nextGame || previousGame === nextGame) {
    return null;
  }

  const inferredKind = move?.type === 'take-distinct' || move?.type === 'take-pair'
    ? 'chip-take'
    : move?.type === 'discard-tokens'
      ? 'discard'
      : move?.type === 'reserve-visible'
        ? 'reserve-visible'
        : move?.type === 'reserve-deck'
          ? 'blind-reserve'
          : move?.type === 'purchase-visible'
            ? 'market-purchase'
            : move?.type === 'purchase-reserved'
              ? 'purchase-reserved'
              : move?.type === 'claim-noble'
                ? 'noble-claim'
                : move?.type === 'skip-noble'
                  ? 'noble-skip'
                  : deriveTransitionKind(previousGame, nextGame);

  switch (inferredKind) {
    case 'chip-take':
      return animateChipTake(previousGame, nextGame);
    case 'discard':
      return animateDiscard(previousGame, nextGame);
    case 'reserve-visible':
      return animateReserveVisible(previousGame, nextGame);
    case 'blind-reserve':
      return animateBlindReserve(previousGame, nextGame);
    case 'market-purchase':
      return animateMarketPurchase(previousGame, nextGame);
    case 'purchase-reserved':
      return animatePurchaseReserved(previousGame, nextGame);
    case 'noble-claim':
      return animateNobleClaim(previousGame, nextGame);
    case 'noble-skip':
      return animateNobleSkip(previousGame, nextGame);
    default:
      return null;
  }
};
