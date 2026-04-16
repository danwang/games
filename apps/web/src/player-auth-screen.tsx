import {
  fieldClass,
  pageWrapClass,
} from './ui-shell.js';
import { Card } from './ui/card.js';
import { PillButton } from './ui/pill-button.js';
import { SectionLabel } from './ui/section-label.js';

export interface PlayerAuthScreenProps {
  readonly defaultName: string;
  readonly isSubmitting: boolean;
  readonly onNameChange: (nextName: string) => void;
  readonly onSubmit: () => void;
}

export const PlayerAuthScreen = ({
  defaultName,
  isSubmitting,
  onNameChange,
  onSubmit,
}: PlayerAuthScreenProps) => {
  return (
    <section className={`${pageWrapClass} justify-center`}>
      <div className="mx-auto w-full max-w-2xl">
        <Card className="flex flex-col justify-center">
          <SectionLabel as="h1">Your name</SectionLabel>

          <div className="mt-6 flex flex-col gap-3 sm:mt-7">
            <label className="flex flex-col gap-2">
              <input
                aria-label="Your name"
                className={fieldClass}
                onChange={(event) => onNameChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    onSubmit();
                  }
                }}
                placeholder="Your name"
                value={defaultName}
              />
            </label>
            <PillButton
              disabled={isSubmitting || defaultName.trim().length === 0}
              onClick={onSubmit}
            >
              {isSubmitting ? 'Joining…' : 'Enter lobby'}
            </PillButton>
          </div>
        </Card>
      </div>
    </section>
  );
};
