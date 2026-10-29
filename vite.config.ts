import { defineConfig } from 'vitest/config';

// `base: './'` emits relative asset URLs, so the build works from any
// sub-path — including GitHub Pages project sites such as
// https://<user>.github.io/lost-games-lab/ — without hard-coding the repo name.
// Override with BASE_PATH=/some/path/ if an absolute base is ever needed.
export default defineConfig({
  base: process.env.BASE_PATH ?? './',
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 2000,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
