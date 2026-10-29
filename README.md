# Lost Games Lab — ORBIT: Forgotten Paths

A modern, mobile-first puzzle strategy game inspired by **Surakarta**, the traditional
Javanese game where stones capture by travelling around circular loops outside the board.

Built with **Phaser 3 + TypeScript + Vite**. No backend, no external services, no image or
audio files: all art (stone texture, stones, glow) and all sounds are generated procedurally
at runtime.

## Play modes

| Mode | What it is |
| --- | --- |
| **Tutorial** ("Learn the Paths") | Five guided lessons: stepping, riding a loop, blocked paths, multi-loop journeys, a small hunt. |
| **Puzzles** | Five curated levels of increasing difficulty. Each unlocks after the previous one. Hint button shows the next move of a real solution. |
| **Free Play vs Oracle** | Full game from the standard opening against a rule-based AI. You are Gold and move first. |

All modes have **Undo**, **Restart**, **Hint**, a **sound toggle**, and a turn/status line.
Progress (solved puzzles, tutorial completion, wins) and the sound preference are stored in
`localStorage`.

## Rules (as implemented)

- 6×6 board of intersections. Free Play starts with 12 stones per side on the two nearest rows.
- **Step:** move one stone one point in any of 8 directions (diagonals included) to an empty point. Steps never capture.
- **Capture:** travel along one of the two circuits —
  - *inner circuit* (amber): rows 2 & 5 and columns b & e, joined by small corner loops;
  - *outer circuit* (verdigris): rows 3 & 4 and columns c & d, joined by large corner loops —
  in either direction, pass through **at least one corner loop**, cross only empty points, and
  land on the **first** stone met, which must be an enemy stone. The mover's own starting point
  counts as empty (a route may cross it). The four board corners are on no circuit.
- **Win:** capture every enemy stone, or leave the opponent with no legal move.
- **Draw (documented default):** 80 consecutive plies (40 moves each) without a capture.
- **Puzzles & tutorial (documented default):** silver stones are *dormant* — they never move.
  Capture every silver stone within the move budget.

## Puzzle validation

`tests/levels.test.ts` runs every puzzle through the rules-engine solver (`src/rules/solver.ts`,
iterative deepening) and asserts that a solution exists **in exactly the move budget** and that
**no shorter** solution exists. Tutorial lessons are validated the same way.

## Project layout

```
src/
  rules/    Deterministic rules engine (no Phaser): board, circuits, move generation,
            game state, puzzle solver, AI. Fully unit-tested.
  levels/   Tutorial lessons and puzzle definitions (ASCII diagrams).
  game/     Phaser scenes, board renderer/animations, procedural audio, localStorage.
  ui/       Theme, buttons, overlays, shared header.
tests/      Vitest unit tests (movement, captures, blocked routes, turns, wins, AI, levels).
```

The renderer never decides legality: it only draws moves produced by `src/rules`, and
`applyMoveToBoard` throws on any move the engine did not generate.

## Install & run

Requires Node.js 18+ (CI uses 22).

```bash
npm install
npm run dev      # dev server on http://localhost:5173/lost-games-lab/ (also exposed on your LAN)
npm run test     # unit tests (Vitest)
npm run build    # type-check + production build into dist/
npm run preview  # serve the production build locally (also on your LAN)
```

### Play on an Android phone (same Wi‑Fi)

1. `npm run dev` (or `npm run build && npm run preview`).
2. Vite prints a `Network:` URL such as `http://192.168.1.20:5173/lost-games-lab/`.
3. Open that URL in Chrome on the phone. Portrait orientation is recommended.
4. Optional: Chrome menu ⋮ → **Add to Home screen** to launch it full-screen like an app.

## Deploy to GitHub Pages

Live URL: **https://ukmarb-sys.github.io/lost-games-lab/**

`vite.config.ts` sets `base: '/lost-games-lab/'` so all asset URLs match the GitHub Pages
project sub-path. To host elsewhere, build with `BASE_PATH=/ npm run build` (or `BASE_PATH=./`).

**Automatic (recommended):** `.github/workflows/deploy.yml` tests, builds and deploys on every push to `main`.
1. One-time setup: GitHub → repository **Settings → Pages → Build and deployment → Source: GitHub Actions**.
   (Until this is done, the deploy job fails with `404 … Ensure GitHub Pages has been enabled`.)
2. Merge/push to `main` (or run the workflow manually from the **Actions** tab).
3. The game appears at `https://<user>.github.io/<repo>/`.

**Manual:** `npm run build` and publish the `dist/` folder to any static host.

## Credits

Game design and code: Lost Games Lab. Inspired by Surakarta (traditional, public domain rules).
All visuals and sounds are original and generated in code.
