import type { SelectionRange } from '@codemirror/state';
import { type EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

type CursorMoveHandler = (view: EditorView, range: SelectionRange) => void;
type EditHandler = (view: EditorView, range: SelectionRange) => void;

export function cursorTracker(onCursorMove: CursorMoveHandler, onEdit: EditHandler) {
  return ViewPlugin.fromClass(
    class {
      constructor(view: EditorView) {
        onCursorMove(view, view.state.selection.main);
      }

      update(update: ViewUpdate) {
        if (!update.selectionSet) return;

        if (update.docChanged) onEdit(update.view, update.state.selection.main);
        else onCursorMove(update.view, update.state.selection.main);
      }
    },
  );
}
