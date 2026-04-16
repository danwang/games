import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { SegmentedControl } from './segmented-control.js';

const meta = {
  component: SegmentedControl,
  title: 'Flow/0. Primitives/SegmentedControl',
} satisfies Meta<typeof SegmentedControl>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    ariaLabel: 'Example segmented control',
    onChange: () => undefined,
    options: [{ label: 'One', value: 'one' }],
    value: 'one',
  },
  render: () => {
    const options = [
      { label: 'One', value: 'one' },
      { label: 'Two', value: 'two' },
      { label: 'Three', value: 'three' },
    ] as const;
    const [value, setValue] = useState<(typeof options)[number]['value']>('two');

    return (
      <div className="mx-auto max-w-md p-6">
        <SegmentedControl
          ariaLabel="Example segmented control"
          onChange={setValue}
          options={options}
          value={value}
        />
      </div>
    );
  },
};
