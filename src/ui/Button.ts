import Phaser from 'phaser';
import { sound } from '../game/audio';
import { COLORS, textStyle } from './theme';

export interface ButtonOptions {
  width: number;
  height: number;
  label: string;
  fontSize?: number;
  primary?: boolean;
  onClick: () => void;
}

/**
 * Large, touch-friendly bronze button. Activates on pointer *up* inside the
 * button so a finger sliding off cancels the press.
 */
export class Button extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private text: Phaser.GameObjects.Text;
  private enabled = true;
  private pressed = false;
  private readonly opts: ButtonOptions;

  constructor(scene: Phaser.Scene, x: number, y: number, opts: ButtonOptions) {
    super(scene, x, y);
    this.opts = opts;
    this.bg = scene.add.graphics();
    this.text = scene.add
      .text(0, 0, opts.label, textStyle(opts.fontSize ?? 44, opts.primary ? COLORS.stone : COLORS.goldBright, { fontStyle: 'bold' }))
      .setOrigin(0.5);
    this.add([this.bg, this.text]);
    this.draw(false);
    this.setSize(opts.width, opts.height);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerdown', () => {
      if (!this.enabled) return;
      this.pressed = true;
      this.draw(true);
      this.setScale(0.97);
    });
    this.on('pointerout', () => this.release());
    this.on('pointerup', () => {
      if (!this.enabled || !this.pressed) return;
      this.release();
      sound.play('click');
      this.opts.onClick();
    });
    scene.add.existing(this);
  }

  private release(): void {
    this.pressed = false;
    this.setScale(1);
    this.draw(false);
  }

  private draw(down: boolean): void {
    const { width: w, height: h, primary } = this.opts;
    const r = Math.min(26, h / 2);
    this.bg.clear();
    // soft glow
    this.bg.fillStyle(primary ? COLORS.gold : COLORS.bronze, down ? 0.25 : 0.12);
    this.bg.fillRoundedRect(-w / 2 - 6, -h / 2 - 6, w + 12, h + 12, r + 6);
    if (primary) {
      this.bg.fillStyle(down ? COLORS.bronze : COLORS.gold, 1);
    } else {
      this.bg.fillStyle(down ? COLORS.stoneLight : COLORS.panel, 0.96);
    }
    this.bg.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    this.bg.lineStyle(3, primary ? COLORS.goldBright : COLORS.bronze, 1);
    this.bg.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
    this.bg.lineStyle(1.5, COLORS.bronzeDark, 0.9);
    this.bg.strokeRoundedRect(-w / 2 + 8, -h / 2 + 8, w - 16, h - 16, Math.max(4, r - 8));
  }

  setLabel(label: string): this {
    this.text.setText(label);
    return this;
  }

  setEnabled(on: boolean): this {
    this.enabled = on;
    this.setAlpha(on ? 1 : 0.38);
    if (!on) this.release();
    return this;
  }
}
