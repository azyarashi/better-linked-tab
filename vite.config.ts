import builtinModules from 'builtin-modules';
import { defineConfig, type UserConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig(({ mode }) => {
  const prod = mode === 'production';

  return {
    plugins: [
      viteStaticCopy({
        targets: prod ? [{ src: 'manifest.json', rename: 'manifest.json', dest: '' }] : [],
      }),
    ],
    build: {
      lib: {
        entry: 'src/main.ts',
        formats: ['cjs'],
      },
      emptyOutDir: prod,
      minify: 'oxc',
      rolldownOptions: {
        output: {
          entryFileNames: 'main.js',
          assetFileNames: 'styles.css',
          codeSplitting: false,
        },
        external: [
          'obsidian',
          'electron',
          '@codemirror/autocomplete',
          '@codemirror/collab',
          '@codemirror/commands',
          '@codemirror/language',
          '@codemirror/lint',
          '@codemirror/search',
          '@codemirror/state',
          '@codemirror/view',
          ...builtinModules,
        ],
        onwarn: (warning, defaultHandler) => {
          if (warning.code !== 'FILE_NAME_CONFLICT') defaultHandler(warning);
        },
      },
    },
    resolve: {
      tsconfigPaths: true,
    },
  } satisfies UserConfig;
});
