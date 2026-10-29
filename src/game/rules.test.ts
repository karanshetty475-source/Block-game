import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BlockOrientation,
  type BlockState,
  type Direction,
  getNextState,
  getOccupiedTiles,
  checkMove,
  getThreeStepHints,
  LEVELS,
} from './rules';

test('Block movement transitions from UPRIGHT', () => {
  const start: BlockState = { x: 2, z: 2, orientation: BlockOrientation.UPRIGHT };

  const right = getNextState(start, 'RIGHT');
  assert.equal(right.orientation, BlockOrientation.HORIZONTAL_X);
  assert.deepEqual(getOccupiedTiles(right), [{ x: 3, z: 2 }, { x: 4, z: 2 }]);

  const left = getNextState(start, 'LEFT');
  assert.equal(left.orientation, BlockOrientation.HORIZONTAL_X);
  assert.deepEqual(getOccupiedTiles(left), [{ x: 0, z: 2 }, { x: 1, z: 2 }]);

  const down = getNextState(start, 'DOWN');
  assert.equal(down.orientation, BlockOrientation.HORIZONTAL_Z);
  assert.deepEqual(getOccupiedTiles(down), [{ x: 2, z: 3 }, { x: 2, z: 4 }]);

  const up = getNextState(start, 'UP');
  assert.equal(up.orientation, BlockOrientation.HORIZONTAL_Z);
  assert.deepEqual(getOccupiedTiles(up), [{ x: 2, z: 0 }, { x: 2, z: 1 }]);
});

test('Block movement reversibility', () => {
  const start: BlockState = { x: 3, z: 3, orientation: BlockOrientation.UPRIGHT };

  // Right then Left
  const toRight = getNextState(start, 'RIGHT');
  const backLeft = getNextState(toRight, 'LEFT');
  assert.deepEqual(backLeft, start);

  // Down then Up
  const toDown = getNextState(start, 'DOWN');
  const backUp = getNextState(toDown, 'UP');
  assert.deepEqual(backUp, start);
});

test('Horizontal rolling along axis vs perpendicular', () => {
  const hx: BlockState = { x: 2, z: 2, orientation: BlockOrientation.HORIZONTAL_X };

  // Rolling along length (Right) stands it upright
  const hxRight = getNextState(hx, 'RIGHT');
  assert.equal(hxRight.orientation, BlockOrientation.UPRIGHT);
  assert.equal(hxRight.x, 4);
  assert.equal(hxRight.z, 2);

  // Rolling along axis (Down) keeps it horizontal
  const hxDown = getNextState(hx, 'DOWN');
  assert.equal(hxDown.orientation, BlockOrientation.HORIZONTAL_X);
  assert.equal(hxDown.x, 2);
  assert.equal(hxDown.z, 3);
});

test('Check move detects off-grid fall', () => {
  const level1 = LEVELS[0];
  const result = checkMove(level1.start, 'UP', level1, new Set());
  assert.equal(result.isOffGrid, true);
  assert.equal(result.isWin, false);
});

function solveLevel(level: typeof LEVELS[0]): { solved: boolean; movesCount: number; path: string[] } {
  const startState = level.start;
  const queue: { state: BlockState; moves: number; path: string[] }[] = [{ state: startState, moves: 0, path: [] }];
  const visited = new Set<string>();

  const stateKey = (s: BlockState) => `${s.x},${s.z},${s.orientation}`;
  visited.add(stateKey(startState));

  const directions: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];

  while (queue.length > 0) {
    const { state, moves, path } = queue.shift()!;

    for (const dir of directions) {
      const res = checkMove(state, dir, level, new Set());
      if (res.isOffGrid || res.isFragileBreak) continue;

      if (res.isWin) {
        return { solved: true, movesCount: moves + 1, path: [...path, dir] };
      }

      const key = stateKey(res.nextState);
      if (!visited.has(key)) {
        visited.add(key);
        queue.push({ state: res.nextState, moves: moves + 1, path: [...path, dir] });
      }
    }
  }

  return { solved: false, movesCount: 0, path: [] };
}

test('All crafted levels are 100% solvable', () => {
  for (const level of LEVELS) {
    const solution = solveLevel(level);
    console.log(`[LEVEL ${level.id}] ${level.name} (${solution.movesCount} moves):`, solution.path.join(' -> '));
    assert.equal(
      solution.solved,
      true,
      `Level ${level.id} (${level.name}) should have a valid winning solution!`
    );
    assert.ok(
      solution.movesCount > 0,
      `Level ${level.id} requires moves to solve (${solution.movesCount} moves)`
    );
  }
});

test('getThreeStepHints returns 3 valid sequential moves for Level 1', () => {
  const level1 = LEVELS[0];
  const hints = getThreeStepHints(level1.start, level1);

  assert.equal(hints.isDeadEnd, false);
  assert.equal(hints.steps.length, 3);
  assert.equal(hints.steps[0].stepNumber, 1);
  assert.equal(hints.steps[1].stepNumber, 2);
  assert.equal(hints.steps[2].stepNumber, 3);

  // Check that the sequence of 3 moves is legal and stays on tiles
  let s = level1.start;
  for (const step of hints.steps) {
    const moveRes = checkMove(s, step.direction, level1, new Set());
    assert.equal(moveRes.isOffGrid, false, `Hint step ${step.stepNumber} (${step.direction}) must not fall off`);
    assert.equal(moveRes.isFragileBreak, false, `Hint step ${step.stepNumber} must not break fragile`);
    assert.deepEqual(step.resultingState, moveRes.nextState);
    s = moveRes.nextState;
  }
});
