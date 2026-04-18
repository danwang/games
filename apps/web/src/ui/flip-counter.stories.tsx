import type { Meta, StoryObj } from '@storybook/react-vite';
import { FlipCounter } from '@games/ui';
import { useEffect, useState } from 'react';

const meta = {
  component: FlipCounter,
  args: {
    value: 12,
  },
  title: 'Flow/0. Primitives/FlipCounter',
} satisfies Meta<typeof FlipCounter>;

export default meta;

type Story = StoryObj<typeof meta>;

const CounterSandbox = ({
  auto = false,
  start = 12,
}: {
  readonly auto?: boolean;
  readonly start?: number;
}) => {
  const [value, setValue] = useState(start);

  useEffect(() => {
    if (!auto) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setValue((current) => (current >= 19 ? 7 : current + 1));
    }, 1200);

    return () => window.clearInterval(intervalId);
  }, [auto]);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 p-6">
      <div className="flex justify-center">
        <FlipCounter label="Score" padToDigits={2} value={value} />
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          className="rounded-full border border-white/12 bg-white/5 px-4 py-2 text-sm font-medium text-stone-100 transition hover:border-white/20 hover:bg-white/8"
          onClick={() => setValue((current) => current - 1)}
          type="button"
        >
          Decrement
        </button>
        <button
          className="rounded-full bg-amber-300 px-4 py-2 text-sm font-semibold text-stone-950 transition hover:bg-amber-200"
          onClick={() => setValue((current) => current + 1)}
          type="button"
        >
          Increment
        </button>
        <button
          className="rounded-full border border-white/12 bg-white/5 px-4 py-2 text-sm font-medium text-stone-100 transition hover:border-white/20 hover:bg-white/8"
          onClick={() => setValue(42)}
          type="button"
        >
          Jump to 42
        </button>
      </div>
    </div>
  );
};

export const Interactive: Story = {
  args: {},
  render: () => <CounterSandbox />,
};

export const AutoPlay: Story = {
  args: {},
  render: () => <CounterSandbox auto start={7} />,
};
