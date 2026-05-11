import { ALL_MODE_CLASSES, IS_ACTIVE_CLASS } from '../constants';

export function defineClassName(className: string) {
  return `betterlinkedtab-${className}`;
}

export function applyDecoratorMode(el: HTMLElement, mode: string) {
  removeDecoratorModes(el);
  el.addClass(`mode-${mode}`);
}

export function removeDecoratorModes(el: HTMLElement) {
  el.removeClass(...ALL_MODE_CLASSES);
}

export function clearSectionDecorations(el: HTMLElement) {
  el.removeClass(IS_ACTIVE_CLASS);
  removeDecoratorModes(el);
  for (const child of Array.from(el.querySelectorAll(`.${IS_ACTIVE_CLASS}`))) {
    if (child instanceof HTMLElement) {
      child.removeClass(IS_ACTIVE_CLASS);
      removeDecoratorModes(child);
    }
  }
}
