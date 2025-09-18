import { Pool } from '../Pool';
import { Entity } from '../Entity';
import { World } from '../World';
import { Position } from '../components/Position';
import { Health } from '../components/Health';
import { Movement } from '../components/Movement';
import { Render } from '../components/Render';
import { Team, TeamType } from '../components/Team';

export interface EnemyConfig {
  type: string;
  health: number;
  speed: number;
  texture: string;
  bounty: number;
  armor?: number;
}

export class EnemyPool {
  private pool: Pool<Entity>;
  private world: World;
  private activeEnemies: Set<number> = new Set();

  constructor(capacity: number, world: World) {
    this.world = world;
    this.pool = new Pool(
      capacity,
      () => this.createEnemy(),
      (enemy) => this.resetEnemy(enemy)
    );
  }

  private createEnemy(): Entity {
    const entity = this.world.createEntity();

    // Add default components
    this.world.addComponent(entity.id, new Position());
    this.world.addComponent(entity.id, new Health(100));
    this.world.addComponent(entity.id, new Movement());
    this.world.addComponent(entity.id, new Render('enemy-normal'));
    this.world.addComponent(entity.id, new Team(TeamType.ENEMY));

    return entity;
  }

  private resetEnemy(enemy: Entity): void {
    // Reset all components to default state
    const position = this.world.getComponent<Position>(enemy.id, 'Position');
    const health = this.world.getComponent<Health>(enemy.id, 'Health');
    const movement = this.world.getComponent<Movement>(enemy.id, 'Movement');
    const render = this.world.getComponent<Render>(enemy.id, 'Render');

    if (position) {
      position.set(0, 0);
    }

    if (health) {
      health.current = health.max;
    }

    if (movement) {
      movement.setSpeed(0);
      movement.setDirection({ x: 0, y: 0 });
    }

    if (render && render.sprite) {
      render.sprite.setVisible(false);
    }

    // Remove from active enemies
    this.activeEnemies.delete(enemy.id);
  }

  spawn(config: EnemyConfig, x: number, y: number): Entity | null {
    const enemy = this.pool.request();
    if (!enemy) {
      console.warn('Enemy pool exhausted!');
      return null;
    }

    // Configure the enemy
    const position = this.world.getComponent<Position>(enemy.id, 'Position')!;
    const health = this.world.getComponent<Health>(enemy.id, 'Health')!;
    const movement = this.world.getComponent<Movement>(enemy.id, 'Movement')!;
    const render = this.world.getComponent<Render>(enemy.id, 'Render')!;

    position.set(x, y);
    health.max = config.health;
    health.current = config.health;
    movement.setSpeed(config.speed);
    render.texture = config.texture;

    if (render.sprite) {
      render.sprite.setTexture(config.texture);
      render.sprite.setVisible(true);
      render.sprite.setPosition(x, y);
    }

    // Add to active enemies
    this.activeEnemies.add(enemy.id);

    return enemy;
  }

  despawn(enemyId: number): void {
    if (!this.activeEnemies.has(enemyId)) {
      return;
    }

    const entities = this.world.getEntities();
    const enemy = entities.get(enemyId);

    if (enemy) {
      this.pool.recycle(enemy);
    }
  }

  getActiveEnemies(): Set<number> {
    return new Set(this.activeEnemies);
  }

  getPoolStats(): { available: number; used: number; total: number } {
    return {
      available: this.pool.getAvailableCount(),
      used: this.pool.getUsedCount(),
      total: this.pool.getAvailableCount() + this.pool.getUsedCount()
    };
  }

  clear(): void {
    // Despawn all active enemies
    for (const enemyId of this.activeEnemies) {
      this.despawn(enemyId);
    }
    this.activeEnemies.clear();
  }
}