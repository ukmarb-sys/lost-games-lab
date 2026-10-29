import { idx } from './board';
import { captureMoves, legalMoves, playMove, type GameState } from './engine';
import { opponent, type Move } from './types';

/**
 * A small rule-based opponent. It looks one move ahead and scores each legal
 * move with a handful of readable heuristics:
 *
 *  1. Winning immediately beats everything.
 *  2. Captures are worth a lot.
 *  3. Leaving stones where the opponent can capture them is penalised.
 *  4. Creating capture threats of its own is rewarded.
 *  5. Mild preference for central squares, plus a little randomness so games vary.
 */
export type Rng = () => number;

/** Deterministic PRNG (mulberry32) so AI behaviour can be reproduced in tests. */
export const seededRng = (seed: number): Rng => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const centrality = (x: number, y: number): number => 5 - (Math.abs(2.5 - x) + Math.abs(2.5 - y));

export const scoreMove = (state: GameState, move: Move): number => {
  const me = state.turn;
  const them = opponent(me);
  const after = playMove(state, move);
  if (after.status.kind === 'won') return after.status.winner === me ? 10_000 : -10_000;

  let score = 0;
  if (move.kind === 'capture') score += 100;

  // Opponent replies: how many distinct stones of mine can they take?
  const threatsAgainstMe = new Set(captureMoves(after.board, them).map((m) => idx(m.to)));
  score -= 45 * threatsAgainstMe.size;
  // Moving stone itself under fire is extra bad (it just committed to that square).
  if (threatsAgainstMe.has(idx(move.to))) score -= 15;

  // My follow-up threats if they pass (approximation of initiative).
  const myThreats = new Set(captureMoves(after.board, me).map((m) => idx(m.to)));
  score += 12 * myThreats.size;

  score += centrality(move.to.x, move.to.y) * 1.5;
  return score;
};

export const chooseAiMove = (state: GameState, rng: Rng = Math.random): Move | null => {
  if (state.status.kind !== 'playing') return null;
  const moves = legalMoves(state.board, state.turn);
  if (moves.length === 0) return null;
  let best: Move = moves[0];
  let bestScore = -Infinity;
  for (const m of moves) {
    const s = scoreMove(state, m) + rng() * 6;
    if (s > bestScore) {
      bestScore = s;
      best = m;
    }
  }
  return best;
};
