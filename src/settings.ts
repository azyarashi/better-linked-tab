import { type App, Notice, PluginSettingTab, Setting } from 'obsidian';
import type ObsidianBetterLinkedTab from './main';
import { generateSentenceDelimiterRegex } from './utils/regex';

export type SentenceHighlightMode = 'off' | 'underline' | 'highlight';
export type SectionHighlightMode = 'off' | 'highlight' | 'indicator';

export type Settings = {
  sentenceDelimiters: string;
  highlightDebounceIntervalMsOnCursorMove: number;

  sentenceHighlightMode: SentenceHighlightMode;
  sectionHighlightMode: SectionHighlightMode;

  sectionHighlightColor: string;
  sectionIndicatorColor: string;
  sentenceHighlightColor: string;
  sentenceUnderlineColor: string;
};

const DEFAULT_DELIMITERS = {
  ja: '。！？.!?',
  en: '.!?',
};

export const DEFAULT_SETTINGS: Settings = {
  sentenceDelimiters:
    // @ts-expect-error
    DEFAULT_DELIMITERS[localStorage.getItem('language')?.toLowerCase() as any] ?? DEFAULT_DELIMITERS.en,
  highlightDebounceIntervalMsOnCursorMove: 50,

  sentenceHighlightMode: 'underline',
  sectionHighlightMode: 'highlight',

  sectionHighlightColor: 'var(--background-secondary)',
  sectionIndicatorColor: 'var(--interactive-accent)',
  sentenceHighlightColor: 'var(--text-selection)',
  sentenceUnderlineColor: 'var(--interactive-accent)',
};

export class SettingTab extends PluginSettingTab {
  override plugin: ObsidianBetterLinkedTab;

  constructor(app: App, plugin: ObsidianBetterLinkedTab) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName('Sentence Delimiters')
      .setDesc('Characters used to identify sentence boundaries (e.g., .!?)')
      .addTextArea((text) =>
        text.setValue(this.plugin.settings.sentenceDelimiters).onChange(async (value) => {
          try {
            generateSentenceDelimiterRegex(value);
            this.plugin.settings.sentenceDelimiters = value;
            await this.plugin.saveSettings();
          } catch (e) {
            new Notice(`[Better Linked Tab] Invalid delimiter list: ${e}`);
          }
        }),
      );

    new Setting(containerEl)
      .setName('Highlight Debounce Interval (ms)')
      .setDesc(
        'Adjusts how quickly the highlight follows your cursor. Lower values feel more responsive but increase CPU usage.',
      )
      .addSlider((slider) =>
        slider
          .setDynamicTooltip()
          .setValue(this.plugin.settings.highlightDebounceIntervalMsOnCursorMove)
          .setLimits(10, 1000, 10)
          .onChange(async (value) => {
            try {
              const num = Number(value);
              this.plugin.settings.highlightDebounceIntervalMsOnCursorMove = num;
              await this.plugin.saveSettings();
            } catch (error) {
              new Notice(`[Better Linked Tab] Invalid debounce interval: ${error}`);
            }
          }),
      );

    new Setting(containerEl).setName('Appearance Modes').setHeading();

    new Setting(containerEl)
      .setName('Sentence Highlight Style')
      .setDesc('Choose how the current sentence is visually emphasized.')
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({
            off: 'Off',
            underline: 'Underline',
            highlight: 'Highlight',
          })
          .setValue(this.plugin.settings.sentenceHighlightMode)
          .onChange(async (value) => {
            this.plugin.settings.sentenceHighlightMode = value as SentenceHighlightMode;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName('Section Highlight Style')
      .setDesc('Choose how the current section is visually emphasized.')
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({
            off: 'Off',
            highlight: 'Highlight',
            indicator: 'Indicator',
          })
          .setValue(this.plugin.settings.sectionHighlightMode)
          .onChange(async (value) => {
            this.plugin.settings.sectionHighlightMode = value as SectionHighlightMode;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl).setName('Colors').setHeading();

    new Setting(containerEl)
      .setName('Section Highlight Color')
      .setDesc('Color used when Section Highlight Style is set to Highlight.')
      .addColorPicker((picker) =>
        picker.setValue(this.plugin.settings.sectionHighlightColor).onChange(async (value) => {
          this.plugin.settings.sectionHighlightColor = value;
          await this.plugin.saveSettings();
        }),
      )
      .addButton((button) =>
        button
          .setIcon('rotate-ccw')
          .setTooltip('Reset')
          .onClick(async () => {
            this.plugin.settings.sectionHighlightColor = DEFAULT_SETTINGS.sectionHighlightColor;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName('Section Indicator Color')
      .setDesc('Color used when Section Highlight Style is set to Indicator.')
      .addColorPicker((picker) =>
        picker.setValue(this.plugin.settings.sectionIndicatorColor).onChange(async (value) => {
          this.plugin.settings.sectionIndicatorColor = value;
          await this.plugin.saveSettings();
        }),
      )
      .addButton((button) =>
        button
          .setIcon('rotate-ccw')
          .setTooltip('Reset')
          .onClick(async () => {
            this.plugin.settings.sectionIndicatorColor = DEFAULT_SETTINGS.sectionIndicatorColor;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName('Sentence Highlight Color')
      .setDesc('Color used when Sentence Highlight Style is set to Highlight.')
      .addColorPicker((picker) =>
        picker.setValue(this.plugin.settings.sentenceHighlightColor).onChange(async (value) => {
          this.plugin.settings.sentenceHighlightColor = value;
          await this.plugin.saveSettings();
        }),
      )
      .addButton((button) =>
        button
          .setIcon('rotate-ccw')
          .setTooltip('Reset')
          .onClick(async () => {
            this.plugin.settings.sentenceHighlightColor = DEFAULT_SETTINGS.sentenceHighlightColor;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName('Sentence Underline Color')
      .setDesc('Color used when Sentence Highlight Style is set to Underline.')
      .addColorPicker((picker) =>
        picker.setValue(this.plugin.settings.sentenceUnderlineColor).onChange(async (value) => {
          this.plugin.settings.sentenceUnderlineColor = value;
          await this.plugin.saveSettings();
        }),
      )
      .addButton((button) =>
        button
          .setIcon('rotate-ccw')
          .setTooltip('Reset')
          .onClick(async () => {
            this.plugin.settings.sentenceUnderlineColor = DEFAULT_SETTINGS.sentenceUnderlineColor;
            await this.plugin.saveSettings();
          }),
      );
  }
}
