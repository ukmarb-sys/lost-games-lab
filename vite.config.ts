import { defineConfig } from 'vitest/config';

// The game is served by GitHub Pages at https://ukmarb-sys.github.io/lost-games-lab/,
// so every asset URL is prefixed with the repository sub-path.
// Override with BASE_PATH=/ (or './') to host it elsewhere.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/lost-games-lab/',
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 2000,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
