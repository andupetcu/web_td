export interface Vec2 {
  x: number;
  y: number;
}

export interface GridPos {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Component {
  type: string;
}

export interface System {
  update(dt: number, world: World): void;
}

export interface World {
  entities: Map<number, Entity>;
  components: Map<string, Map<number, Component>>;
  systems: System[];
}

export interface Entity {
  id: number;
  components: Set<string>;
}

export enum GameState {
  MENU = 'menu',
  PLAYING = 'playing',
  PAUSED = 'paused',
  GAME_OVER = 'game_over'
}

export interface GameConfig {
  gridSize: number;
  mapWidth: number;
  mapHeight: number;
  startingGold: number;
  targetFPS: number;
}