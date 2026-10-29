import { boardFromDiagram, type Board } from '../rules';

/**
 * Guided tutorial. Silver stones are dormant here too. Each lesson finishes when
 * its goal is met; running out of moves without meeting it resets the lesson.
 */
export interface Lesson {
  readonly title: string;
  readonly text: string;
  readonly success: string;
  /** 'step' = make any ordinary move; 'captureAll' = take every silver stone. */
  readonly goal: 'step' | 'captureAll';
  readonly maxMoves: number;
  readonly diagram: readonly string[];
}

export const LESSONS: readonly Lesson[] = [
  {
    title: 'I · The Step',
    text: 'Tap your gold stone, then tap a glowing point. A stone steps one point in any direction — diagonals too — onto an empty point.',
    success: 'Good. Stepping never captures; it only repositions.',
    goal: 'step',
    maxMoves: 1,
    diagram: [
      '.....S',
      '......',
      '......',
      '..G...',
      '......',
      '......',
    ],
  },
  {
    title: 'II · Ride the Loop',
    text: 'Captures travel along the glowing tracks. Follow a line, swing around a corner loop, and land on an enemy stone. Selected captures show a red ring and their route.',
    success: 'The stone rode the great verdigris loop. Every capture must pass through at least one loop.',
    goal: 'captureAll',
    maxMoves: 1,
    diagram: [
      '......',
      '......',
      'G.....',
      '..S...',
      '......',
      '......',
    ],
  },
  {
    title: 'III · Blocked Paths',
    text: 'The silver stone is beside you, but there is no loop between you — no capture. The other way round, your own stone blocks the loop. Step it aside, then strike.',
    success: 'A track must be clear all the way. Any stone in the way ends the journey.',
    goal: 'captureAll',
    maxMoves: 2,
    diagram: [
      '.G....',
      'GS....',
      '......',
      '......',
      '......',
      '......',
    ],
  },
  {
    title: 'IV · The Long Way Round',
    text: 'Amber tracks form the inner circuit (small loops); verdigris tracks form the outer circuit (large loops). The silver stone sits straight ahead, yet only a journey through three loops reaches it.',
    success: 'Journeys may pass any number of loops — and even cross their own starting point.',
    goal: 'captureAll',
    maxMoves: 1,
    diagram: [
      '......',
      'G...S.',
      '......',
      '......',
      '......',
      '......',
    ],
  },
  {
    title: 'V · The Hunt',
    text: 'Put it together: capture both silver stones in 3 moves. Use a step to line up a new orbit after your first capture.',
    success: 'You have learned the forgotten paths. The puzzles await.',
    goal: 'captureAll',
    maxMoves: 3,
    diagram: [
      '......',
      '.S....',
      '......',
      '......',
      '....G.',
      '...S..',
    ],
  },
];

export const lessonBoard = (lesson: Lesson): Board => boardFromDiagram(lesson.diagram);
