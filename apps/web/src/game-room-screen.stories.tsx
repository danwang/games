import type { Meta, StoryObj } from '@storybook/react-vite';

import { GameRoomScreen } from './game-room-screen.js';
import { PageBackdrop } from './page-backdrop.js';
import {
  activeRoomSnapshot,
  storyGuestPlayerId,
  storyPlayerId,
  waitingRoomSnapshot,
} from './story-fixtures.js';

const waitingReadyToStartRoom = {
  ...waitingRoomSnapshot,
  seats: waitingRoomSnapshot.seats.concat([
    {
      id: 'seat-3',
      playerId: 'player-margaret',
      displayName: 'Margaret',
    },
    {
      id: 'seat-4',
      playerId: 'player-edsger',
      displayName: 'Edsger',
    },
  ]),
};

const meta = {
  component: GameRoomScreen,
  title: 'Flow/3. Room',
  render: (args) => (
    <PageBackdrop>
      <GameRoomScreen {...args} />
    </PageBackdrop>
  ),
  args: {
    leaveRoom: () => undefined,
    playerId: storyPlayerId,
    startRoom: () => undefined,
    submitMove: () => undefined,
  },
} satisfies Meta<typeof GameRoomScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WaitingHost: Story = {
  args: {
    room: waitingRoomSnapshot,
  },
};

export const WaitingGuest: Story = {
  args: {
    playerId: storyGuestPlayerId,
    room: waitingRoomSnapshot,
  },
};

export const InProgress: Story = {
  args: {
    room: activeRoomSnapshot,
  },
};

export const WaitingReadyToStartHost: Story = {
  args: {
    room: waitingReadyToStartRoom,
  },
};

export const WaitingReadyToStartGuest: Story = {
  args: {
    playerId: storyGuestPlayerId,
    room: waitingReadyToStartRoom,
  },
};
