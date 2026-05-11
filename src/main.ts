import type { Line, SelectionRange } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { type Debouncer, debounce, MarkdownView, Plugin, type View } from 'obsidian';
// biome-ignore format: readability
import { ALL_MODE_CLASSES, IS_ACTIVE_CLASS, MARKDOWN_MODES, OBSIDIAN_HEADER_CLASS,  OBSIDIAN_PRE_CLASS, PLUGIN_CLASSES, SECTION_CLASS } from './constants';
import { clearDecoration, cursorTracker } from './extensions';
import { Decorator } from './libs';
import { DEFAULT_SETTINGS, type Settings, SettingTab } from './settings';
// biome-ignore format: readability
import { applyDecoratorMode, clearSectionDecorations, forEachActivePreviewSection, generateSentenceDelimiterRegex, refreshMarkdownViews } from './utils';

import './styles.css';

// * Plugin
export default class ObsidianBetterLinkedTab extends Plugin {
  static readonly id = 'better-linked-tab';

  // settings
  settings!: Settings;
  sentenceDelimiterRegex!: RegExp;
  private debouncedUpdateHighlights?: Debouncer<[view: EditorView, range: SelectionRange], void>;

  // state
  private groupId: string | null = null;
  private cursorContext = {
    from: 0,
    to: 0,
    lineFrom: 0,
    lineTo: 0,
  };
  activeSectionContext = {
    sourceText: '',
    sentenceIndices: [] as number[],
  };

  // lib
  decorator!: Decorator;

  // * onload

  override async onload() {
    await this.loadSettings();
    this.decorator = new Decorator(this);

    this.registerMarkdownPostProcessor((el, ctx) => {
      if (el.hasClass(OBSIDIAN_HEADER_CLASS) || el.hasClass(OBSIDIAN_PRE_CLASS)) return;
      el.addClass(SECTION_CLASS);
      if (!this.groupId) return;

      const sectionInfo = ctx.getSectionInfo(el);
      if (!sectionInfo) return;

      const { lineStart, lineEnd } = sectionInfo;
      if (!this.isActiveSection(lineStart, lineEnd)) return;

      el.addClass(IS_ACTIVE_CLASS);
      applyDecoratorMode(el, this.settings.sectionHighlightMode);
      this.decorator.ensureWrapped(el);
      this.decorator.updateSentenceDecorations(el);
    });

    this.app.workspace.onLayoutReady(() => {
      this.onLayoutReady().catch((e) => console.error(e));
    });
  }

  // * onLayoutReady

  private async onLayoutReady() {
    this.registerEditorExtension([
      clearDecoration(() => this.clearAllPreviewHighlights()),
      cursorTracker(
        (view, range) => this.debouncedUpdateHighlights?.(view, range),
        (view, range) => {
          this.debouncedUpdateHighlights?.(view, range);
          requestAnimationFrame(() => this.removeOldHighlights(view, range));
        },
      ),
    ]);

    await refreshMarkdownViews(this.app);

    const activeMarkdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (activeMarkdownView) this.tryUpdateGroupId(activeMarkdownView);

    this.registerEvent(
      this.app.workspace.on('active-leaf-change', (leaf) => {
        const view = leaf?.view;
        if (view) this.tryUpdateGroupId(view);
      }),
    );

    this.addSettingTab(new SettingTab(this.app, this));
  }

  private clearAllPreviewHighlights() {
    this.debouncedUpdateHighlights?.cancel();
    if (!this.groupId) return;

    forEachActivePreviewSection(this.app, this.groupId, (el) => {
      clearSectionDecorations(el);
    });
  }

  private updateHighlights(view: EditorView, range: SelectionRange) {
    this.setCursorContext(view, range);
    if (!this.groupId) return;

    forEachActivePreviewSection(this.app, this.groupId, (el, lineStart, lineEnd) => {
      const isActive = this.isActiveSection(lineStart, lineEnd);
      if (isActive) {
        el.addClass(IS_ACTIVE_CLASS);
        applyDecoratorMode(el, this.settings.sectionHighlightMode);
        this.decorator.ensureWrapped(el);
        this.decorator.updateSentenceDecorations(el);
      } else if (el.hasClass(IS_ACTIVE_CLASS)) {
        clearSectionDecorations(el);
      }
    });
  }

  private removeOldHighlights(view: EditorView, range: SelectionRange) {
    this.setCursorContext(view, range);
    if (!this.groupId) return;

    forEachActivePreviewSection(this.app, this.groupId, (el, lineStart, lineEnd) => {
      if (el.hasClass(IS_ACTIVE_CLASS) && !this.isActiveSection(lineStart, lineEnd)) {
        clearSectionDecorations(el);
      }
    });
  }

  private tryUpdateGroupId(view: View): boolean {
    if (view instanceof MarkdownView && view.getMode() === MARKDOWN_MODES.SOURCE) {
      this.groupId = view.leaf.group;
      return true;
    }

    this.groupId = null;
    return false;
  }

  // * context

  private isActiveSection(startLine: number, endLine: number) {
    const { lineFrom, lineTo } = this.cursorContext;
    return (
      (startLine <= lineFrom && lineFrom <= endLine) ||
      (startLine <= lineTo && lineTo <= endLine) ||
      (lineFrom <= startLine && endLine <= lineTo)
    );
  }

  private setCursorContext(view: EditorView, range: SelectionRange) {
    let { from, to } = range;
    let lineFrom = view.state.doc.lineAt(from);
    let lineTo = view.state.doc.lineAt(to);

    if (from === to) {
      // ? 編集中に改行を行った際の体験を向上 (空行なら一つ前の文字のコンテキストを採用)
      if (lineFrom.text === '' && from !== 0) {
        from -= 1;
        to -= 1;
        lineFrom = view.state.doc.lineAt(from);
      }
      lineTo = lineFrom;
    }

    this.cursorContext = {
      from,
      to,
      lineFrom: lineFrom.number - 1,
      lineTo: lineTo.number - 1,
    };

    this.updateActiveSectionContext(view, lineFrom, lineTo);
  }

  private updateActiveSectionContext(view: EditorView, lineFrom: Line, lineTo: Line) {
    const sectionStart = view.state.doc.line(lineFrom.number).from;
    const sectionEnd = view.state.doc.line(lineTo.number).to;
    const sourceText = view.state.doc.sliceString(sectionStart, sectionEnd);

    this.activeSectionContext = {
      sourceText,
      sentenceIndices: this.calculateActiveSentenceIndices(
        sourceText,
        this.cursorContext.from - sectionStart,
        this.cursorContext.to - sectionStart,
      ),
    };
  }

  private calculateActiveSentenceIndices(sourceText: string, startPos: number, endPos: number): number[] {
    const parts = sourceText.split(this.sentenceDelimiterRegex).filter((p) => 0 < p.trim().length);
    const indices: number[] = [];
    let cumulative = 0;

    for (let i = 0; i < parts.length; i++) {
      const pStart = cumulative;
      const pEnd = cumulative + parts[i]!.length;

      const isOverlap = Math.max(pStart, startPos) < Math.min(pEnd, endPos);
      const isCursorInside = startPos === endPos && pStart <= startPos && startPos < pEnd;

      if (isOverlap || isCursorInside) indices.push(i);
      cumulative = pEnd;
    }

    if (indices.length === 0 && startPos === cumulative && 0 < parts.length) indices.push(parts.length - 1);
    return indices;
  }

  // * settings

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, (await this.loadData()) as Partial<Settings>);
    await this.applySettings();
  }

  async saveSettings() {
    await this.saveData(this.settings);
    await this.applySettings();
  }

  async applySettings() {
    this.sentenceDelimiterRegex = generateSentenceDelimiterRegex(this.settings.sentenceDelimiters);

    this.debouncedUpdateHighlights?.cancel();
    this.debouncedUpdateHighlights = debounce(
      (view: EditorView, range: SelectionRange) => this.updateHighlights(view, range),
      this.settings.highlightDebounceIntervalMsOnCursorMove,
    );

    document.body.style.setProperty('--betterlinkedtab-section-highlight-color', this.settings.sectionHighlightColor);
    document.body.style.setProperty('--betterlinkedtab-section-indicator-color', this.settings.sectionIndicatorColor);
    document.body.style.setProperty('--betterlinkedtab-sentence-highlight-color', this.settings.sentenceHighlightColor);
    document.body.style.setProperty('--betterlinkedtab-sentence-underline-color', this.settings.sentenceUnderlineColor);
  }

  // * onExternalSettingsChange

  override onExternalSettingsChange = debounce(() => this.loadSettings(), 1000, true);

  // * onunload

  override async onunload() {
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (leaf.view instanceof MarkdownView && leaf.view.getMode() === MARKDOWN_MODES.PREVIEW) {
        const el = leaf.view.previewMode.containerEl;
        for (const PLUGIN_CLASS of PLUGIN_CLASSES) {
          for (const elc of el.querySelectorAll(`.${PLUGIN_CLASS}`)) {
            elc.removeClass(PLUGIN_CLASS);
            elc.removeClass(IS_ACTIVE_CLASS, ...ALL_MODE_CLASSES);
          }
        }

        leaf.view.previewMode.rerender(true);
      }
    });
  }
}
