import Phaser from 'phaser';
import { PUZZLES } from '../../levels/puzzles';
import { addBackground, addHeader } from '../../ui/chrome';
import { COLORS, textStyle } from '../../ui/theme';
import { sound } from '../audio';
import { loadProgress } from '../storage';

/** Puzzle list. A level unlocks once the previous one is solved. */
export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super('LevelSelect');
  }

  create(): void {
    const { width: W, height: H } = this.scale;
    addBackground(this);
    this.cameras.main.fadeIn(250, 0, 0, 0);
    addHeader(this, 'Puzzles', () => this.scene.start('Menu'));

    const progress = loadProgress();
    this.add
      .text(W / 2, 250, 'Capture every silver stone within the move limit.\nSilver stones lie dormant — they never move.', textStyle(34, COLORS.muted, { align: 'center', lineSpacing: 8 }))
      .setOrigin(0.5);

    const cardH = Math.min(230, (H - 420) / PUZZLES.length - 24);
    let y = 360 + cardH / 2;
    PUZZLES.forEach((level, i) => {
      const solved = progress.solved.includes(level.id);
      const unlocked = i === 0 || progress.solved.includes(PUZZLES[i - 1].id);
      this.card(W / 2, y, W - 140, cardH, i, level.name, level.maxMoves, solved, unlocked);
      y += cardH + 24;
    });
  }

  private card(x: number, y: number, w: number, h: number, i: number, name: string, moves: number, solved: boolean, unlocked: boolean): void {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    const draw = (down: boolean) => {
      g.clear();
      g.fillStyle(down ? COLORS.stoneLight : COLORS.panel, unlocked ? 0.95 : 0.6);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, 28);
      g.lineStyle(3, solved ? COLORS.gold : unlocked ? COLORS.bronze : COLORS.bronzeDark, 1);
      g.strokeRoundedRect(-w / 2, -h / 2, w, h, 28);
    };
    draw(false);
    const numeral = ['I', 'II', 'III', 'IV', 'V'][i] ?? String(i + 1);
    const medal = this.add.graphics();
    medal.lineStyle(4, unlocked ? COLORS.gold : COLORS.bronzeDark, 1);
    medal.strokeCircle(-w / 2 + 95, 0, 56);
    const num = this.add.text(-w / 2 + 95, 0, numeral, textStyle(46, unlocked ? COLORS.goldBright : COLORS.muted, { fontStyle: 'bold' })).setOrigin(0.5);
    const title = this.add.text(-w / 2 + 185, -26, name, textStyle(46, unlocked ? COLORS.parchment : COLORS.muted, { fontStyle: 'bold' })).setOrigin(0, 0.5);
    const sub = this.add
      .text(-w / 2 + 185, 34, unlocked ? `${moves} move${moves > 1 ? 's' : ''}` : 'Sealed — solve the previous puzzle', textStyle(32, COLORS.muted))
      .setOrigin(0, 0.5);
    const badge = this.add
      .text(w / 2 - 50, 0, solved ? '✦' : unlocked ? '›' : '', textStyle(64, solved ? COLORS.gold : COLORS.bronze))
      .setOrigin(1, 0.5);
    c.add([g, medal, num, title, sub, badge]);
    c.setSize(w, h);
    if (!unlocked) return;
    c.setInteractive({ useHandCursor: true });
    let pressed = false;
    c.on('pointerdown', () => {
      pressed = true;
      draw(true);
    });
    c.on('pointerout', () => {
      pressed = false;
      draw(false);
    });
    c.on('pointerup', () => {
      if (!pressed) return;
      sound.play('click');
      this.scene.start('Game', { mode: 'puzzle', level: i });
    });
  }
}
