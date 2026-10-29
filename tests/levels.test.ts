import { describe, expect, it } from 'vitest';
import { LESSONS, lessonBoard } from '../src/levels/tutorial';
import { PUZZLES, puzzleBoard } from '../src/levels/puzzles';
import {
  applyMoveToBoard,
  captureMoves,
  countPieces,
  createGame,
  legalMoves,
  playSoloMove,
  solvePuzzle,
  stepMovesFrom,
  posOf,
} from '../src/rules';

describe('puzzle levels', () => {
  it('has five puzzles with unique ids and increasing budgets', () => {
    expect(PUZZLES).toHaveLength(5);
    expect(new Set(PUZZLES.map((p) => p.id)).size).toBe(5);
    for (let i = 1; i < PUZZLES.length; i++) {
      expect(PUZZLES[i].maxMoves).toBeGreaterThanOrEqual(PUZZLES[i - 1].maxMoves);
    }
  });

  for (const level of PUZZLES) {
    describe(level.name, () => {
      const board = puzzleBoard(level);

      it('is a valid position with stones of both colours', () => {
        expect(board).toHaveLength(36);
        expect(countPieces(board, 'gold')).toBeGreaterThan(0);
        expect(countPieces(board, 'silver')).toBeGreaterThan(0);
      });

      it('has a solution exactly within the move budget, and none shorter', () => {
        const res = solvePuzzle(board, 'gold', level.maxMoves);
        expect(res).not.toBeNull();
        expect(res!.moves).toHaveLength(level.maxMoves);
        // replay through the real game flow
        let g = createGame(board, 'gold');
        for (const m of res!.moves) g = playSoloMove(g, m);
        expect(g.status).toEqual({ kind: 'won', winner: 'gold', reason: 'captured-all' });
        if (level.maxMoves > 1) expect(solvePuzzle(board, 'gold', level.maxMoves - 1)).toBeNull();
      });
    });
  }
});

describe('tutorial lessons', () => {
  for (const lesson of LESSONS) {
    it(`${lesson.title} is achievable in its move budget`, () => {
      const board = lessonBoard(lesson);
      if (lesson.goal === 'step') {
        const golds = board.map((c, i) => (c === 'gold' ? i : -1)).filter((i) => i >= 0);
        expect(golds.some((i) => stepMovesFrom(board, posOf(i)).length > 0)).toBe(true);
        // a pure stepping lesson must not offer captures (it would confuse the lesson)
        expect(captureMoves(board, 'gold')).toHaveLength(0);
      } else {
        const res = solvePuzzle(board, 'gold', lesson.maxMoves);
        expect(res).not.toBeNull();
        expect(res!.moves).toHaveLength(lesson.maxMoves);
      }
    });
  }

  it('lesson III really needs the blocker moved first', () => {
    const board = lessonBoard(LESSONS[2]);
    expect(captureMoves(board, 'gold')).toHaveLength(0);
    const step = legalMoves(board, 'gold').find((m) => m.from.x === 1 && m.from.y === 0 && m.to.x === 2 && m.to.y === 0)!;
    expect(captureMoves(applyMoveToBoard(board, step), 'gold').map((m) => m.to)).toEqual([{ x: 1, y: 1 }]);
  });

  it('lesson IV needs three loops', () => {
    const caps = captureMoves(lessonBoard(LESSONS[3]), 'gold');
    expect(caps).toHaveLength(1);
    expect(caps[0].loopsUsed).toBe(3);
  });
});
