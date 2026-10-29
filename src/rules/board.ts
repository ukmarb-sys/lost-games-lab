import { BOARD_SIZE, type Board, type Cell, type Player, type Pos } from './types';

export const idx = (p: Pos): number => p.y * BOARD_SIZE + p.x;
export const posOf = (i: number): Pos => ({ x: i % BOARD_SIZE, y: Math.floor(i / BOARD_SIZE) });
export const samePos = (a: Pos, b: Pos): boolean => a.x === b.x && a.y === b.y;
export const inBounds = (p: Pos): boolean =>
  p.x >= 0 && p.y >= 0 && p.x < BOARD_SIZE && p.y < BOARD_SIZE;

export const emptyBoard = (): Board => new Array<Cell>(BOARD_SIZE * BOARD_SIZE).fill(null);

export const cellAt = (board: Board, p: Pos): Cell => board[idx(p)];

/** Standard Surakarta opening: Silver fills the top two rows, Gold the bottom two. */
export const initialBoard = (): Board => {
  const b = emptyBoard().slice();
  for (let x = 0; x < BOARD_SIZE; x++) {
    b[idx({ x, y: 0 })] = 'silver';
    b[idx({ x, y: 1 })] = 'silver';
    b[idx({ x, y: 4 })] = 'gold';
    b[idx({ x, y: 5 })] = 'gold';
  }
  return b;
};

export const countPieces = (board: Board, player: Player): number =>
  board.reduce((n, c) => (c === player ? n + 1 : n), 0);

/**
 * Builds a board from a 6-line ASCII diagram: `G` gold, `S` silver, `.` empty.
 * Whitespace inside a line is ignored, so rows may be written as "G . . S . .".
 */
export const boardFromDiagram = (rows: readonly string[]): Board => {
  if (rows.length !== BOARD_SIZE) throw new Error(`Diagram needs ${BOARD_SIZE} rows`);
  const b: Cell[] = [];
  rows.forEach((row, y) => {
    const chars = row.replace(/\s+/g, '');
    if (chars.length !== BOARD_SIZE) throw new Error(`Row ${y} must have ${BOARD_SIZE} cells: "${row}"`);
    for (const ch of chars) {
      if (ch === 'G') b.push('gold');
      else if (ch === 'S') b.push('silver');
      else if (ch === '.') b.push(null);
      else throw new Error(`Unknown diagram symbol "${ch}"`);
    }
  });
  return b;
};

export const boardToDiagram = (board: Board): string[] => {
  const rows: string[] = [];
  for (let y = 0; y < BOARD_SIZE; y++) {
    let r = '';
    for (let x = 0; x < BOARD_SIZE; x++) {
      const c = board[idx({ x, y })];
      r += c === 'gold' ? 'G' : c === 'silver' ? 'S' : '.';
    }
    rows.push(r);
  }
  return rows;
};
