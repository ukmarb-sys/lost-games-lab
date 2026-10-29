import { BOARD_SIZE, type LoopInfo, type Pos } from './types';

/**
 * Surakarta has two closed circuits. Each is made of two rows and two columns
 * joined at the four corners by 270° loops that run outside the board.
 *
 *  - Inner circuit (radius 1): rows 1 & 4 and columns 1 & 4.
 *  - Outer circuit (radius 2): rows 2 & 3 and columns 2 & 3.
 *
 * A circuit is stored as a cyclic list of 24 entries. Crossing points appear
 * twice (once on a row, once on a column). `loopAfter` marks that moving from
 * this entry to the next one rides a corner loop.
 */
export interface CircuitEntry {
  readonly pos: Pos;
  readonly loopAfter: LoopInfo | null;
}

export interface Circuit {
  readonly id: 1 | 2;
  readonly entries: readonly CircuitEntry[];
}

const LAST = BOARD_SIZE - 1;

const buildCircuit = (k: 1 | 2): Circuit => {
  const m = LAST - k;
  const entries: CircuitEntry[] = [];
  const push = (x: number, y: number, loop: LoopInfo | null = null) =>
    entries.push({ pos: { x, y }, loopAfter: loop });

  // Row k, left → right; exit right and loop round the top-right corner into column m.
  for (let x = 0; x <= LAST; x++) push(x, k, x === LAST ? { corner: 'tr', radius: k } : null);
  // Column m, top → bottom; loop round the bottom-right corner into row m.
  for (let y = 0; y <= LAST; y++) push(m, y, y === LAST ? { corner: 'br', radius: k } : null);
  // Row m, right → left; loop round the bottom-left corner into column k.
  for (let x = LAST; x >= 0; x--) push(x, m, x === 0 ? { corner: 'bl', radius: k } : null);
  // Column k, bottom → top; loop round the top-left corner back into row k.
  for (let y = LAST; y >= 0; y--) push(k, y, y === 0 ? { corner: 'tl', radius: k } : null);

  return { id: k, entries };
};

export const INNER_CIRCUIT = buildCircuit(1);
export const OUTER_CIRCUIT = buildCircuit(2);
export const CIRCUITS: readonly Circuit[] = [INNER_CIRCUIT, OUTER_CIRCUIT];

/** Board-space coordinates of a corner (the centre of its loop arc). */
export const cornerPos = (corner: LoopInfo['corner']): Pos => {
  switch (corner) {
    case 'tl':
      return { x: 0, y: 0 };
    case 'tr':
      return { x: LAST, y: 0 };
    case 'br':
      return { x: LAST, y: LAST };
    case 'bl':
      return { x: 0, y: LAST };
  }
};

/** True when a point lies on the given circuit's lines. */
export const onCircuit = (c: Circuit, p: Pos): boolean =>
  c.entries.some((e) => e.pos.x === p.x && e.pos.y === p.y);
