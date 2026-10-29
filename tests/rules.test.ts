import { describe, expect, it } from 'vitest';
import {
  CIRCUITS,
  QUIET_PLY_LIMIT,
  applyMoveToBoard,
  boardFromDiagram,
  captureMovesFrom,
  captureRoutesFrom,
  chooseAiMove,
  cornerPos,
  countPieces,
  createGame,
  findLegalMove,
  initialBoard,
  legalMoves,
  playMove,
  seededRng,
  stepMovesFrom,
  type GameState,
} from '../src/rules';

const targets = (moves: { to: { x: number; y: number } }[]) =>
  moves.map((m) => `${m.to.x},${m.to.y}`).sort();

describe('circuits', () => {
  it('each circuit has 24 points and 4 corner loops of the right radius', () => {
    for (const c of CIRCUITS) {
      expect(c.entries).toHaveLength(24);
      const loops = c.entries.filter((e) => e.loopAfter);
      expect(loops).toHaveLength(4);
      for (let i = 0; i < c.entries.length; i++) {
        const loop = c.entries[i].loopAfter;
        if (!loop) continue;
        expect(loop.radius).toBe(c.id);
        // Both ends of a loop sit exactly `radius` away from the corner, on the board edge.
        const corner = cornerPos(loop.corner);
        const a = c.entries[i].pos;
        const b = c.entries[(i + 1) % 24].pos;
        expect(Math.abs(a.x - corner.x) + Math.abs(a.y - corner.y)).toBe(loop.radius);
        expect(Math.abs(b.x - corner.x) + Math.abs(b.y - corner.y)).toBe(loop.radius);
      }
    }
  });

  it('never touches the four board corners', () => {
    for (const c of CIRCUITS) {
      for (const e of c.entries) {
        const isCorner = (e.pos.x === 0 || e.pos.x === 5) && (e.pos.y === 0 || e.pos.y === 5);
        expect(isCorner).toBe(false);
      }
    }
  });
});

describe('normal movement', () => {
  it('moves one step in all 8 directions from the centre', () => {
    const b = boardFromDiagram(['......', '......', '..G...', '......', '......', '......']);
    expect(targets(stepMovesFrom(b, { x: 2, y: 2 }))).toEqual(
      ['1,1', '2,1', '3,1', '1,2', '3,2', '1,3', '2,3', '3,3'].sort(),
    );
  });

  it('has only 3 steps from a corner', () => {
    const b = boardFromDiagram(['G.....', '......', '......', '......', '......', '......']);
    expect(targets(stepMovesFrom(b, { x: 0, y: 0 }))).toEqual(['0,1', '1,0', '1,1']);
  });

  it('cannot step onto any occupied point (own or enemy)', () => {
    const b = boardFromDiagram(['......', '.GS...', '.SG...', '......', '......', '......']);
    expect(targets(stepMovesFrom(b, { x: 1, y: 1 }))).toEqual(['0,0', '0,1', '0,2', '1,0', '2,0'].sort());
  });

  it('opening position: gold has only forward steps and no captures', () => {
    const b = initialBoard();
    const moves = legalMoves(b, 'gold');
    expect(moves.every((m) => m.kind === 'step')).toBe(true);
    expect(moves.every((m) => m.to.y === 3)).toBe(true);
    expect(moves).toHaveLength(16); // 6 straight + 5 left-diagonal + 5 right-diagonal
  });
});

describe('capture routes', () => {
  it('captures around the top-left inner loop', () => {
    // Gold on (0,1) rides the inner circuit leftwards, loops round the corner into column 1.
    const b = boardFromDiagram(['......', 'G.....', '.S....', '......', '......', '......']);
    const caps = captureMovesFrom(b, { x: 0, y: 1 });
    expect(targets(caps)).toEqual(['1,2']);
    const route = caps[0];
    expect(route.circuit).toBe(1);
    expect(route.loopsUsed).toBe(1);
    expect(route.path.map((n) => `${n.pos.x},${n.pos.y}`)).toEqual(['0,1', '1,0', '1,1', '1,2']);
    expect(route.path[1].loop).toEqual({ corner: 'tl', radius: 1 });
  });

  it('captures along the outer circuit through a large loop', () => {
    // Gold on (2,0) goes up column 2, loops round top-left (radius 2) into row 2.
    const b = boardFromDiagram(['..G...', '......', '...S..', '......', '......', '......']);
    const caps = captureMovesFrom(b, { x: 2, y: 0 });
    const toS = caps.find((m) => m.to.x === 3 && m.to.y === 2);
    expect(toS).toBeDefined();
    expect(toS!.circuit).toBe(2);
    expect(toS!.path[1].loop).toEqual({ corner: 'tl', radius: 2 });
  });

  it('cannot capture in a straight line without passing a loop', () => {
    const b = boardFromDiagram(['......', 'G...S.', '......', '......', '......', '......']);
    // Rightwards along row 1 the first piece met is S with no loop crossed → no capture that way.
    // Leftwards: loop tl → column 1 → loop bl → row 4 → loop br → column 4 up → reaches (4,1) → capture!
    const caps = captureRoutesFrom(b, { x: 0, y: 1 });
    expect(caps).toHaveLength(1);
    expect(caps[0].loopsUsed).toBe(3);
  });

  it('is blocked by the player’s own piece on the route', () => {
    // Without blockers gold on (0,1) can take (1,2) both ways round the inner circuit.
    const open = boardFromDiagram(['......', 'G.....', '.S....', '......', '......', '......']);
    expect(captureRoutesFrom(open, { x: 0, y: 1 })).toHaveLength(2);
    // Own stones on (1,0) and (3,1) close both routes.
    const b = boardFromDiagram(['.G....', 'G..G..', '.S....', '......', '......', '......']);
    expect(captureRoutesFrom(b, { x: 0, y: 1 })).toHaveLength(0);
  });

  it('is blocked by an enemy piece met before any loop', () => {
    // Gold (1,3) heading up column 1 meets silver at (1,2) before the loop → that silver blocks and cannot be taken that way.
    const b = boardFromDiagram(['......', '......', '.S....', '.G....', '......', '......']);
    const routes = captureRoutesFrom(b, { x: 1, y: 3 });
    expect(routes.every((r) => !(r.to.x === 1 && r.to.y === 2 && r.path.length === 2))).toBe(true);
    // ...but going the other way round the inner circuit it is reachable after loops.
    expect(routes.some((r) => r.to.x === 1 && r.to.y === 2 && r.loopsUsed >= 1)).toBe(true);
  });

  it('may pass over its own vacated starting point', () => {
    // Gold at the crossing (1,1): out along row 1 leftwards, loop tl, down column 1 through (1,1) itself.
    const b = boardFromDiagram(['......', '.G....', '......', '.S....', '......', '......']);
    const route = captureRoutesFrom(b, { x: 1, y: 1 }).find(
      (r) => r.to.x === 1 && r.to.y === 3 && r.path.some((n, i) => i > 0 && n.pos.x === 1 && n.pos.y === 1),
    );
    expect(route).toBeDefined();
  });

  it('cannot capture its own pieces', () => {
    const b = boardFromDiagram(['......', 'G.....', '.G....', '......', '......', '......']);
    expect(captureMovesFrom(b, { x: 0, y: 1 })).toHaveLength(0);
  });

  it('applyMoveToBoard rejects fake moves', () => {
    const b = boardFromDiagram(['......', 'G...S.', '......', '......', '......', '......']);
    expect(() =>
      applyMoveToBoard(b, { kind: 'step', player: 'gold', from: { x: 0, y: 1 }, to: { x: 3, y: 4 } }),
    ).toThrow();
    expect(() =>
      applyMoveToBoard(b, {
        kind: 'capture',
        player: 'gold',
        from: { x: 0, y: 1 },
        to: { x: 3, y: 3 },
        circuit: 1,
        path: [],
        loopsUsed: 1,
      }),
    ).toThrow();
  });
});

describe('turns', () => {
  it('alternates turns and rejects moving out of turn', () => {
    let g = createGame();
    expect(g.turn).toBe('gold');
    const goldMove = findLegalMove(g.board, { x: 2, y: 4 }, { x: 2, y: 3 })!;
    g = playMove(g, goldMove);
    expect(g.turn).toBe('silver');
    expect(g.ply).toBe(1);
    expect(() => playMove(g, findLegalMove(g.board, { x: 2, y: 3 }, { x: 2, y: 2 })!)).toThrow();
    const silverMove = findLegalMove(g.board, { x: 0, y: 1 }, { x: 0, y: 2 })!;
    g = playMove(g, silverMove);
    expect(g.turn).toBe('gold');
  });

  it('resets the quiet counter on capture', () => {
    const b = boardFromDiagram(['......', 'G.....', '.S....', '......', '....S.', '......']);
    let g: GameState = { ...createGame(b), quietPlies: 10 };
    g = playMove(g, findLegalMove(g.board, { x: 0, y: 1 }, { x: 1, y: 2 })!);
    expect(g.quietPlies).toBe(0);
  });
});

describe('win conditions', () => {
  it('capturing the last enemy stone wins', () => {
    const b = boardFromDiagram(['......', 'G.....', '.S....', '......', '......', '......']);
    const g = playMove(createGame(b), findLegalMove(b, { x: 0, y: 1 }, { x: 1, y: 2 })!);
    expect(g.status).toEqual({ kind: 'won', winner: 'gold', reason: 'captured-all' });
    expect(countPieces(g.board, 'silver')).toBe(0);
    expect(() => playMove(g, legalMoves(g.board, 'gold')[0])).toThrow();
  });

  it('a side with no legal moves loses', () => {
    // Silver trapped in the corner (corners are not on any circuit) and boxed in by gold
    // stones that are themselves not capturable from the corner.
    const b = boardFromDiagram(['SG....', 'GG....', '......', '......', '......', '......']);
    const g = createGame(b, 'silver');
    expect(legalMoves(b, 'silver')).toHaveLength(0);
    expect(g.status).toEqual({ kind: 'won', winner: 'gold', reason: 'no-moves' });
  });

  it('a long quiet stretch is a draw', () => {
    const g0 = { ...createGame(), quietPlies: QUIET_PLY_LIMIT - 1 };
    const g1 = playMove(g0, findLegalMove(g0.board, { x: 2, y: 4 }, { x: 2, y: 3 })!);
    expect(g1.status).toEqual({ kind: 'draw', reason: 'quiet-limit' });
  });
});

describe('AI', () => {
  it('always returns a legal move and takes a winning capture', () => {
    const b = boardFromDiagram(['......', 'S.....', '.G....', '......', '......', '......']);
    const g = createGame(b, 'silver');
    const m = chooseAiMove(g, seededRng(7))!;
    expect(m.kind).toBe('capture');
    expect(playMove(g, m).status.kind).toBe('won');
  });

  it('plays a full game against itself without illegal moves', () => {
    const rng = seededRng(42);
    let g = createGame();
    let guard = 0;
    while (g.status.kind === 'playing' && guard++ < 3000) {
      const m = chooseAiMove(g, rng)!;
      g = playMove(g, m); // throws if the AI ever proposes an illegal move
    }
    expect(g.status.kind).not.toBe('playing');
  });
});
