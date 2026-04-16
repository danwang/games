import type { Preview } from '@storybook/react-vite';
import React from 'react';

import '../apps/web/src/styles.css';

const preview: Preview = {
  decorators: [(Story) => <Story />],
  globalTypes: {
    splendorPerspective: {
      defaultValue: 'active',
      description: 'Player perspective for Splendor stories',
      toolbar: {
        dynamicTitle: true,
        icon: 'user',
        items: [
          { title: 'Active player', value: 'active' },
          { title: 'Another player', value: 'other' },
        ],
      },
    },
  },
  parameters: {
    layout: 'fullscreen',
    controls: {
      expanded: true,
    },
    options: {
      storySort: {
        order: ['Flow', ['1. Name', '2. Lobby', '3. Room']],
      },
    },
  },
};

export default preview;
