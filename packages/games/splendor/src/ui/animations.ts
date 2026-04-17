import {
  animation,
  bulge,
  checkpoint,
  clone,
  detached,
  effectSequence,
  effectWait,
  fade,
  fadeTo,
  flipTo,
  highlight,
  hold,
  overlay,
  pulseNumber,
  reveal,
  removeAtEnd,
  sequence,
  targetEffect,
  to,
  wait,
  type Animation,
  type TargetEffectAnimation,
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
  readonly cardHoldReserveCompleteMs: number;
  readonly cardHoldReserveRevealLeadMs: number;
  readonly cardHoldReserveVisibleMs: number;
  readonly chipImpactLeadMs: number;
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
  cardHoldReserveCompleteMs: 140,
  cardHoldReserveRevealLeadMs: 600,
  cardHoldReserveVisibleMs: 100,
  chipImpactLeadMs: 90,
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
      readonly color: GemColor;
      readonly kind: 'chip';
    }
  | {
      readonly card: Card;
      readonly face: 'back' | 'front';
      readonly kind: 'card';
      readonly tier: CardTier;
    }
  | {
      readonly kind: 'noble';
      readonly noble: Noble;
    };

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

const cardFace = (card: Card): SplendorAnimationObject => ({
  card,
  face: 'front',
  kind: 'card',
  tier: card.tier,
});

const cardBack = (card: Card): SplendorAnimationObject => ({
  card,
  face: 'back',
  kind: 'card',
  tier: card.tier,
});

const chipObject = (color: GemColor): SplendorAnimationObject => ({
  color,
  kind: 'chip',
});

const nobleObject = (noble: Noble): SplendorAnimationObject => ({
  kind: 'noble',
  noble,
});

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
      if (delta > 0) {
        return nextGame.bank[color];
      }

      if (delta < 0) {
        return previousGame.bank[color];
      }

      return nextGame.bank[color];
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

const createVisibleMarketDeparturePresentation = (
  previousGame: SplendorState,
  nextGame: SplendorState,
): SplendorState => {
  const chipTransferGame = createChipTransferPresentation(previousGame, nextGame);

  return {
    ...chipTransferGame,
    decks: nextGame.decks,
    market: nextGame.market,
  };
};

const createBlindReserveDeparturePresentation = (
  previousGame: SplendorState,
  nextGame: SplendorState,
): SplendorState => {
  const chipTransferGame = createChipTransferPresentation(previousGame, nextGame);

  return {
    ...chipTransferGame,
    decks: nextGame.decks,
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

const changedMarketEntries = (
  previousGame: SplendorState,
  nextGame: SplendorState,
): readonly {
  readonly card: Card;
  readonly index: number;
  readonly tier: CardTier;
}[] =>
  cardTierOrder.flatMap((tier) =>
    nextGame.market[`tier${tier}`].flatMap((card, index) =>
      previousGame.market[`tier${tier}`][index]?.id !== card.id
        ? [{ card, index, tier } as const]
        : [],
    ),
  );

const changedDeckTiers = (
  previousGame: SplendorState,
  nextGame: SplendorState,
): readonly CardTier[] =>
  cardTierOrder.filter(
    (tier) => previousGame.decks[`tier${tier}`].length !== nextGame.decks[`tier${tier}`].length,
  );

const delayedBulge = (target: string, delayMs: number): TargetEffectAnimation =>
  targetEffect(target, [effectSequence([effectWait(delayMs), bulge(splendorAnimationTiming.bulgeDurationMs)])]);

const delayedChipArrivalBulge = (target: string, arrivalMs: number): TargetEffectAnimation =>
  delayedBulge(
    target,
    Math.max(arrivalMs - splendorAnimationTiming.chipImpactLeadMs, 0),
  );

const delayedHighlight = (target: string, delayMs: number, durationMs: number): TargetEffectAnimation =>
  targetEffect(target, [effectSequence([effectWait(delayMs), highlight(durationMs)])]);

const delayedFade = (target: string, delayMs: number, durationMs: number): TargetEffectAnimation =>
  targetEffect(target, [effectSequence([effectWait(delayMs), fade(durationMs)])]);

const delayedPulse = (target: string, delayMs: number, durationMs: number): TargetEffectAnimation =>
  targetEffect(target, [effectSequence([effectWait(delayMs), pulseNumber(durationMs)])]);

const delayedReveal = (target: string, delayMs: number, durationMs: number): TargetEffectAnimation =>
  targetEffect(target, [effectSequence([effectWait(delayMs), reveal(durationMs)])]);

const arrivalEffects = (
  previousGame: SplendorState,
  nextGame: SplendorState,
  actorId: string,
  delayMs: number,
  extra: readonly TargetEffectAnimation[] = [],
): readonly TargetEffectAnimation[] => [
  ...extra,
  ...changedMarketCardIds(previousGame, nextGame).map((cardId) =>
    delayedReveal(splendorAnimationTargets.marketCard(cardId), delayMs, splendorAnimationTiming.bulgeDurationMs),
  ),
  ...changedDeckTiers(previousGame, nextGame).map((tier) =>
    delayedBulge(splendorAnimationTargets.deck(tier), delayMs),
  ),
  delayedHighlight(
    splendorAnimationTargets.playerRow(actorId),
    delayMs,
    splendorAnimationTiming.settleDurationMs,
  ),
];

const chipOverlays = (
  previousGame: SplendorState,
  nextGame: SplendorState,
  options?: {
    readonly delayMs?: number;
  },
): readonly ReturnType<typeof overlay<SplendorAnimationObject>>[] => {
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

    const fromTarget =
      delta > 0
        ? splendorAnimationTargets.bankChip(color)
        : splendorAnimationTargets.playerChip(previousActor.identity.id, color);
    const toTarget =
      delta > 0
        ? splendorAnimationTargets.playerChip(previousActor.identity.id, color)
        : splendorAnimationTargets.bankChip(color);

    return Array.from({ length: count }, (_, index) =>
      overlay<SplendorAnimationObject>({
        id: `chip:${previousActor.identity.id}:${color}:${delta > 0 ? 'take' : 'return'}:${index}`,
        mount: clone(fromTarget),
        object: chipObject(color),
        steps: [
          sequence([
            ...(options?.delayMs !== undefined ? [wait<SplendorAnimationObject>(options.delayMs)] : []),
            to(toTarget, {
              durationMs: splendorAnimationTiming.flightDurationMs,
              easing: 'flight',
            }),
          ]),
        ],
        unmount: removeAtEnd(),
      }),
    );
  });
};

const marketRevealOverlays = (
  previousGame: SplendorState,
  nextGame: SplendorState,
  delayMs: number,
): readonly ReturnType<typeof overlay<SplendorAnimationObject>>[] => {
  const revealDurationMs = splendorAnimationTiming.bulgeDurationMs;
  const holdUntilSourceClearsMs = Math.max(
    splendorAnimationTiming.flightDurationMs - delayMs - revealDurationMs,
    0,
  );

  return changedMarketEntries(previousGame, nextGame).map(({ card, index, tier }) =>
    overlay<SplendorAnimationObject>({
      id: `card:market-reveal:${card.id}`,
      initialPose: {
        opacity: 0,
        scale: 0.01,
      },
      mount: detached(splendorAnimationTargets.marketSlot(tier, index)),
      object: cardFace(card),
      steps: [
        sequence([
          wait(delayMs),
          to('self', {
            durationMs: splendorAnimationTiming.bulgeDurationMs - 80,
            opacity: 1,
            scale: 1.06,
          }),
          to('self', {
            durationMs: 80,
            opacity: 1,
            scale: 1,
          }),
          hold(holdUntilSourceClearsMs),
          fadeTo(0, { durationMs: 40 }),
        ]),
      ],
      unmount: removeAtEnd(),
    }),
  );
};

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

  return animation({
    checkpoints: [
      checkpoint(0, departure),
      checkpoint(splendorAnimationTiming.flightDurationMs, arrival),
      checkpoint(
        splendorAnimationTiming.flightDurationMs + splendorAnimationTiming.turnHandoffGapMs,
        nextGame,
      ),
    ],
    effects: [
      ...sourceTargets.map((target) => targetEffect(target, [bulge(splendorAnimationTiming.bulgeDurationMs)])),
      ...destinationTargets.map((target) =>
        delayedChipArrivalBulge(target, splendorAnimationTiming.flightDurationMs),
      ),
      ...arrivalEffects(previousGame, nextGame, nextActor.identity.id, splendorAnimationTiming.flightDurationMs),
    ],
    overlays: chipOverlays(previousGame, nextGame),
  });
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

  return animation({
    checkpoints: [
      checkpoint(0, departure),
      checkpoint(splendorAnimationTiming.flightDurationMs, arrival),
      checkpoint(
        splendorAnimationTiming.flightDurationMs + splendorAnimationTiming.turnHandoffGapMs,
        nextGame,
      ),
    ],
    effects: [
      ...sourceTargets.map((target) => targetEffect(target, [bulge(splendorAnimationTiming.bulgeDurationMs)])),
      ...bankTargets.map((target) =>
        delayedChipArrivalBulge(target, splendorAnimationTiming.flightDurationMs),
      ),
      ...arrivalEffects(previousGame, nextGame, previousActor.identity.id, splendorAnimationTiming.flightDurationMs),
    ],
    overlays: chipOverlays(previousGame, nextGame),
  });
};

const animateReserveVisible = (
  previousGame: SplendorState,
  nextGame: SplendorState,
): Animation<SplendorState, SplendorAnimationObject> | null => {
  const departure = createChipTransferPresentation(previousGame, nextGame);
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
  const cardId = `card:reserve-visible:${reservedCard.id}`;
  const reserveRevealStartMs =
    splendorAnimationTiming.flightDurationMs - splendorAnimationTiming.cardHoldReserveRevealLeadMs;

  return animation({
    checkpoints: [
      checkpoint(0, departure),
      checkpoint(splendorAnimationTiming.flightDurationMs, arrival),
      checkpoint(
        splendorAnimationTiming.flightDurationMs +
          splendorAnimationTiming.cardHoldReserveVisibleMs +
          splendorAnimationTiming.flipDurationMs +
          splendorAnimationTiming.cardArrivalDurationMs +
          splendorAnimationTiming.cardHoldReserveCompleteMs +
          splendorAnimationTiming.turnHandoffGapMs,
        nextGame,
      ),
    ],
    effects: [
      ...sourceBankTargets.map((target) => targetEffect(target, [bulge(splendorAnimationTiming.bulgeDurationMs)])),
      ...destinationChipTargets.map((target) =>
        delayedChipArrivalBulge(target, splendorAnimationTiming.flightDurationMs),
      ),
      delayedBulge(
        splendorAnimationTargets.playerReserved(nextActor.identity.id),
        reserveRevealStartMs,
      ),
      ...arrivalEffects(
        previousGame,
        nextGame,
        nextActor.identity.id,
        reserveRevealStartMs,
      ),
    ],
    overlays: [
      ...chipOverlays(previousGame, nextGame),
      ...marketRevealOverlays(previousGame, nextGame, reserveRevealStartMs),
      overlay({
        id: cardId,
        mount: clone(splendorAnimationTargets.marketCard(reservedCard.id)),
        object: cardFace(reservedCard),
        steps: [
          sequence([
            to(splendorAnimationTargets.playerReserved(nextActor.identity.id), {
              durationMs: splendorAnimationTiming.flightDurationMs,
              easing: 'flight',
              rotate: -4,
              scale: 0.76,
            }),
            hold(splendorAnimationTiming.cardHoldReserveVisibleMs),
            flipTo(cardBack(reservedCard), {
              axis: 'y',
              durationMs: splendorAnimationTiming.flipDurationMs,
            }),
            to('self', {
              durationMs: splendorAnimationTiming.cardArrivalDurationMs,
              rotate: 0,
              scale: 1,
              y: 0,
            }),
            fadeTo(0, {
              durationMs: splendorAnimationTiming.cardHoldReserveCompleteMs,
              rotate: -4,
              scale: 0.24,
              x: 42,
              y: -6,
            }),
          ]),
        ],
        unmount: removeAtEnd(),
      }),
    ],
  });
};

const animateBlindReserve = (
  previousGame: SplendorState,
  nextGame: SplendorState,
): Animation<SplendorState, SplendorAnimationObject> | null => {
  const departure = createBlindReserveDeparturePresentation(previousGame, nextGame);
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

  return animation({
    checkpoints: [
      checkpoint(0, departure),
      checkpoint(splendorAnimationTiming.flightDurationMs, arrival),
      checkpoint(
        splendorAnimationTiming.flightDurationMs +
          splendorAnimationTiming.bulgeDurationMs +
          splendorAnimationTiming.cardArrivalDurationMs +
          splendorAnimationTiming.cardHoldReserveCompleteMs +
          splendorAnimationTiming.turnHandoffGapMs,
        nextGame,
      ),
    ],
    effects: [
      ...sourceBankTargets.map((target) => targetEffect(target, [bulge(splendorAnimationTiming.bulgeDurationMs)])),
      ...destinationChipTargets.map((target) =>
        delayedChipArrivalBulge(target, splendorAnimationTiming.flightDurationMs),
      ),
      delayedBulge(
        splendorAnimationTargets.playerReserved(nextActor.identity.id),
        splendorAnimationTiming.flightDurationMs + splendorAnimationTiming.bulgeDurationMs,
      ),
      ...arrivalEffects(
        previousGame,
        nextGame,
        nextActor.identity.id,
        splendorAnimationTiming.flightDurationMs + splendorAnimationTiming.bulgeDurationMs,
      ),
    ],
    overlays: [
      ...chipOverlays(previousGame, nextGame),
      overlay({
        id: `card:reserve-deck:${reservedCard.id}`,
        mount: clone(splendorAnimationTargets.deck(reservedCard.tier)),
        object: cardBack(reservedCard),
        steps: [
          sequence([
            to(splendorAnimationTargets.playerReserved(nextActor.identity.id), {
              durationMs: splendorAnimationTiming.flightDurationMs,
              easing: 'flight',
              rotate: -4,
              scale: 0.76,
            }),
            hold(splendorAnimationTiming.bulgeDurationMs),
            to('self', {
              durationMs: splendorAnimationTiming.cardArrivalDurationMs,
              rotate: 0,
              scale: 1,
              y: 0,
            }),
            fadeTo(0, {
              durationMs: splendorAnimationTiming.cardHoldReserveCompleteMs,
              rotate: -4,
              scale: 0.24,
              x: 42,
              y: -6,
            }),
          ]),
        ],
        unmount: removeAtEnd(),
      }),
    ],
  });
};

const animateMarketPurchase = (
  previousGame: SplendorState,
  nextGame: SplendorState,
): Animation<SplendorState, SplendorAnimationObject> | null => {
  const departure = createVisibleMarketDeparturePresentation(previousGame, nextGame);
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
  const cardStartDelay = splendorAnimationTiming.purchaseCardStaggerMs;
  const settleStartMs =
    cardStartDelay +
    splendorAnimationTiming.flightDurationMs +
    splendorAnimationTiming.bulgeDurationMs;

  return animation({
    checkpoints: [
      checkpoint(0, departure),
      checkpoint(cardStartDelay + splendorAnimationTiming.flightDurationMs, arrival),
      checkpoint(
        settleStartMs +
          splendorAnimationTiming.cardArrivalDurationMs +
          splendorAnimationTiming.cardHoldReserveCompleteMs +
          splendorAnimationTiming.turnHandoffGapMs,
        nextGame,
      ),
    ],
    effects: [
      ...sourcePlayerChipTargets.map((target) => targetEffect(target, [bulge(splendorAnimationTiming.bulgeDurationMs)])),
      ...bankTargets.map((target) =>
        delayedChipArrivalBulge(target, cardStartDelay + splendorAnimationTiming.flightDurationMs),
      ),
      delayedBulge(
        splendorAnimationTargets.playerTableau(nextActor.identity.id),
        settleStartMs,
      ),
      delayedBulge(
        splendorAnimationTargets.playerTableauBonus(nextActor.identity.id, purchasedCard.bonus),
        settleStartMs,
      ),
      delayedPulse(
        splendorAnimationTargets.playerScore(nextActor.identity.id),
        settleStartMs,
        splendorAnimationTiming.settleDurationMs,
      ),
      ...arrivalEffects(
        previousGame,
        nextGame,
        nextActor.identity.id,
        settleStartMs,
      ),
    ],
    overlays: [
      ...chipOverlays(previousGame, nextGame),
      overlay({
        id: `card:purchase-visible:${purchasedCard.id}`,
        mount: clone(splendorAnimationTargets.marketCard(purchasedCard.id)),
        object: cardFace(purchasedCard),
        steps: [
          sequence([
            wait(cardStartDelay),
            to(splendorAnimationTargets.playerTableau(nextActor.identity.id), {
              durationMs: splendorAnimationTiming.flightDurationMs,
              easing: 'flight',
              rotate: -4,
              scale: 0.76,
            }),
            hold(splendorAnimationTiming.bulgeDurationMs),
            to('self', {
              durationMs: splendorAnimationTiming.cardArrivalDurationMs,
              rotate: 0,
              scale: 1,
              y: 0,
            }),
            fadeTo(0, {
              durationMs: splendorAnimationTiming.cardHoldReserveCompleteMs,
              rotate: -4,
              scale: 0.24,
              x: 42,
              y: -6,
            }),
          ]),
        ],
        unmount: removeAtEnd(),
      }),
    ],
  });
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
  const moveStart =
    splendorAnimationTiming.cardExpandDurationMs +
    splendorAnimationTiming.flipDurationMs +
    splendorAnimationTiming.cardHoldPurchaseReservedMs;
  const bankArrival =
    moveStart +
    splendorAnimationTiming.purchaseReservedChipDelayMs +
    splendorAnimationTiming.flightDurationMs;
  const cardArrival = moveStart + splendorAnimationTiming.flightDurationMs;
  const settleStart = Math.max(bankArrival, cardArrival);

  return animation({
    checkpoints: [
      checkpoint(0, cardDeparture),
      checkpoint(moveStart, departure),
      checkpoint(settleStart, bankTargets.length > 0 ? chipArrival : arrival),
      checkpoint(settleStart + splendorAnimationTiming.settleDurationMs, arrival),
      checkpoint(
        settleStart +
          splendorAnimationTiming.settleDurationMs +
          splendorAnimationTiming.cardHoldReserveCompleteMs +
          splendorAnimationTiming.turnHandoffGapMs,
        nextGame,
      ),
    ],
    effects: [
      ...sourcePlayerChipTargets.map((target) => targetEffect(target, [effectSequence([effectWait(moveStart), bulge(splendorAnimationTiming.bulgeDurationMs)])])),
      ...bankTargets.map((target) =>
        delayedChipArrivalBulge(target, bankArrival),
      ),
      delayedBulge(
        splendorAnimationTargets.playerTableau(nextActor.identity.id),
        settleStart,
      ),
      delayedBulge(
        splendorAnimationTargets.playerTableauBonus(nextActor.identity.id, purchasedCard.bonus),
        settleStart,
      ),
      delayedPulse(
        splendorAnimationTargets.playerScore(nextActor.identity.id),
        settleStart,
        splendorAnimationTiming.settleDurationMs,
      ),
      ...arrivalEffects(previousGame, nextGame, nextActor.identity.id, settleStart),
    ],
    overlays: [
      ...chipOverlays(previousGame, nextGame, {
        delayMs: moveStart + splendorAnimationTiming.purchaseReservedChipDelayMs,
      }),
      overlay({
        id: `card:purchase-reserved:${purchasedCard.id}`,
        mount: clone(splendorAnimationTargets.playerReserved(nextActor.identity.id)),
        object: cardBack(purchasedCard),
        steps: [
          sequence([
            to('self', {
              durationMs: splendorAnimationTiming.cardExpandDurationMs,
              rotate: 0,
              scale: 1,
              y: -8,
            }),
            flipTo(cardFace(purchasedCard), {
              axis: 'y',
              durationMs: splendorAnimationTiming.flipDurationMs,
            }),
            hold(splendorAnimationTiming.cardHoldPurchaseReservedMs),
            to(splendorAnimationTargets.playerTableau(nextActor.identity.id), {
              durationMs: splendorAnimationTiming.flightDurationMs,
              easing: 'flight',
              rotate: -4,
              scale: 0.76,
            }),
            hold(Math.max(bankArrival - cardArrival, 0)),
            to('self', {
              durationMs: splendorAnimationTiming.settleDurationMs,
              rotate: 0,
              scale: 1,
              y: 0,
            }),
            fadeTo(0, {
              durationMs: splendorAnimationTiming.cardHoldReserveCompleteMs,
              rotate: -4,
              scale: 0.24,
              x: 42,
              y: -6,
            }),
          ]),
        ],
        unmount: removeAtEnd(),
      }),
    ],
  });
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

  return animation({
    checkpoints: [
      checkpoint(0, previousGame),
      checkpoint(splendorAnimationTiming.flightDurationMs, arrival),
      checkpoint(
        splendorAnimationTiming.flightDurationMs +
          splendorAnimationTiming.settleDurationMs +
          splendorAnimationTiming.turnHandoffGapMs,
        nextGame,
      ),
    ],
    effects: [
      delayedBulge(
        splendorAnimationTargets.playerNobles(nextActor.identity.id),
        splendorAnimationTiming.flightDurationMs,
      ),
      delayedPulse(
        splendorAnimationTargets.playerScore(nextActor.identity.id),
        splendorAnimationTiming.flightDurationMs,
        splendorAnimationTiming.settleDurationMs,
      ),
      ...arrivalEffects(previousGame, nextGame, nextActor.identity.id, splendorAnimationTiming.flightDurationMs),
    ],
    overlays: [
      overlay({
        id: `noble:${noble.id}`,
        mount: detached(splendorAnimationTargets.viewportNobleOrigin()),
        object: nobleObject(noble),
        steps: [
          sequence([
            to(splendorAnimationTargets.playerNobles(nextActor.identity.id), {
              durationMs: splendorAnimationTiming.flightDurationMs,
              easing: 'flight',
              scale: 0.94,
            }),
          ]),
        ],
        unmount: removeAtEnd(),
      }),
    ],
  });
};

const animateNobleSkip = (
  previousGame: SplendorState,
  nextGame: SplendorState,
): Animation<SplendorState, SplendorAnimationObject> =>
  animation({
    checkpoints: [
      checkpoint(0, previousGame),
      checkpoint(splendorAnimationTiming.turnHandoffGapMs, nextGame),
    ],
  });

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
