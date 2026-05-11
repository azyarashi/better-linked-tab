import { defineClassName } from './utils';

export const MARKDOWN_MODES = {
  SOURCE: 'source',
  PREVIEW: 'preview',
} as const;

// * class

// obsidian
export const OBSIDIAN_HEADER_CLASS = 'mod-header';
export const OBSIDIAN_PRE_CLASS = 'el-pre';

// plugin
export const SECTION_CLASS = defineClassName('section');
export const SENTENCE_CLASS = defineClassName('sentence');

export const PLUGIN_CLASSES = [SECTION_CLASS, SENTENCE_CLASS];

// shared
export const IS_ACTIVE_CLASS = 'is-active';

export const MODE_HIGHLIGHT = 'mode-highlight';
export const MODE_UNDERLINE = 'mode-underline';
export const MODE_INDICATOR = 'mode-indicator';
export const MODE_OFF = 'mode-off';

export const ALL_MODE_CLASSES = [MODE_HIGHLIGHT, MODE_UNDERLINE, MODE_INDICATOR, MODE_OFF];
