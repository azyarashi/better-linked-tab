import { Prec } from '@codemirror/state';
import { keymap } from '@codemirror/view';

export function clearDecoration(onClear: () => void) {
  return Prec.lowest(
    keymap.of([
      {
        key: 'Escape',
        run: () => {
          onClear();
          return true;
        },
      },
    ]),
  );
}
