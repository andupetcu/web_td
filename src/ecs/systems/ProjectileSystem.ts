import { System, World } from '@/core/types';
import { Position } from '../components/Position';
import { Movement } from '../components/Movement';
import { Team, TeamType } from '../components/Team';
import { ProjectilePool, Projectile } from '@/ecs/pools/ProjectilePool';
import { CollisionManager } from '@/gameplay/CollisionManager';
import { EnemyFactory } from '@/enemies/EnemyFactory';
import { RenderSystem } from './RenderSystem';

export class ProjectileSystem implements System {
  private projectilePool: ProjectilePool;
  private collisionManager: CollisionManager;
  private enemyFactory: EnemyFactory;
  private renderSystem: RenderSystem;
  private world: World;

  constructor(
    projectilePool: ProjectilePool,
    collisionManager: CollisionManager,
    enemyFactory: EnemyFactory,
    renderSystem: RenderSystem,
    world: World
  ) {
    this.projectilePool = projectilePool;
    this.collisionManager = collisionManager;
    this.enemyFactory = enemyFactory;
    this.renderSystem = renderSystem;
    this.world = world;
  }

  update(dt: number, world: World): void {
    const activeProjectiles = this.projectilePool.getActiveProjectiles();

    for (const projectileId of activeProjectiles) {
      // Update projectile lifetime
      if (!this.projectilePool.updateProjectile(projectileId, dt)) {
        continue; // Projectile was destroyed due to lifetime
      }

      const position = world.getComponent<Position>(projectileId, 'Position');
      const movement = world.getComponent<Movement>(projectileId, 'Movement');
      const team = world.getComponent<Team>(projectileId, 'Team');

      if (!position || !movement || !team) continue;

      // Check for collisions with enemies
      if (team.team === TeamType.PLAYER) {
        this.checkProjectileCollisions(projectileId, position);
      }
    }
  }

  private checkProjectileCollisions(projectileId: number, position: Position): void {
    const projectileData = this.projectilePool.getProjectileData(projectileId);
    if (!projectileData || projectileData.hasHit) return;

    // Check collision with enemies
    const targets = this.collisionManager.queryRadius(
      { x: position.x, y: position.y },
      8, // Small collision radius for projectiles
      TeamType.ENEMY
    );

    if (targets.length === 0) return;

    const target = targets[0];

    // Handle hit based on projectile type
    if (projectileData.aoe) {
      this.handleAOEHit(projectileId, position, projectileData);
    } else {
      this.handleSingleTargetHit(projectileId, target.entityId, projectileData);
    }
  }

  private handleSingleTargetHit(projectileId: number, targetId: number, projectileData: Projectile): void {
    // Apply damage to target
    const isDead = this.enemyFactory.applyDamage(targetId, projectileData.damage);

    // Show damage numbers
    const position = this.world.getComponent<Position>(targetId, 'Position');
    if (position) {
      this.renderSystem.createFloatingText(
        position.x,
        position.y - 10,
        projectileData.damage.toString(),
        '#ffff00'
      );
    }

    // Handle enemy death
    if (isDead) {
      const bounty = this.enemyFactory.destroyEnemy(targetId);
      // TODO: Add bounty to player gold

      if (position) {
        this.renderSystem.createFloatingText(
          position.x,
          position.y + 10,
          `+${bounty}`,
          '#00ff00'
        );
      }
    }

    // Mark projectile as hit or destroy it
    if (!projectileData.piercing) {
      projectileData.hasHit = true;
      this.projectilePool.despawn(projectileId);
    }
  }

  private handleAOEHit(projectileId: number, position: Position, projectileData: Projectile): void {
    if (!projectileData.aoe) return;

    // Create explosion effect
    this.renderSystem.createExplosionEffect(
      position.x,
      position.y,
      projectileData.aoe.radius
    );

    // Find all enemies in AOE radius
    const targets = this.collisionManager.queryRadius(
      { x: position.x, y: position.y },
      projectileData.aoe.radius,
      TeamType.ENEMY
    );

    // Apply damage to all targets in range
    for (const target of targets) {
      const distance = Math.sqrt(
        Math.pow(target.position.x - position.x, 2) +
        Math.pow(target.position.y - position.y, 2)
      );

      // Calculate damage falloff
      const damagePercent = Math.max(
        projectileData.aoe.falloff,
        1 - (distance / projectileData.aoe.radius)
      );
      const finalDamage = Math.floor(projectileData.damage * damagePercent);

      const isDead = this.enemyFactory.applyDamage(target.entityId, finalDamage);

      // Show damage numbers
      this.renderSystem.createFloatingText(
        target.position.x,
        target.position.y - 10,
        finalDamage.toString(),
        '#ff6b6b'
      );

      // Handle enemy death
      if (isDead) {
        const bounty = this.enemyFactory.destroyEnemy(target.entityId);
        this.renderSystem.createFloatingText(
          target.position.x,
          target.position.y + 10,
          `+${bounty}`,
          '#00ff00'
        );
      }
    }

    // Destroy AOE projectile after explosion
    this.projectilePool.despawn(projectileId);
  }

  // Apply special effects based on tower type
  applySpecialEffects(projectileId: number, targetId: number, towerType: string): void {
    const projectileData = this.projectilePool.getProjectileData(projectileId);
    if (!projectileData) return;

    switch (towerType) {
      case 'slow':
        // Apply slow effect
        this.enemyFactory.applySlow(targetId, 0.5, 3.0);
        break;

      case 'dot':
        // Apply poison effect
        this.enemyFactory.applyPoison(targetId, 8, 4.0);
        break;
    }
  }
}