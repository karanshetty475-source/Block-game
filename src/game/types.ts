export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export enum BlockOrientation {
  UPRIGHT = 'UPRIGHT',          // 1x1 base, 2 units tall
  HORIZONTAL_X = 'HORIZONTAL_X', // 2x1 base (spans along X: (x, z) and (x+1, z)), 1 unit tall
  HORIZONTAL_Z = 'HORIZONTAL_Z', // 1x2 base (spans along Z: (x, z) and (x, z+1)), 1 unit tall
}

export interface GridCoord {
  x: number;
  z: number;
}

export interface BlockState {
  x: number;
  z: number;
  orientation: BlockOrientation;
}

export type TileType = 'NORMAL' | 'TARGET' | 'FRAGILE' | 'START';

export interface TileDef {
  x: number;
  z: number;
  type?: TileType;
}

export interface CoinDef {
  id: string;
  x: number;
  z: number;
}

export interface LevelData {
  id: number;
  name: string;
  description: string;
  parMoves: number;
  start: BlockState;
  target: GridCoord;
  tiles: TileDef[];
  coins?: CoinDef[];
}

export interface MoveResult {
  nextState: BlockState;
  isOffGrid: boolean;
  isFragileBreak: boolean;
  isWin: boolean;
  collectedCoinIds: string[];
  occupied: GridCoord[];
}

export interface HintStep {
  stepNumber: number;
  direction: Direction;
  label: string;
  arrow: string;
  resultingState: BlockState;
}

export interface HintResult {
  isDeadEnd: boolean;
  steps: HintStep[];
}

