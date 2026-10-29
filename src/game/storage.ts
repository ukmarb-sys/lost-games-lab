/**
 * Local persistence (progress + preferences) in localStorage. Every access is
 * guarded: private browsing or blocked storage just means nothing is remembered.
 */
const PROGRESS_KEY = 'orbit.progress.v1';
const SOUND_KEY = 'orbit.sound.v1';

export interface Progress {
  /** Ids of solved puzzle levels. */
  solved: string[];
  tutorialDone: boolean;
  freePlayWins: number;
}

const DEFAULT_PROGRESS: Progress = { solved: [], tutorialDone: false, freePlayWins: 0 };

const read = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const write = (key: string, value: string): void => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable — ignore */
  }
};

export const loadProgress = (): Progress => {
  const raw = read(PROGRESS_KEY);
  if (!raw) return { ...DEFAULT_PROGRESS, solved: [] };
  try {
    const p = JSON.parse(raw) as Partial<Progress>;
    return {
      solved: Array.isArray(p.solved) ? p.solved.filter((s) => typeof s === 'string') : [],
      tutorialDone: p.tutorialDone === true,
      freePlayWins: typeof p.freePlayWins === 'number' ? p.freePlayWins : 0,
    };
  } catch {
    return { ...DEFAULT_PROGRESS, solved: [] };
  }
};

export const saveProgress = (p: Progress): void => write(PROGRESS_KEY, JSON.stringify(p));

export const updateProgress = (fn: (p: Progress) => void): Progress => {
  const p = loadProgress();
  fn(p);
  saveProgress(p);
  return p;
};

export const loadSoundEnabled = (): boolean => read(SOUND_KEY) !== 'off';
export const saveSoundEnabled = (on: boolean): void => write(SOUND_KEY, on ? 'on' : 'off');
