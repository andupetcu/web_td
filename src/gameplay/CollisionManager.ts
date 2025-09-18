import { Vec2, Rect } from '@/core/types';
import { Entity } from '@/ecs/Entity';

export interface SpatialObject {
  entityId: number;
  position: Vec2;
  radius: number;
  team?: string;
}

export class SpatialHashGrid {
  private cellSize: number;
  private grid: Map<string, SpatialObject[]>;
  private objects: Map<number, SpatialObject>;

  constructor(cellSize: number = 128) {
    this.cellSize = cellSize;
    this.grid = new Map();
    this.objects = new Map();
  }

  private getCellKey(x: number, y: number): string {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    return `${cellX},${cellY}`;
  }

  private getCellsForObject(obj: SpatialObject): string[] {
    const cells: string[] = [];
    const radius = obj.radius;

    // Calculate the range of cells this object might occupy
    const minX = obj.position.x - radius;
    const maxX = obj.position.x + radius;
    const minY = obj.position.y - radius;
    const maxY = obj.position.y + radius;

    const minCellX = Math.floor(minX / this.cellSize);
    const maxCellX = Math.floor(maxX / this.cellSize);
    const minCellY = Math.floor(minY / this.cellSize);
    const maxCellY = Math.floor(maxY / this.cellSize);

    for (let x = minCellX; x <= maxCellX; x++) {
      for (let y = minCellY; y <= maxCellY; y++) {
        cells.push(`${x},${y}`);
      }
    }

    return cells;
  }

  insert(obj: SpatialObject): void {
    // Remove existing object if it exists
    this.remove(obj.entityId);

    // Store the object
    this.objects.set(obj.entityId, obj);

    // Add to relevant cells
    const cells = this.getCellsForObject(obj);
    for (const cellKey of cells) {
      if (!this.grid.has(cellKey)) {
        this.grid.set(cellKey, []);
      }
      this.grid.get(cellKey)!.push(obj);
    }
  }

  remove(entityId: number): void {
    const obj = this.objects.get(entityId);
    if (!obj) return;

    // Remove from all cells
    const cells = this.getCellsForObject(obj);
    for (const cellKey of cells) {
      const cellObjects = this.grid.get(cellKey);
      if (cellObjects) {
        const index = cellObjects.findIndex(o => o.entityId === entityId);
        if (index > -1) {
          cellObjects.splice(index, 1);
        }

        // Clean up empty cells
        if (cellObjects.length === 0) {
          this.grid.delete(cellKey);
        }
      }
    }

    this.objects.delete(entityId);
  }

  update(entityId: number, newPosition: Vec2): void {
    const obj = this.objects.get(entityId);
    if (!obj) return;

    // Update position and re-insert
    obj.position = { ...newPosition };
    this.insert(obj);
  }

  queryRadius(center: Vec2, radius: number, team?: string): SpatialObject[] {
    const results: SpatialObject[] = [];
    const radiusSquared = radius * radius;

    // Get all cells that might contain objects within the radius
    const minX = center.x - radius;
    const maxX = center.x + radius;
    const minY = center.y - radius;
    const maxY = center.y + radius;

    const minCellX = Math.floor(minX / this.cellSize);
    const maxCellX = Math.floor(maxX / this.cellSize);
    const minCellY = Math.floor(minY / this.cellSize);
    const maxCellY = Math.floor(maxY / this.cellSize);

    const checked = new Set<number>();

    for (let x = minCellX; x <= maxCellX; x++) {
      for (let y = minCellY; y <= maxCellY; y++) {
        const cellKey = `${x},${y}`;
        const cellObjects = this.grid.get(cellKey);

        if (cellObjects) {
          for (const obj of cellObjects) {
            // Skip if already checked
            if (checked.has(obj.entityId)) continue;
            checked.add(obj.entityId);

            // Team filter
            if (team && obj.team !== team) continue;

            // Distance check
            const dx = obj.position.x - center.x;
            const dy = obj.position.y - center.y;
            const distSquared = dx * dx + dy * dy;

            if (distSquared <= radiusSquared) {
              results.push(obj);
            }
          }
        }
      }
    }

    return results;
  }

  queryRect(rect: Rect, team?: string): SpatialObject[] {
    const results: SpatialObject[] = [];

    const minCellX = Math.floor(rect.x / this.cellSize);
    const maxCellX = Math.floor((rect.x + rect.width) / this.cellSize);
    const minCellY = Math.floor(rect.y / this.cellSize);
    const maxCellY = Math.floor((rect.y + rect.height) / this.cellSize);

    const checked = new Set<number>();

    for (let x = minCellX; x <= maxCellX; x++) {
      for (let y = minCellY; y <= maxCellY; y++) {
        const cellKey = `${x},${y}`;
        const cellObjects = this.grid.get(cellKey);

        if (cellObjects) {
          for (const obj of cellObjects) {
            // Skip if already checked
            if (checked.has(obj.entityId)) continue;
            checked.add(obj.entityId);

            // Team filter
            if (team && obj.team !== team) continue;

            // Rectangle intersection check
            if (obj.position.x >= rect.x &&
                obj.position.x <= rect.x + rect.width &&
                obj.position.y >= rect.y &&
                obj.position.y <= rect.y + rect.height) {
              results.push(obj);
            }
          }
        }
      }
    }

    return results;
  }

  queryNearest(center: Vec2, maxRadius: number, team?: string): SpatialObject | null {
    let nearest: SpatialObject | null = null;
    let nearestDistSquared = maxRadius * maxRadius;

    const objects = this.queryRadius(center, maxRadius, team);

    for (const obj of objects) {
      const dx = obj.position.x - center.x;
      const dy = obj.position.y - center.y;
      const distSquared = dx * dx + dy * dy;

      if (distSquared < nearestDistSquared) {
        nearest = obj;
        nearestDistSquared = distSquared;
      }
    }

    return nearest;
  }

  clear(): void {
    this.grid.clear();
    this.objects.clear();
  }

  getObjectCount(): number {
    return this.objects.size;
  }

  getCellCount(): number {
    return this.grid.size;
  }

  // Debug method to visualize the grid
  getOccupiedCells(): { cellKey: string; objectCount: number }[] {
    const cells: { cellKey: string; objectCount: number }[] = [];

    for (const [cellKey, objects] of this.grid) {
      if (objects.length > 0) {
        cells.push({ cellKey, objectCount: objects.length });
      }
    }

    return cells;
  }
}

export class CollisionManager {
  private spatialGrid: SpatialHashGrid;
  private collisionCallbacks: Map<string, (obj1: SpatialObject, obj2: SpatialObject) => void>;

  constructor(cellSize: number = 128) {
    this.spatialGrid = new SpatialHashGrid(cellSize);
    this.collisionCallbacks = new Map();
  }

  addObject(obj: SpatialObject): void {
    this.spatialGrid.insert(obj);
  }

  removeObject(entityId: number): void {
    this.spatialGrid.remove(entityId);
  }

  updateObject(entityId: number, newPosition: Vec2): void {
    this.spatialGrid.update(entityId, newPosition);
  }

  queryRadius(center: Vec2, radius: number, team?: string): SpatialObject[] {
    return this.spatialGrid.queryRadius(center, radius, team);
  }

  queryRect(rect: Rect, team?: string): SpatialObject[] {
    return this.spatialGrid.queryRect(rect, team);
  }

  queryNearest(center: Vec2, maxRadius: number, team?: string): SpatialObject | null {
    return this.spatialGrid.queryNearest(center, maxRadius, team);
  }

  // Register collision callback for specific collision types
  onCollision(collisionType: string, callback: (obj1: SpatialObject, obj2: SpatialObject) => void): void {
    this.collisionCallbacks.set(collisionType, callback);
  }

  // Check for collisions and trigger callbacks
  checkCollisions(): void {
    // This would be called each frame to detect and handle collisions
    // Implementation would depend on specific collision types needed
  }

  // Utility methods for common collision checks
  checkProjectileHits(projectilePos: Vec2, projectileRadius: number, targetTeam: string): SpatialObject[] {
    return this.queryRadius(projectilePos, projectileRadius, targetTeam);
  }

  findTargetsInRange(position: Vec2, range: number, targetTeam: string): SpatialObject[] {
    return this.queryRadius(position, range, targetTeam);
  }

  findNearestTarget(position: Vec2, range: number, targetTeam: string): SpatialObject | null {
    return this.queryNearest(position, range, targetTeam);
  }

  clear(): void {
    this.spatialGrid.clear();
  }

  getStats(): { objectCount: number; cellCount: number } {
    return {
      objectCount: this.spatialGrid.getObjectCount(),
      cellCount: this.spatialGrid.getCellCount()
    };
  }
}