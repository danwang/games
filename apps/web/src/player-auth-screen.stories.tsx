import type { Meta, StoryObj } from '@storybook/react-vite';

import { PageBackdrop } from './page-backdrop.js';
import { PlayerAuthScreen } from './player-auth-screen.js';

const meta = {
  component: PlayerAuthScreen,
  title: 'Flow/1. Name',
  render: (args) => (
    <PageBackdrop>
      <PlayerAuthScreen {...args} />
    </PageBackdrop>
  ),
  args: {
    defaultName: '',
    isSubmitting: false,
    onNameChange: () => undefined,
    onSubmit: () => undefined,
  },
} satisfies Meta<typeof PlayerAuthScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const ReadyToJoin: Story = {
  args: {
    defaultName: 'Ada',
  },
};
