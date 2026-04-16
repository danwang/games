import type { Meta, StoryObj } from '@storybook/react-vite';

import { LobbyShell } from './lobby-shell.js';
import { LobbyScreen } from './lobby-screen.js';
import {
  availableStoryGames,
  crowdedLobbySnapshot,
  emptyLobbySnapshot,
  populatedLobbySnapshot,
} from './story-fixtures.js';

const meta = {
  component: LobbyScreen,
  title: 'Flow/2. Lobby',
  render: (args) => (
    <LobbyShell connectionState="connected" playerName={args.playerName}>
      <LobbyScreen {...args} />
    </LobbyShell>
  ),
  args: {
    availableGames: availableStoryGames,
    createRoom: () => undefined,
    joinRoom: () => undefined,
    playerName: 'Ada',
  },
} satisfies Meta<typeof LobbyScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const JoinRoomLoading: Story = {
  render: (args) => (
    <LobbyShell connectionState="connecting" playerName={args.playerName}>
      <LobbyScreen {...args} />
    </LobbyShell>
  ),
  args: {
    initialTab: 'join',
    isLobbyReady: false,
    lobby: emptyLobbySnapshot,
  },
};

export const JoinRoomEmpty: Story = {
  args: {
    initialTab: 'join',
    isLobbyReady: true,
    lobby: emptyLobbySnapshot,
  },
};

export const CreateRoom: Story = {
  args: {
    initialTab: 'create',
    isLobbyReady: true,
    lobby: emptyLobbySnapshot,
  },
};

export const JoinRoomPopulated: Story = {
  args: {
    initialTab: 'join',
    isLobbyReady: true,
    lobby: populatedLobbySnapshot,
  },
};

export const JoinRoomCrowded: Story = {
  args: {
    initialTab: 'join',
    isLobbyReady: true,
    lobby: crowdedLobbySnapshot,
  },
};
