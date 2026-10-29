import Phaser from 'phaser';
import { BootScene } from './game/scenes/BootScene';
import { GameScene } from './game/scenes/GameScene';
import { LevelSelectScene } from './game/scenes/LevelSelectScene';
import { MenuScene } from './game/scenes/MenuScene';
import { COLORS, GAME_WIDTH } from './ui/theme';

/**
 * Portrait-first canvas. The logical width is fixed (1080) and the logical
 * height follows the device's aspect ratio (clamped), so layouts fill tall
 * Android screens without letterboxing while staying crisp on high-DPI displays.
 */
const aspect = window.innerHeight / Math.max(1, window.innerWidth);
const height = Math.round(GAME_WIDTH * Phaser.Math.Clamp(aspect, 1.62, 2.2));

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: COLORS.stone,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height,
  },
  input: { activePointers: 2 },
  render: { antialias: true, roundPixels: false },
  scene: [BootScene, MenuScene, LevelSelectScene, GameScene],
});

// Exposed for automated browser smoke tests and debugging from the console.
(window as unknown as { __orbit?: Phaser.Game }).__orbit = game;
