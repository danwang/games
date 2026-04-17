import { type ActiveRoomSnapshot, type PlayerId, type RoomSnapshot, type SerializedValue } from '@games/game-sdk';

import { getRegisteredGameClient } from './client-registry.js';
import {
  pageWrapClass,
} from './ui-shell.js';
import { Card } from './ui/card.js';
import { PillButton } from './ui/pill-button.js';
import { SectionLabel } from './ui/section-label.js';

export interface GameRoomScreenProps {
  readonly room: RoomSnapshot;
  readonly roomHistory?: readonly ActiveRoomSnapshot[];
  readonly playerId: PlayerId | null;
  readonly submitMove: (move: SerializedValue) => void;
  readonly leaveRoom: () => void;
  readonly startRoom: () => void;
}

export const GameRoomScreen = ({
  playerId,
  room,
  roomHistory = [],
  submitMove,
  leaveRoom,
  startRoom,
}: GameRoomScreenProps) => {
  const registeredGame = getRegisteredGameClient(room.gameId);

  if (!registeredGame) {
    return (
      <section className="rounded-[1.4rem] border border-rose-400/20 bg-rose-400/10 p-6 text-rose-100">
        Unknown game: {room.gameId}
      </section>
    );
  }

  const { definition } = registeredGame;
  const config = definition.deserializeConfig(room.config);
  const seatCount = definition.getSeatCount(config);
  const configSummary = definition.configFields
    .map((field) => {
      const value =
        typeof config === 'object' && config !== null
          ? (config as unknown as Record<string, unknown>)[field.key]
          : undefined;
      const selectedOption = field.options.find((option) => option.value === value);

      return selectedOption ? selectedOption.label : null;
    })
    .filter((value) => value !== null)
    .join(' · ');
  const seatSlots = Array.from({ length: seatCount }, (_, index) => room.seats[index] ?? null);
  const roomLabel = `Room ${room.id}`;
  const isHost = room.seats[0]?.playerId === playerId;
  const isReadyToStart = room.status === 'waiting' && room.seats.length === seatCount;
  const waitingStatusMessage = isReadyToStart
    ? isHost
      ? 'All players have joined. Ready to start.'
      : 'All players have joined. Waiting for the host to start the game.'
    : 'Waiting for more players to join.';

  if (room.status === 'waiting') {
    return (
      <section className={`${pageWrapClass} max-w-3xl`}>
        <Card as="header">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div className="flex flex-col gap-2">
              <SectionLabel>{definition.displayName}</SectionLabel>
              <div className="flex flex-col gap-1 text-sm text-stone-400">
                <span className="select-all font-mono uppercase tracking-[0.22em] text-stone-300">
                  {roomLabel}
                </span>
                {configSummary ? <span>{configSummary}</span> : null}
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:max-w-[15rem] lg:flex-col lg:items-stretch">
              <PillButton
                className="sm:w-auto lg:w-full"
                onClick={() => void navigator.clipboard.writeText(room.id)}
                variant="secondary"
              >
                Copy code
              </PillButton>
              {isHost ? (
                <PillButton
                  className="sm:w-auto lg:w-full"
                  disabled={!isReadyToStart}
                  onClick={startRoom}
                >
                  Start game
                </PillButton>
              ) : null}
              <PillButton className="sm:w-auto lg:w-full" onClick={leaveRoom} variant="secondary">
                Back to lobby
              </PillButton>
            </div>
          </div>
        </Card>

        <Card as="section">
          <div className="grid gap-4">
            <div>
              <SectionLabel>Players</SectionLabel>
              <p className="mt-2 text-sm text-stone-400">{waitingStatusMessage}</p>
            </div>

            <div className="grid gap-2.5">
              {seatSlots.map((seat, index) => (
                <Card
                  className="flex items-center justify-between gap-3"
                  key={`seat-slot-${index + 1}`}
                  tone={seat ? 'panel' : 'empty'}
                >
                  {seat ? (
                    <>
                      <div>
                        <div className="flex items-center gap-2">
                          {index === 0 ? (
                            <span
                              aria-label="Host"
                              className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-300/15 text-amber-200"
                              title="Host"
                            >
                              <svg
                                aria-hidden="true"
                                className="h-3.5 w-3.5"
                                fill="none"
                                viewBox="0 0 16 16"
                              >
                                <path
                                  d="m2.5 11 1.2-5 2.5 2L8 3.5 9.8 8l2.5-2 1.2 5H2.5Zm.7 1.5h9.6"
                                  stroke="currentColor"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="1.2"
                                />
                              </svg>
                            </span>
                          ) : null}
                          <div className="font-medium text-stone-100">{seat.displayName}</div>
                        </div>
                      </div>
                      {seat.playerId === playerId ? (
                        <span className="inline-flex items-center rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2.5 py-1 text-[11px] font-medium text-emerald-100">
                          You
                        </span>
                      ) : null}
                    </>
                  ) : null}
                  {!seat ? (
                    <div>
                      <div className="font-medium italic text-stone-400">Open seat</div>
                    </div>
                  ) : null}
                </Card>
              ))}
            </div>
          </div>
        </Card>
      </section>
    );
  }

  const { client } = registeredGame;
  const state = definition.deserializeState(room.state);
  const playerView = definition.selectPlayerView(state, playerId);
  const RenderGame = client.renderGame;

  return (
    <RenderGame
      gameId={definition.id}
      leaveRoom={leaveRoom}
      playerId={playerId}
      playerView={playerView}
      roomHistory={roomHistory
        .filter((historyEntry) => historyEntry.gameId === definition.id)
        .map((historyEntry) => ({
          state: definition.deserializeState(historyEntry.state),
          stateVersion: historyEntry.stateVersion,
          status: historyEntry.status,
        }))}
      roomLabel={roomLabel}
      roomSummary={configSummary}
      roomStateVersion={room.stateVersion}
      state={state}
      submitMove={(move) => submitMove(definition.serializeMove(move))}
    />
  );
};
