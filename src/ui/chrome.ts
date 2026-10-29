import Phaser from 'phaser';
import { sound } from '../game/audio';
import { Button } from './Button';
import { COLORS, textStyle } from './theme';

/** Stone background shared by every scene. */
export const addBackground = (scene: Phaser.Scene): void => {
  scene.add.image(0, 0, 'bg').setOrigin(0).setDepth(-10);
};

export const soundLabel = (): string => (sound.enabled ? '♪ On' : '♪ Off');

/** Sound toggle button (top-right). */
export const addSoundToggle = (scene: Phaser.Scene, x: number, y: number): Button => {
  const btn: Button = new Button(scene, x, y, {
    width: 200,
    height: 110,
    label: soundLabel(),
    fontSize: 40,
    onClick: () => {
      sound.toggle();
      btn.setLabel(soundLabel());
    },
  });
  return btn;
};

/** Standard header: back button, centred title, sound toggle. */
export const addHeader = (scene: Phaser.Scene, title: string, onBack: () => void): void => {
  const { width: W } = scene.scale;
  new Button(scene, 125, 95, { width: 200, height: 110, label: '‹ Menu', fontSize: 40, onClick: onBack });
  scene.add.text(W / 2, 95, title, textStyle(50, COLORS.goldBright, { fontStyle: 'bold' })).setOrigin(0.5);
  addSoundToggle(scene, W - 125, 95);
};

/** Unlock Web Audio on the first touch anywhere. */
export const unlockAudioOnFirstTouch = (scene: Phaser.Scene): void => {
  scene.input.once('pointerdown', () => sound.unlock());
};
