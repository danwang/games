import { useEffect, useState } from 'react';

import { getGameDefinition } from '@games/game-registry';
import { type GameConfigField, type LobbySnapshot, type SerializedValue } from '@games/game-sdk';

import {
  fieldClass,
  pageWrapClass,
  roomStatusLabel,
  roomStatusPillClass,
} from './ui-shell.js';
import { Card } from './ui/card.js';
import { SegmentedControl } from './ui/segmented-control.js';
import { PillButton } from './ui/pill-button.js';
import { SectionLabel } from './ui/section-label.js';

export interface LobbyScreenProps {
  readonly lobby: LobbySnapshot;
  readonly createRoom: (gameId: string, config: SerializedValue) => void;
  readonly currentRoomId?: string | null;
  readonly initialTab?: 'join' | 'create';
  readonly isLobbyReady?: boolean;
  readonly joinRoom: (roomId: string) => void;
  readonly playerName: string;
  readonly availableGames: readonly {
    readonly id: string;
    readonly displayName: string;
    readonly description: string;
    readonly defaultConfig: SerializedValue;
    readonly configFields: readonly GameConfigField[];
  }[];
}

export const LobbyScreen = ({
  availableGames,
  lobby,
  createRoom,
  currentRoomId = null,
  initialTab = 'join',
  isLobbyReady = true,
  joinRoom,
}: LobbyScreenProps) => {
  const [activeTab, setActiveTab] = useState<'join' | 'create'>(initialTab);
  const lobbyTabs = [
    { label: 'Join room', value: 'join' },
    { label: 'Create room', value: 'create' },
  ] as const;
  const preferredGameId = availableGames.find((game) => game.id === 'splendor')?.id ?? availableGames[0]?.id ?? '';
  const [selectedGameId, setSelectedGameId] = useState(preferredGameId);
  const selectedGame =
    availableGames.find((game) => game.id === selectedGameId) ??
    availableGames.find((game) => game.id === preferredGameId) ??
    availableGames[0] ??
    null;
  const [draftConfig, setDraftConfig] = useState<SerializedValue>(selectedGame?.defaultConfig ?? {});

  useEffect(() => {
    if (availableGames.some((game) => game.id === selectedGameId)) {
      return;
    }

    setSelectedGameId(preferredGameId);
  }, [availableGames, preferredGameId, selectedGameId]);

  useEffect(() => {
    setDraftConfig(selectedGame?.defaultConfig ?? {});
  }, [selectedGame?.defaultConfig, selectedGame?.id]);

  const updateConfigField = (key: string, value: string) => {
    setDraftConfig((currentConfig: SerializedValue) => ({
      ...(typeof currentConfig === 'object' && currentConfig !== null
        ? (currentConfig as Record<string, unknown>)
        : {}),
      [key]: Number.isNaN(Number(value)) ? value : Number(value),
    }));
  };

  const readConfigFieldValue = (config: SerializedValue, key: string): string => {
    if (typeof config !== 'object' || config === null) {
      return '';
    }

    const value = (config as Record<string, unknown>)[key];

    return value === undefined ? '' : String(value);
  };

  const roomGameLabel = (gameId: string) => getGameDefinition(gameId)?.displayName ?? gameId;
  const roomConfigLabel = (gameId: string, config: SerializedValue) => {
    const definition = getGameDefinition(gameId);

    if (!definition) {
      return '';
    }

    const normalizedConfig = definition.deserializeConfig(config);

    return definition.configFields
      .map((field) => {
        const selectedOption = field.options.find((option) => {
          if (typeof normalizedConfig !== 'object' || normalizedConfig === null) {
            return false;
          }

          return (normalizedConfig as unknown as Record<string, unknown>)[field.key] === option.value;
        });

        return selectedOption ? `${field.label}: ${selectedOption.label}` : null;
      })
      .filter((value): value is string => value !== null)
      .join(' • ');
  };

  return (
    <section className={`${pageWrapClass} pb-28 sm:pb-32`}>
      <Card as="section" className="grid gap-4">
        {activeTab === 'join' ? (
          <div className="grid gap-4">
            <div>
              <SectionLabel>Choose a room</SectionLabel>
            </div>

            <ul className="grid list-none gap-3 p-0">
              {!isLobbyReady ? (
                <Card as="li" className="text-sm leading-7 text-stone-400" tone="panel">
                  Loading rooms…
                </Card>
              ) : lobby.rooms.length === 0 ? (
                <Card as="li" className="text-sm leading-7 text-stone-400" tone="panel">
                  No rooms open yet.
                </Card>
              ) : (
                lobby.rooms.map((room) => (
                  <Card as="li" key={room.id} tone="panel">
                    {(() => {
                      const isCurrentRoom = currentRoomId === room.id;

                      return (
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-stone-100">
                            {roomGameLabel(room.gameId)}
                          </h3>
                          <span className={roomStatusPillClass[room.status]}>
                            {roomStatusLabel(room.status)}
                          </span>
                        </div>
                        <p className="text-sm text-stone-400">
                          <span className="select-all font-mono uppercase tracking-[0.22em] text-stone-300">
                            {room.id}
                          </span>{' '}
                          • Seats {room.occupiedSeatCount}/{room.seatCount}
                        </p>
                        <p className="text-sm leading-7 text-stone-300">
                          {roomConfigLabel(room.gameId, room.config) || 'Default room settings'}
                        </p>
                      </div>

                      <PillButton
                        className="sm:w-auto"
                        fullWidth
                        onClick={() => joinRoom(room.id)}
                        variant="secondary"
                      >
                        {isCurrentRoom ? 'Enter room' : 'Join room'}
                      </PillButton>
                    </div>
                      );
                    })()}
                  </Card>
                ))
              )}
            </ul>
          </div>
        ) : (
          <div className="grid gap-4">
            <div>
              <SectionLabel>Create a room</SectionLabel>
            </div>

            <div className="grid gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-stone-100">Game</span>
                <div className="relative">
                  <select
                    className={`${fieldClass} pr-12`}
                    onChange={(event) => setSelectedGameId(event.target.value)}
                    value={selectedGame?.id ?? ''}
                  >
                    {availableGames.map((game) => (
                      <option key={game.id} value={game.id}>
                        {game.displayName}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-stone-400">
                    <svg
                      aria-hidden="true"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 16 16"
                    >
                      <path
                        d="M3.5 6 8 10.5 12.5 6"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.6"
                      />
                    </svg>
                  </span>
                </div>
              </label>

              {selectedGame ? (
                <>
                  {selectedGame.configFields.map((field) => (
                    <label className="flex flex-col gap-2" key={field.key}>
                      <span className="text-sm font-medium text-stone-100">{field.label}</span>
                      <div className="relative">
                        <select
                          className={`${fieldClass} pr-12`}
                          onChange={(event) => updateConfigField(field.key, event.target.value)}
                          value={readConfigFieldValue(draftConfig, field.key)}
                        >
                          {field.options.map((option) => (
                            <option
                              key={`${field.key}-${String(option.value)}`}
                              value={String(option.value)}
                            >
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-stone-400">
                          <svg
                            aria-hidden="true"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 16 16"
                          >
                            <path
                              d="M3.5 6 8 10.5 12.5 6"
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.6"
                            />
                          </svg>
                        </span>
                      </div>
                    </label>
                  ))}

                  <PillButton
                    className="mt-3"
                    fullWidth
                    onClick={() => createRoom(selectedGame.id, draftConfig)}
                  >
                    Create {selectedGame.displayName} room
                  </PillButton>
                </>
              ) : null}
            </div>
          </div>
        )}
      </Card>

      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-10 h-28"
      >
        <div className="h-full w-full bg-[linear-gradient(180deg,_rgba(9,13,21,0)_0%,_rgba(9,13,21,0.72)_34%,_rgba(9,13,21,0.96)_100%)]" />
      </div>

      <nav
        aria-label="Lobby sections"
        className="fixed inset-x-0 bottom-0 z-20"
      >
        <div className="mx-auto w-full max-w-6xl sm:px-4">
          <div className="border-t border-white/10 bg-slate-950/90 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl sm:rounded-t-[1.4rem] sm:border sm:px-3 sm:shadow-[0_18px_48px_rgba(0,0,0,0.28)]">
            <SegmentedControl
              ariaLabel="Lobby sections"
              onChange={setActiveTab}
              options={lobbyTabs}
              value={activeTab}
            />
          </div>
        </div>
      </nav>
    </section>
  );
};
