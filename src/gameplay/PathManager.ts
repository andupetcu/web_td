import { GridPos, Vec2, Rect } from '@/core/types';
import { Grid, CellType } from './Grid';

export interface FlowField {
  directions: Vec2[][];
  costs: number[][];
  dirty: boolean;
}

export class PathManager {
  private grid: Grid;
  private flowField: FlowField;
  private isDirty: boolean = true;

  constructor(grid: Grid) {
    this.grid = grid;
    this.flowField = {
      directions: [],
      costs: [],
      dirty: true
    };
    this.initializeFlowField();
  }

  private initializeFlowField(): void {
    const width = this.grid.getWidth();
    const height = this.grid.getHeight();

    this.flowField.directions = [];
    this.flowField.costs = [];

    for (let y = 0; y < height; y++) {
      this.flowField.directions[y] = [];
      this.flowField.costs[y] = [];
      for (let x = 0; x < width; x++) {
        this.flowField.directions[y][x] = { x: 0, y: 0 };
        this.flowField.costs[y][x] = Infinity;
      }
    }
  }

  computeFlowField(goal: GridPos): void {
    if (!this.isDirty && !this.flowField.dirty) {
      return;
    }

    this.resetCosts();
    this.calculateCostField(goal);
    this.calculateFlowField();

    this.isDirty = false;
    this.flowField.dirty = false;
  }

  private resetCosts(): void {
    const width = this.grid.getWidth();
    const height = this.grid.getHeight();

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        this.flowField.costs[y][x] = Infinity;
      }
    }
  }

  private calculateCostField(goal: GridPos): void {
    const width = this.grid.getWidth();
    const height = this.grid.getHeight();

    // Initialize goal with cost 0
    this.flowField.costs[goal.y][goal.x] = 0;

    // Use Dijkstra's algorithm to calculate costs
    const queue: { pos: GridPos; cost: number }[] = [{ pos: goal, cost: 0 }];
    const visited = new Set<string>();

    const directions = [
      { x: 0, y: -1 }, // Up
      { x: 1, y: 0 },  // Right
      { x: 0, y: 1 },  // Down
      { x: -1, y: 0 },  // Left
      { x: 1, y: -1 }, // Up-Right
      { x: 1, y: 1 },  // Down-Right
      { x: -1, y: 1 }, // Down-Left
      { x: -1, y: -1 } // Up-Left
    ];

    while (queue.length > 0) {
      // Find minimum cost node
      let minIndex = 0;
      for (let i = 1; i < queue.length; i++) {
        if (queue[i].cost < queue[minIndex].cost) {
          minIndex = i;
        }
      }

      const current = queue.splice(minIndex, 1)[0];
      const key = `${current.pos.x},${current.pos.y}`;

      if (visited.has(key)) {
        continue;
      }
      visited.add(key);

      // Check all neighbors
      for (const dir of directions) {
        const neighbor: GridPos = {
          x: current.pos.x + dir.x,
          y: current.pos.y + dir.y
        };

        if (!this.grid.isValidPosition(neighbor)) {
          continue;
        }

        const neighborKey = `${neighbor.x},${neighbor.y}`;
        if (visited.has(neighborKey)) {
          continue;
        }

        const cell = this.grid.getCell(neighbor);
        if (!cell || !cell.walkable) {
          continue;
        }

        // Calculate movement cost (diagonal = 1.414, orthogonal = 1)
        const isDiagonal = Math.abs(dir.x) + Math.abs(dir.y) === 2;
        const movementCost = isDiagonal ? 1.414 : 1.0;
        const newCost = current.cost + movementCost;

        if (newCost < this.flowField.costs[neighbor.y][neighbor.x]) {
          this.flowField.costs[neighbor.y][neighbor.x] = newCost;
          queue.push({ pos: neighbor, cost: newCost });
        }
      }
    }
  }

  private calculateFlowField(): void {
    const width = this.grid.getWidth();
    const height = this.grid.getHeight();

    const directions = [
      { x: 0, y: -1 }, // Up
      { x: 1, y: 0 },  // Right
      { x: 0, y: 1 },  // Down
      { x: -1, y: 0 },  // Left
      { x: 1, y: -1 }, // Up-Right
      { x: 1, y: 1 },  // Down-Right
      { x: -1, y: 1 }, // Down-Left
      { x: -1, y: -1 } // Up-Left
    ];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const currentCost = this.flowField.costs[y][x];

        if (currentCost === Infinity) {
          this.flowField.directions[y][x] = { x: 0, y: 0 };
          continue;
        }

        let bestDirection = { x: 0, y: 0 };
        let lowestCost = currentCost;

        // Find the direction to the neighbor with the lowest cost
        for (const dir of directions) {
          const neighborX = x + dir.x;
          const neighborY = y + dir.y;

          if (neighborX >= 0 && neighborX < width && neighborY >= 0 && neighborY < height) {
            const neighborCost = this.flowField.costs[neighborY][neighborX];

            if (neighborCost < lowestCost) {
              lowestCost = neighborCost;
              bestDirection = { x: dir.x, y: dir.y };
            }
          }
        }

        // Normalize the direction vector
        const length = Math.sqrt(bestDirection.x * bestDirection.x + bestDirection.y * bestDirection.y);
        if (length > 0) {
          this.flowField.directions[y][x] = {
            x: bestDirection.x / length,
            y: bestDirection.y / length
          };
        } else {
          this.flowField.directions[y][x] = { x: 0, y: 0 };
        }
      }
    }
  }

  getFlowAt(worldPos: Vec2): Vec2 {
    const gridPos = this.grid.worldToGrid(worldPos);

    if (!this.grid.isValidPosition(gridPos)) {
      return { x: 0, y: 0 };
    }

    return this.flowField.directions[gridPos.y][gridPos.x];
  }

  getFlowAtGrid(gridPos: GridPos): Vec2 {
    if (!this.grid.isValidPosition(gridPos)) {
      return { x: 0, y: 0 };
    }

    return this.flowField.directions[gridPos.y][gridPos.x];
  }

  getCostAt(gridPos: GridPos): number {
    if (!this.grid.isValidPosition(gridPos)) {
      return Infinity;
    }

    return this.flowField.costs[gridPos.y][gridPos.x];
  }

  markDirty(rect?: Rect): void {
    this.isDirty = true;
    this.flowField.dirty = true;
  }

  isDirtyFlag(): boolean {
    return this.isDirty || this.flowField.dirty;
  }

  // Interpolated flow sampling for smoother movement
  getInterpolatedFlow(worldPos: Vec2): Vec2 {
    const cellSize = this.grid.getCellSize();
    const gridX = worldPos.x / cellSize;
    const gridY = worldPos.y / cellSize;

    const x0 = Math.floor(gridX);
    const y0 = Math.floor(gridY);
    const x1 = x0 + 1;
    const y1 = y0 + 1;

    const fx = gridX - x0;
    const fy = gridY - y0;

    // Get flow vectors at the four surrounding grid points
    const flow00 = this.getFlowAtGrid({ x: x0, y: y0 });
    const flow10 = this.getFlowAtGrid({ x: x1, y: y0 });
    const flow01 = this.getFlowAtGrid({ x: x0, y: y1 });
    const flow11 = this.getFlowAtGrid({ x: x1, y: y1 });

    // Bilinear interpolation
    const flowX = (1 - fx) * (1 - fy) * flow00.x +
                  fx * (1 - fy) * flow10.x +
                  (1 - fx) * fy * flow01.x +
                  fx * fy * flow11.x;

    const flowY = (1 - fx) * (1 - fy) * flow00.y +
                  fx * (1 - fy) * flow10.y +
                  (1 - fx) * fy * flow01.y +
                  fx * fy * flow11.y;

    return { x: flowX, y: flowY };
  }

  getFlowField(): FlowField {
    return this.flowField;
  }
}