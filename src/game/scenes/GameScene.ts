import Phaser from 'phaser';
import { LESSONS, lessonBoard } from '../../levels/tutorial';
import { PUZZLES, puzzleBoard } from '../../levels/puzzles';
import {
  cellAt,
  chooseAiMove,
  countPieces,
  createGame,
  legalMovesFrom,
  playMove,
  playSoloMove,
  samePos,
  solvePuzzle,
  type GameState,
  type Move,
  type Pos,
} from '../../rules';
import { Button } from '../../ui/Button';
import { Overlay } from '../../ui/Overlay';
import { addBackground, addHeader } from '../../ui/chrome';
import { COLORS, textStyle } from '../../ui/theme';
import { sound } from '../audio';
import { BoardView } from '../BoardView';
import { updateProgress } from '../storage';

export type GameMode = 'tutorial' | 'puzzle' | 'free';

export interface GameSceneData {
  mode: GameMode;
  /** Puzzle index (puzzle mode) or lesson index (tutorial). */
  level?: number;
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V'];
const AI_DELAY_MS = 520;

/** Human-readable square names: columns a–f left to right, rows 1–6 bottom to top. */
const squareName = (p: Pos): string => `${'abcdef'[p.x]}${6 - p.y}`;

export class GameScene extends Phaser.Scene {
  private mode: GameMode = 'free';
  private level = 0;
  private state!: GameState;
  private history: GameState[] = [];
  private selected: Pos | null = null;
  private busy = false;
  private overlayOpen = false;
  private view!: BoardView;

  private statusText!: Phaser.GameObjects.Text;
  private statusIcon!: Phaser.GameObjects.Image;
  private countsText!: Phaser.GameObjects.Text;
  private infoTitle!: Phaser.GameObjects.Text;
  private infoBody!: Phaser.GameObjects.Text;
  private undoBtn!: Button;
  private hintBtn!: Button;
  private restartBtn!: Button;

  constructor() {
    super('Game');
  }

  init(data: GameSceneData): void {
    this.mode = data.mode ?? 'free';
    this.level = data.level ?? 0;
    this.history = [];
    this.selected = null;
    this.busy = false;
    this.overlayOpen = false;
  }

  create(): void {
    const { width: W, height: H } = this.scale;
    addBackground(this);
    this.cameras.main.fadeIn(250, 0, 0, 0);
    addHeader(this, this.mode === 'tutorial' ? 'Tutorial' : this.mode === 'puzzle' ? 'Puzzle' : 'Free Play', () => this.scene.start('Menu'));

    // --- layout -----------------------------------------------------------
    const topReserve = 330;
    const bottomReserve = 560;
    const cell = Math.min(W / 9.8, (H - topReserve - bottomReserve) / 9.6);
    const boardCy = topReserve + (H - topReserve - bottomReserve) / 2;
    this.view = new BoardView(this, W / 2, boardCy, cell);

    // Turn / status line.
    this.statusIcon = this.add.image(0, 222, 'piece-gold').setScale(0.42);
    this.statusText = this.add.text(W / 2, 222, '', textStyle(48, COLORS.parchment, { fontStyle: 'bold' })).setOrigin(0.5);
    this.countsText = this.add.text(W / 2, 285, '', textStyle(32, COLORS.muted)).setOrigin(0.5);

    // Info panel.
    const infoTop = H - bottomReserve + 40;
    const panel = this.add.graphics();
    panel.fillStyle(COLORS.panel, 0.82);
    panel.fillRoundedRect(40, infoTop, W - 80, 330, 26);
    panel.lineStyle(2, COLORS.bronzeDark, 1);
    panel.strokeRoundedRect(40, infoTop, W - 80, 330, 26);
    this.infoTitle = this.add.text(80, infoTop + 26, '', textStyle(40, COLORS.goldBright, { fontStyle: 'bold' }));
    this.infoBody = this.add.text(80, infoTop + 84, '', textStyle(33, COLORS.parchment, { wordWrap: { width: W - 160 }, lineSpacing: 8 }));

    // Action buttons.
    const by = H - 95;
    const bw = (W - 80 - 40) / 3;
    this.undoBtn = new Button(this, 40 + bw / 2, by, { width: bw, height: 130, label: '↶ Undo', fontSize: 42, onClick: () => this.undo() });
    this.restartBtn = new Button(this, W / 2, by, { width: bw, height: 130, label: '⟲ Restart', fontSize: 42, onClick: () => this.restart() });
    this.hintBtn = new Button(this, W - 40 - bw / 2, by, { width: bw, height: 130, label: '✦ Hint', fontSize: 42, onClick: () => this.hint() });

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onTap(p.x, p.y));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.off('pointerdown'));

    this.startRound();
  }

  // ------------------------------------------------------------------ rounds

  private isSolo(): boolean {
    return this.mode !== 'free';
  }

  private moveBudget(): number {
    if (this.mode === 'puzzle') return PUZZLES[this.level].maxMoves;
    if (this.mode === 'tutorial') return LESSONS[this.level].maxMoves;
    return Infinity;
  }

  private startRound(): void {
    this.time.removeAllEvents();
    this.history = [];
    this.selected = null;
    this.busy = false;
    if (this.mode === 'puzzle') {
      this.state = createGame(puzzleBoard(PUZZLES[this.level]), 'gold');
    } else if (this.mode === 'tutorial') {
      this.state = createGame(lessonBoard(LESSONS[this.level]), 'gold');
    } else {
      this.state = createGame();
    }
    this.view.setBoard(this.state.board);
    this.view.clearHighlights();
    this.setDefaultInfo();
    this.refreshUi();
  }

  private restart(): void {
    if (this.busy) return;
    this.startRound();
  }

  private setDefaultInfo(): void {
    if (this.mode === 'tutorial') {
      const l = LESSONS[this.level];
      this.setInfo(l.title, l.text);
    } else if (this.mode === 'puzzle') {
      const p = PUZZLES[this.level];
      const n = p.maxMoves;
      this.setInfo(
        `${ROMAN[this.level]} · ${p.name}`,
        `Capture every silver stone in ${n} move${n > 1 ? 's' : ''}. Silver stones are dormant. Steps reposition; captures must ride a loop.`,
      );
    } else {
      this.setInfo(
        'Gold against the Oracle',
        'You play Gold and move first. Step one point in any direction, or capture by riding a track through at least one corner loop. Take every silver stone to win.',
      );
    }
  }

  private setInfo(title: string, body: string): void {
    this.infoTitle.setText(title);
    this.infoBody.setText(body);
  }

  private refreshUi(): void {
    const s = this.state;
    const W = this.scale.width;
    const gold = countPieces(s.board, 'gold');
    const silver = countPieces(s.board, 'silver');
    let status: string;
    let icon: 'gold' | 'silver' = s.turn;
    if (this.mode === 'free') {
      if (s.status.kind === 'won') status = s.status.winner === 'gold' ? 'You prevail' : 'The Oracle prevails';
      else if (s.status.kind === 'draw') status = 'The stars are still';
      else if (s.turn === 'gold') status = this.busy ? 'Your stone travels…' : 'Your move';
      else status = 'The Oracle ponders…';
      if (s.status.kind === 'won') icon = s.status.winner;
      this.countsText.setText(`Gold ${gold}   ·   Silver ${silver}   ·   Quiet moves ${s.quietPlies}`);
    } else {
      const budget = this.moveBudget();
      status = this.mode === 'tutorial' ? `Lesson ${this.level + 1} of ${LESSONS.length}` : `Move ${Math.min(s.ply + 1, budget)} of ${budget}`;
      if (s.status.kind === 'won') status = 'Solved';
      this.countsText.setText(`Silver stones left: ${silver}   ·   Moves used: ${s.ply}/${budget}`);
    }
    this.statusText.setText(status);
    this.statusIcon.setTexture(`piece-${icon}`);
    this.statusIcon.setX(W / 2 - this.statusText.width / 2 - 45);

    const canAct = !this.busy && !this.overlayOpen;
    this.undoBtn.setEnabled(canAct && this.history.length > 0);
    this.restartBtn.setEnabled(canAct && (this.history.length > 0 || this.state.ply > 0));
    this.hintBtn.setEnabled(canAct && s.status.kind === 'playing' && s.turn === 'gold');
  }

  // ------------------------------------------------------------------- input

  private onTap(x: number, y: number): void {
    if (this.busy || this.overlayOpen) return;
    if (this.state.status.kind !== 'playing' || this.state.turn !== 'gold') return;
    const p = this.view.pickPoint(x, y);
    if (!p) {
      if (this.selected) this.deselect();
      return;
    }
    const occupant = cellAt(this.state.board, p);
    if (this.selected) {
      if (samePos(this.selected, p)) {
        this.deselect();
        return;
      }
      const move = legalMovesFrom(this.state.board, this.selected).find((m) => samePos(m.to, p));
      if (move) {
        void this.commit(move);
        return;
      }
    }
    if (occupant === 'gold') this.select(p);
    else if (occupant === 'silver') {
      sound.play('invalid');
      this.view.nudge(p);
      if (this.selected) this.deselect();
    } else if (this.selected) this.deselect();
  }

  private select(p: Pos): void {
    const moves = legalMovesFrom(this.state.board, p);
    if (moves.length === 0) {
      sound.play('invalid');
      this.view.nudge(p);
      this.selected = null;
      this.view.clearHighlights();
      return;
    }
    this.selected = p;
    sound.play('select');
    this.view.showSelection(p, moves);
  }

  private deselect(): void {
    this.selected = null;
    this.view.clearHighlights();
    this.view.showLastMove(this.state.lastMove);
  }

  // ------------------------------------------------------------------- moves

  private async commit(move: Move): Promise<void> {
    this.busy = true;
    this.selected = null;
    this.view.clearHighlights();
    this.refreshUi();
    this.history.push(this.state);
    // Rules first: compute the next state (throws on anything illegal), then animate it.
    const next = this.isSolo() ? playSoloMove(this.state, move) : playMove(this.state, move);
    sound.play(move.kind === 'step' ? 'step' : 'whoosh');
    await this.view.animateMove(move);
    if (move.kind === 'capture') sound.play('capture');
    this.state = next;
    this.busy = false;
    if (!this.scene.isActive()) return;
    this.view.showLastMove(move);
    this.describeMove(move);
    this.afterMove(move);
  }

  private describeMove(move: Move): void {
    if (this.mode !== 'free') return;
    const who = move.player === 'gold' ? 'You' : 'The Oracle';
    if (move.kind === 'capture') {
      const circuit = move.circuit === 1 ? 'inner amber' : 'outer verdigris';
      this.setInfo(
        'Capture!',
        `${who} rode the ${circuit} circuit from ${squareName(move.from)} to ${squareName(move.to)} through ${move.loopsUsed} loop${move.loopsUsed > 1 ? 's' : ''}.`,
      );
    } else {
      this.setInfo('Gold against the Oracle', `${who} stepped ${squareName(move.from)} → ${squareName(move.to)}.`);
    }
  }

  private afterMove(move: Move): void {
    this.refreshUi();
    const s = this.state;
    if (this.mode === 'tutorial') {
      const lesson = LESSONS[this.level];
      const done = lesson.goal === 'step' ? move.kind === 'step' : s.status.kind === 'won';
      if (done) return this.lessonComplete();
      if (s.ply >= lesson.maxMoves) {
        sound.play('invalid');
        this.setInfo('Not quite', 'That move does not finish the lesson. The stones return — try again.');
        this.busy = true;
        this.time.delayedCall(1600, () => this.startRound());
        this.refreshUi();
      }
      return;
    }
    if (this.mode === 'puzzle') {
      if (s.status.kind === 'won') return this.puzzleSolved();
      if (s.ply >= this.moveBudget()) this.puzzleFailed();
      return;
    }
    // free play
    if (s.status.kind !== 'playing') return this.freeGameOver();
    if (s.turn === 'silver') this.aiTurn();
    else this.view.pulseSide(s.board, 'gold');
  }

  private aiTurn(): void {
    this.busy = true;
    this.refreshUi();
    this.time.delayedCall(AI_DELAY_MS, () => {
      const move = chooseAiMove(this.state);
      if (!move) {
        this.busy = false;
        this.refreshUi();
        return;
      }
      void this.commit(move);
    });
  }

  private undo(): void {
    if (this.busy || this.history.length === 0) return;
    let prev = this.history.pop()!;
    // In free play, rewind to the last position where it was the player's turn.
    while (this.mode === 'free' && prev.turn !== 'gold' && this.history.length > 0) prev = this.history.pop()!;
    this.state = prev;
    this.selected = null;
    this.view.setBoard(prev.board);
    this.view.clearHighlights();
    this.view.showLastMove(prev.lastMove);
    this.setDefaultInfo();
    this.refreshUi();
  }

  private hint(): void {
    if (this.busy || this.state.status.kind !== 'playing') return;
    let move: Move | null = null;
    if (this.mode === 'free') {
      move = chooseAiMove(this.state);
      if (move) this.setInfo('The stars suggest…', `Consider ${squareName(move.from)} → ${squareName(move.to)}.`);
    } else if (this.mode === 'tutorial' && LESSONS[this.level].goal === 'step') {
      const from = this.state.board.findIndex((c) => c === 'gold');
      move = legalMovesFrom(this.state.board, { x: from % 6, y: Math.floor(from / 6) })[0] ?? null;
    } else {
      const remaining = this.moveBudget() - this.state.ply;
      const res = solvePuzzle(this.state.board, 'gold', remaining);
      if (res && res.moves.length > 0) {
        move = res.moves[0];
        if (this.mode === 'puzzle') this.setInfo('A whisper from the stars', PUZZLES[this.level].hint);
      } else {
        sound.play('invalid');
        this.setInfo('The path is lost', 'No solution remains from this position. Undo a move or restart.');
        return;
      }
    }
    if (!move) return;
    sound.play('select');
    this.selected = move.from;
    this.view.showHint(move);
  }

  // ---------------------------------------------------------------- endings

  private showOverlay(title: string, body: string, actions: { label: string; primary?: boolean; onClick: () => void }[]): void {
    this.overlayOpen = true;
    this.refreshUi();
    new Overlay(
      this,
      title,
      body,
      actions.map((a) => ({
        ...a,
        onClick: () => {
          this.overlayOpen = false;
          a.onClick();
          if (this.scene.isActive()) this.refreshUi();
        },
      })),
    );
  }

  private lessonComplete(): void {
    sound.play('win');
    const lesson = LESSONS[this.level];
    const last = this.level === LESSONS.length - 1;
    if (last) updateProgress((p) => (p.tutorialDone = true));
    this.time.delayedCall(450, () =>
      this.showOverlay(
        last ? 'Tutorial complete' : 'Well done',
        lesson.success,
        last
          ? [
              { label: 'Begin the Puzzles', primary: true, onClick: () => this.scene.start('LevelSelect') },
              { label: 'Free Play', onClick: () => this.scene.start('Game', { mode: 'free' }) },
              { label: 'Menu', onClick: () => this.scene.start('Menu') },
            ]
          : [
              { label: 'Next lesson ›', primary: true, onClick: () => this.scene.restart({ mode: 'tutorial', level: this.level + 1 }) },
              { label: 'Repeat lesson', onClick: () => this.startRound() },
            ],
      ),
    );
  }

  private puzzleSolved(): void {
    sound.play('win');
    const p = PUZZLES[this.level];
    updateProgress((pr) => {
      if (!pr.solved.includes(p.id)) pr.solved.push(p.id);
    });
    const hasNext = this.level < PUZZLES.length - 1;
    this.time.delayedCall(450, () =>
      this.showOverlay(
        'Solved',
        hasNext
          ? `“${p.name}” — every silver stone taken in ${this.state.ply} move${this.state.ply > 1 ? 's' : ''}.`
          : `“${p.name}” — you have walked every forgotten path. Try your skill against the Oracle in Free Play.`,
        [
          ...(hasNext ? [{ label: 'Next puzzle ›', primary: true, onClick: () => this.scene.restart({ mode: 'puzzle', level: this.level + 1 }) }] : []),
          ...(!hasNext ? [{ label: 'Free Play', primary: true, onClick: () => this.scene.start('Game', { mode: 'free' }) }] : []),
          { label: 'Puzzle list', onClick: () => this.scene.start('LevelSelect') },
          { label: 'Replay', onClick: () => this.startRound() },
        ],
      ),
    );
  }

  private puzzleFailed(): void {
    sound.play('lose');
    this.time.delayedCall(350, () =>
      this.showOverlay('The path closes', `All ${this.moveBudget()} moves are spent and silver stones remain.`, [
        { label: 'Undo last move', primary: true, onClick: () => this.undo() },
        { label: 'Restart puzzle', onClick: () => this.startRound() },
      ]),
    );
  }

  private freeGameOver(): void {
    const s = this.state.status;
    let title = 'Drawn';
    let body = 'Forty moves each without a capture — the stars fall still. A draw.';
    if (s.kind === 'won') {
      const youWon = s.winner === 'gold';
      title = youWon ? 'Victory' : 'Defeat';
      if (youWon) updateProgress((p) => (p.freePlayWins += 1));
      body =
        s.reason === 'captured-all'
          ? youWon
            ? 'Every silver stone has fallen from the sky.'
            : 'The Oracle has taken all of your gold stones.'
          : youWon
            ? 'The Oracle has no legal move left.'
            : 'You have no legal move left.';
      sound.play(youWon ? 'win' : 'lose');
    }
    this.time.delayedCall(500, () =>
      this.showOverlay(title, body, [
        { label: 'Play again', primary: true, onClick: () => this.startRound() },
        ...(this.history.length > 0 ? [{ label: 'Undo last move', onClick: () => this.undo() }] : []),
        { label: 'Menu', onClick: () => this.scene.start('Menu') },
      ]),
    );
  }
}
