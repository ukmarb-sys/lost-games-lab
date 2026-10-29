/** Shared visual language: dark stone, bronze and gold, two glowing circuits. */
export const COLORS = {
  stone: 0x0f0d0b,
  stoneLight: 0x1c1915,
  panel: 0x16130f,
  panelEdge: 0x6e5532,
  bronze: 0xb08d57,
  bronzeDark: 0x5a4527,
  gold: 0xe6bd62,
  goldBright: 0xffe2a0,
  parchment: 0xe9dcc0,
  muted: 0x9c8f78,
  /** Inner circuit (small loops): warm amber. */
  inner: 0xe0a64a,
  /** Outer circuit (large loops): oxidised-bronze verdigris. */
  outer: 0x5fb8a6,
  capture: 0xff7a4d,
  step: 0xf2d79a,
  silver: 0xcfd8e2,
} as const;

export const css = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

export const FONT_SERIF = "Georgia, 'Palatino Linotype', 'Book Antiqua', 'Noto Serif', serif";

/** Logical game width. Height is chosen at boot to match the phone's aspect ratio. */
export const GAME_WIDTH = 1080;

export const textStyle = (
  size: number,
  color: number = COLORS.parchment,
  extra: Phaser.Types.GameObjects.Text.TextStyle = {},
): Phaser.Types.GameObjects.Text.TextStyle => ({
  fontFamily: FONT_SERIF,
  fontSize: `${size}px`,
  color: css(color),
  ...extra,
});
