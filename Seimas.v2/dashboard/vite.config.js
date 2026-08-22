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
    // VoteDetailView.noChoices.test.tsx vi.mock()s ../services/api while
    // provenanceContract.test.ts imports the real module from it; with mock
    // state persisting, the suite failed about one run in three — and passed
    // 3/3 with that one file excluded, which is what identified the pair.
    // A flaky guard teaches people to re-run instead of look.
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