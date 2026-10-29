import {
  BlockOrientation,
  type BlockState,
  type Direction,
  type GridCoord,
  type LevelData,
  type MoveResult,
  type TileDef,
  type CoinDef,
  type HintStep,
  type HintResult,
} from './types';

export {
  BlockOrientation,
  type BlockState,
  type Direction,
  type GridCoord,
  type LevelData,
  type MoveResult,
  type TileDef,
  type CoinDef,
  type HintStep,
  type HintResult,
};

export function getCoordKey(x: number, z: number): string {
  return `${x},${z}`;
}

export function getOccupiedTiles(state: BlockState): GridCoord[] {
  const { x, z, orientation } = state;
  switch (orientation) {
    case BlockOrientation.UPRIGHT:
      return [{ x, z }];
    case BlockOrientation.HORIZONTAL_X:
      return [
        { x, z },
        { x: x + 1, z },
      ];
    case BlockOrientation.HORIZONTAL_Z:
      return [
        { x, z },
        { x, z: z + 1 },
      ];
  }
}

export function getNextState(state: BlockState, dir: Direction): BlockState {
  const { x, z, orientation } = state;

  switch (orientation) {
    case BlockOrientation.UPRIGHT:
      switch (dir) {
        case 'RIGHT':
          return { x: x + 1, z, orientation: BlockOrientation.HORIZONTAL_X };
        case 'LEFT':
          return { x: x - 2, z, orientation: BlockOrientation.HORIZONTAL_X };
        case 'DOWN':
          return { x, z: z + 1, orientation: BlockOrientation.HORIZONTAL_Z };
        case 'UP':
          return { x, z: z - 2, orientation: BlockOrientation.HORIZONTAL_Z };
      }
      break;

    case BlockOrientation.HORIZONTAL_X:
      switch (dir) {
        case 'RIGHT':
          return { x: x + 2, z, orientation: BlockOrientation.UPRIGHT };
        case 'LEFT':
          return { x: x - 1, z, orientation: BlockOrientation.UPRIGHT };
        case 'DOWN':
          return { x, z: z + 1, orientation: BlockOrientation.HORIZONTAL_X };
        case 'UP':
          return { x, z: z - 1, orientation: BlockOrientation.HORIZONTAL_X };
      }
      break;

    case BlockOrientation.HORIZONTAL_Z:
      switch (dir) {
        case 'RIGHT':
          return { x: x + 1, z, orientation: BlockOrientation.HORIZONTAL_Z };
        case 'LEFT':
          return { x: x - 1, z, orientation: BlockOrientation.HORIZONTAL_Z };
        case 'DOWN':
          return { x, z: z + 2, orientation: BlockOrientation.UPRIGHT };
        case 'UP':
          return { x, z: z - 1, orientation: BlockOrientation.UPRIGHT };
      }
      break;
  }
}

export function getPivotAndAxis(
  state: BlockState,
  dir: Direction
): { pivot: [number, number, number]; axis: [number, number, number]; angle: number } {
  // Coordinates are in grid space where tile center is at (x, 0, z)
  // Tile dimensions: 1 x 0.2 x 1, with top surface at y = 0
  // When UPRIGHT, block size is (1, 2, 1), bottom at y = 0, center at (x, 1, z)
  // When HORIZONTAL_X, block size is (2, 1, 1), bottom at y = 0, center at (x + 0.5, 0.5, z)
  // When HORIZONTAL_Z, block size is (1, 1, 2), bottom at y = 0, center at (x, 0.5, z + 0.5)

  const { x, z, orientation } = state;

  switch (orientation) {
    case BlockOrientation.UPRIGHT:
      switch (dir) {
        case 'RIGHT':
          // Rolls around edge at x + 0.5, y = 0
          return { pivot: [x + 0.5, 0, z], axis: [0, 0, -1], angle: Math.PI / 2 };
        case 'LEFT':
          return { pivot: [x - 0.5, 0, z], axis: [0, 0, 1], angle: Math.PI / 2 };
        case 'DOWN':
          return { pivot: [x, 0, z + 0.5], axis: [1, 0, 0], angle: Math.PI / 2 };
        case 'UP':
          return { pivot: [x, 0, z - 0.5], axis: [-1, 0, 0], angle: Math.PI / 2 };
      }
      break;

    case BlockOrientation.HORIZONTAL_X:
      switch (dir) {
        case 'RIGHT':
          return { pivot: [x + 1.5, 0, z], axis: [0, 0, -1], angle: Math.PI / 2 };
        case 'LEFT':
          return { pivot: [x - 0.5, 0, z], axis: [0, 0, 1], angle: Math.PI / 2 };
        case 'DOWN':
          return { pivot: [x + 0.5, 0, z + 0.5], axis: [1, 0, 0], angle: Math.PI / 2 };
        case 'UP':
          return { pivot: [x + 0.5, 0, z - 0.5], axis: [-1, 0, 0], angle: Math.PI / 2 };
      }
      break;

    case BlockOrientation.HORIZONTAL_Z:
      switch (dir) {
        case 'RIGHT':
          return { pivot: [x + 0.5, 0, z + 0.5], axis: [0, 0, -1], angle: Math.PI / 2 };
        case 'LEFT':
          return { pivot: [x - 0.5, 0, z + 0.5], axis: [0, 0, 1], angle: Math.PI / 2 };
        case 'DOWN':
          return { pivot: [x, 0, z + 1.5], axis: [1, 0, 0], angle: Math.PI / 2 };
        case 'UP':
          return { pivot: [x, 0, z - 0.5], axis: [-1, 0, 0], angle: Math.PI / 2 };
      }
      break;
  }
}

export function checkMove(
  currentState: BlockState,
  dir: Direction,
  level: LevelData,
  alreadyCollectedCoins: Set<string>
): MoveResult {
  const nextState = getNextState(currentState, dir);
  const occupied = getOccupiedTiles(nextState);

  const tileMap = new Map<string, TileDef>();
  for (const t of level.tiles) {
    tileMap.set(getCoordKey(t.x, t.z), t);
  }

  // Check if any occupied cell is missing from tile map
  let isOffGrid = false;
  let isFragileBreak = false;

  for (const coord of occupied) {
    const key = getCoordKey(coord.x, coord.z);
    const tile = tileMap.get(key);
    if (!tile) {
      isOffGrid = true;
      break;
    }
    // Fragile tile break: if block stands UPRIGHT on a fragile tile
    if (tile.type === 'FRAGILE' && nextState.orientation === BlockOrientation.UPRIGHT) {
      isFragileBreak = true;
    }
  }

  // Check win condition: standing upright on the target tile
  const isWin =
    !isOffGrid &&
    !isFragileBreak &&
    nextState.orientation === BlockOrientation.UPRIGHT &&
    nextState.x === level.target.x &&
    nextState.z === level.target.z;

  // Check coins collected on newly occupied tiles
  const newlyCollected: string[] = [];
  if (!isOffGrid && !isFragileBreak && level.coins) {
    for (const coin of level.coins) {
      if (!alreadyCollectedCoins.has(coin.id)) {
        const hitsCoin = occupied.some((c) => c.x === coin.x && c.z === coin.z);
        if (hitsCoin) {
          newlyCollected.push(coin.id);
        }
      }
    }
  }

  return {
    nextState,
    isOffGrid,
    isFragileBreak,
    isWin,
    collectedCoinIds: newlyCollected,
    occupied,
  };
}

export function findOptimalPath(fromState: BlockState, level: LevelData): Direction[] | null {
  const queue: { state: BlockState; path: Direction[] }[] = [{ state: fromState, path: [] }];
  const visited = new Set<string>();

  const stateKey = (s: BlockState) => `${s.x},${s.z},${s.orientation}`;
  visited.add(stateKey(fromState));

  const directions: Direction[] = ['UP', 'RIGHT', 'DOWN', 'LEFT'];

  while (queue.length > 0) {
    const { state, path } = queue.shift()!;

    for (const dir of directions) {
      const res = checkMove(state, dir, level, new Set());
      if (res.isOffGrid || res.isFragileBreak) continue;

      if (res.isWin) {
        return [...path, dir];
      }

      const key = stateKey(res.nextState);
      if (!visited.has(key)) {
        visited.add(key);
        queue.push({ state: res.nextState, path: [...path, dir] });
      }
    }
  }

  return null;
}

export function getThreeStepHints(currentState: BlockState, level: LevelData): HintResult {
  // First, check if reachable from current position
  let path = findOptimalPath(currentState, level);
  let isDeadEnd = false;
  let startForHints = currentState;

  if (!path || path.length === 0) {
    // Current position cannot reach target - fallback to path from level.start
    isDeadEnd = true;
    path = findOptimalPath(level.start, level) || [];
    startForHints = level.start;
  }

  const nextThreeDirs = path.slice(0, 3);
  const steps: HintStep[] = [];
  let simulatedState = startForHints;

  const dirLabels: Record<Direction, { label: string; arrow: string }> = {
    UP: { label: 'UP ↗', arrow: '↗' },
    LEFT: { label: 'LEFT ↖', arrow: '↖' },
    DOWN: { label: 'DOWN ↙', arrow: '↙' },
    RIGHT: { label: 'RIGHT ↘', arrow: '↘' },
  };

  for (let i = 0; i < nextThreeDirs.length; i++) {
    const dir = nextThreeDirs[i];
    simulatedState = getNextState(simulatedState, dir);
    steps.push({
      stepNumber: i + 1,
      direction: dir,
      label: dirLabels[dir].label,
      arrow: dirLabels[dir].arrow,
      resultingState: simulatedState,
    });
  }

  return { isDeadEnd, steps };
}

// Helper to construct grid rows easily (1 character = 1 grid tile, space = empty)
export function createTilesFromAscii(
  mapRows: string[],
  originX = 0,
  originZ = 0
): { tiles: TileDef[]; start?: BlockState; target?: GridCoord; coins: { id: string; x: number; z: number }[] } {
  const tiles: TileDef[] = [];
  let start: BlockState | undefined;
  let target: GridCoord | undefined;
  const coins: { id: string; x: number; z: number }[] = [];
  let coinIdx = 1;

  for (let r = 0; r < mapRows.length; r++) {
    const row = mapRows[r];
    for (let c = 0; c < row.length; c++) {
      const char = row[c];
      const gx = originX + c;
      const gz = originZ + r;

      if (char === ' ') continue;

      if (char === 'S') {
        tiles.push({ x: gx, z: gz, type: 'START' });
        start = { x: gx, z: gz, orientation: BlockOrientation.UPRIGHT };
      } else if (char === 'T') {
        tiles.push({ x: gx, z: gz, type: 'TARGET' });
        target = { x: gx, z: gz };
      } else if (char === 'X' || char === '.') {
        tiles.push({ x: gx, z: gz, type: 'NORMAL' });
      } else if (char === 'C') {
        tiles.push({ x: gx, z: gz, type: 'NORMAL' });
        coins.push({ id: `c-${gx}-${gz}-${coinIdx++}`, x: gx, z: gz });
      } else if (char === 'F') {
        tiles.push({ x: gx, z: gz, type: 'FRAGILE' });
      }
    }
  }

  return { tiles, start, target, coins };
}

// 7 handcrafted, progressively challenging levels verified by solver
export const LEVELS: LevelData[] = [
  // Level 1: Gentle Introduction - Straight & Turn
  (() => {
    const layout = [
      'SXX',
      'XXX',
      'XXT',
    ];
    const { tiles, start, target, coins } = createTilesFromAscii(layout, 0, 0);
    coins.push({ id: 'c-1-1', x: 2, z: 0 });
    return {
      id: 1,
      name: 'First Steps',
      description: 'Roll the yellow block onto the dark target tile.',
      parMoves: 8,
      start: start || { x: 0, z: 0, orientation: BlockOrientation.UPRIGHT },
      target: target || { x: 2, z: 2 },
      tiles,
      coins,
    };
  })(),

  // Level 2: The Winding Path
  (() => {
    const layout = [
      'SXXX',
      'XXXX',
      '  XXX',
      '  XXX',
      '    T',
    ];
    const { tiles, start, target, coins } = createTilesFromAscii(layout, 0, 0);
    coins.push({ id: 'c-2-1', x: 3, z: 0 });
    coins.push({ id: 'c-2-2', x: 4, z: 3 });
    return {
      id: 2,
      name: 'Winding Path',
      description: 'Navigate the turns and collect the shiny gold coins.',
      parMoves: 8,
      start: start || { x: 0, z: 0, orientation: BlockOrientation.UPRIGHT },
      target: target || { x: 4, z: 4 },
      tiles,
      coins,
    };
  })(),

  // Level 3: Precision Roll (requires orientation shift)
  (() => {
    const layout = [
      'SXX  ',
      'XXXX ',
      ' XXXX',
      '  XXX',
      '   XT',
    ];
    const { tiles, start, target, coins } = createTilesFromAscii(layout, 0, 0);
    coins.push({ id: 'c-3-1', x: 3, z: 1 });
    coins.push({ id: 'c-3-2', x: 4, z: 3 });
    return {
      id: 3,
      name: 'Precision Roll',
      description: 'Calculate your orientation so the block lands upright on the target.',
      parMoves: 8,
      start: start || { x: 0, z: 0, orientation: BlockOrientation.UPRIGHT },
      target: target || { x: 4, z: 4 },
      tiles,
      coins,
    };
  })(),

  // Level 4: The Narrow Bridge & Island
  (() => {
    const layout = [
      'SXX   ',
      'XXX   ',
      ' XX   ',
      ' XXXX ',
      '   XXX',
      '   XXT',
    ];
    const { tiles, start, target, coins } = createTilesFromAscii(layout, 0, 0);
    coins.push({ id: 'c-4-1', x: 4, z: 3 });
    coins.push({ id: 'c-4-2', x: 2, z: 1 });
    return {
      id: 4,
      name: 'Ridge Cross',
      description: 'Cross the ridge without tumbling off the edge.',
      parMoves: 18,
      start: start || { x: 0, z: 0, orientation: BlockOrientation.UPRIGHT },
      target: target || { x: 5, z: 5 },
      tiles,
      coins,
    };
  })(),

  // Level 5: Glass Bridges (Fragile Tiles)
  (() => {
    const layout = [
      'SXXX  ',
      'XXXX  ',
      '  XXFF',
      '  XXFF',
      '    XXXX',
      '    XXXT',
    ];
    const { tiles, start, target, coins } = createTilesFromAscii(layout, 0, 0);
    coins.push({ id: 'c-5-1', x: 5, z: 2 });
    return {
      id: 5,
      name: 'Glass Bridges',
      description: 'Orange fragile tiles collapse if you stand upright on them! Roll flat.',
      parMoves: 10,
      start: start || { x: 0, z: 0, orientation: BlockOrientation.UPRIGHT },
      target: target || { x: 7, z: 5 },
      tiles,
      coins,
    };
  })(),

  // Level 6: The Zigzag Maze
  (() => {
    const layout = [
      'SXXX  ',
      'XXXX  ',
      ' XXXX ',
      ' XXXX ',
      '  XXXX',
      '  XXXT',
    ];
    const { tiles, start, target, coins } = createTilesFromAscii(layout, 0, 0);
    coins.push({ id: 'c-6-1', x: 3, z: 0 });
    coins.push({ id: 'c-6-2', x: 2, z: 3 });
    coins.push({ id: 'c-6-3', x: 5, z: 4 });
    return {
      id: 6,
      name: 'Zigzag Maze',
      description: 'Wider paths with tricky alignments to reach the target tile.',
      parMoves: 10,
      start: start || { x: 0, z: 0, orientation: BlockOrientation.UPRIGHT },
      target: target || { x: 5, z: 5 },
      tiles,
      coins,
    };
  })(),

  // Level 7: The Grand Gauntlet
  (() => {
    const layout = [
      'SXXX   ',
      'XXXX   ',
      '  XXXX ',
      '  XXFX ',
      '   XXXX',
      '   XXXT',
      '   XXXX',
    ];
    const { tiles, start, target, coins } = createTilesFromAscii(layout, 0, 0);
    coins.push({ id: 'c-7-1', x: 3, z: 0 });
    coins.push({ id: 'c-7-2', x: 5, z: 2 });
    coins.push({ id: 'c-7-3', x: 6, z: 4 });
    return {
      id: 7,
      name: 'Grand Finale',
      description: 'The ultimate test of isometric spatial mastery!',
      parMoves: 10,
      start: start || { x: 0, z: 0, orientation: BlockOrientation.UPRIGHT },
      target: target || { x: 6, z: 5 },
      tiles,
      coins,
    };
  })(),
];
