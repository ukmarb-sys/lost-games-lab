import Phaser from 'phaser';
import { COLORS, css } from '../../ui/theme';

/**
 * Generates every texture procedurally (stone background, stones, glow) —
 * the game ships with no image assets at all.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.makeBackground();
    this.makePiece('piece-gold', '#fff0c4', '#e2b65c', '#8a5d1c', '#5b3a0e', 'sun');
    this.makePiece('piece-silver', '#ffffff', '#c3ccd6', '#6b7684', '#2e3540', 'moon');
    this.makeGlow();
    this.scene.start('Menu');
  }

  private makeBackground(): void {
    const { width: W, height: H } = this.scale;
    const tex = this.textures.createCanvas('bg', W, H)!;
    const ctx = tex.getContext();

    // Stone base with a warm centre.
    const base = ctx.createRadialGradient(W / 2, H * 0.42, 40, W / 2, H * 0.5, H * 0.75);
    base.addColorStop(0, '#2a241d');
    base.addColorStop(0.55, '#16130f');
    base.addColorStop(1, '#070605');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, W, H);

    // Grain / speckle (deterministic so it looks the same every load).
    let seed = 1337;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 9000; i++) {
      const v = Math.floor(rnd() * 60 + 20);
      ctx.fillStyle = `rgba(${v + 20},${v + 12},${v},${rnd() * 0.18})`;
      const s = rnd() * 3 + 0.5;
      ctx.fillRect(rnd() * W, rnd() * H, s, s);
    }

    // Faint carved cracks.
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 14; i++) {
      let x = rnd() * W;
      let y = rnd() * H;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let k = 0; k < 6; k++) {
        x += (rnd() - 0.5) * 120;
        y += (rnd() - 0.5) * 120;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Stars and a few constellation threads.
    const stars: [number, number][] = [];
    for (let i = 0; i < 140; i++) {
      const x = rnd() * W;
      const y = rnd() * H;
      stars.push([x, y]);
      const r = rnd() * 1.8 + 0.4;
      ctx.fillStyle = `rgba(255,226,160,${0.15 + rnd() * 0.35})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(224,183,98,0.08)';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 18; i++) {
      const a = stars[Math.floor(rnd() * stars.length)];
      const b = stars[Math.floor(rnd() * stars.length)];
      if (Math.hypot(a[0] - b[0], a[1] - b[1]) > 260) continue;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }

    // Astrolabe rings with tick marks, centred where the board sits.
    const cx = W / 2;
    const cy = H * 0.45;
    ctx.strokeStyle = css(COLORS.bronze);
    for (const [r, a] of [
      [W * 0.49, 0.1],
      [W * 0.53, 0.07],
      [W * 0.62, 0.05],
    ] as const) {
      ctx.globalAlpha = a;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.09;
    for (let i = 0; i < 72; i++) {
      const ang = (i / 72) * Math.PI * 2;
      const r1 = W * 0.49;
      const r2 = r1 + (i % 6 === 0 ? 28 : 12);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1);
      ctx.lineTo(cx + Math.cos(ang) * r2, cy + Math.sin(ang) * r2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Vignette.
    const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.78);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.65)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
    tex.refresh();
  }

  private makePiece(key: string, hi: string, mid: string, low: string, rim: string, emblem: 'sun' | 'moon'): void {
    const S = 128;
    const tex = this.textures.createCanvas(key, S, S)!;
    const ctx = tex.getContext();
    const c = S / 2;

    // Drop shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(c + 3, c + 6, 56, 56, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body.
    const g = ctx.createRadialGradient(c - 16, c - 20, 6, c, c, 58);
    g.addColorStop(0, hi);
    g.addColorStop(0.45, mid);
    g.addColorStop(1, low);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(c, c, 56, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = rim;
    ctx.stroke();

    // Engraved inner ring.
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.arc(c, c, 42, 0, Math.PI * 2);
    ctx.stroke();

    // Emblem — shape, not only colour, tells the sides apart.
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.strokeStyle = 'rgba(0,0,0,0.32)';
    if (emblem === 'sun') {
      ctx.beginPath();
      ctx.arc(c, c, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(c + Math.cos(a) * 20, c + Math.sin(a) * 20);
        ctx.lineTo(c + Math.cos(a) * 30, c + Math.sin(a) * 30);
        ctx.stroke();
      }
    } else {
      ctx.beginPath();
      ctx.arc(c, c, 24, Math.PI * 0.3, Math.PI * 1.7, false);
      ctx.arc(c + 11, c - 2, 19, Math.PI * 1.62, Math.PI * 0.38, true);
      ctx.closePath();
      ctx.fill();
    }

    // Specular highlight.
    const sh = ctx.createRadialGradient(c - 18, c - 22, 2, c - 18, c - 22, 26);
    sh.addColorStop(0, 'rgba(255,255,255,0.55)');
    sh.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sh;
    ctx.beginPath();
    ctx.arc(c, c, 56, 0, Math.PI * 2);
    ctx.fill();
    tex.refresh();
  }

  private makeGlow(): void {
    const S = 128;
    const tex = this.textures.createCanvas('glow', S, S)!;
    const ctx = tex.getContext();
    const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    tex.refresh();
  }
}
