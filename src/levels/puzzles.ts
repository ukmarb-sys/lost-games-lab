import { boardFromDiagram, type Board } from '../rules';

/**
 * Curated puzzles. Diagram key: G = your gold stone, S = dormant silver stone.
 *
 * Puzzle rules (documented default): silver stones are *dormant* — they do not
 * move. Capture every silver stone within the move budget. Each budget equals
 * the shortest possible solution, which `tests/levels.test.ts` proves with the
 * rules-engine solver.
 */
export interface PuzzleLevel {
  readonly id: string;
  readonly name: string;
  readonly hint: string;
  readonly maxMoves: number;
  readonly diagram: readonly string[];
}

export const PUZZLES: readonly PuzzleLevel[] = [
  {
    id: 'p1',
    name: 'First Orbit',
    hint: 'One stone, one loop. Look for the track that bends around a corner.',
    maxMoves: 1,
    diagram: [
      '......',
      '......',
      '.G....',
      '.....S',
      '......',
      '......',
    ],
  },
  {
    id: 'p2',
    name: 'Twin Moons',
    hint: 'After the first capture, a single step can open the next orbit.',
    maxMoves: 3,
    diagram: [
      '......',
      '....G.',
      '......',
      '...S..',
      '....S.',
      '......',
    ],
  },
  {
    id: 'p3',
    name: 'The Sleeping Sentinel',
    hint: 'A stone in a corner touches no track. Not every stone can hunt.',
    maxMoves: 3,
    diagram: [
      '.....G',
      '.....G',
      '......',
      '......',
      '......',
      '...SS.',
    ],
  },
  {
    id: 'p4',
    name: 'Crossing Wheels',
    hint: 'Chain your captures — each landing point is the start of a new journey.',
    maxMoves: 4,
    diagram: [
      'G.....',
      '......',
      '......',
      '.....S',
      'S...S.',
      '....G.',
    ],
  },
  {
    id: 'p5',
    name: 'The Forgotten Path',
    hint: 'The obvious first capture leaves you stranded. Find the one stone whose orbit reaches everything.',
    maxMoves: 5,
    diagram: [
      'GS....',
      '....G.',
      'S.S..S',
      '......',
      '......',
      '......',
    ],
  },
];

export const puzzleBoard = (level: PuzzleLevel): Board => boardFromDiagram(level.diagram);
