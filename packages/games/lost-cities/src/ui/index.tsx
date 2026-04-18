import { type GameClientModule, type GameRenderProps } from '@games/game-sdk';
import { type ReactNode, useMemo, useState } from 'react';

import { scoreExpedition } from '../rules/helpers.js';
import {
  type Card,
  type ExpeditionColor,
  type GameState,
  type Move,
  type PlayerView,
} from '../model/types.js';

type LostCitiesSelection = string | null;

type LostCitiesRenderProps = GameRenderProps<GameState, Move, PlayerView>;

const viewportClass =
  'h-[100dvh] overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.15),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.14),_transparent_30%),linear-gradient(180deg,_#1d140f,_#090d15)] text-stone-100';
const shellClass =
  'rounded-[1.55rem] border border-white/10 bg-slate-950/74 shadow-[0_18px_48px_rgba(0,0,0,0.28)] backdrop-blur-xl';
const panelClass =
  'rounded-[1.1rem] border border-white/10 bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]';
const badgeClass =
  'inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[0.58rem] uppercase tracking-[0.2em] text-stone-300';
const secondaryButtonClass =
  'rounded-full border border-white/14 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-100 transition enabled:hover:border-white/20 enabled:hover:bg-white/[0.08]';

const LocalActionSheet = ({
  children,
  onClose,
  open,
  subtitle,
  title,
}: {
  readonly children: ReactNode;
  readonly onClose: () => void;
  readonly open: boolean;
  readonly subtitle?: string;
  readonly title: string;
}) =>
  open ? (
    <div className="fixed inset-0 z-40">
      <button
        aria-label="Close action sheet"
        className="absolute inset-0 bg-stone-950/48 backdrop-blur-[2px]"
        onClick={onClose}
        type="button"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center px-2 pb-2">
        <div className="pointer-events-auto w-full max-w-[32rem] overflow-hidden rounded-[1.7rem] border border-amber-200/15 bg-stone-950/96 shadow-[0_-18px_64px_rgba(0,0,0,0.55)]">
          <div className="flex items-start justify-between gap-3 border-b border-white/8 px-4 py-4">
            <div>
              <div className="text-[0.65rem] uppercase tracking-[0.3em] text-amber-300/70">Turn</div>
              <h2 className="mt-2 font-['Iowan_Old_Style','Palatino_Linotype',serif] text-[1.65rem] leading-none text-amber-50">
                {title}
              </h2>
              {subtitle ? <p className="mt-2 text-sm text-stone-300">{subtitle}</p> : null}
            </div>
            <button className={secondaryButtonClass} onClick={onClose} type="button">
              Close
            </button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto px-4 py-4">{children}</div>
        </div>
      </div>
    </div>
  ) : null;

const colorThemes: Readonly<
  Record<
    ExpeditionColor,
    {
      readonly accent: string;
      readonly badge: string;
      readonly card: string;
      readonly dot: string;
      readonly glow: string;
    }
  >
> = {
  yellow: {
    accent: 'from-amber-300/24 via-amber-300/8 to-transparent',
    badge: 'border-amber-300/35 bg-amber-300/12 text-amber-100',
    card: 'border-amber-300/45 bg-[linear-gradient(180deg,rgba(245,158,11,0.34),rgba(120,53,15,0.74))] text-amber-50',
    dot: 'border-amber-300/45 bg-amber-300/85',
    glow: 'shadow-[0_0_0_1px_rgba(251,191,36,0.16),0_12px_26px_rgba(245,158,11,0.18)]',
  },
  blue: {
    accent: 'from-sky-300/22 via-sky-300/8 to-transparent',
    badge: 'border-sky-300/35 bg-sky-300/12 text-sky-100',
    card: 'border-sky-300/45 bg-[linear-gradient(180deg,rgba(56,189,248,0.3),rgba(12,74,110,0.74))] text-sky-50',
    dot: 'border-sky-300/45 bg-sky-300/85',
    glow: 'shadow-[0_0_0_1px_rgba(125,211,252,0.16),0_12px_26px_rgba(14,165,233,0.18)]',
  },
  white: {
    accent: 'from-stone-200/18 via-stone-200/6 to-transparent',
    badge: 'border-stone-200/35 bg-stone-100/10 text-stone-100',
    card: 'border-stone-200/45 bg-[linear-gradient(180deg,rgba(231,229,228,0.3),rgba(68,64,60,0.82))] text-stone-50',
    dot: 'border-stone-200/45 bg-stone-100/90',
    glow: 'shadow-[0_0_0_1px_rgba(231,229,228,0.14),0_12px_26px_rgba(120,113,108,0.18)]',
  },
  green: {
    accent: 'from-emerald-300/22 via-emerald-300/8 to-transparent',
    badge: 'border-emerald-300/35 bg-emerald-300/12 text-emerald-100',
    card: 'border-emerald-300/45 bg-[linear-gradient(180deg,rgba(52,211,153,0.3),rgba(6,78,59,0.76))] text-emerald-50',
    dot: 'border-emerald-300/45 bg-emerald-300/85',
    glow: 'shadow-[0_0_0_1px_rgba(110,231,183,0.16),0_12px_26px_rgba(16,185,129,0.18)]',
  },
  red: {
    accent: 'from-rose-300/22 via-rose-300/8 to-transparent',
    badge: 'border-rose-300/35 bg-rose-300/12 text-rose-100',
    card: 'border-rose-300/45 bg-[linear-gradient(180deg,rgba(251,113,133,0.3),rgba(127,29,29,0.78))] text-rose-50',
    dot: 'border-rose-300/45 bg-rose-300/85',
    glow: 'shadow-[0_0_0_1px_rgba(253,164,175,0.16),0_12px_26px_rgba(225,29,72,0.18)]',
  },
  purple: {
    accent: 'from-fuchsia-300/22 via-fuchsia-300/8 to-transparent',
    badge: 'border-fuchsia-300/35 bg-fuchsia-300/12 text-fuchsia-100',
    card: 'border-fuchsia-300/45 bg-[linear-gradient(180deg,rgba(232,121,249,0.3),rgba(88,28,135,0.78))] text-fuchsia-50',
    dot: 'border-fuchsia-300/45 bg-fuchsia-300/85',
    glow: 'shadow-[0_0_0_1px_rgba(240,171,252,0.16),0_12px_26px_rgba(192,38,211,0.18)]',
  },
};

const isCurrentUsersTurn = (playerView: PlayerView): boolean =>
  playerView.playerId !== null && playerView.activePlayerId === playerView.playerId;

const cardValueLabel = (card: Card): string => (card.kind === 'wager' ? 'W' : String(card.value));

const cardTitle = (card: Card): string =>
  `${card.color} ${card.kind === 'wager' ? 'wager' : card.value}`;

const drawSourceLabel = (move: Move): string =>
  move.drawSource.type === 'deck'
    ? 'Draw deck'
    : `Take ${move.drawSource.color}`;

const scoreLabel = (score: number): string => (score > 0 ? `+${score}` : `${score}`);

const turnCopy = (playerView: PlayerView): string => {
  if (playerView.state.status === 'finished') {
    return 'Final score';
  }

  const activePlayer = playerView.state.players[playerView.state.activePlayerIndex];

  return activePlayer ? `${activePlayer.identity.displayName} to play` : 'In progress';
};

const DeckGlyph = ({ count }: { readonly count: number }) => (
  <div className="relative h-[4.2rem] w-[3rem]">
    <div className="absolute left-1 top-1 h-full w-full rounded-[0.85rem] border border-white/10 bg-stone-950/80" />
    <div className="absolute left-0 top-0 flex h-full w-full items-center justify-center rounded-[0.85rem] border border-amber-300/20 bg-[linear-gradient(180deg,rgba(251,191,36,0.16),rgba(15,23,42,0.98))] shadow-[0_10px_24px_rgba(0,0,0,0.24)]">
      <div className="text-center">
        <div className="text-[0.58rem] uppercase tracking-[0.28em] text-amber-300/70">Deck</div>
        <div className="mt-0.5 font-['Iowan_Old_Style','Palatino_Linotype',serif] text-lg text-amber-50">
          {count}
        </div>
      </div>
    </div>
  </div>
);

const LostCitiesCardFace = ({
  card,
  faceDown = false,
  selected = false,
  size = 'hand',
}: {
  readonly card?: Card;
  readonly faceDown?: boolean;
  readonly selected?: boolean;
  readonly size?: 'mini' | 'hand' | 'sheet';
}) => {
  const sizeClass =
    size === 'mini'
      ? 'h-[2.95rem] w-[2rem] rounded-[0.72rem]'
      : size === 'sheet'
        ? 'h-[7.35rem] w-[5.2rem] rounded-[1.15rem]'
        : 'h-[6.4rem] w-[4.25rem] rounded-[1.05rem]';

  if (faceDown || !card) {
    return (
      <div
        className={[
          'relative overflow-hidden border border-white/12 bg-[linear-gradient(180deg,rgba(148,163,184,0.14),rgba(15,23,42,0.98))] shadow-[0_10px_22px_rgba(0,0,0,0.22)]',
          sizeClass,
          selected ? 'ring-2 ring-amber-200/75 ring-offset-2 ring-offset-slate-950' : '',
        ].join(' ')}
      >
        <div className="absolute inset-[0.38rem] rounded-[0.75rem] border border-white/8 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.12),transparent_42%),linear-gradient(180deg,rgba(15,23,42,0.3),rgba(2,6,23,0.9))]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-6 w-6 rounded-full border border-amber-300/18 bg-amber-300/8" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={[
        'relative overflow-hidden border',
        sizeClass,
        colorThemes[card.color].card,
        colorThemes[card.color].glow,
        selected ? 'ring-2 ring-amber-200/75 ring-offset-2 ring-offset-slate-950' : '',
      ].join(' ')}
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${colorThemes[card.color].accent}`} />
      <div className="relative flex h-full items-center justify-center">
        <div
          className={[
            "font-['Iowan_Old_Style','Palatino_Linotype',serif] leading-none",
            size === 'mini'
              ? 'text-[1rem]'
              : size === 'sheet'
                ? 'text-[2.35rem]'
                : 'text-[2rem]',
          ].join(' ')}
        >
          {cardValueLabel(card)}
        </div>
      </div>
    </div>
  );
};

const ExpeditionValueChip = ({ card }: { readonly card: Card }) => (
  <div
    className={[
      'relative flex h-[0.62rem] w-[1.45rem] items-center justify-center overflow-hidden rounded-[0.3rem] border text-[0.46rem] font-semibold shadow-[0_3px_8px_rgba(0,0,0,0.16)]',
      colorThemes[card.color].card,
    ].join(' ')}
  >
    <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${colorThemes[card.color].accent}`} />
    <span className="relative leading-none">{card.kind === 'wager' ? 'W' : card.value}</span>
  </div>
);

const HandBackStrip = ({ count }: { readonly count: number }) => (
  <div className="relative h-[3rem] w-[4rem]">
    {Array.from({ length: Math.min(count, 5) }, (_, index) => (
      <div
        className="absolute bottom-0"
        key={`hand-back-${index}`}
        style={{
          left: `${index * 9}px`,
          zIndex: index,
        }}
      >
        <LostCitiesCardFace faceDown size="mini" />
      </div>
    ))}
    <div className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-stone-950 px-1 text-[10px] font-semibold text-stone-100 ring-1 ring-white/10">
      {count}
    </div>
  </div>
);

const ScorePip = ({
  label,
  value,
  tone = 'stone',
}: {
  readonly label: string;
  readonly tone?: 'emerald' | 'rose' | 'stone';
  readonly value: string | number;
}) => (
    <div
    className={[
      'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[0.5rem] uppercase tracking-[0.14em]',
      tone === 'emerald'
        ? 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100'
        : tone === 'rose'
          ? 'border-rose-300/25 bg-rose-300/10 text-rose-100'
          : 'border-white/10 bg-white/[0.04] text-stone-300',
    ].join(' ')}
  >
    <span>{label}</span>
    <span className="font-semibold text-stone-100">{value}</span>
  </div>
);

const PlayerRail = ({
  active,
  currentScore,
  cumulativeScore,
  handCount,
  isViewer,
  name,
}: {
  readonly active: boolean;
  readonly cumulativeScore: number;
  readonly currentScore: number;
  readonly handCount: number;
  readonly isViewer: boolean;
  readonly name: string;
}) => (
  <div
    className={[
      'flex items-center justify-between gap-2 rounded-[0.85rem] border px-2 py-1.5',
      active ? 'border-amber-300/22 bg-amber-300/[0.06]' : 'border-white/8 bg-white/[0.03]',
    ].join(' ')}
  >
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <h3 className="truncate text-[0.82rem] font-semibold text-stone-100">{name}</h3>
        {isViewer ? (
          <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2 py-0.5 text-[0.55rem] uppercase tracking-[0.18em] text-emerald-100">
            You
          </span>
        ) : null}
      </div>
      <div className="mt-0.5 flex flex-wrap gap-0.5">
        <ScorePip label="Match" value={cumulativeScore} />
        <ScorePip
          label="Round"
          tone={currentScore >= 0 ? 'emerald' : 'rose'}
          value={scoreLabel(currentScore)}
        />
      </div>
    </div>
    <HandBackStrip count={handCount} />
  </div>
);

const ExpeditionStack = ({
  cards,
  color,
}: {
  readonly cards: readonly Card[];
  readonly color: ExpeditionColor;
}) => (
  <div className="relative flex h-[5.35rem] flex-col justify-end overflow-hidden rounded-[0.72rem] bg-black/10 px-0.5 py-0.5">
    <div className={`absolute inset-x-0 top-0 h-6 bg-gradient-to-b ${colorThemes[color].accent}`} />
    {cards.length > 0 ? (
      <div className="relative flex flex-col items-center gap-0">
        {cards.map((card) => (
          <ExpeditionValueChip card={card} key={card.id} />
        ))}
      </div>
    ) : (
      <div className="flex h-full items-center justify-center text-[0.44rem] uppercase tracking-[0.18em] text-stone-500">
        Empty
      </div>
    )}
  </div>
);

const DiscardPile = ({
  cards,
  color,
}: {
  readonly cards: readonly Card[];
  readonly color: ExpeditionColor;
}) => {
  const topCard = cards.at(-1) ?? null;

  return (
    <div className="relative flex h-[2.9rem] items-center justify-center rounded-[0.65rem] bg-black/10">
      {topCard ? <LostCitiesCardFace card={topCard} size="mini" /> : <LostCitiesCardFace faceDown size="mini" />}
      <div className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-stone-950 px-1 text-[9px] font-semibold text-stone-100 ring-1 ring-white/10">
        {cards.length}
      </div>
      <div className={`pointer-events-none absolute inset-x-0 bottom-0 h-2 rounded-b-[0.65rem] bg-gradient-to-t ${colorThemes[color].accent}`} />
    </div>
  );
};

const MoveButton = ({
  card,
  disabled = false,
  move,
  onClick,
}: {
  readonly card: Card;
  readonly disabled?: boolean;
  readonly move: Move;
  readonly onClick: () => void;
}) => (
  <button
    className="flex w-full items-center justify-between gap-3 rounded-[1.1rem] border border-white/10 bg-white/[0.04] px-3 py-3 text-left transition enabled:hover:border-white/18 enabled:hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-45"
    disabled={disabled}
    onClick={onClick}
    type="button"
  >
    <div className="flex items-center gap-3">
      <LostCitiesCardFace card={card} size="mini" />
      <div>
        <div className="text-[0.62rem] uppercase tracking-[0.26em] text-amber-300/72">
          {move.type === 'play' ? 'Play' : 'Discard'}
        </div>
        <div className="mt-1 text-sm font-medium text-stone-100">{drawSourceLabel(move)}</div>
      </div>
    </div>
    <div className="flex items-center gap-2">
      {move.drawSource.type === 'deck' ? (
        <div className="scale-[0.7]">
          <DeckGlyph count={0} />
        </div>
      ) : (
        <span className={`rounded-full border px-2 py-1 text-[0.6rem] uppercase tracking-[0.2em] ${colorThemes[move.drawSource.color].badge}`}>
          {move.drawSource.color}
        </span>
      )}
      <span className="text-stone-400">›</span>
    </div>
  </button>
);

const FinishedBanner = ({ playerView }: { readonly playerView: PlayerView }) => {
  if (playerView.state.status !== 'finished' || !playerView.state.result) {
    return null;
  }

  const didWin =
    playerView.playerId !== null && playerView.state.result.winners.includes(playerView.playerId);
  const title =
    playerView.state.result.winners.length > 1
      ? 'Tie game'
      : didWin
        ? 'You win'
        : 'Match complete';

  return (
    <div className={`${panelClass} border-amber-300/18 bg-[linear-gradient(180deg,rgba(251,191,36,0.08),rgba(2,6,23,0.82))] px-3 py-2.5`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[0.62rem] uppercase tracking-[0.28em] text-amber-300/70">Result</div>
          <div className="mt-1 font-['Iowan_Old_Style','Palatino_Linotype',serif] text-[1.4rem] leading-none text-amber-50">
            {title}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[0.62rem] uppercase tracking-[0.24em] text-stone-400">Final</div>
          <div className="mt-1 text-lg font-semibold text-stone-100">
            {playerView.state.result.scores.join(' / ')}
          </div>
        </div>
      </div>
    </div>
  );
};

const deriveRoundScores = (playerView: PlayerView): readonly [number, number] =>
  [
    playerView.state.activeColors.reduce(
      (sum, color) => sum + scoreExpedition(playerView.state.players[0].expeditions[color]),
      0,
    ),
    playerView.state.activeColors.reduce(
      (sum, color) => sum + scoreExpedition(playerView.state.players[1].expeditions[color]),
      0,
    ),
  ];

const groupMovesForCard = (
  legalMoves: readonly Move[],
  cardId: string,
): {
  readonly playMoves: readonly Extract<Move, { readonly type: 'play' }>[];
  readonly discardMoves: readonly Extract<Move, { readonly type: 'discard' }>[];
} => ({
  playMoves: legalMoves.filter(
    (move): move is Extract<Move, { readonly type: 'play' }> =>
      move.type === 'play' && move.cardId === cardId,
  ),
  discardMoves: legalMoves.filter(
    (move): move is Extract<Move, { readonly type: 'discard' }> =>
      move.type === 'discard' && move.cardId === cardId,
  ),
});

const laneGridClass = (laneCount: number): string =>
  laneCount === 6
    ? 'grid-cols-6'
    : laneCount === 5
      ? 'grid-cols-5'
      : `grid-cols-${laneCount}`;

export interface LostCitiesGameViewProps extends LostCitiesRenderProps {
  readonly initialSelection?: LostCitiesSelection;
}

export const LostCitiesGameView = ({
  initialSelection = null,
  leaveRoom,
  playerId,
  playerView,
  roomLabel,
  roomSummary,
  submitMove,
}: LostCitiesGameViewProps) => {
  const [selectedCardId, setSelectedCardId] = useState<LostCitiesSelection>(initialSelection);
  const currentPlayerIndex =
    playerId === null ? -1 : playerView.state.players.findIndex((player) => player.identity.id === playerId);
  const viewerBottomIndex: 0 | 1 = currentPlayerIndex === 1 ? 1 : 0;
  const opponentTopIndex: 0 | 1 = viewerBottomIndex === 0 ? 1 : 0;
  const bottomPlayer = playerView.state.players[viewerBottomIndex];
  const topPlayer = playerView.state.players[opponentTopIndex];
  const roundScores = useMemo(() => deriveRoundScores(playerView), [playerView]);
  const selectedCard =
    currentPlayerIndex >= 0 && currentPlayerIndex < playerView.state.players.length
      ? playerView.state.players[currentPlayerIndex]!.hand.find((card) => card.id === selectedCardId) ?? null
      : null;
  const selectedMoves = selectedCardId
    ? groupMovesForCard(playerView.legalMoves, selectedCardId)
    : { playMoves: [], discardMoves: [] };
  const currentUserTurn = isCurrentUsersTurn(playerView);
  const viewerHand =
    currentPlayerIndex >= 0 && currentPlayerIndex < playerView.state.players.length
      ? playerView.state.players[currentPlayerIndex]!.hand
      : [];

  return (
    <section className={viewportClass}>
      <div className="mx-auto flex h-full max-w-[30rem] flex-col gap-1 px-0.5 py-0.5 sm:max-w-[34rem]">
        <header className={`${shellClass} shrink-0 px-2 py-1.5`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[0.55rem] uppercase tracking-[0.24em] text-amber-300/70">
                {roomLabel ?? 'Room LOST'}
              </div>
              <h1 className="mt-0.5 font-['Iowan_Old_Style','Palatino_Linotype',serif] text-[1.5rem] leading-none text-amber-50">
                Lost Cities
              </h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-0.5">
                <span className={badgeClass}>Round {playerView.state.currentRound}/3</span>
                <span className={badgeClass}>Mode {playerView.state.activeColors.length}</span>
                {roomSummary ? <span className="text-[0.52rem] uppercase tracking-[0.14em] text-stone-500">{roomSummary}</span> : null}
              </div>
            </div>
            <div className="flex shrink-0 items-start gap-1">
              <DeckGlyph count={playerView.state.drawCount} />
              {leaveRoom ? (
                <button className={secondaryButtonClass} onClick={leaveRoom} type="button">
                  Leave
                </button>
              ) : null}
            </div>
          </div>
        </header>

        <FinishedBanner playerView={playerView} />

        <section className={`${shellClass} min-h-0 flex-1 overflow-hidden px-0.5 py-0.5`}>
          <div className="grid h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-0.5">
            <PlayerRail
              active={playerView.state.activePlayerIndex === opponentTopIndex}
              cumulativeScore={playerView.state.cumulativeScores[opponentTopIndex] ?? 0}
              currentScore={roundScores[opponentTopIndex] ?? 0}
              handCount={topPlayer.handCount}
              isViewer={topPlayer.identity.id === playerId}
              name={topPlayer.identity.displayName}
            />

            <div className="flex items-center justify-between gap-2 px-0.5 py-0">
              <div className="text-[0.56rem] uppercase tracking-[0.18em] text-amber-300/72">
                {turnCopy(playerView)}
              </div>
              <div className="flex items-center gap-0.5">
                {playerView.state.completedRounds.map((summary) => (
                  <ScorePip key={`summary-${summary.roundNumber}`} label={`R${summary.roundNumber}`} value={`${summary.scores[0]}:${summary.scores[1]}`} />
                ))}
              </div>
            </div>

            <div className="min-h-0 overflow-hidden">
              <div
                className={`grid h-full min-h-0 gap-px ${laneGridClass(playerView.state.activeColors.length)}`}
              >
                {playerView.state.activeColors.map((color) => (
                  <article
                    className="grid min-w-0 grid-rows-[auto_minmax(0,1fr)_auto_minmax(0,1fr)] gap-0.5 rounded-[0.55rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] px-[3px] py-[3px]"
                    key={color}
                  >
                    <div className="flex items-center justify-between gap-0.5 px-px">
                      <span className={`h-1.5 w-1.5 rounded-full border ${colorThemes[color].dot}`} />
                      <span className="text-[0.36rem] font-medium uppercase tracking-[0.02em] text-stone-500">
                        {topPlayer.expeditions[color].length + bottomPlayer.expeditions[color].length}
                      </span>
                    </div>
                    <div className="text-center text-[0.38rem] uppercase tracking-[0.08em] text-stone-500">
                      {scoreLabel(scoreExpedition(topPlayer.expeditions[color]))}
                    </div>
                    <ExpeditionStack cards={topPlayer.expeditions[color]} color={color} />
                    <DiscardPile cards={playerView.state.discardPiles[color]} color={color} />
                    <div className="text-center text-[0.38rem] uppercase tracking-[0.08em] text-stone-500">
                      {scoreLabel(scoreExpedition(bottomPlayer.expeditions[color]))}
                    </div>
                    <ExpeditionStack cards={bottomPlayer.expeditions[color]} color={color} />
                  </article>
                ))}
              </div>
            </div>

            <div className="shrink-0 border-t border-white/8 pt-0.5">
              <div className="mb-0.5 flex items-center justify-between gap-2 px-0.5">
                <div className="text-[0.56rem] uppercase tracking-[0.18em] text-amber-300/72">
                  {currentPlayerIndex >= 0 ? (currentUserTurn ? 'Your hand' : 'Waiting hand') : 'Spectator'}
                </div>
                <div className="text-[0.5rem] uppercase tracking-[0.14em] text-stone-500">
                  {currentPlayerIndex >= 0 ? `${viewerHand.length} cards` : 'hands hidden'}
                </div>
              </div>
              {currentPlayerIndex >= 0 ? (
                <div className="flex gap-1 overflow-x-auto overscroll-contain pb-0.5">
                  {viewerHand.map((card) => (
                    <button
                      aria-label={cardTitle(card)}
                      className="shrink-0"
                      key={card.id}
                      onClick={() => setSelectedCardId(card.id)}
                      type="button"
                    >
                      <LostCitiesCardFace
                        card={card}
                        selected={selectedCardId === card.id}
                        size="hand"
                      />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center rounded-[0.95rem] border border-dashed border-white/10 bg-black/12 px-3 py-5 text-[0.68rem] uppercase tracking-[0.24em] text-stone-500">
                  Spectators only see the table
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <LocalActionSheet
        onClose={() => setSelectedCardId(null)}
        open={selectedCard !== null}
        title={selectedCard ? cardTitle(selectedCard) : 'Lost Cities'}
        {...(selectedCard
          ? {
              subtitle: currentUserTurn
                ? 'Pick how to use the card and where to draw from.'
                : 'Only the active player can submit moves.',
            }
          : {})}
      >
        <div className="grid gap-4">
          {selectedCard ? (
            <div className={`${panelClass} flex items-center gap-3 p-3`}>
              <LostCitiesCardFace card={selectedCard} size="sheet" />
              <div>
                <div className="text-[0.62rem] uppercase tracking-[0.26em] text-stone-500">Selected</div>
                <div className="mt-2 text-sm leading-6 text-stone-300">
                  {currentUserTurn
                    ? 'Every option below completes the whole turn.'
                    : 'You can inspect the card here while you wait.'}
                </div>
              </div>
            </div>
          ) : null}

          <div className="grid gap-2">
            {selectedCard && selectedMoves.playMoves.length > 0 ? (
              selectedMoves.playMoves.map((move) => (
                <MoveButton
                  card={selectedCard}
                  disabled={!currentUserTurn}
                  key={`play-${move.cardId}-${move.drawSource.type}-${move.drawSource.type === 'discard' ? move.drawSource.color : 'deck'}`}
                  move={move}
                  onClick={() => {
                    submitMove(move);
                    setSelectedCardId(null);
                  }}
                />
              ))
            ) : null}
            {selectedCard
              ? selectedMoves.discardMoves.map((move) => (
                  <MoveButton
                    card={selectedCard}
                    disabled={!currentUserTurn}
                    key={`discard-${move.cardId}-${move.drawSource.type}-${move.drawSource.type === 'discard' ? move.drawSource.color : 'deck'}`}
                    move={move}
                    onClick={() => {
                      submitMove(move);
                      setSelectedCardId(null);
                    }}
                  />
                ))
              : null}
          </div>
        </div>
      </LocalActionSheet>
    </section>
  );
};

export const lostCitiesClientModule: GameClientModule<GameState, Move, PlayerView> = {
  renderGame: LostCitiesGameView,
};
