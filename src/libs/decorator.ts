import { IS_ACTIVE_CLASS, SENTENCE_CLASS } from '../constants';
import type ObsidianBetterLinkedTab from '../main';
import { applyDecoratorMode, removeDecoratorModes } from '../utils/css';

export class Decorator {
  constructor(private plugin: ObsidianBetterLinkedTab) {}

  ensureWrapped(el: HTMLElement) {
    const text = el.textContent || '';
    if (!text.trim()) return;

    const hasWrappers = el.querySelector(`.${SENTENCE_CLASS}`);
    const isStale = el.dataset.lastWrappedText !== text;
    if (hasWrappers && !isStale) return;

    if (hasWrappers && isStale) this.unwrap(el);

    this.wrapSentences(el);
    el.dataset.lastWrappedText = text;
  }

  private unwrap(el: HTMLElement) {
    const wrappers = el.querySelectorAll(`.${SENTENCE_CLASS}`);
    for (const w of Array.from(wrappers).reverse()) w.replaceWith(...Array.from(w.childNodes));
    el.normalize();
    el.removeAttribute('data-last-wrapped-text');
  }

  private wrapSentences(el: HTMLElement) {
    const fullText = el.textContent || '';
    const parts = fullText.split(this.plugin.sentenceDelimiterRegex).filter((p) => 0 < p.trim().length);

    const boundaries: number[] = [];
    let sum = 0;
    for (const p of parts) {
      sum += p.length;
      boundaries.push(sum);
    }
    if (0 < boundaries.length) {
      boundaries[boundaries.length - 1] = Math.max(boundaries[boundaries.length - 1]!, fullText.length);
    }

    let globalPos = 0;
    const walk = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        const fragment = document.createDocumentFragment();

        let startInNode = 0;
        while (startInNode < text.length) {
          const charGlobalPos = globalPos + startInNode;
          let sIdx = boundaries.findIndex((b) => charGlobalPos < b);
          if (sIdx === -1) sIdx = Math.max(0, boundaries.length - 1);

          const boundary = boundaries[sIdx] ?? 0;
          const remainingInNode = text.length - startInNode;
          const remainingInSentence = Math.max(0, boundary - charGlobalPos);

          const segmentLength = Math.min(remainingInNode, remainingInSentence || remainingInNode);

          if (segmentLength <= 0) {
            if (text.length <= startInNode) break;
            const nextPart = text.substring(startInNode);
            fragment.appendChild(document.createTextNode(nextPart));
            break;
          }

          const segmentText = text.substring(startInNode, startInNode + segmentLength);
          if (0 < segmentText.trim().length) {
            const match = segmentText.match(/^(\s+)/);
            const leadingSpace = match ? match[1]! : '';
            const actualText = segmentText.substring(leadingSpace.length);

            if (leadingSpace) fragment.appendChild(document.createTextNode(leadingSpace));
            if (0 < actualText.length) {
              const span = document.createElement('span');
              span.textContent = actualText;
              span.addClass(SENTENCE_CLASS);
              span.dataset.index = String(sIdx);
              fragment.appendChild(span);
            }
          } else fragment.appendChild(document.createTextNode(segmentText));

          startInNode += segmentLength;
        }

        globalPos += text.length;
        node.parentNode?.replaceChild(fragment, node);
      } else if (node.nodeType === Node.ELEMENT_NODE) for (const child of Array.from(node.childNodes)) walk(child);
    };
    walk(el);
  }

  updateSentenceDecorations(container: HTMLElement) {
    const { sourceText, sentenceIndices } = this.plugin.activeSectionContext;
    if (!sourceText) return;

    const sourcePartsCount = sourceText
      .split(this.plugin.sentenceDelimiterRegex)
      .filter((p) => 0 < p.trim().length).length;
    const renderedSentences = container.querySelectorAll(`.${SENTENCE_CLASS}`);

    let maxIdx = -1;
    renderedSentences.forEach((s) => {
      const idx = parseInt((s as HTMLElement).dataset.index || '-1', 10);
      if (maxIdx < idx) maxIdx = idx;
    });
    const renderedCount = maxIdx + 1;

    if (sourcePartsCount === renderedCount) {
      renderedSentences.forEach((s) => {
        if (!(s instanceof HTMLElement)) return;
        const idx = parseInt(s.dataset.index || '-1', 10);
        const isActive = sentenceIndices.includes(idx);
        s.toggleClass(IS_ACTIVE_CLASS, isActive);
        if (isActive) applyDecoratorMode(s, this.plugin.settings.sentenceHighlightMode);
        else removeDecoratorModes(s);
      });
    } else {
      for (const s of Array.from(renderedSentences)) {
        if (!(s instanceof HTMLElement)) continue;
        s.removeClass(IS_ACTIVE_CLASS);
        removeDecoratorModes(s);
      }
    }
  }
}
