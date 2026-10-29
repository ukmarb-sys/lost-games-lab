import { countPieces } from './board';
import { applyMoveToBoard, legalMoves } from './engine';
import { opponent, type Board, type Move, type Player } from './types';

/**
 * Solver for ORBIT puzzles. In a puzzle the enemy stones are *dormant*: they
 * never move, so the player makes every move. The goal is to capture every
 * enemy stone within a move budget.
 *
 * Iterative deepening guarantees the returned solution is as short as possible.
 */
export interface SolveResult {
  readonly moves: readonly Move[];
  /** Search nodes visited — handy for gauging difficulty in tests/tools. */
  readonly nodes: number;
}

const key = (b: Board): string => b.map((c) => (c === 'gold' ? 'G' : c === 'silver' ? 'S' : '.')).join('');

export const solvePuzzle = (board: Board, player: Player, maxMoves: number): SolveResult | null => {
  const enemy = opponent(player);
  let nodes = 0;

  for (let depth = 0; depth <= maxMoves; depth++) {
    // Positions already proven unsolvable with exactly `remaining` moves left.
    const dead = new Set<string>();
    const line: Move[] = [];

    const search = (b: Board, remaining: number): boolean => {
      nodes++;
      const left = countPieces(b, enemy);
      if (left === 0) return true;
      // Each move captures at most one stone.
      if (left > remaining) return false;
      const k = `${remaining}|${key(b)}`;
      if (dead.has(k)) return false;
      const moves = legalMoves(b, player);
      // Try captures first — they make progress fastest.
      moves.sort((a, c) => (a.kind === c.kind ? 0 : a.kind === 'capture' ? -1 : 1));
      for (const m of moves) {
        line.push(m);
        if (search(applyMoveToBoard(b, m), remaining - 1)) return true;
        line.pop();
      }
      dead.add(k);
      return false;
    };

    if (search(board, depth)) return { moves: line, nodes };
  }
  return null;
};
