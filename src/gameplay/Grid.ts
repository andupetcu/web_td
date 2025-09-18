import { GridPos, Vec2 } from '@/core/types';

export enum CellType {
  EMPTY = 'empty',
  BLOCKED = 'blocked',
  PATH = 'path',
  SPAWN = 'spawn',
  GOAL = 'goal'
}

export interface GridCell {
  type: CellType;
  walkable: boolean;
  buildable: boolean;
  occupiedBy?: number; // Entity ID
}

export class Grid {
  private cells: GridCell[][];
  private width: number;
  private height: number;
  private cellSize: number;
  private spawn: GridPos | null = null;
  private goal: GridPos | null = null;

  constructor(width: number, height: number, cellSize: number) {
    this.width = width;
    this.height = height;
    this.cellSize = cellSize;
    this.initializeCells();
    this.generateDefaultPath();
  }

  private initializeCells(): void {
    this.cells = [];
    for (let y = 0; y < this.height; y++) {
      this.cells[y] = [];
      for (let x = 0; x < this.width; x++) {
        this.cells[y][x] = {
          type: CellType.EMPTY,
          walkable: false,
          buildable: true
        };
      }
    }
  }

  private generateDefaultPath(): void {
    // Create a simple path from left to right for testing
    const pathY = Math.floor(this.height / 2);

    for (let x = 0; x < this.width; x++) {
      this.cells[pathY][x] = {
        type: x === 0 ? CellType.SPAWN : x === this.width - 1 ? CellType.GOAL : CellType.PATH,
        walkable: true,
        buildable: false
      };
    }

    this.spawn = { x: 0, y: pathY };
    this.goal = { x: this.width - 1, y: pathY };
  }

  getCell(pos: GridPos): GridCell | null {
    if (!this.isValidPosition(pos)) {
      return null;
    }
    return this.cells[pos.y][pos.x];
  }

  setCell(pos: GridPos, cell: GridCell): boolean {
    if (!this.isValidPosition(pos)) {
      return false;
    }
    this.cells[pos.y][pos.x] = cell;
    return true;
  }

  isValidPosition(pos: GridPos): boolean {
    return pos.x >= 0 && pos.x < this.width && pos.y >= 0 && pos.y < this.height;
  }

  isBuildable(pos: GridPos): boolean {
    const cell = this.getCell(pos);
    return cell !== null && cell.buildable && !cell.occupiedBy;
  }

  isWalkable(pos: GridPos): boolean {
    const cell = this.getCell(pos);
    return cell !== null && cell.walkable;
  }

  placeTower(pos: GridPos, entityId: number): boolean {
    if (!this.isBuildable(pos)) {
      return false;
    }

    // Check if path is still valid after placement
    const cell = this.getCell(pos)!;
    cell.occupiedBy = entityId;
    cell.buildable = false;

    if (!this.hasValidPath()) {
      // Revert the placement
      cell.occupiedBy = undefined;
      cell.buildable = true;
      return false;
    }

    return true;
  }

  removeTower(pos: GridPos): boolean {
    const cell = this.getCell(pos);
    if (!cell || !cell.occupiedBy) {
      return false;
    }

    cell.occupiedBy = undefined;
    cell.buildable = true;
    return true;
  }

  private hasValidPath(): boolean {
    if (!this.spawn || !this.goal) {
      return false;
    }

    // Simple BFS to check if path exists
    const visited = new Set<string>();
    const queue: GridPos[] = [this.spawn];
    visited.add(`${this.spawn.x},${this.spawn.y}`);

    const directions = [
      { x: 0, y: -1 }, // Up
      { x: 1, y: 0 },  // Right
      { x: 0, y: 1 },  // Down
      { x: -1, y: 0 }  // Left
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.x === this.goal.x && current.y === this.goal.y) {
        return true;
      }

      for (const dir of directions) {
        const next: GridPos = {
          x: current.x + dir.x,
          y: current.y + dir.y
        };

        const key = `${next.x},${next.y}`;
        if (!visited.has(key) && this.isWalkable(next)) {
          visited.add(key);
          queue.push(next);
        }
      }
    }

    return false;
  }

  worldToGrid(worldPos: Vec2): GridPos {
    return {
      x: Math.floor(worldPos.x / this.cellSize),
      y: Math.floor(worldPos.y / this.cellSize)
    };
  }

  gridToWorld(gridPos: GridPos): Vec2 {
    return {
      x: gridPos.x * this.cellSize + this.cellSize / 2,
      y: gridPos.y * this.cellSize + this.cellSize / 2
    };
  }

  getSpawn(): GridPos | null {
    return this.spawn;
  }

  getGoal(): GridPos | null {
    return this.goal;
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }

  getCellSize(): number {
    return this.cellSize;
  }

  getAllCells(): GridCell[][] {
    return this.cells;
  }
}