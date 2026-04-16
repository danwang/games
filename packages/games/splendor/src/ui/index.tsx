import { type ActiveEffectMap } from '@games/animation-core';
import { ActionSheet, SegmentedControl, useAnimationRunner } from '@games/ui';
import { type GameClientModule, type GameRenderProps } from '@games/game-sdk';
import { type CSSProperties, type ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import {
  getAutoPayment,
  getCardEffectiveCost,
  isValidPaymentForCard,
} from '../rules/selectors.js';
import { type Card, type CardTier, type GemColor, type PaymentSelection, type TokenColor } from '../model/types.js';
import { type SplendorMove, type SplendorPlayerView, type SplendorState } from '../platform/definition.js';
import {
  animateTransition,
  splendorAnimationCssVars,
  splendorAnimationTiming,
  type SplendorAnimationObject,
} from './animations.js';
import { splendorAnimationTargets } from './animation-targets.js';
import { DeckCard, GemPip, getNobleImageSrc, NobleTile, SplendorCard } from './game-card.js';
import { GameCompleteScreen } from './game-complete-screen.js';
import {
  cardTierOrder,
  countGemSelection,
  countTokenSelection,
  deriveInteractionModel,
  derivePlayerSummaries,
  gemOrder,
  moveLabel,
  movesMatchDistinctSelection,
  tokenColorOrder,
  type PlayerSummaryModel,
} from './game-ui.js';
import { deriveRoomHistoryEntries, type RoomActivityEntry } from './room-activity.js';

type Selection =
  | { readonly type: 'market-card'; readonly cardId: string }
  | { readonly type: 'reserved-card'; readonly cardId: string }
  | { readonly type: 'deck'; readonly tier: CardTier }
  | { readonly type: 'bank' }
  | { readonly type: 'player'; readonly playerId: string }
  | { readonly type: 'menu' }
  | null;

type BoardPanel = 'board' | 'nobles' | 'log';
type ForcedSheet = 'discard' | 'noble';

interface PlayerReceiveAnimation {
  readonly changedChipColors: readonly GemColor[];
  readonly changedTableauColors: readonly TokenColor[];
  readonly reservedChanged: boolean;
  readonly scoreChanged: boolean;
}

interface SourceChipBulges {
  readonly bankColors: readonly GemColor[];
  readonly playerColorsById: Readonly<Record<string, readonly GemColor[]>>;
}

interface ReplaySelection {
  readonly afterStateVersion: number;
  readonly beforeStateVersion: number;
  readonly entryId: string | null;
}

export interface SplendorGameViewProps
  extends GameRenderProps<SplendorState, SplendorMove, SplendorPlayerView> {
  readonly initialPanel?: BoardPanel;
  readonly initialSelection?: Selection;
}

const subtleButtonClass =
  'rounded-full border border-white/12 bg-white/5 px-3 py-2 text-sm font-medium text-stone-100 transition hover:border-white/20 hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-45';

const primaryButtonClass =
  'rounded-full bg-amber-300 px-3 py-2 text-sm font-semibold text-stone-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-400';

const createEmptyPaymentSelection = (): PaymentSelection => ({
  tokens: tokenColorOrder.reduce<Record<TokenColor, number>>((result, color) => {
    return {
      ...result,
      [color]: 0,
    };
  }, {} as Record<TokenColor, number>),
  gold: 0,
});

const totalSelectedPayment = (payment: PaymentSelection): number =>
  tokenColorOrder.reduce((sum, color) => sum + payment.tokens[color], payment.gold);

const createTokenList = (tokens: SplendorState['bank']): readonly GemColor[] =>
  gemOrder.flatMap((color) => Array.from({ length: tokens[color] }, () => color));

const normalizeGemSelection = (tokens: readonly GemColor[]): readonly GemColor[] =>
  [...tokens].sort((left, right) => gemOrder.indexOf(left) - gemOrder.indexOf(right));

const discardMoveMatchesSelection = (
  move: Extract<SplendorMove, { readonly type: 'discard-tokens' }>,
  tokens: readonly GemColor[],
): boolean => {
  const left = normalizeGemSelection(move.tokens);
  const right = normalizeGemSelection(tokens);

  return left.length === right.length && left.every((color, index) => color === right[index]);
};

const roomCodeLabel = (roomLabel: string | undefined): string => {
  const rawValue = roomLabel?.replace(/^Room\s+/i, '') ?? 'GAME';

  return rawValue.length > 10 ? rawValue.slice(0, 10).toUpperCase() : rawValue.toUpperCase();
};

const currentTurnCopy = (state: SplendorState, activePlayerName: string): string => {
  if (state.status === 'finished') {
    return 'Final results are ready.';
  }

  if (state.turn.kind === 'discard') {
    return `${activePlayerName} is discarding.`;
  }

  if (state.turn.kind === 'noble') {
    return `${activePlayerName} is choosing a noble.`;
  }

  return `${activePlayerName}'s turn.`;
};

const iconButtonClass =
  'inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-stone-100 transition hover:border-white/20 hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-white/10 disabled:hover:bg-white/5';

const ReplayIconButton = ({
  children,
  disabled = false,
  label,
  onClick,
}: {
  readonly children: ReactNode;
  readonly disabled?: boolean;
  readonly label: string;
  readonly onClick: () => void;
}) => (
  <button
    aria-label={label}
    className={iconButtonClass}
    disabled={disabled}
    onClick={onClick}
    type="button"
  >
    {children}
  </button>
);

const ReplayChevron = ({ direction }: { readonly direction: 'left' | 'right' }) => (
  <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 16 16">
    <path
      d={
        direction === 'left'
          ? 'M10.5 3.5 6 8l4.5 4.5'
          : 'M5.5 3.5 10 8l-4.5 4.5'
      }
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
  </svg>
);

const ReplayDoubleChevron = ({ direction }: { readonly direction: 'left' | 'right' }) => (
  <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 16 16">
    <path
      d={
        direction === 'left'
          ? 'M11.5 3.5 7 8l4.5 4.5M8.5 3.5 4 8l4.5 4.5'
          : 'M4.5 3.5 9 8l-4.5 4.5M7.5 3.5 12 8l-4.5 4.5'
      }
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
  </svg>
);

const ReplayPlayIcon = ({ paused }: { readonly paused: boolean }) =>
  paused ? (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 16 16">
      <path d="M5.5 4.5v7m5-7v7" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
    </svg>
  ) : (
    <svg aria-hidden="true" className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
      <path d="M5 3.8c0-.6.64-.98 1.16-.68l5.62 3.2c.53.3.53 1.06 0 1.36l-5.62 3.2A.78.78 0 0 1 5 10.2V3.8Z" />
    </svg>
  );

const ReplayUndoIcon = () => (
  <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 16 16">
    <path
      d="M5 5.5 2.75 7.75 5 10m-2.25-2.25H8.5a4 4 0 1 1 0 8"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.4"
    />
  </svg>
);

const scrollFadeClass =
  'pointer-events-none absolute inset-x-0 z-10 h-4';

const topScrollFadeClass = `${scrollFadeClass} top-0 bg-[linear-gradient(180deg,_rgba(12,9,8,0.92)_0%,_rgba(12,9,8,0.58)_45%,_rgba(12,9,8,0)_100%)]`;

const bottomScrollFadeClass = `${scrollFadeClass} bottom-0 bg-[linear-gradient(180deg,_rgba(12,9,8,0)_0%,_rgba(12,9,8,0.58)_55%,_rgba(12,9,8,0.92)_100%)]`;

const tokenRingStyles: Readonly<Record<TokenColor, string>> = {
  white: 'outline-stone-300/80',
  blue: 'outline-sky-300/70',
  green: 'outline-emerald-300/70',
  red: 'outline-rose-300/70',
  black: 'outline-stone-500/80',
};

const tableauBadgeStyles: Readonly<Record<TokenColor, string>> = {
  white: 'border-stone-300/80 bg-stone-100/95 text-stone-950',
  blue: 'border-sky-300/60 bg-sky-500/85 text-sky-50',
  green: 'border-emerald-300/60 bg-emerald-500/85 text-emerald-50',
  red: 'border-rose-300/60 bg-rose-500/85 text-rose-50',
  black: 'border-stone-500/80 bg-stone-900/90 text-stone-50',
};

const reservedMarkerStyles = [
  'border-emerald-200/35 from-emerald-700 via-emerald-900 to-emerald-950',
  'border-amber-200/35 from-amber-500 via-yellow-700 to-amber-950',
  'border-sky-200/35 from-sky-700 via-blue-900 to-sky-950',
] as const;

const floatingChipStyles: Readonly<Record<GemColor, string>> = {
  white:
    'border border-stone-400/85 bg-stone-200 text-stone-900 shadow-[0_0_0_1px_rgba(255,255,255,0.45),0_10px_22px_rgba(255,255,255,0.18)]',
  blue:
    'border border-sky-500/70 bg-sky-100 text-sky-900 shadow-[0_0_0_1px_rgba(125,211,252,0.22),0_10px_22px_rgba(56,189,248,0.22)]',
  green:
    'border border-emerald-500/70 bg-emerald-100 text-emerald-900 shadow-[0_0_0_1px_rgba(110,231,183,0.22),0_10px_22px_rgba(52,211,153,0.22)]',
  red:
    'border border-rose-500/70 bg-rose-100 text-rose-900 shadow-[0_0_0_1px_rgba(253,164,175,0.22),0_10px_22px_rgba(251,113,133,0.22)]',
  black:
    'border border-slate-500/80 bg-slate-300 text-slate-950 shadow-[0_0_0_1px_rgba(120,113,108,0.35),0_10px_22px_rgba(24,24,27,0.24)]',
  gold:
    'border border-amber-400/70 bg-amber-100 text-amber-900 shadow-[0_0_0_1px_rgba(253,230,138,0.2),0_10px_22px_rgba(252,211,77,0.24)]',
};

const emptyPlayerReceiveAnimation: PlayerReceiveAnimation = {
  changedChipColors: [],
  changedTableauColors: [],
  reservedChanged: false,
  scoreChanged: false,
};

const groupChipTranslations = (
  translations: ReturnType<
    typeof useAnimationRunner<SplendorState, SplendorAnimationObject>
  >['translations'],
) => {
  const grouped = new Map<
    string,
    {
      readonly color: GemColor;
      count: number;
      readonly delayMs?: number;
      readonly durationMs: number;
      readonly from: string;
      readonly fromX: number;
      readonly fromY: number;
      readonly id: string;
      readonly to: string;
      readonly toX: number;
      readonly toY: number;
    }
  >();

  for (const translation of translations) {
    if (translation.object.kind !== 'chip') {
      continue;
    }

    const key = `${translation.object.color}:${translation.from}:${translation.to}`;
    const existing = grouped.get(key);

    if (existing) {
      existing.count += 1;
      continue;
    }

    grouped.set(key, {
      color: translation.object.color,
      count: 1,
      ...(translation.delayMs !== undefined ? { delayMs: translation.delayMs } : {}),
      durationMs: translation.durationMs,
      from: translation.from,
      fromX: translation.fromX,
      fromY: translation.fromY,
      id: key,
      to: translation.to,
      toX: translation.toX,
      toY: translation.toY,
    });
  }

  return [...grouped.values()];
};

const spreadGroupedChipTranslations = (
  translations: readonly ReturnType<typeof groupChipTranslations>[number][],
) => {
  const pathGroups = new Map<string, ReturnType<typeof groupChipTranslations>[number][]>();

  for (const translation of translations) {
    const key = `${translation.from}:${translation.to}`;
    const existing = pathGroups.get(key) ?? [];
    existing.push(translation);
    pathGroups.set(key, existing);
  }

  return [...pathGroups.values()].flatMap((group) => {
    const ordered = [...group].sort(
      (left, right) => gemOrder.indexOf(left.color) - gemOrder.indexOf(right.color),
    );

    return ordered.map((translation, index) => {
      const centeredIndex = index - (ordered.length - 1) / 2;
      const laneOffsetX = centeredIndex * 18;
      const laneOffsetY = Math.abs(centeredIndex) * 4;

      return {
        ...translation,
        laneOffsetX,
        laneOffsetY,
      };
    });
  });
};

const getFallbackNobleFlightOrigin = (): { readonly x: number; readonly y: number } => {
  if (typeof window === 'undefined') {
    return { x: 148, y: 640 };
  }

  return {
    x: window.innerWidth / 2 - 40,
    y: window.innerHeight - 112,
  };
};

const deriveActiveAnimationState = (
  activeEffects: ActiveEffectMap,
): {
  readonly changedBankColors: readonly GemColor[];
  readonly changedDeckTiers: readonly CardTier[];
  readonly hiddenMarketCardIds: ReadonlySet<string>;
  readonly changedPlayerIds: readonly string[];
} => ({
  changedBankColors: gemOrder.filter((color) => activeEffects.bulge.has(splendorAnimationTargets.bankChip(color))),
  changedDeckTiers: cardTierOrder.filter((tier) => activeEffects.bulge.has(splendorAnimationTargets.deck(tier))),
  hiddenMarketCardIds: new Set(
    Array.from(activeEffects.fade)
      .filter((targetId) => targetId.startsWith('market:'))
      .map((targetId) => targetId.replace('market:', '')),
  ),
  changedPlayerIds: Array.from(activeEffects.highlight)
    .filter((targetId) => targetId.startsWith('player:') && targetId.endsWith(':row'))
    .map((targetId) => targetId.split(':')[1]!)
    .filter((playerId, index, playerIds) => playerIds.indexOf(playerId) === index),
});

const deriveTargetPlayerAnimations = (
  activeEffects: ActiveEffectMap,
  players: readonly PlayerSummaryModel[],
): Readonly<Record<string, PlayerReceiveAnimation>> =>
  players.reduce<Record<string, PlayerReceiveAnimation>>((result, player) => {
    return {
      ...result,
      [player.id]: {
        changedChipColors: gemOrder.filter((color) =>
          activeEffects.bulge.has(splendorAnimationTargets.playerChip(player.id, color)),
        ),
        changedTableauColors: tokenColorOrder.filter((color) =>
          activeEffects.bulge.has(splendorAnimationTargets.playerTableauBonus(player.id, color)),
        ),
        reservedChanged: activeEffects.bulge.has(splendorAnimationTargets.playerReserved(player.id)),
        scoreChanged: activeEffects['pulse-number'].has(splendorAnimationTargets.playerScore(player.id)),
      },
    };
  }, {});

const deriveSourceChipBulgeState = (
  activeEffects: ActiveEffectMap,
  players: readonly PlayerSummaryModel[],
): SourceChipBulges => ({
  bankColors: gemOrder.filter((color) => activeEffects.bulge.has(splendorAnimationTargets.bankChip(color))),
  playerColorsById: players.reduce<Record<string, readonly GemColor[]>>((result, player) => {
    return {
      ...result,
      [player.id]: gemOrder.filter((color) =>
        activeEffects.bulge.has(splendorAnimationTargets.playerChip(player.id, color)),
      ),
    };
  }, {}),
});

const createEmptyEffectMap = () => ({
  bulge: new Set<string>(),
  expand: new Set<string>(),
  fade: new Set<string>(),
  flip: new Set<string>(),
  highlight: new Set<string>(),
  hold: new Set<string>(),
  land: new Set<string>(),
  'pulse-number': new Set<string>(),
});

const ChipStrip = ({
  counts,
  highlightedColors = [],
  targetRefByColor,
}: {
  readonly counts: Readonly<Record<GemColor, number>>;
  readonly highlightedColors?: readonly GemColor[];
  readonly targetRefByColor?: Readonly<Partial<Record<GemColor, (node: HTMLSpanElement | null) => void>>>;
}) => (
  <div className="flex flex-wrap items-center gap-1">
    {gemOrder.map((color) => (
      <span
        key={`chip-${color}`}
        ref={targetRefByColor?.[color]}
        className={`${counts[color] > 0 ? '' : 'opacity-25'} ${
          highlightedColors.includes(color) ? 'receive-bulge' : ''
        }`}
      >
        <GemPip color={color} count={counts[color]} size="summary" />
      </span>
    ))}
  </div>
);

const TableauStrip = ({
  counts,
  highlightedColors = [],
  targetRefByColor,
}: {
  readonly counts: PlayerSummaryModel['tableauBonuses'];
  readonly highlightedColors?: readonly TokenColor[];
  readonly targetRefByColor?: Readonly<
    Partial<Record<TokenColor, (node: HTMLSpanElement | null) => void>>
  >;
}) => (
  <div className="flex flex-wrap items-center gap-1">
    {tokenColorOrder.map((color) => (
      <span
        key={`tableau-${color}`}
        ref={targetRefByColor?.[color]}
        className={`inline-flex h-7 w-7 items-center justify-center rounded-[0.45rem] border text-[10px] font-bold leading-none shadow-sm ${
          tableauBadgeStyles[color]
        } ${counts[color] > 0 ? '' : 'opacity-35'} ${
          highlightedColors.includes(color) ? 'receive-bulge receive-bulge-delay' : ''
        }`}
      >
        {counts[color]}
      </span>
    ))}
  </div>
);

const ReservedMarkers = ({
  isHighlighted = false,
  tiers,
}: {
  readonly isHighlighted?: boolean;
  readonly tiers: readonly (1 | 2 | 3)[];
}) => (
  <div className="flex items-center gap-1">
    {tiers.map((tier, index) => (
      <span
        key={`reserved-marker-${index}`}
        className={`relative h-5 w-3.5 rounded-[0.35rem] border bg-linear-to-br shadow-sm ${
          reservedMarkerStyles[tier - 1]
        } ${isHighlighted ? 'receive-bulge receive-bulge-delay' : ''}`}
      >
        <span className="absolute inset-[2px] rounded-[0.28rem] border border-white/10 bg-[linear-gradient(135deg,_rgba(255,255,255,0.08),_transparent_40%,_rgba(0,0,0,0.18))]" />
      </span>
    ))}
    {tiers.length === 0 ? <span className="text-[11px] text-stone-500">0</span> : null}
  </div>
);

const NobleMarkers = ({ nobleIds }: { readonly nobleIds: readonly string[] }) => (
  <div className="flex items-center gap-1">
    {nobleIds.map((nobleId) => (
      <span
        key={`claimed-noble-${nobleId}`}
        className="relative h-6 w-6 overflow-hidden rounded-[0.45rem] border border-emerald-200/30 bg-stone-950 shadow-sm"
      >
        <img
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
          src={getNobleImageSrc(nobleId)}
        />
      </span>
    ))}
    {nobleIds.length === 0 ? <span className="text-[11px] text-stone-500">0</span> : null}
  </div>
);

const PlayerSummaryRow = ({
  chipTargetRefByColor,
  currentUserId,
  isRecentlyUpdated,
  nobleTargetRef,
  player,
  playerAnimation,
  rowRef,
  scoreTargetRef,
  sourceChipBulges,
  onPress,
  reservedTargetRef,
  tableauBonusTargetRefByColor,
  tableauTargetRef,
}: {
  readonly chipTargetRefByColor?: Readonly<
    Partial<Record<GemColor, (node: HTMLSpanElement | null) => void>>
  >;
  readonly currentUserId: string | undefined;
  readonly isRecentlyUpdated: boolean;
  readonly nobleTargetRef?: (node: HTMLDivElement | null) => void;
  readonly onPress: () => void;
  readonly player: PlayerSummaryModel;
  readonly playerAnimation: PlayerReceiveAnimation;
  readonly reservedTargetRef?: (node: HTMLDivElement | null) => void;
  readonly rowRef?: (node: HTMLButtonElement | null) => void;
  readonly scoreTargetRef?: (node: HTMLParagraphElement | null) => void;
  readonly sourceChipBulges: readonly GemColor[];
  readonly tableauBonusTargetRefByColor?: Readonly<
    Partial<Record<TokenColor, (node: HTMLSpanElement | null) => void>>
  >;
  readonly tableauTargetRef?: (node: HTMLDivElement | null) => void;
}) => {
  const isCurrentUser = player.id === currentUserId;
  const totalTableauCards = tokenColorOrder.reduce(
    (sum, color) => sum + player.tableauBonuses[color],
    0,
  );
  const totalChips = gemOrder.reduce((sum, color) => sum + player.tokens[color], 0);

  return (
    <button
      ref={rowRef}
      className={`relative w-full overflow-hidden rounded-[1rem] border px-2.5 py-1.5 text-left ${
        isCurrentUser
          ? 'border-amber-300/45 bg-amber-300/10'
          : 'border-white/8 bg-white/3'
      } ${isRecentlyUpdated ? 'player-row-receive' : ''}`}
      onClick={onPress}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[13px] font-semibold text-stone-50">{player.displayName}</span>
            {isCurrentUser ? (
              <span className="inline-flex h-5 items-center rounded-full border border-sky-300/25 px-2 text-[9px] leading-none uppercase tracking-[0.15em] text-sky-200">
                You
              </span>
            ) : null}
          </div>
        </div>
        <div className="text-right">
          <p className="text-[9px] uppercase tracking-[0.18em] text-stone-500">VP</p>
          <p
            ref={scoreTargetRef}
            className={`text-[1.05rem] leading-none font-semibold text-amber-50 ${
              playerAnimation.scoreChanged ? 'score-flip' : ''
            }`}
          >
            {player.score}
          </p>
        </div>
      </div>

      <div className="mt-1 grid grid-cols-[3.9rem_minmax(0,1fr)] items-center gap-x-2 gap-y-1">
        <p className="whitespace-nowrap text-[9px] uppercase tracking-[0.18em] text-stone-500">
          Cards ({totalTableauCards})
        </p>
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <div ref={tableauTargetRef} className="min-w-0">
            <TableauStrip
              counts={player.tableauBonuses}
              highlightedColors={playerAnimation.changedTableauColors}
              {...(tableauBonusTargetRefByColor ? { targetRefByColor: tableauBonusTargetRefByColor } : {})}
            />
          </div>
          <div className="flex items-center gap-2 justify-self-end">
            <div ref={reservedTargetRef}>
              <ReservedMarkers
                isHighlighted={playerAnimation.reservedChanged}
                tiers={player.reservedTiers}
              />
            </div>
            {player.nobleIds.length > 0 ? (
              <div className="min-w-0">
                <NobleMarkers nobleIds={player.nobleIds} />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-0.75 grid grid-cols-[3.9rem_minmax(0,1fr)] items-center gap-x-2 gap-y-1">
        <p className="whitespace-nowrap text-[9px] uppercase tracking-[0.18em] text-stone-500">
          Chips ({totalChips})
        </p>
        <div className="min-w-0">
          <ChipStrip
            counts={player.tokens}
            highlightedColors={[...playerAnimation.changedChipColors, ...sourceChipBulges]}
            {...(chipTargetRefByColor ? { targetRefByColor: chipTargetRefByColor } : {})}
          />
        </div>
      </div>
      <div
        ref={nobleTargetRef}
        aria-hidden="true"
        className="pointer-events-none absolute right-2.25 bottom-2 h-6 w-6 opacity-0"
      />
    </button>
  );
};

export const SplendorGameView = ({
  initialPanel = 'board',
  initialSelection = null,
  leaveRoom,
  playerId,
  playerView,
  roomHistory = [],
  roomLabel,
  roomSummary,
  roomStateVersion,
  state,
  submitMove,
}: SplendorGameViewProps) => {
  const [selection, setSelection] = useState<Selection>(initialSelection);
  const [activePanel, setActivePanel] = useState<BoardPanel>(initialPanel);
  const [bankSelection, setBankSelection] = useState<readonly TokenColor[]>([]);
  const [discardSelection, setDiscardSelection] = useState<readonly GemColor[]>([]);
  const [purchaseSelection, setPurchaseSelection] = useState<PaymentSelection>(createEmptyPaymentSelection);
  const [showGameComplete, setShowGameComplete] = useState(state.status === 'finished');
  const [replaySelection, setReplaySelection] = useState<ReplaySelection | null>(null);
  const [isReplayPlaying, setIsReplayPlaying] = useState(false);
  const [dismissedForcedSheet, setDismissedForcedSheet] = useState<ForcedSheet | null>(null);
  const mainScrollRef = useRef<HTMLDivElement | null>(null);
  const targetNodeRefs = useRef<Partial<Record<string, HTMLElement | null>>>({});
  const registerTarget = useCallback(
    (targetId: string) => (node: HTMLElement | null) => {
      targetNodeRefs.current[targetId] = node;
    },
    [],
  );
  const [mainScrollFadeState, setMainScrollFadeState] = useState({
    showBottom: false,
    showTop: false,
  });
  const normalizedRoomHistory = useMemo(() => {
    const byVersion = new Map<number, (typeof roomHistory)[number]>();

    for (const entry of roomHistory) {
      byVersion.set(entry.stateVersion, entry);
    }

    if (roomStateVersion !== undefined) {
      byVersion.set(roomStateVersion, {
        state,
        stateVersion: roomStateVersion,
        status: state.status,
      });
    }

    return [...byVersion.values()].sort((left, right) => left.stateVersion - right.stateVersion);
  }, [roomHistory, roomStateVersion, state]);
  const roomHistoryByVersion = useMemo(
    () => new Map(normalizedRoomHistory.map((entry) => [entry.stateVersion, entry])),
    [normalizedRoomHistory],
  );
  const resolveTargetRect = useCallback((targetId: string) => {
    if (targetId === splendorAnimationTargets.viewportNobleOrigin()) {
      const origin = getFallbackNobleFlightOrigin();

      return {
        height: 68,
        left: origin.x,
        top: origin.y,
        width: 68,
      };
    }

    const node = targetNodeRefs.current[targetId];

    if (!node) {
      return null;
    }

    const rect = node.getBoundingClientRect();

    return {
      height: rect.height,
      left: rect.left,
      top: rect.top,
      width: rect.width,
    };
  }, []);
  const replayBeforeEntry = replaySelection
    ? roomHistoryByVersion.get(replaySelection.beforeStateVersion) ?? null
    : null;
  const replayAfterEntry = replaySelection
    ? roomHistoryByVersion.get(replaySelection.afterStateVersion) ?? null
    : null;
  const sourceState = replayAfterEntry?.state ?? state;
  const animationFrame = useAnimationRunner<SplendorState, SplendorAnimationObject>({
    canonicalSnapshot: sourceState,
    deriveAnimation: (previousSnapshot, nextSnapshot) =>
      animateTransition(null, previousSnapshot, nextSnapshot),
    initialPresentedSnapshot: replayBeforeEntry?.state ?? null,
    resetKey: replaySelection
      ? `replay:${replaySelection.entryId}:${replaySelection.beforeStateVersion}:${replaySelection.afterStateVersion}`
      : 'live',
    resolveTargetRect,
  });
  const displayedState = animationFrame.presentedSnapshot ?? sourceState;
  const displayedActivePlayerId =
    displayedState.players[displayedState.turn.activePlayerIndex]?.identity.id ?? playerView.activePlayerId;
  const interaction = useMemo(
    () => deriveInteractionModel(displayedState, playerId ?? undefined),
    [displayedState, playerId],
  );
  const playerSummaries = useMemo(() => derivePlayerSummaries(displayedState), [displayedState]);
  const animationState = deriveActiveAnimationState(animationFrame.activeEffects);
  const groupedChipTranslations = useMemo(
    () => groupChipTranslations(animationFrame.translations),
    [animationFrame.translations],
  );
  const displayedChipTranslations = useMemo(
    () => spreadGroupedChipTranslations(groupedChipTranslations),
    [groupedChipTranslations],
  );
  const playerAnimations = deriveTargetPlayerAnimations(animationFrame.activeEffects, playerSummaries);
  const sourceChipBulges = deriveSourceChipBulgeState(animationFrame.activeEffects, playerSummaries);
  const cardTranslations = animationFrame.translations.filter(
    (translation): translation is typeof animationFrame.translations[number] & {
      readonly object: Extract<SplendorAnimationObject, { readonly kind: 'card' | 'noble' }>;
    } => translation.object.kind === 'card' || translation.object.kind === 'noble',
  );
  const activePlayer = displayedState.players[displayedState.turn.activePlayerIndex] ?? null;
  const activePlayerName = activePlayer?.identity.displayName ?? 'Unknown player';
  const activityEntries = useMemo(
    () => deriveRoomHistoryEntries(normalizedRoomHistory),
    [normalizedRoomHistory],
  );
  const replayableEntries = useMemo(
    () =>
      activityEntries
        .filter(
          (entry) =>
            roomHistoryByVersion.has(entry.beforeStateVersion) &&
            roomHistoryByVersion.has(entry.afterStateVersion),
        )
        .sort((left, right) => left.afterStateVersion - right.afterStateVersion),
    [activityEntries, roomHistoryByVersion],
  );
  const replayEntry = replaySelection
    ? replaySelection.entryId === null
      ? null
      : replayableEntries.find((entry) => entry.id === replaySelection.entryId) ?? null
    : null;
  const isInitialReplayState =
    replaySelection !== null &&
    replaySelection.entryId === null &&
    replaySelection.beforeStateVersion === replaySelection.afterStateVersion;
  const replayIndex = replayEntry
    ? replayableEntries.findIndex((entry) => entry.id === replayEntry.id)
    : -1;
  const previousReplayEntry = isInitialReplayState
    ? null
    : replayIndex > 0
      ? replayableEntries[replayIndex - 1] ?? null
      : null;
  const nextReplayEntry = isInitialReplayState
    ? replayableEntries[0] ?? null
    : replayIndex >= 0 && replayIndex < replayableEntries.length - 1
      ? replayableEntries[replayIndex + 1] ?? null
      : null;
  const latestReplayEntry =
    replayableEntries.length > 0 ? replayableEntries[replayableEntries.length - 1] ?? null : null;
  const liveAdvancedWhileReplaying =
    replaySelection !== null &&
    roomStateVersion !== undefined &&
    roomStateVersion > replaySelection.afterStateVersion;
  const selectedVisibleCard =
    selection?.type === 'market-card'
      ? cardTierOrder
          .flatMap((tier) => displayedState.market[`tier${tier}`])
          .find((card) => card.id === selection.cardId) ?? null
      : null;
  const currentPlayer = displayedState.players.find((player) => player.identity.id === playerId) ?? null;
  const selectedReservedCard =
    selection?.type === 'reserved-card'
      ? currentPlayer?.reservedCards.find((card) => card.id === selection.cardId) ?? null
      : null;
  const selectedPlayer =
    selection?.type === 'player'
      ? displayedState.players.find((player) => player.identity.id === selection.playerId) ?? null
      : null;
  const selectedBankMove =
    interaction.pairMovesByColor[bankSelection[0] ?? 'white'] && bankSelection.length === 2
      ? interaction.pairMovesByColor[bankSelection[0] ?? 'white'] ?? null
      : interaction.distinctMoves.find((move) => movesMatchDistinctSelection(move, bankSelection)) ?? null;
  const discardTokenPool = activePlayer ? createTokenList(activePlayer.tokens) : [];
  const discardMove =
    interaction.discardMoves.find((move) => discardMoveMatchesSelection(move, discardSelection)) ?? null;
  const waitingForDiscard = displayedState.turn.kind === 'discard';
  const waitingForNoble = displayedState.turn.kind === 'noble';
  const forcedSheet: ForcedSheet | null = interaction.isCurrentUsersTurn
    ? waitingForNoble
      ? 'noble'
      : waitingForDiscard
        ? 'discard'
        : null
    : null;
  const visibleForcedSheet = forcedSheet !== null && dismissedForcedSheet !== forcedSheet ? forcedSheet : null;
  const actionSheetOpen = visibleForcedSheet !== null || selection !== null;
  const canSubmitRealtimeMoves = replaySelection === null;

  const submitAndReset = (move: SplendorMove) => {
    submitMove(move);
    setSelection(null);
    setDismissedForcedSheet(null);
    setBankSelection([]);
    setDiscardSelection([]);
    setPurchaseSelection(createEmptyPaymentSelection());
  };

  const startReplay = (entry: RoomActivityEntry) => {
    setSelection(null);
    setActivePanel('log');
    setIsReplayPlaying(false);
    setReplaySelection({
      afterStateVersion: entry.afterStateVersion,
      beforeStateVersion: entry.beforeStateVersion,
      entryId: entry.id,
    });
  };

  const selectInitialReplayState = () => {
    const firstHistoryEntry = normalizedRoomHistory[0];

    if (!firstHistoryEntry) {
      return;
    }

    setSelection(null);
    setActivePanel('log');
    setIsReplayPlaying(false);
    setReplaySelection({
      afterStateVersion: firstHistoryEntry.stateVersion,
      beforeStateVersion: firstHistoryEntry.stateVersion,
      entryId: null,
    });
  };

  const stopReplay = () => {
    setIsReplayPlaying(false);
    setReplaySelection(null);
  };

  useEffect(() => {
    if (!replaySelection) {
      return;
    }

    if (
      !roomHistoryByVersion.has(replaySelection.beforeStateVersion) ||
      !roomHistoryByVersion.has(replaySelection.afterStateVersion)
    ) {
      setIsReplayPlaying(false);
      setReplaySelection(null);
    }
  }, [replaySelection, roomHistoryByVersion]);

  useEffect(() => {
    if (forcedSheet === null) {
      setDismissedForcedSheet(null);
      return;
    }

    if (dismissedForcedSheet !== null && dismissedForcedSheet !== forcedSheet) {
      setDismissedForcedSheet(null);
    }
  }, [dismissedForcedSheet, forcedSheet]);

  useEffect(() => {
    if (!isReplayPlaying) {
      return;
    }

    if (!nextReplayEntry) {
      setIsReplayPlaying(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      startReplay(nextReplayEntry);
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [isReplayPlaying, nextReplayEntry]);

  useEffect(() => {
    if (displayedState.status === 'finished') {
      setShowGameComplete(true);
      return;
    }

    if (replaySelection === null) {
      setShowGameComplete(false);
    }
  }, [displayedState.status, replaySelection]);

  useEffect(() => {
    const scrollNode = mainScrollRef.current;

    if (!scrollNode) {
      return;
    }

    const updateFadeState = () => {
      const { clientHeight, scrollHeight, scrollTop } = scrollNode;
      const maxScrollTop = Math.max(scrollHeight - clientHeight, 0);

      setMainScrollFadeState({
        showTop: scrollTop > 2,
        showBottom: maxScrollTop - scrollTop > 2,
      });
    };

    updateFadeState();
    scrollNode.addEventListener('scroll', updateFadeState, { passive: true });
    window.addEventListener('resize', updateFadeState);

    return () => {
      scrollNode.removeEventListener('scroll', updateFadeState);
      window.removeEventListener('resize', updateFadeState);
    };
  }, [activePanel, displayedState, showGameComplete]);

  const toggleBankColor = (color: TokenColor) => {
    setBankSelection((current) => {
      const selectedCount = countTokenSelection(current)[color];
      const pairMove = interaction.pairMovesByColor[color];
      const availableCount = displayedState.bank[color];

      if (selectedCount > 1) {
        return current;
      }

      if (selectedCount === 1 && current.length === 1 && pairMove) {
        return [color, color];
      }

      if (selectedCount > 0) {
        return current.filter((entry, index) => index !== current.indexOf(color));
      }

      if (current.length >= 3 || selectedCount >= availableCount) {
        return current;
      }

      const next = [...current, color];
      return interaction && (selectedCount > 0 || movesMatchDistinctSelection({ type: 'take-distinct', colors: next }, next) || selectedBankMove || interaction.distinctMoves.some((move) => next.length <= move.colors.length && next.every((entry) => move.colors.includes(entry))))
        ? next
        : next;
    });
  };

  const renderPurchaseSheet = (card: Card, source: 'market' | 'reserved') => {
    const purchaseMove =
      source === 'market'
        ? interaction.purchaseVisibleByCardId[card.id]
        : interaction.purchaseReservedByCardId[card.id];
    const reserveMove = source === 'market' ? interaction.reserveVisibleByCardId[card.id] : null;
    const isActionable =
      canSubmitRealtimeMoves && interaction.isCurrentUsersTurn && displayedState.turn.kind === 'main-action';
    const autoPayment = activePlayer ? getAutoPayment(activePlayer, card) : null;
    const effectiveCost = activePlayer ? getCardEffectiveCost(activePlayer, card) : createEmptyPaymentSelection().tokens;
    const manualSelectedCount = totalSelectedPayment(purchaseSelection);
    const manualPaymentValid =
      activePlayer !== null && isValidPaymentForCard(activePlayer, card, purchaseSelection);
    const totalEffectiveCost = tokenColorOrder.reduce((sum, color) => sum + effectiveCost[color], 0);

    const addPaymentToken = (color: GemColor) => {
      if (!activePlayer || totalSelectedPayment(purchaseSelection) >= totalEffectiveCost) {
        return;
      }

      if (color === 'gold') {
        if (purchaseSelection.gold >= activePlayer.tokens.gold) {
          return;
        }

        setPurchaseSelection((current) => ({
          ...current,
          gold: current.gold + 1,
        }));
        return;
      }

      if (
        purchaseSelection.tokens[color] >= activePlayer.tokens[color] ||
        purchaseSelection.tokens[color] >= effectiveCost[color]
      ) {
        return;
      }

      setPurchaseSelection((current) => ({
        ...current,
        tokens: {
          ...current.tokens,
          [color]: current.tokens[color] + 1,
        },
      }));
    };

    const removePaymentToken = (color: GemColor) => {
      if (color === 'gold') {
        setPurchaseSelection((current) => ({
          ...current,
          gold: Math.max(0, current.gold - 1),
        }));
        return;
      }

      setPurchaseSelection((current) => ({
        ...current,
        tokens: {
          ...current.tokens,
          [color]: Math.max(0, current.tokens[color] - 1),
        },
      }));
    };

    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-24 shrink-0">
            <SplendorCard card={card} size="compact" />
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <section className="space-y-2">
              <p className="text-xs uppercase tracking-[0.24em] text-stone-500">Effective cost</p>
              <div className="flex flex-wrap gap-2">
                {tokenColorOrder
                  .filter((color) => effectiveCost[color] > 0)
                  .map((color) => (
                    <GemPip color={color} count={effectiveCost[color]} key={`effective-${card.id}-${color}`} size="sm" />
                  ))}
                {totalEffectiveCost === 0 ? <span className="text-sm text-stone-400">Free with discounts</span> : null}
              </div>
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.24em] text-stone-500">Your chips</p>
                <button
                  className="text-[10px] uppercase tracking-[0.18em] text-stone-500 transition hover:text-stone-300 disabled:cursor-not-allowed disabled:opacity-35"
                  disabled={manualSelectedCount === 0}
                  onClick={() => setPurchaseSelection(createEmptyPaymentSelection())}
                  type="button"
                >
                  Clear
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {gemOrder.map((color) => {
                  const selectedCount = color === 'gold' ? purchaseSelection.gold : purchaseSelection.tokens[color as TokenColor];
                  const availableCount = activePlayer?.tokens[color] ?? 0;

                  return (
                    <button
                      className="relative rounded-full"
                      disabled={
                        !isActionable ||
                        availableCount === 0 ||
                        manualSelectedCount >= totalEffectiveCost ||
                        (color === 'gold'
                          ? purchaseSelection.gold >= availableCount
                          : effectiveCost[color as TokenColor] === 0 ||
                            purchaseSelection.tokens[color as TokenColor] >= availableCount ||
                            purchaseSelection.tokens[color as TokenColor] >= effectiveCost[color as TokenColor])
                      }
                      key={`payment-chip-${card.id}-${color}`}
                      onClick={() => addPaymentToken(color)}
                      type="button"
                    >
                      <GemPip color={color} count={availableCount} size="sm" />
                      {selectedCount > 0 ? (
                        <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-stone-950 px-1 text-[10px] font-semibold text-stone-100 ring-1 ring-white/10">
                          {selectedCount}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="space-y-2">
              <p className="text-xs uppercase tracking-[0.24em] text-stone-500">Paying</p>
              <div className="min-h-11 rounded-[1rem] border border-white/8 bg-white/4 p-2">
                <div className="flex flex-wrap gap-2">
                  {gemOrder
                    .filter((color) =>
                      color === 'gold'
                        ? purchaseSelection.gold > 0
                        : purchaseSelection.tokens[color as TokenColor] > 0,
                    )
                    .map((color) => {
                      const count = color === 'gold' ? purchaseSelection.gold : purchaseSelection.tokens[color as TokenColor];

                      return (
                        <button
                          className="rounded-full ring-2 ring-amber-300/40"
                          key={`selected-${card.id}-${color}`}
                          onClick={() => removePaymentToken(color)}
                          type="button"
                        >
                          <GemPip color={color} count={count} size="sm" />
                        </button>
                      );
                    })}
                  {manualSelectedCount === 0 ? <p className="text-sm text-stone-500">Auto-buy will spend the fewest gold.</p> : null}
                </div>
              </div>
            </section>
          </div>
        </div>
        <div className="grid gap-3">
          <button
            className={primaryButtonClass}
            disabled={!isActionable || (manualSelectedCount === 0 ? !purchaseMove || !autoPayment : !manualPaymentValid)}
            onClick={() => {
              if (manualSelectedCount > 0) {
                submitAndReset({
                  type: source === 'market' ? 'purchase-visible' : 'purchase-reserved',
                  cardId: card.id,
                  payment: purchaseSelection,
                });
                return;
              }

              if (purchaseMove && autoPayment) {
                submitAndReset({
                  type: source === 'market' ? 'purchase-visible' : 'purchase-reserved',
                  cardId: card.id,
                  payment: autoPayment,
                });
              }
            }}
            type="button"
          >
            {manualSelectedCount > 0 ? 'Buy' : 'Auto-buy'}
          </button>
          {source === 'market' ? (
            <button
              className={subtleButtonClass}
              disabled={!reserveMove || !isActionable}
              onClick={() => reserveMove && submitAndReset(reserveMove)}
              type="button"
            >
              Reserve
            </button>
          ) : null}
        </div>
      </div>
    );
  };

  const renderDeckSheet = (tier: CardTier) => {
    const reserveMove = interaction.deckMovesByTier[tier];

    return (
      <div className="space-y-3">
        {reserveMove && canSubmitRealtimeMoves && interaction.isCurrentUsersTurn && displayedState.turn.kind === 'main-action' ? (
          <button className={primaryButtonClass} onClick={() => submitAndReset(reserveMove)} type="button">
            Reserve
          </button>
        ) : (
          <p className="text-sm leading-6 text-stone-300">You cannot reserve from this deck right now.</p>
        )}
      </div>
    );
  };

  const renderBankSheet = () => (
    <div className="space-y-5">
      <p className="text-sm leading-6 text-stone-300">
        Tap bank tokens to build your pick. Tap the same color twice to take a pair when allowed.
      </p>
      <section className="space-y-3">
        <p className="text-xs uppercase tracking-[0.24em] text-stone-500">Selected {bankSelection.length}/3</p>
        <div className="flex flex-wrap gap-2.5">
          {tokenColorOrder.map((color) => {
            const selectedCount = countTokenSelection(bankSelection)[color];

            return (
              <button
                className="relative rounded-full px-1.5 py-1"
                disabled={displayedState.bank[color] === 0}
                key={`bank-${color}`}
                onClick={() => toggleBankColor(color)}
                type="button"
              >
                <GemPip color={color} count={displayedState.bank[color]} />
                {selectedCount > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-stone-950 px-1 text-[10px] font-semibold text-stone-100 ring-1 ring-white/10">
                    {selectedCount}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </section>
      <button
        className={primaryButtonClass}
        disabled={!selectedBankMove || !canSubmitRealtimeMoves}
        onClick={() => selectedBankMove && submitAndReset(selectedBankMove)}
        type="button"
      >
        Take {bankSelection.length}
      </button>
    </div>
  );

  const renderDiscardSheet = () => {
    const requiredCount = displayedState.turn.kind === 'discard' ? displayedState.turn.requiredCount : 0;
    const remainingTokens = discardSelection.reduce<readonly GemColor[]>((pool, color) => {
      const tokenIndex = pool.indexOf(color);
      return tokenIndex === -1 ? pool : pool.filter((_, index) => index !== tokenIndex);
    }, discardTokenPool);
    const remainingCounts = countGemSelection(remainingTokens);
    const discardCounts = countGemSelection(discardSelection);

    return (
      <div className="space-y-5">
        <p className="text-sm leading-6 text-stone-300">
          Tap tokens to move them into the discard pile. Submit once you have exactly {requiredCount}.
        </p>
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.28em] text-stone-400">Your tokens</p>
            <span className="text-xs uppercase tracking-[0.22em] text-stone-500">
              {Math.max(requiredCount - discardSelection.length, 0)} left
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {gemOrder
              .filter((color) => remainingCounts[color] > 0)
              .map((color) => (
                <button
                  className="rounded-full"
                  disabled={discardSelection.length >= requiredCount}
                  key={`available-${color}`}
                  onClick={() => {
                    if (discardSelection.length < requiredCount) {
                      setDiscardSelection((current) => [...current, color]);
                    }
                  }}
                  type="button"
                >
                  <GemPip color={color} count={remainingCounts[color]} />
                </button>
              ))}
          </div>
        </section>
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.28em] text-amber-300/70">To discard</p>
            <span className="text-xs uppercase tracking-[0.22em] text-stone-500">
              {discardSelection.length}/{requiredCount}
            </span>
          </div>
          <div className="min-h-14 rounded-[1.2rem] border border-white/8 bg-white/3 p-3">
            <div className="flex min-h-10 flex-wrap items-center gap-2">
              {gemOrder
                .filter((color) => discardCounts[color] > 0)
                .map((color) => (
                  <button
                    className="rounded-full ring-2 ring-amber-300/40"
                    key={`discard-${color}`}
                    onClick={() => {
                      const tokenIndex = discardSelection.indexOf(color);

                      if (tokenIndex !== -1) {
                        setDiscardSelection((current) => current.filter((_, index) => index !== tokenIndex));
                      }
                    }}
                    type="button"
                  >
                    <GemPip color={color} count={discardCounts[color]} />
                  </button>
                ))}
              {discardSelection.length === 0 ? (
                <span className="inline-flex min-h-10 items-center text-sm text-stone-500">
                  Select tokens to discard.
                </span>
              ) : null}
            </div>
          </div>
        </section>
        <button
          className={primaryButtonClass}
          disabled={discardSelection.length !== requiredCount || !discardMove || !canSubmitRealtimeMoves}
          onClick={() => discardMove && submitAndReset(discardMove)}
          type="button"
        >
          {discardSelection.length === requiredCount ? 'Discard selected tokens' : `Select ${requiredCount} tokens`}
        </button>
      </div>
    );
  };

  const renderNobleSheet = () => (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-stone-300">Your purchase unlocked a noble. Claim one or skip the visit.</p>
      <div className="grid grid-cols-3 gap-2">
        {[
          ...displayedState.nobles.map((noble) => ({
            noble,
            ownerDisplayName: null as string | null,
          })),
          ...displayedState.players.flatMap((player) =>
            player.nobles.map((noble) => ({
              noble,
              ownerDisplayName: player.identity.displayName,
            })),
          ),
        ].map(({ noble, ownerDisplayName }) => {
          const claimMove = interaction.claimNobleMoves.find((move) => move.nobleId === noble.id);
          const statusLabel = claimMove
            ? 'Claim'
            : ownerDisplayName
              ? 'Claimed'
              : 'Ineligible';

          return (
            <div
              className={`relative ${
                claimMove
                  ? ''
                  : ownerDisplayName
                    ? 'opacity-45 saturate-50'
                    : ''
              }`}
              key={`noble-${noble.id}`}
            >
              <NobleTile
                isSelected={Boolean(claimMove)}
                noble={noble}
                size="compact"
                {...(claimMove
                  ? {
                      onPress: () => canSubmitRealtimeMoves && submitAndReset(claimMove),
                    }
                  : {})}
              />
              <span
                className={`pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] ${
                  claimMove
                    ? 'border border-emerald-200/35 bg-emerald-500/18 text-emerald-50 shadow-[0_6px_20px_rgba(16,185,129,0.18)]'
                    : ownerDisplayName
                      ? 'border border-sky-200/20 bg-sky-950/70 text-sky-100'
                      : 'border border-white/10 bg-stone-950/75 text-stone-400'
                }`}
              >
                {statusLabel}
              </span>
            </div>
          );
        })}
      </div>
      {interaction.skipNobleMove ? (
        <button className={subtleButtonClass} disabled={!canSubmitRealtimeMoves} onClick={() => submitAndReset(interaction.skipNobleMove!)} type="button">
          Skip noble
        </button>
      ) : null}
    </div>
  );

  const renderPlayerSheet = (player: SplendorState['players'][number]) => {
    const playerSummary = playerSummaries.find((summary) => summary.id === player.identity.id)!;
    const canViewReserved = player.identity.id === playerId;

    return (
      <div className="space-y-4">
        <div className="rounded-[1.2rem] border border-white/8 bg-white/4 p-3">
          <p className="text-xs uppercase tracking-[0.28em] text-stone-400">Tableau cards</p>
          <div className="mt-3 grid grid-cols-5 gap-1.5">
            {player.purchasedCards.length > 0 ? (
              player.purchasedCards.map((card) => (
                <SplendorCard card={card} key={`tableau-${player.identity.id}-${card.id}`} size="tiny" />
              ))
            ) : (
              <p className="col-span-5 text-sm text-stone-500">No purchased cards yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-[1.2rem] border border-white/8 bg-white/4 p-3">
          <p className="text-xs uppercase tracking-[0.28em] text-stone-400">Reserved cards</p>
          <div className="mt-3">
            {canViewReserved ? (
              <div className="grid grid-cols-5 gap-1.5">
                {player.reservedCards.length > 0 ? (
                  player.reservedCards.map((card) => (
                    <SplendorCard
                      card={card}
                      key={`reserved-detail-${card.id}`}
                      onPress={() => setSelection({ type: 'reserved-card', cardId: card.id })}
                      size="tiny"
                    />
                  ))
                ) : (
                  <p className="col-span-5 text-sm text-stone-500">No reserved cards.</p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-1.5">
                {playerSummary.reservedTiers.map((tier, index) => (
                  <DeckCard
                    hideCount
                    key={`hidden-${player.identity.id}-${index}`}
                    remainingCount={0}
                    size="compact"
                    tier={tier}
                  />
                ))}
                {playerSummary.reservedTiers.length === 0 ? (
                  <p className="col-span-5 text-sm text-stone-500">No reserved cards.</p>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderMenuSheet = () => (
    <div className="space-y-4">
      <div className="rounded-[1rem] border border-white/8 bg-white/4 p-3 text-sm text-stone-300">
        {roomLabel ?? 'Current game'}
      </div>
      {roomSummary ? (
        <div className="rounded-[1rem] border border-white/8 bg-white/4 p-3 text-sm text-stone-300">
          {roomSummary}
        </div>
      ) : null}
      {leaveRoom ? (
        <button className={subtleButtonClass} onClick={leaveRoom} type="button">
          Back to lobby
        </button>
      ) : null}
    </div>
  );

  const renderBoardPanel = () => (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <section className="shrink-0 rounded-[1rem] border border-white/10 bg-stone-950/72 p-2 shadow-[0_14px_36px_rgba(0,0,0,0.24)]">
        <button
          className={`flex w-full items-center gap-2 rounded-[0.8rem] text-left transition ${
            selection?.type === 'bank' ? 'bg-white/5' : ''
          } ${canSubmitRealtimeMoves && interaction.isCurrentUsersTurn && displayedState.turn.kind === 'main-action' ? 'active:scale-[0.995]' : ''}`}
          disabled={!canSubmitRealtimeMoves || !interaction.isCurrentUsersTurn || displayedState.turn.kind !== 'main-action'}
          onClick={() => setSelection({ type: 'bank' })}
          type="button"
        >
          <span className="text-[10px] uppercase tracking-[0.18em] text-stone-400">Bank</span>
          <ChipStrip
            counts={displayedState.bank}
            highlightedColors={animationState.changedBankColors}
            targetRefByColor={Object.fromEntries(
              gemOrder.map((color) => [color, registerTarget(splendorAnimationTargets.bankChip(color))]),
            ) as Partial<Record<GemColor, (node: HTMLSpanElement | null) => void>>}
          />
        </button>
      </section>

      <section className="min-h-0 overflow-hidden rounded-[1rem] border border-white/10 bg-stone-950/72 p-2 shadow-[0_14px_36px_rgba(0,0,0,0.24)]">
        <div className="relative min-h-0 flex-1">
          <div className="flex h-full min-h-0 flex-col gap-1.5 overflow-y-auto">
          {cardTierOrder.map((tier) => (
            <section className="px-0.5" key={`tier-${tier}`}>
              <div className="grid grid-cols-5 gap-1.5">
                <div ref={registerTarget(splendorAnimationTargets.deck(tier))}>
                  <DeckCard
                    disabled={!canSubmitRealtimeMoves || !interaction.isCurrentUsersTurn || displayedState.turn.kind !== 'main-action'}
                    isSelected={selection?.type === 'deck' && selection.tier === tier}
                    onPress={() => setSelection({ type: 'deck', tier })}
                    remainingCount={displayedState.decks[`tier${tier}`].length}
                    size="compact"
                    tier={tier}
                  />
                </div>
                {displayedState.market[`tier${tier}`].map((card) => (
                  <div key={card.id} ref={registerTarget(splendorAnimationTargets.marketCard(card.id))}>
                    {animationState.hiddenMarketCardIds.has(card.id) ? (
                      <div className="aspect-[5/7] w-full rounded-[1.05rem] border border-dashed border-white/10 bg-white/3" />
                    ) : (
                      <SplendorCard
                        card={card}
                        isSelected={selection?.type === 'market-card' && selection.cardId === card.id}
                        onPress={() => setSelection({ type: 'market-card', cardId: card.id })}
                        size="compact"
                      />
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
          </div>
        </div>
      </section>
    </div>
  );

  const renderNoblesPanel = () => (
    <section className="rounded-[1rem] border border-white/10 bg-stone-950/72 p-3 shadow-[0_14px_36px_rgba(0,0,0,0.24)]">
      <div className="grid grid-cols-3 gap-2">
        {displayedState.nobles.map((noble) => (
          <NobleTile key={`panel-noble-${noble.id}`} noble={noble} size="compact" />
        ))}
      </div>
    </section>
  );

  const renderLogPanel = () => (
    <section className="rounded-[1rem] border border-white/10 bg-stone-950/72 p-2 shadow-[0_14px_36px_rgba(0,0,0,0.24)]">
      <div className="space-y-1.5">
        {activityEntries.length > 0 ? (
          activityEntries.map((entry) => (
            <button
              className={`flex w-full items-center justify-between gap-3 rounded-[0.9rem] border px-3 py-2 text-left text-sm ${
                entry.accent === 'amber'
                  ? 'border-amber-300/18 bg-amber-300/7 text-amber-50'
                  : entry.accent === 'emerald'
                    ? 'border-emerald-300/18 bg-emerald-300/7 text-emerald-50'
                    : 'border-sky-300/18 bg-sky-300/7 text-sky-50'
              } ${replaySelection?.entryId === entry.id ? 'ring-2 ring-amber-300/35' : ''}`}
              disabled={
                !roomHistoryByVersion.has(entry.beforeStateVersion) ||
                !roomHistoryByVersion.has(entry.afterStateVersion)
              }
              key={entry.id}
              onClick={() => startReplay(entry)}
              type="button"
            >
              <span className="min-w-0 flex-1">{entry.message}</span>
              <span className="shrink-0 rounded-full border border-white/10 bg-black/15 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-stone-200/90">
                Replay
              </span>
            </button>
          ))
        ) : (
          <p className="rounded-[0.9rem] border border-white/8 bg-white/4 px-3 py-3 text-sm text-stone-400">
            No actions yet.
          </p>
        )}
      </div>
    </section>
  );

  const renderActionSheetContent = () => {
    if (visibleForcedSheet === 'discard') {
      return {
        title: 'Discard tokens',
        subtitle: `Discard ${displayedState.turn.kind === 'discard' ? displayedState.turn.requiredCount : 0} to complete the turn.`,
        content: renderDiscardSheet(),
      };
    }

    if (visibleForcedSheet === 'noble') {
      return {
        title: 'Choose noble',
        subtitle: 'Resolve the noble step before the turn can pass.',
        content: renderNobleSheet(),
      };
    }

    if (selection?.type === 'player' && selectedPlayer) {
      return {
        eyebrow: 'Player',
        title: selectedPlayer.identity.displayName,
        content: renderPlayerSheet(selectedPlayer),
      };
    }

    if (selection?.type === 'menu') {
      return {
        eyebrow: 'Room',
        title: 'Menu',
        content: renderMenuSheet(),
      };
    }

    if (selection?.type === 'market-card' && selectedVisibleCard) {
      return {
        eyebrow: 'Market',
        title: 'Buy or reserve',
        content: renderPurchaseSheet(selectedVisibleCard, 'market'),
      };
    }

    if (selection?.type === 'reserved-card' && selectedReservedCard) {
      return {
        eyebrow: 'Reserved card',
        title: 'Buy reserved card',
        content: renderPurchaseSheet(selectedReservedCard, 'reserved'),
      };
    }

    if (selection?.type === 'deck') {
      return {
        title: `Blind reserve: tier ${selection.tier}`,
        content: renderDeckSheet(selection.tier),
      };
    }

    if (selection?.type === 'bank') {
      return {
        title: 'Take gems',
        content: renderBankSheet(),
      };
    }

    return null;
  };

  const actionSheetContent = renderActionSheetContent();
  const panelOptions = [
    { label: 'Board', value: 'board' },
    { label: 'Nobles', value: 'nobles' },
    { label: 'Log', value: 'log' },
  ] as const;
  const renderCardAnimationObject = (
    object: Extract<SplendorAnimationObject, { readonly kind: 'card' }>,
    effect?: 'expand' | 'flip' | 'hold' | 'land',
  ) => {
    const cardContent =
      object.motion === 'reserve-deck' && effect !== 'hold' && effect !== 'land' ? (
        <DeckCard hideCount remainingCount={0} size="compact" tier={object.tier} />
      ) : object.motion === 'reserve-visible' && effect !== 'hold' && effect !== 'land' ? (
        <DeckCard hideCount remainingCount={0} size="compact" tier={object.tier} />
      ) : (
        <SplendorCard card={object.card} size="compact" />
      );

    if (effect === 'expand') {
      return object.motion === 'purchase-reserved' ? (
        <div className="card-expand-only-inner relative aspect-[5/7] w-full">
          <div className="card-flight-face absolute inset-0">
            <SplendorCard card={object.card} size="compact" />
          </div>
          <div className="card-flight-face absolute inset-0" style={{ transform: 'rotateY(180deg)' }}>
            <DeckCard hideCount remainingCount={0} size="compact" tier={object.tier} />
          </div>
        </div>
      ) : (
        cardContent
      );
    }

    if (effect === 'flip') {
      if (object.motion === 'reserve-visible') {
        return (
          <div className="card-flip-only-inner relative aspect-[5/7] w-full">
            <div className="card-flight-face absolute inset-0">
              <SplendorCard card={object.card} size="compact" />
            </div>
            <div className="card-flight-face absolute inset-0" style={{ transform: 'rotateY(180deg)' }}>
              <DeckCard hideCount remainingCount={0} size="compact" tier={object.tier} />
            </div>
          </div>
        );
      }

      if (object.motion === 'purchase-reserved') {
        return (
          <div className="card-flip-reveal-only-inner relative aspect-[5/7] w-full">
            <div className="card-flight-face absolute inset-0">
              <SplendorCard card={object.card} size="compact" />
            </div>
            <div className="card-flight-face absolute inset-0" style={{ transform: 'rotateY(180deg)' }}>
              <DeckCard hideCount remainingCount={0} size="compact" tier={object.tier} />
            </div>
          </div>
        );
      }
    }

    return cardContent;
  };

  return (
    <main
      className="h-[100dvh] overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.16),_transparent_22%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.14),_transparent_28%),linear-gradient(180deg,_#1e140f,_#090d15)] text-stone-100"
      style={splendorAnimationCssVars as CSSProperties}
    >
      <div className="mx-auto flex h-full max-w-md flex-col gap-2 px-2 py-2 pb-18">
        <header className="sticky top-0 z-30 rounded-[1rem] border border-white/10 bg-stone-950/90 px-2.5 py-2 shadow-[0_14px_36px_rgba(0,0,0,0.28)] backdrop-blur">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                <span className="truncate text-[10px] uppercase tracking-[0.18em] text-stone-400">
                  Room {roomCodeLabel(roomLabel)}
                </span>
                <span className="text-[10px] uppercase tracking-[0.18em] text-amber-300/80">•</span>
                <span className="text-sm font-semibold text-amber-50">
                  {displayedState.status === 'finished' ? 'Finished' : 'Action'}
                </span>
              </div>
              <p className="truncate text-[12px] leading-4 text-stone-300">{currentTurnCopy(displayedState, activePlayerName)}</p>
            </div>
            {forcedSheet !== null && dismissedForcedSheet === forcedSheet ? (
              <button
                className="rounded-full border border-amber-300/18 bg-amber-300/10 px-2.5 py-1 text-[11px] font-medium text-amber-50 transition hover:border-amber-300/30 hover:bg-amber-300/16"
                onClick={() => setDismissedForcedSheet(null)}
                type="button"
              >
                {forcedSheet === 'discard' ? 'Back to discard' : 'Back to noble'}
              </button>
            ) : null}
            {replaySelection === null && latestReplayEntry ? (
              <button
                aria-label="Enter replay mode"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-sky-200/18 bg-sky-950/26 text-sky-50 transition hover:bg-sky-950/40"
                onClick={() => startReplay(latestReplayEntry)}
                type="button"
              >
                <ReplayUndoIcon />
              </button>
            ) : null}
            <button
              className="rounded-full border border-white/12 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-stone-100 transition hover:border-white/20 hover:bg-white/8"
              onClick={() => setSelection({ type: 'menu' })}
              type="button"
            >
              Menu
            </button>
            {displayedState.status === 'finished' && !showGameComplete ? (
              <button
                className="rounded-full border border-amber-300/18 bg-amber-300/8 px-2.5 py-1 text-[11px] font-medium text-amber-50 transition hover:border-amber-300/30 hover:bg-amber-300/12"
                onClick={() => setShowGameComplete(true)}
                type="button"
              >
                Score
              </button>
            ) : null}
          </div>
          {replaySelection ? (
            <div className="mt-2 flex items-center gap-2 rounded-[0.9rem] border border-sky-300/18 bg-sky-300/8 px-2 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-[9px] uppercase tracking-[0.16em] text-sky-200/80">Replay</p>
                <p className="truncate text-[11px] text-sky-50">
                  {isInitialReplayState ? 'Initial board' : `${replayIndex + 1} / ${replayableEntries.length}`}
                  {liveAdvancedWhileReplaying && roomStateVersion !== undefined ? ` • Live v${roomStateVersion}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <ReplayIconButton
                  disabled={isInitialReplayState}
                  label="Rewind to beginning"
                  onClick={selectInitialReplayState}
                >
                  <ReplayDoubleChevron direction="left" />
                </ReplayIconButton>
                <ReplayIconButton
                  disabled={!previousReplayEntry}
                  label="Previous step"
                  onClick={() => {
                    if (previousReplayEntry) {
                      startReplay(previousReplayEntry);
                    }
                  }}
                >
                  <ReplayChevron direction="left" />
                </ReplayIconButton>
                <ReplayIconButton
                  disabled={replayableEntries.length === 0}
                  label={isReplayPlaying ? 'Pause replay' : 'Play replay'}
                  onClick={() => setIsReplayPlaying((current) => !current)}
                >
                  <ReplayPlayIcon paused={isReplayPlaying} />
                </ReplayIconButton>
                <ReplayIconButton
                  disabled={!nextReplayEntry}
                  label="Next step"
                  onClick={() => {
                    if (nextReplayEntry) {
                      startReplay(nextReplayEntry);
                    }
                  }}
                >
                  <ReplayChevron direction="right" />
                </ReplayIconButton>
                <ReplayIconButton label="Jump to live" onClick={stopReplay}>
                  <ReplayDoubleChevron direction="right" />
                </ReplayIconButton>
              </div>
            </div>
          ) : null}
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-2">
          {!(showGameComplete && displayedState.status === 'finished') ? (
            <section className="min-h-[7.75rem] flex-[0_1_auto] overflow-hidden rounded-[1rem] border border-white/10 bg-stone-950/72 shadow-[0_14px_36px_rgba(0,0,0,0.24)]">
              <div className="relative h-full max-h-full">
                <div className="h-full max-h-full overflow-y-auto p-2">
                <div className="space-y-1.5">
                  {playerSummaries.map((player) => {
                    return (
                      <PlayerSummaryRow
                        chipTargetRefByColor={Object.fromEntries(
                          gemOrder.map((color) => [
                            color,
                            registerTarget(splendorAnimationTargets.playerChip(player.id, color)),
                          ]),
                        ) as Partial<Record<GemColor, (node: HTMLSpanElement | null) => void>>}
                        currentUserId={playerId ?? undefined}
                        isRecentlyUpdated={animationState.changedPlayerIds.includes(player.id)}
                        key={`summary-${player.id}`}
                        nobleTargetRef={registerTarget(splendorAnimationTargets.playerNobles(player.id))}
                        onPress={() => setSelection({ type: 'player', playerId: player.id })}
                        player={player}
                        playerAnimation={playerAnimations[player.id] ?? emptyPlayerReceiveAnimation}
                        reservedTargetRef={registerTarget(splendorAnimationTargets.playerReserved(player.id))}
                        rowRef={registerTarget(splendorAnimationTargets.playerRow(player.id)) as (node: HTMLButtonElement | null) => void}
                        scoreTargetRef={registerTarget(splendorAnimationTargets.playerScore(player.id)) as (node: HTMLParagraphElement | null) => void}
                        sourceChipBulges={sourceChipBulges.playerColorsById[player.id] ?? []}
                        tableauBonusTargetRefByColor={Object.fromEntries(
                          tokenColorOrder.map((color) => [
                            color,
                            registerTarget(splendorAnimationTargets.playerTableauBonus(player.id, color)),
                          ]),
                        ) as Partial<Record<TokenColor, (node: HTMLSpanElement | null) => void>>}
                        tableauTargetRef={registerTarget(splendorAnimationTargets.playerTableau(player.id))}
                      />
                    );
                  })}
                </div>
                </div>
              </div>
            </section>
          ) : null}

          {showGameComplete && displayedState.status === 'finished' ? (
            <GameCompleteScreen game={displayedState} onViewBoard={() => setShowGameComplete(false)} playerSummaries={playerSummaries} />
          ) : (
            <div className="relative flex min-h-0 flex-1 flex-col">
              {mainScrollFadeState.showTop ? (
                <div aria-hidden="true" className={topScrollFadeClass} />
              ) : null}
              {mainScrollFadeState.showBottom ? (
                <div aria-hidden="true" className={bottomScrollFadeClass} />
              ) : null}
              <div
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4"
                ref={mainScrollRef}
              >
                <div className={activePanel === 'board' ? 'flex min-h-full flex-col' : 'space-y-2'}>
                {activePanel === 'board'
                  ? renderBoardPanel()
                  : activePanel === 'nobles'
                    ? renderNoblesPanel()
                    : renderLogPanel()}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 bottom-0 z-10 h-16">
        <div className="h-full w-full bg-[linear-gradient(180deg,_rgba(9,13,21,0)_0%,_rgba(9,13,21,0.58)_45%,_rgba(9,13,21,0.9)_100%)]" />
      </div>

      {!showGameComplete || displayedState.status !== 'finished' ? (
        <nav aria-label="Splendor panels" className="fixed inset-x-0 bottom-0 z-20">
          <div className="mx-auto w-full max-w-md">
            <div className="border-t border-white/10 bg-slate-950/90 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
              <SegmentedControl
                ariaLabel="Splendor panels"
                onChange={setActivePanel}
                options={panelOptions}
                value={activePanel}
              />
            </div>
          </div>
        </nav>
      ) : null}

      {displayedChipTranslations.map((translation) => (
        <span
          key={translation.id}
          aria-hidden="true"
          className="chip-flight fixed z-50 inline-flex items-center justify-center"
          style={
            {
              ...(translation.delayMs !== undefined ? { animationDelay: `${translation.delayMs}ms` } : {}),
              animationDuration: `${translation.durationMs}ms`,
              left: `${translation.fromX}px`,
              top: `${translation.fromY}px`,
              '--chip-dx': `${translation.toX - translation.fromX + translation.laneOffsetX}px`,
              '--chip-dy': `${translation.toY - translation.fromY + translation.laneOffsetY}px`,
            } as CSSProperties
          }
        >
          <span
            className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-[11px] font-bold ring-1 ring-white/18 shadow-[0_10px_22px_rgba(0,0,0,0.34)] ${floatingChipStyles[translation.color]}`}
          >
            {translation.count}
          </span>
        </span>
      ))}

      {cardTranslations.map((translation) => (
        <div
          key={translation.object.kind === 'card' ? `${translation.object.motion}:${translation.object.card.id}:${translation.from}:${translation.to}` : `${translation.object.noble.id}:${translation.from}:${translation.to}`}
          aria-hidden="true"
          className={`fixed z-50 pointer-events-none ${
            translation.object.kind === 'noble' ? 'noble-flight w-[4.25rem]' : 'card-flight w-[4.6rem]'
          }`}
          style={
            {
              ...(translation.delayMs !== undefined ? { animationDelay: `${translation.delayMs}ms` } : {}),
              animationDuration: `${translation.durationMs}ms`,
              left: `${translation.fromX}px`,
              top: `${translation.fromY}px`,
              '--card-dx': `${translation.toX - translation.fromX}px`,
              '--card-dy': `${translation.toY - translation.fromY}px`,
            } as CSSProperties
          }
        >
          {translation.object.kind === 'noble' ? (
            <NobleTile noble={translation.object.noble} size="compact" />
          ) : (
            renderCardAnimationObject(translation.object)
          )}
        </div>
      ))}

      {animationFrame.attachedObjects.map((attachedObject, index) => (
        <div
          key={`${attachedObject.target}:${attachedObject.effect}:${index}`}
          aria-hidden="true"
          className={`fixed z-50 pointer-events-none w-[4.6rem] ${
            attachedObject.effect === 'expand'
              ? 'card-expand-only card-overlay-pose'
              : attachedObject.effect === 'hold'
                ? 'card-hold'
                : attachedObject.effect === 'land'
                  ? 'card-land card-overlay-pose'
                  : 'card-flip-only card-overlay-pose'
          }`}
          style={
            {
              ...(attachedObject.delayMs !== undefined ? { animationDelay: `${attachedObject.delayMs}ms` } : {}),
              animationDuration: `${attachedObject.durationMs}ms`,
              left: `${attachedObject.left}px`,
              top: `${attachedObject.top}px`,
            } as CSSProperties
          }
        >
          {attachedObject.object.kind === 'card'
            ? renderCardAnimationObject(attachedObject.object, attachedObject.effect)
            : attachedObject.object.kind === 'noble'
              ? <NobleTile noble={attachedObject.object.noble} size="compact" />
              : null}
        </div>
      ))}

      <ActionSheet
        {...(actionSheetContent?.eyebrow ? { eyebrow: actionSheetContent.eyebrow } : {})}
        {...(visibleForcedSheet !== null
          ? {
              closeLabel: 'View board',
              onClose: () => setDismissedForcedSheet(visibleForcedSheet),
            }
          : { onClose: () => setSelection(null) })}
        open={actionSheetOpen && actionSheetContent !== null}
        {...(actionSheetContent?.subtitle ? { subtitle: actionSheetContent.subtitle } : {})}
        title={actionSheetContent?.title ?? 'Action'}
      >
        {actionSheetContent?.content ?? null}
      </ActionSheet>
    </main>
  );
};

export const splendorClientModule = {
  renderGame: SplendorGameView,
} satisfies GameClientModule<SplendorState, SplendorMove, SplendorPlayerView>;

export { splendorAnimationCssVars } from './animations.js';
export { DeckCard, GemPip, NobleTile, SplendorCard } from './game-card.js';
