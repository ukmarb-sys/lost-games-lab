import Phaser from 'phaser';
import { Button } from './Button';
import { COLORS, textStyle } from './theme';

export interface OverlayAction {
  label: string;
  primary?: boolean;
  onClick: () => void;
}

/** Modal result / message panel. Blocks input to everything beneath it. */
export class Overlay extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, title: string, body: string, actions: OverlayAction[]) {
    const { width: W, height: H } = scene.scale;
    super(scene, 0, 0);
    this.setDepth(1000);

    const shade = scene.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.62).setInteractive();
    const pw = W - 120;
    const bodyText = scene.add
      .text(W / 2, 0, body, textStyle(40, COLORS.parchment, { align: 'center', wordWrap: { width: pw - 100 }, lineSpacing: 10 }))
      .setOrigin(0.5, 0);
    const btnH = 120;
    const ph = 150 + bodyText.height + 60 + actions.length * (btnH + 24) + 40;
    const top = H / 2 - ph / 2;

    const panel = scene.add.graphics();
    panel.fillStyle(COLORS.panel, 0.98);
    panel.fillRoundedRect(60, top, pw, ph, 34);
    panel.lineStyle(4, COLORS.bronze, 1);
    panel.strokeRoundedRect(60, top, pw, ph, 34);
    panel.lineStyle(1.5, COLORS.bronzeDark, 1);
    panel.strokeRoundedRect(76, top + 16, pw - 32, ph - 32, 24);

    const titleText = scene.add
      .text(W / 2, top + 80, title, textStyle(64, COLORS.goldBright, { fontStyle: 'bold' }))
      .setOrigin(0.5);
    bodyText.setY(top + 150);

    this.add([shade, panel, titleText, bodyText]);
    let y = top + 150 + bodyText.height + 60 + btnH / 2;
    for (const a of actions) {
      const b = new Button(scene, W / 2, y, {
        width: pw - 160,
        height: btnH,
        label: a.label,
        primary: a.primary,
        onClick: () => {
          this.destroy();
          a.onClick();
        },
      });
      this.add(b);
      y += btnH + 24;
    }

    this.setAlpha(0);
    scene.add.existing(this);
    scene.tweens.add({ targets: this, alpha: 1, duration: 220, ease: 'Sine.easeOut' });
  }
}
