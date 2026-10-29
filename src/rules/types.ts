/** The two sides. Gold always belongs to the human player in this prototype. */
export type Player = 'gold' | 'silver';

export const BOARD_SIZE = 6;

/** A board intersection. x = column (0 left), y = row (0 top). */
export interface Pos {
  readonly x: number;
  readonly y: number;
}

export type Cell = Player | null;

/** Row-major array of 36 cells, index = y * 6 + x. Treated as immutable. */
export type Board = readonly Cell[];

export type Corner = 'tl' | 'tr' | 'br' | 'bl';

/** A corner loop: a 270° arc around a board corner with radius 1 (inner) or 2 (outer). */
export interface LoopInfo {
  readonly corner: Corner;
  readonly radius: 1 | 2;
}

/** One point along a capture route. `loop` is set when the leg *arriving* at `pos` rides a corner loop. */
export interface PathNode {
  readonly pos: Pos;
  readonly loop: LoopInfo | null;
}

export interface StepMove {
  readonly kind: 'step';
  readonly player: Player;
  readonly from: Pos;
  readonly to: Pos;
}

export interface CaptureMove {
  readonly kind: 'capture';
  readonly player: Player;
  readonly from: Pos;
  readonly to: Pos;
  /** Which circuit the route travels: 1 = inner (small loops), 2 = outer (large loops). */
  readonly circuit: 1 | 2;
  /** Full route, starting at `from` and ending at `to`. */
  readonly path: readonly PathNode[];
  readonly loopsUsed: number;
}

export type Move = StepMove | CaptureMove;

export const opponent = (p: Player): Player => (p === 'gold' ? 'silver' : 'gold');
