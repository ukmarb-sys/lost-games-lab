import Phaser from 'phaser';
import { PUZZLES } from '../../levels/puzzles';
import { Button } from '../../ui/Button';
import { addBackground, addSoundToggle, unlockAudioOnFirstTouch } from '../../ui/chrome';
import { COLORS, textStyle } from '../../ui/theme';
import { loadProgress } from '../storage';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    const { width: W, height: H } = this.scale;
    addBackground(this);
    unlockAudioOnFirstTouch(this);
    this.cameras.main.fadeIn(350, 0, 0, 0);

    const progress = loadProgress();
    const emblemY = H * 0.2;
    this.drawEmblem(W / 2, emblemY);

    this.add
      .text(W / 2, H * 0.355, 'ORBIT', textStyle(170, COLORS.goldBright, { fontStyle: 'bold' }))
      .setOrigin(0.5)
      .setLetterSpacing(24);
    this.add.text(W / 2, H * 0.43, 'Forgotten Paths', textStyle(58, COLORS.parchment, { fontStyle: 'italic' })).setOrigin(0.5);
    this.add
      .text(W / 2, H * 0.475, 'LOST GAMES LAB  ·  ARTIFACT  I', textStyle(30, COLORS.muted))
      .setOrigin(0.5)
      .setLetterSpacing(6);

    const bw = W - 260;
    const bh = 140;
    let y = H * 0.56;
    const gap = bh + 34;
    new Button(this, W / 2, y, {
      width: bw,
      height: bh,
      label: progress.tutorialDone ? 'Tutorial' : 'Learn the Paths',
      primary: !progress.tutorialDone,
      fontSize: 50,
      onClick: () => this.go('Game', { mode: 'tutorial' }),
    });
    y += gap;
    new Button(this, W / 2, y, {
      width: bw,
      height: bh,
      label: `Puzzles  ${progress.solved.filter((id) => PUZZLES.some((p) => p.id === id)).length}/${PUZZLES.length}`,
      primary: progress.tutorialDone && progress.solved.length < PUZZLES.length,
      fontSize: 50,
      onClick: () => this.go('LevelSelect'),
    });
    y += gap;
    new Button(this, W / 2, y, {
      width: bw,
      height: bh,
      label: 'Free Play vs Oracle',
      fontSize: 50,
      onClick: () => this.go('Game', { mode: 'free' }),
    });

    addSoundToggle(this, W / 2, y + gap);

    this.add
      .text(W / 2, H - 70, 'Inspired by Surakarta, a traditional Javanese game', textStyle(28, COLORS.muted, { fontStyle: 'italic' }))
      .setOrigin(0.5);
  }

  private go(scene: string, data?: object): void {
    this.cameras.main.fadeOut(220, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(scene, data));
  }

  /** Animated astrolabe: two tracks with stones in orbit. */
  private drawEmblem(x: number, y: number): void {
    const g = this.add.graphics();
    g.lineStyle(10, COLORS.outer, 0.12);
    g.strokeCircle(x, y, 150);
    g.lineStyle(3, COLORS.outer, 0.85);
    g.strokeCircle(x, y, 150);
    g.lineStyle(10, COLORS.inner, 0.12);
    g.strokeCircle(x, y, 95);
    g.lineStyle(3, COLORS.inner, 0.9);
    g.strokeCircle(x, y, 95);
    g.lineStyle(2, COLORS.bronze, 0.5);
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      g.lineBetween(x + Math.cos(a) * 160, y + Math.sin(a) * 160, x + Math.cos(a) * (i % 6 === 0 ? 185 : 170), y + Math.sin(a) * (i % 6 === 0 ? 185 : 170));
    }
    g.fillStyle(COLORS.bronze, 1);
    g.fillCircle(x, y, 12);

    const gold = this.add.image(x, y, 'piece-gold').setScale(0.5);
    const silver = this.add.image(x, y, 'piece-silver').setScale(0.42);
    const state = { a: 0 };
    this.tweens.add({
      targets: state,
      a: Math.PI * 2,
      duration: 9000,
      repeat: -1,
      onUpdate: () => {
        gold.setPosition(x + Math.cos(state.a) * 150, y + Math.sin(state.a) * 150);
        silver.setPosition(x + Math.cos(-state.a * 1.5 + 2) * 95, y + Math.sin(-state.a * 1.5 + 2) * 95);
      },
    });
  }
}
