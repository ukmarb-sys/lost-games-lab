import Phaser from 'phaser';
import {
  BOARD_SIZE,
  CIRCUITS,
  cornerPos,
  idx,
  posOf,
  type Board,
  type CaptureMove,
  type LoopInfo,
  type Move,
  type PathNode,
  type Pos,
} from '../rules';
import { COLORS } from '../ui/theme';

const circuitColor = (id: 1 | 2): number => (id === 1 ? COLORS.inner : COLORS.outer);

/**
 * Renders the board, the two loop circuits, the stones and all move feedback.
 * Pure view: it never decides what is legal — it only draws moves the rules
 * engine produced.
 */
export class BoardView {
  readonly cell: number;
  private readonly scene: Phaser.Scene;
  private readonly cx: number;
  private readonly cy: number;
  private readonly pieces = new Map<number, Phaser.GameObjects.Image>();
  private readonly hl: Phaser.GameObjects.Graphics;
  private readonly routeLayer: Phaser.GameObjects.Graphics;
  private readonly trail: Phaser.GameObjects.Graphics;
  private readonly markers: Phaser.GameObjects.GameObject[] = [];
  private readonly trackGlow: Phaser.GameObjects.Graphics;
  private pieceScale = 1;

  constructor(scene: Phaser.Scene, cx: number, cy: number, cell: number) {
    this.scene = scene;
    this.cx = cx;
    this.cy = cy;
    this.cell = cell;
    this.pieceScale = (cell * 0.78) / 128;

    this.trackGlow = scene.add.graphics().setDepth(1);
    const staticLayer = scene.add.graphics().setDepth(2);
    this.drawBoard(staticLayer);
    this.routeLayer = scene.add.graphics().setDepth(3);
    this.hl = scene.add.graphics().setDepth(4);
    this.trail = scene.add.graphics().setDepth(5);

    // Slow "breathing" of the loop glow.
    scene.tweens.add({ targets: this.trackGlow, alpha: { from: 0.55, to: 1 }, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  // ---------------------------------------------------------------- geometry

  toScreen(p: Pos): Phaser.Math.Vector2 {
    const half = (BOARD_SIZE - 1) / 2;
    return new Phaser.Math.Vector2(this.cx + (p.x - half) * this.cell, this.cy + (p.y - half) * this.cell);
  }

  /** Nearest intersection to a screen point, if the tap is close enough. */
  pickPoint(x: number, y: number): Pos | null {
    const half = (BOARD_SIZE - 1) / 2;
    const gx = Math.round((x - this.cx) / this.cell + half);
    const gy = Math.round((y - this.cy) / this.cell + half);
    if (gx < 0 || gy < 0 || gx >= BOARD_SIZE || gy >= BOARD_SIZE) return null;
    const s = this.toScreen({ x: gx, y: gy });
    return Phaser.Math.Distance.Between(x, y, s.x, s.y) <= this.cell * 0.5 ? { x: gx, y: gy } : null;
  }

  /** Points along a corner loop from one board point to another, the long way round (270°). */
  private arcPoints(loop: LoopInfo, from: Pos, to: Pos, segments = 40): Phaser.Math.Vector2[] {
    const c = this.toScreen(cornerPos(loop.corner));
    const a = this.toScreen(from);
    const b = this.toScreen(to);
    const r = loop.radius * this.cell;
    const a1 = Math.atan2(a.y - c.y, a.x - c.x);
    const a2 = Math.atan2(b.y - c.y, b.x - c.x);
    const d = Phaser.Math.Angle.Wrap(a2 - a1);
    const sweep = d > 0 ? d - Math.PI * 2 : d + Math.PI * 2;
    const pts: Phaser.Math.Vector2[] = [];
    for (let i = 0; i <= segments; i++) {
      const ang = a1 + (sweep * i) / segments;
      pts.push(new Phaser.Math.Vector2(c.x + Math.cos(ang) * r, c.y + Math.sin(ang) * r));
    }
    return pts;
  }

  /** Dense polyline following a capture route, including its loops. */
  routePolyline(path: readonly PathNode[]): Phaser.Math.Vector2[] {
    const pts: Phaser.Math.Vector2[] = [this.toScreen(path[0].pos)];
    for (let i = 1; i < path.length; i++) {
      const node = path[i];
      if (node.loop) pts.push(...this.arcPoints(node.loop, path[i - 1].pos, node.pos).slice(1));
      else pts.push(this.toScreen(node.pos));
    }
    return pts;
  }

  // ----------------------------------------------------------------- drawing

  private drawBoard(g: Phaser.GameObjects.Graphics): void {
    const c = this.cell;
    const tl = this.toScreen({ x: 0, y: 0 });
    const br = this.toScreen({ x: BOARD_SIZE - 1, y: BOARD_SIZE - 1 });

    // Stone slab behind the grid.
    const pad = c * 0.55;
    g.fillStyle(0x000000, 0.35);
    g.fillRoundedRect(tl.x - pad + 8, tl.y - pad + 12, br.x - tl.x + pad * 2, br.y - tl.y + pad * 2, 26);
    g.fillStyle(COLORS.stoneLight, 0.92);
    g.fillRoundedRect(tl.x - pad, tl.y - pad, br.x - tl.x + pad * 2, br.y - tl.y + pad * 2, 26);
    g.lineStyle(3, COLORS.bronzeDark, 1);
    g.strokeRoundedRect(tl.x - pad, tl.y - pad, br.x - tl.x + pad * 2, br.y - tl.y + pad * 2, 26);

    // Edge lines (rows/columns 0 and 5) belong to no circuit: draw them quietly.
    g.lineStyle(3, COLORS.bronzeDark, 1);
    for (const k of [0, BOARD_SIZE - 1]) {
      const a = this.toScreen({ x: 0, y: k });
      const b = this.toScreen({ x: BOARD_SIZE - 1, y: k });
      g.lineBetween(a.x, a.y, b.x, b.y);
      const d = this.toScreen({ x: k, y: 0 });
      const e = this.toScreen({ x: k, y: BOARD_SIZE - 1 });
      g.lineBetween(d.x, d.y, e.x, e.y);
    }

    // The two circuits: soft glow on its own (breathing) layer, crisp core line on top.
    for (const circuit of CIRCUITS) {
      const color = circuitColor(circuit.id);
      const segments = this.circuitSegments(circuit.id);
      for (const seg of segments) {
        this.trackGlow.lineStyle(c * 0.22, color, 0.09);
        this.trackGlow.strokePoints(seg, false);
        this.trackGlow.lineStyle(c * 0.1, color, 0.16);
        this.trackGlow.strokePoints(seg, false);
        g.lineStyle(4, color, 0.95);
        g.strokePoints(seg, false);
      }
    }

    // Intersections.
    for (let i = 0; i < BOARD_SIZE * BOARD_SIZE; i++) {
      const s = this.toScreen(posOf(i));
      g.fillStyle(COLORS.bronzeDark, 1);
      g.fillCircle(s.x, s.y, c * 0.085);
      g.fillStyle(COLORS.bronze, 1);
      g.fillCircle(s.x, s.y, c * 0.05);
    }
  }

  /** Lines and loops of a circuit as separate polylines for drawing. */
  private circuitSegments(id: 1 | 2): Phaser.Math.Vector2[][] {
    const circuit = CIRCUITS.find((c) => c.id === id)!;
    const segs: Phaser.Math.Vector2[][] = [];
    const e = circuit.entries;
    let line: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < e.length; i++) {
      line.push(this.toScreen(e[i].pos));
      const loop = e[i].loopAfter;
      if (loop) {
        segs.push(line);
        segs.push(this.arcPoints(loop, e[i].pos, e[(i + 1) % e.length].pos, 64));
        line = [];
      }
    }
    return segs;
  }

  // ------------------------------------------------------------------ pieces

  private makePiece(player: 'gold' | 'silver', p: Pos): Phaser.GameObjects.Image {
    const s = this.toScreen(p);
    return this.scene.add.image(s.x, s.y, `piece-${player}`).setScale(this.pieceScale).setDepth(10);
  }

  setBoard(board: Board): void {
    for (const img of this.pieces.values()) img.destroy();
    this.pieces.clear();
    board.forEach((c, i) => {
      if (c) this.pieces.set(i, this.makePiece(c, posOf(i)));
    });
  }

  /** Gentle bob of every stone of one side — used as a turn cue. */
  pulseSide(board: Board, player: 'gold' | 'silver'): void {
    board.forEach((c, i) => {
      const img = this.pieces.get(i);
      if (c === player && img) {
        this.scene.tweens.add({ targets: img, scale: this.pieceScale * 1.08, duration: 160, yoyo: true, ease: 'Sine.easeOut' });
      }
    });
  }

  // -------------------------------------------------------------- highlights

  clearHighlights(): void {
    this.hl.clear();
    this.routeLayer.clear();
    for (const m of this.markers) m.destroy();
    this.markers.length = 0;
  }

  showLastMove(move: Move | null): void {
    if (!move) return;
    const a = this.toScreen(move.from);
    this.hl.lineStyle(3, COLORS.muted, 0.6);
    this.hl.strokeCircle(a.x, a.y, this.cell * 0.2);
  }

  /** Selected stone + its legal destinations. Captures get a distinct ring and their route. */
  showSelection(from: Pos, moves: readonly Move[]): void {
    this.clearHighlights();
    const s = this.toScreen(from);
    const sel = this.scene.add.image(s.x, s.y, 'glow').setDepth(9).setTint(COLORS.goldBright).setScale((this.cell * 1.5) / 128).setAlpha(0.9);
    this.markers.push(sel);
    this.scene.tweens.add({ targets: sel, alpha: 0.45, duration: 700, yoyo: true, repeat: -1 });

    for (const m of moves) {
      const t = this.toScreen(m.to);
      if (m.kind === 'step') {
        this.hl.fillStyle(COLORS.step, 0.22);
        this.hl.fillCircle(t.x, t.y, this.cell * 0.3);
        this.hl.fillStyle(COLORS.step, 0.95);
        this.hl.fillCircle(t.x, t.y, this.cell * 0.12);
      } else {
        this.drawRoute(m, 0.55);
        const ring = this.scene.add.graphics().setDepth(11);
        ring.lineStyle(7, COLORS.capture, 1);
        ring.strokeCircle(0, 0, this.cell * 0.47);
        ring.lineStyle(2, COLORS.goldBright, 0.9);
        ring.strokeCircle(0, 0, this.cell * 0.56);
        ring.setPosition(t.x, t.y);
        this.markers.push(ring);
        this.scene.tweens.add({ targets: ring, scale: 1.12, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    }
  }

  private drawRoute(m: CaptureMove, alpha: number): void {
    const pts = this.routePolyline(m.path);
    const color = circuitColor(m.circuit);
    this.routeLayer.lineStyle(this.cell * 0.2, color, alpha * 0.25);
    this.routeLayer.strokePoints(pts, false);
    this.routeLayer.lineStyle(6, COLORS.goldBright, alpha);
    this.routeLayer.strokePoints(pts, false);
  }

  /** Points at a suggested move (puzzle hints). */
  showHint(move: Move): void {
    this.showSelection(move.from, [move]);
    const t = this.toScreen(move.to);
    const arrow = this.scene.add.image(t.x, t.y, 'glow').setDepth(8).setTint(COLORS.goldBright).setScale((this.cell * 1.8) / 128);
    this.markers.push(arrow);
    this.scene.tweens.add({ targets: arrow, alpha: 0.2, duration: 450, yoyo: true, repeat: -1 });
  }

  // -------------------------------------------------------------- animation

  animateMove(move: Move): Promise<void> {
    const from = idx(move.from);
    const sprite = this.pieces.get(from);
    if (!sprite) return Promise.resolve();
    this.pieces.delete(from);
    sprite.setDepth(20);
    const victim = move.kind === 'capture' ? this.pieces.get(idx(move.to)) : undefined;
    if (victim) this.pieces.delete(idx(move.to));

    if (move.kind === 'step') {
      const t = this.toScreen(move.to);
      return new Promise((resolve) => {
        this.scene.tweens.add({
          targets: sprite,
          x: t.x,
          y: t.y,
          duration: 200,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            sprite.setDepth(10);
            this.pieces.set(idx(move.to), sprite);
            resolve();
          },
        });
      });
    }

    const pts = this.routePolyline(move.path);
    const lens = [0];
    for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + pts[i].distance(pts[i - 1]));
    const total = lens[lens.length - 1];
    const duration = Phaser.Math.Clamp(300 + (total / this.cell) * 70, 550, 1500);
    const color = circuitColor(move.circuit);
    const at = (d: number): { p: Phaser.Math.Vector2; i: number } => {
      let i = 1;
      while (i < lens.length - 1 && lens[i] < d) i++;
      const seg = lens[i] - lens[i - 1] || 1;
      const f = Phaser.Math.Clamp((d - lens[i - 1]) / seg, 0, 1);
      return { p: pts[i - 1].clone().lerp(pts[i], f), i };
    };

    return new Promise((resolve) => {
      const state = { t: 0 };
      this.scene.tweens.add({
        targets: state,
        t: 1,
        duration,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          const { p, i } = at(state.t * total);
          sprite.setPosition(p.x, p.y);
          const drawn = [...pts.slice(0, i), p];
          this.trail.clear();
          this.trail.lineStyle(this.cell * 0.26, color, 0.18);
          this.trail.strokePoints(drawn, false);
          this.trail.lineStyle(7, COLORS.goldBright, 0.9);
          this.trail.strokePoints(drawn, false);
        },
        onComplete: () => {
          sprite.setDepth(10);
          this.pieces.set(idx(move.to), sprite);
          this.scene.tweens.add({ targets: this.trail, alpha: 0, duration: 380, onComplete: () => this.trail.clear().setAlpha(1) });
          if (victim) this.shatter(victim);
          this.impact(move.to);
          resolve();
        },
      });
    });
  }

  private shatter(victim: Phaser.GameObjects.Image): void {
    victim.setDepth(15);
    this.scene.tweens.add({
      targets: victim,
      scale: this.pieceScale * 1.6,
      alpha: 0,
      angle: 40,
      duration: 380,
      ease: 'Cubic.easeOut',
      onComplete: () => victim.destroy(),
    });
  }

  private impact(p: Pos): void {
    const s = this.toScreen(p);
    const flash = this.scene.add.image(s.x, s.y, 'glow').setDepth(25).setTint(COLORS.goldBright).setScale(0.4);
    this.scene.tweens.add({ targets: flash, scale: (this.cell * 3) / 128, alpha: 0, duration: 520, ease: 'Cubic.easeOut', onComplete: () => flash.destroy() });
    for (let i = 0; i < 12; i++) {
      const ang = (Math.PI * 2 * i) / 12;
      const spark = this.scene.add.circle(s.x, s.y, 5, COLORS.goldBright).setDepth(25);
      this.scene.tweens.add({
        targets: spark,
        x: s.x + Math.cos(ang) * this.cell * 0.9,
        y: s.y + Math.sin(ang) * this.cell * 0.9,
        alpha: 0,
        scale: 0.3,
        duration: 480,
        ease: 'Cubic.easeOut',
        onComplete: () => spark.destroy(),
      });
    }
  }

  /** Short horizontal shake of a stone — feedback for an impossible tap. */
  nudge(p: Pos): void {
    const img = this.pieces.get(idx(p));
    if (!img) return;
    const x = img.x;
    this.scene.tweens.add({ targets: img, x: x + 8, duration: 50, yoyo: true, repeat: 2, onComplete: () => img.setX(x) });
  }
}
