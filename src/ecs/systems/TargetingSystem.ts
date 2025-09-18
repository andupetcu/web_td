import { System, World } from '@/core/types';
import { Position } from '../components/Position';
import { Attack } from '../components/Attack';
import { Team, TeamType } from '../components/Team';
import { CollisionManager, SpatialObject } from '@/gameplay/CollisionManager';
import { TowerFactory } from '@/towers/TowerFactory';
import { ProjectilePool } from '@/ecs/pools/ProjectilePool';

export class TargetingSystem implements System {
  private collisionManager: CollisionManager;
  private towerFactory: TowerFactory;
  private projectilePool: ProjectilePool;

  constructor(collisionManager: CollisionManager, towerFactory: TowerFactory, projectilePool: ProjectilePool) {
    this.collisionManager = collisionManager;
    this.towerFactory = towerFactory;
    this.projectilePool = projectilePool;
  }

  update(dt: number, world: World): void {
    const currentTime = performance.now();
    const towerEntities = world.getEntitiesWithComponents('Position', 'Attack', 'Team');

    for (const entity of towerEntities) {
      const position = world.getComponent<Position>(entity.id, 'Position')!;
      const attack = world.getComponent<Attack>(entity.id, 'Attack')!;
      const team = world.getComponent<Team>(entity.id, 'Team')!;

      // Only process player towers
      if (team.team !== TeamType.PLAYER) continue;

      // Check if tower can attack
      if (!attack.canAttack(currentTime)) continue;

      // Get tower data for additional information
      const towerData = this.towerFactory.getTowerData(entity.id);
      if (!towerData) continue;

      // Find targets in range
      const targets = this.collisionManager.findTargetsInRange(
        { x: position.x, y: position.y },
        attack.range,
        TeamType.ENEMY
      );

      if (targets.length === 0) continue;

      // Select target based on tower type and strategy
      const target = this.selectTarget(targets, towerData.config.type, position);
      if (!target) continue;

      // Attack the target
      this.performAttack(entity.id, position, target, attack, towerData.config, currentTime);
    }
  }

  private selectTarget(
    targets: SpatialObject[],
    towerType: string,
    towerPosition: Position
  ): SpatialObject | null {
    if (targets.length === 0) return null;

    switch (towerType) {
      case 'basic':
      case 'aoe':
        // Target closest enemy
        return this.findClosestTarget(targets, towerPosition);

      case 'slow':
        // Target fastest enemy that isn't already slowed
        return this.findFastestTarget(targets);

      case 'dot':
        // Target enemy with highest health that doesn't have poison
        return this.findHighestHealthTarget(targets);

      default:
        return this.findClosestTarget(targets, towerPosition);
    }
  }

  private findClosestTarget(targets: SpatialObject[], towerPosition: Position): SpatialObject | null {
    let closest: SpatialObject | null = null;
    let closestDistance = Infinity;

    for (const target of targets) {
      const dx = target.position.x - towerPosition.x;
      const dy = target.position.y - towerPosition.y;
      const distance = dx * dx + dy * dy;

      if (distance < closestDistance) {
        closestDistance = distance;
        closest = target;
      }
    }

    return closest;
  }

  private findFastestTarget(targets: SpatialObject[]): SpatialObject | null {
    // For now, just return the first target
    // In a full implementation, this would check enemy movement speed
    return targets[0] || null;
  }

  private findHighestHealthTarget(targets: SpatialObject[]): SpatialObject | null {
    // For now, just return the first target
    // In a full implementation, this would check enemy health
    return targets[0] || null;
  }

  private performAttack(
    towerId: number,
    towerPosition: Position,
    target: SpatialObject,
    attack: Attack,
    towerConfig: any,
    currentTime: number
  ): void {
    // Mark attack time
    attack.attack(currentTime);

    // Create projectile based on tower type
    const startPos = { x: towerPosition.x, y: towerPosition.y };
    const targetPos = { x: target.position.x, y: target.position.y };

    switch (towerConfig.projectileType) {
      case 'basic':
        this.projectilePool.createBasicProjectile(startPos, targetPos, attack.damage);
        break;

      case 'aoe':
        this.projectilePool.createAOEProjectile(startPos, targetPos, attack.damage);
        break;

      default:
        this.projectilePool.createBasicProjectile(startPos, targetPos, attack.damage);
        break;
    }

    // Store last target for tower data
    const towerData = this.towerFactory.getTowerData(towerId);
    if (towerData) {
      towerData.lastTargetId = target.entityId;
    }
  }
}