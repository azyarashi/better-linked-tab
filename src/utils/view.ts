import { type App, MarkdownView } from 'obsidian';
import { MARKDOWN_MODES, SECTION_CLASS } from '../constants';

// * refresh

export async function refreshMarkdownViews(app: App) {
  app.workspace.iterateAllLeaves((leaf) => {
    if (leaf.view instanceof MarkdownView) refreshMarkdownView(leaf.view);
  });
}

export async function refreshMarkdownView(view: MarkdownView) {
  const mode = view.getMode();
  if (mode === MARKDOWN_MODES.PREVIEW) view.previewMode.rerender(true);
  else if (mode === MARKDOWN_MODES.SOURCE) await view.leaf.rebuildView();
}

// iterate

export function forEachActivePreviewSection(
  app: App,
  groupId: string | null,
  callback: (el: HTMLElement, lineStart: number, lineEnd: number) => void,
) {
  if (!groupId) return;

  const leaves = app.workspace.getGroupLeaves(groupId);
  for (const leaf of leaves) {
    if (!(leaf.view instanceof MarkdownView) || leaf.view.getMode() !== MARKDOWN_MODES.PREVIEW) continue;

    const sections = leaf.view.previewMode.renderer?.sections;
    if (!sections) continue;

    for (const section of sections) {
      if (!section.el?.hasClass(SECTION_CLASS)) continue;
      // @ts-expect-error: Internal Obsidian API
      const lineStart = section.start.line;
      // @ts-expect-error: Internal Obsidian API
      const lineEnd = section.end.line;
      callback(section.el, lineStart, lineEnd);
    }
  }
}
