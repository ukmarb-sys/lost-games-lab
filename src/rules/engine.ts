import { cellAt, countPieces, idx, inBounds, initialBoard, posOf, samePos } from './board';
import { CIRCUITS } from './circuits';
import {
  opponent,
  type Board,
  type CaptureMove,
  type Cell,
  type Move,
  type PathNode,
  type Player,
  type Pos,
  type StepMove,
} from './types';

const DIRECTIONS: readonly Pos[] = [
  { x: -1, y: -1 },
  { x: 0, y: -1 },
  { x: 1, y: -1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
  { x: -1, y: 1 },
  { x: 0, y: 1 },
  { x: 1, y: 1 },
];

/** Ordinary moves: one step in any of the 8 directions onto an empty intersection. */
export const stepMovesFrom = (board: Board, from: Pos): StepMove[] => {
  const player = cellAt(board, from);
  if (!player) return [];
  const moves: StepMove[] = [];
  for (const d of DIRECTIONS) {
    const to = { x: from.x + d.x, y: from.y + d.y };
    if (inBounds(to) && cellAt(board, to) === null) moves.push({ kind: 'step', player, from, to });
  }
  return moves;
};

/**
 * Every capture route available to the piece on `from`, including several
 * routes to the same target. A route:
 *  - runs along one circuit, in either direction, starting from any occurrence
 *    of `from` on that circuit (crossing points occur twice);
 *  - must pass through at least one corner loop before landing;
 *  - may only cross empty intersections (the mover's own starting point counts
 *    as empty, since the piece has left it);
 *  - ends on the first piece met, which must be an opponent's.
 */
export const captureRoutesFrom = (board: Board, from: Pos): CaptureMove[] => {
  const player = cellAt(board, from);
  if (!player) return [];
  const enemy = opponent(player);
  const routes: CaptureMove[] = [];

  for (const circuit of CIRCUITS) {
    const entries = circuit.entries;
    const n = entries.length;
    for (let start = 0; start < n; start++) {
      if (!samePos(entries[start].pos, from)) continue;
      for (const dir of [1, -1] as const) {
        const path: PathNode[] = [{ pos: from, loop: null }];
        let loops = 0;
        let cur = start;
        for (let step = 0; step < n; step++) {
          const next = (cur + dir + n) % n;
          const loop = dir === 1 ? entries[cur].loopAfter : entries[next].loopAfter;
          if (loop) loops++;
          const pos = entries[next].pos;
          path.push({ pos, loop });
          const occupant: Cell = samePos(pos, from) ? null : cellAt(board, pos);
          if (occupant === null) {
            cur = next;
            continue;
          }
          if (occupant === enemy && loops > 0) {
            routes.push({ kind: 'capture', player, from, to: pos, circuit: circuit.id, path, loopsUsed: loops });
          }
          break; // any piece ends the route — captured or blocking
        }
      }
    }
  }
  return routes;
};

/** One capture per target square, keeping the shortest route (ties: inner circuit first). */
export const captureMovesFrom = (board: Board, from: Pos): CaptureMove[] => {
  const best = new Map<number, CaptureMove>();
  for (const r of captureRoutesFrom(board, from)) {
    const k = idx(r.to);
    const prev = best.get(k);
    if (!prev || r.path.length < prev.path.length) best.set(k, r);
  }
  return [...best.values()];
};

export const legalMovesFrom = (board: Board, from: Pos): Move[] => [
  ...captureMovesFrom(board, from),
  ...stepMovesFrom(board, from),
];

export const legalMoves = (board: Board, player: Player): Move[] => {
  const moves: Move[] = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i] !== player) continue;
    moves.push(...legalMovesFrom(board, posOf(i)));
  }
  return moves;
};

export const captureMoves = (board: Board, player: Player): CaptureMove[] =>
  legalMoves(board, player).filter((m): m is CaptureMove => m.kind === 'capture');

/** Finds the legal move matching a from/to pair (capture preferred), or null if none exists. */
export const findLegalMove = (board: Board, from: Pos, to: Pos): Move | null => {
  const moves = legalMovesFrom(board, from);
  return moves.find((m) => samePos(m.to, to)) ?? null;
};

const isLegal = (board: Board, move: Move): boolean => {
  if (cellAt(board, move.from) !== move.player) return false;
  if (move.kind === 'step') {
    return stepMovesFrom(board, move.from).some((m) => samePos(m.to, move.to));
  }
  return captureRoutesFrom(board, move.from).some((m) => samePos(m.to, move.to));
};

/** Applies a move to a board. Throws if the move is not legal — moves are never faked. */
export const applyMoveToBoard = (board: Board, move: Move): Board => {
  if (!isLegal(board, move)) throw new Error(`Illegal move ${JSON.stringify({ from: move.from, to: move.to, kind: move.kind })}`);
  const next = board.slice();
  next[idx(move.from)] = null;
  next[idx(move.to)] = move.player;
  return next;
};

// ---------------------------------------------------------------------------
// Full game state (turns, win / draw detection)
// ---------------------------------------------------------------------------

export type GameStatus =
  | { kind: 'playing' }
  | { kind: 'won'; winner: Player; reason: 'captured-all' | 'no-moves' }
  | { kind: 'draw'; reason: 'quiet-limit' };

export interface GameState {
  readonly board: Board;
  readonly turn: Player;
  /** Plies played since the last capture; used for the draw rule. */
  readonly quietPlies: number;
  readonly ply: number;
  readonly status: GameStatus;
  readonly lastMove: Move | null;
}

/** Documented default: a game with no capture for this many consecutive plies is drawn. */
export const QUIET_PLY_LIMIT = 80;

export const evaluateStatus = (board: Board, turn: Player, quietPlies: number): GameStatus => {
  const other = opponent(turn);
  if (countPieces(board, turn) === 0) return { kind: 'won', winner: other, reason: 'captured-all' };
  if (countPieces(board, other) === 0) return { kind: 'won', winner: turn, reason: 'captured-all' };
  if (legalMoves(board, turn).length === 0) return { kind: 'won', winner: other, reason: 'no-moves' };
  if (quietPlies >= QUIET_PLY_LIMIT) return { kind: 'draw', reason: 'quiet-limit' };
  return { kind: 'playing' };
};

export const createGame = (board: Board = initialBoard(), turn: Player = 'gold'): GameState => ({
  board,
  turn,
  quietPlies: 0,
  ply: 0,
  status: evaluateStatus(board, turn, 0),
  lastMove: null,
});

/** Plays a move for the side to move and passes the turn. Throws on illegal moves or a finished game. */
export const playMove = (state: GameState, move: Move): GameState => {
  if (state.status.kind !== 'playing') throw new Error('Game is over');
  if (move.player !== state.turn) throw new Error(`It is ${state.turn}'s turn`);
  const board = applyMoveToBoard(state.board, move);
  const turn = opponent(state.turn);
  const quietPlies = move.kind === 'capture' ? 0 : state.quietPlies + 1;
  return {
    board,
    turn,
    quietPlies,
    ply: state.ply + 1,
    status: evaluateStatus(board, turn, quietPlies),
    lastMove: move,
  };
};

/**
 * Plays a move in a *solo* position (puzzles and tutorial): enemy stones are
 * dormant, so the same side keeps the move. Status is re-evaluated so that
 * capturing the last enemy stone still registers as a win.
 */
export const playSoloMove = (state: GameState, move: Move): GameState => {
  if (state.status.kind !== 'playing') throw new Error('Game is over');
  if (move.player !== state.turn) throw new Error(`It is ${state.turn}'s turn`);
  const board = applyMoveToBoard(state.board, move);
  return {
    board,
    turn: state.turn,
    quietPlies: 0,
    ply: state.ply + 1,
    status: evaluateStatus(board, state.turn, 0),
    lastMove: move,
  };
};
