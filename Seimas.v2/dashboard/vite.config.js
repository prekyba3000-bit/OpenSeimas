/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';
import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // Workspace deps (e.g. @tanstack/react-query) hoist to the monorepo root and
    // would otherwise resolve React from outside the repo — two React instances,
    // "Invalid hook call" in any test rendering a provider.
    dedupe: ['react', 'react-dom'],
  },
  server: {
    fs: {
      allow: [
        __dirname,
        path.resolve(__dirname, '../../packages'),
        // @fontsource hoists to the repo-root node_modules, outside this
        // project root, so the dev server answered 403 for all 20 font files
        // and rendered in fallback typefaces. The production build inlines
        // them correctly, which is why this stayed invisible — but it makes
        // every local rendered-surface audit happen in the wrong font.
        path.resolve(__dirname, '../../node_modules'),
      ],
    },
    proxy: {
      '/api': 'http://localhost:8000'
    }
  },
  build: {
    chunkSizeWarningLimit: 1000,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    // Reset mock state between tests rather than trusting each file to do it.
    //
    // These were added on the theory that mock state leaked between
    // VoteDetailView.noChoices.test.tsx and provenanceContract.test.ts. That
    // theory is probably wrong: vitest isolates the module registry per file
    // by default, and nothing here overrides `isolate` or `pool`. The evidence
    // for it was a clean run after the change, which later turned out to be
    // luck — the failure came back.
    //
    // They are kept because resetting mock state between tests is right on its
    // own terms, not because they are known to fix anything. The race actually
    // addressed was an assertion landing between React commits; see that file.
    restoreMocks: true,
    mockReset: true,
    setupFiles: './src/tests/setup.js',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: [...configDefaults.exclude, 'tests/**'],
    server: {
      // react-query hoists to the monorepo root, so Node resolves its `react`
      // import outside the repo — a second React instance and "Invalid hook
      // call" in every test that renders a provider. Inlining routes it through
      // Vite, where resolve.dedupe applies.
      deps: { inline: ['@tanstack/react-query'] },
    },
  }
});