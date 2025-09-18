import { Pool } from '../Pool';
import { Entity } from '../Entity';
import { World } from '../World';
import { Position } from '../components/Position';
import { Movement } from '../components/Movement';
import { Render } from '../components/Render';
import { Team, TeamType } from '../components/Team';
import { Vec2 } from '@/core/types';

export interface ProjectileConfig {
  damage: number;
  speed: number;
  texture: string;
  lifetime: number;
  piercing?: boolean;
  aoe?: {
    radius: number;
    falloff: number;
  };
}

export class Projectile {
  public damage: number = 0;
  public lifetime: number = 0;
  public maxLifetime: number = 0;
  public piercing: boolean = false;
  public aoe?: {
    radius: number;
    falloff: number;
  };
  public targetId?: number;
  public hasHit: boolean = false;

  reset(): void {
    this.damage = 0;
    this.lifetime = 0;
    this.maxLifetime = 0;
    this.piercing = false;
    this.aoe = undefined;
    this.targetId = undefined;
    this.hasHit = false;
  }
}

export class ProjectilePool {
  private pool: Pool<Entity>;
  private world: World;
  private activeProjectiles: Set<number> = new Set();
  private projectileData: Map<number, Projectile> = new Map();

  constructor(capacity: number, world: World) {
    this.world = world;
    this.pool = new Pool(
      capacity,
      () => this.createProjectile(),
      (projectile) => this.resetProjectile(projectile)
    );
  }

  private createProjectile(): Entity {
    const entity = this.world.createEntity();

    // Add default components
    this.world.addComponent(entity.id, new Position());
    this.world.addComponent(entity.id, new Movement());
    this.world.addComponent(entity.id, new Render('projectile-basic'));
    this.world.addComponent(entity.id, new Team(TeamType.PLAYER));

    // Create projectile data
    this.projectileData.set(entity.id, new Projectile());

    return entity;
  }

  private resetProjectile(entity: Entity): void {
    // Reset all components to default state
    const position = this.world.getComponent<Position>(entity.id, 'Position');
    const movement = this.world.getComponent<Movement>(entity.id, 'Movement');
    const render = this.world.getComponent<Render>(entity.id, 'Render');
    const projectileData = this.projectileData.get(entity.id);

    if (position) {
      position.set(0, 0);
    }

    if (movement) {
      movement.setSpeed(0);
      movement.setDirection({ x: 0, y: 0 });
    }

    if (render && render.sprite) {
      render.sprite.setVisible(false);
    }

    if (projectileData) {
      projectileData.reset();
    }

    // Remove from active projectiles
    this.activeProjectiles.delete(entity.id);
  }

  spawn(config: ProjectileConfig, startPos: Vec2, targetPos: Vec2, targetId?: number): Entity | null {
    const projectile = this.pool.request();
    if (!projectile) {
      console.warn('Projectile pool exhausted!');
      return null;
    }

    // Configure the projectile
    const position = this.world.getComponent<Position>(projectile.id, 'Position')!;
    const movement = this.world.getComponent<Movement>(projectile.id, 'Movement')!;
    const render = this.world.getComponent<Render>(projectile.id, 'Render')!;
    const projectileData = this.projectileData.get(projectile.id)!;

    // Set position
    position.set(startPos.x, startPos.y);

    // Calculate direction to target
    const dx = targetPos.x - startPos.x;
    const dy = targetPos.y - startPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0) {
      const direction = { x: dx / distance, y: dy / distance };
      movement.setDirection(direction);
      movement.setSpeed(config.speed);
    }

    // Configure projectile data
    projectileData.damage = config.damage;
    projectileData.lifetime = 0;
    projectileData.maxLifetime = config.lifetime;
    projectileData.piercing = config.piercing || false;
    projectileData.aoe = config.aoe;
    projectileData.targetId = targetId;
    projectileData.hasHit = false;

    // Set render properties
    render.texture = config.texture;
    if (render.sprite) {
      render.sprite.setTexture(config.texture);
      render.sprite.setVisible(true);
      render.sprite.setPosition(startPos.x, startPos.y);
    }

    // Add to active projectiles
    this.activeProjectiles.add(projectile.id);

    return projectile;
  }

  despawn(projectileId: number): void {
    if (!this.activeProjectiles.has(projectileId)) {
      return;
    }

    const entities = this.world.getEntities();
    const projectile = entities.get(projectileId);

    if (projectile) {
      this.pool.recycle(projectile);
    }
  }

  getProjectileData(projectileId: number): Projectile | undefined {
    return this.projectileData.get(projectileId);
  }

  updateProjectile(projectileId: number, dt: number): boolean {
    const projectileData = this.projectileData.get(projectileId);
    if (!projectileData) return false;

    // Update lifetime
    projectileData.lifetime += dt;

    // Check if projectile should be despawned
    if (projectileData.lifetime >= projectileData.maxLifetime) {
      this.despawn(projectileId);
      return false;
    }

    return true;
  }

  getActiveProjectiles(): Set<number> {
    return new Set(this.activeProjectiles);
  }

  getPoolStats(): { available: number; used: number; total: number } {
    return {
      available: this.pool.getAvailableCount(),
      used: this.pool.getUsedCount(),
      total: this.pool.getAvailableCount() + this.pool.getUsedCount()
    };
  }

  clear(): void {
    // Despawn all active projectiles
    for (const projectileId of this.activeProjectiles) {
      this.despawn(projectileId);
    }
    this.activeProjectiles.clear();
  }

  // Utility method to create different projectile types
  createBasicProjectile(startPos: Vec2, targetPos: Vec2, damage: number = 10): Entity | null {
    return this.spawn({
      damage,
      speed: 300,
      texture: 'projectile-basic',
      lifetime: 3.0
    }, startPos, targetPos);
  }

  createAOEProjectile(startPos: Vec2, targetPos: Vec2, damage: number = 25): Entity | null {
    return this.spawn({
      damage,
      speed: 200,
      texture: 'projectile-aoe',
      lifetime: 4.0,
      aoe: {
        radius: 80,
        falloff: 0.5
      }
    }, startPos, targetPos);
  }

  createPiercingProjectile(startPos: Vec2, targetPos: Vec2, damage: number = 15): Entity | null {
    return this.spawn({
      damage,
      speed: 400,
      texture: 'projectile-basic',
      lifetime: 2.5,
      piercing: true
    }, startPos, targetPos);
  }
}