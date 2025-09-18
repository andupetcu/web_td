import { Entity } from '@/ecs/Entity';
import { World } from '@/ecs/World';
import { Position } from '@/ecs/components/Position';
import { Health } from '@/ecs/components/Health';
import { Movement } from '@/ecs/components/Movement';
import { Render } from '@/ecs/components/Render';
import { Team, TeamType } from '@/ecs/components/Team';
import { EnemyPool, EnemyConfig } from '@/ecs/pools/EnemyPool';
import { GridPos, Vec2 } from '@/core/types';
import { Grid } from '@/gameplay/Grid';
import { PathManager } from '@/gameplay/PathManager';
import enemyData from '@/config/enemies.json';

export interface EnemyConfigData {
  id: string;
  name: string;
  type: string;
  health: number;
  speed: number;
  armor: number;
  bounty: number;
  texture: string;
  size: number;
  description: string;
  abilities?: {
    regeneration?: number;
    immunity?: string[];
    shield?: number;
  };
}

export interface StatusEffect {
  type: string;
  duration: number;
  strength: number;
  tickInterval?: number;
  lastTick?: number;
}

export class EnemyData {
  public config: EnemyConfigData;
  public baseSpeed: number;
  public currentSpeed: number;
  public armor: number;
  public bounty: number;
  public statusEffects: StatusEffect[] = [];
  public pathProgress: number = 0;
  public waypoints: Vec2[] = [];
  public currentWaypoint: number = 0;
  public reachedGoal: boolean = false;

  constructor(config: EnemyConfigData) {
    this.config = config;
    this.baseSpeed = config.speed;
    this.currentSpeed = config.speed;
    this.armor = config.armor;
    this.bounty = config.bounty;
  }

  reset(): void {
    this.currentSpeed = this.baseSpeed;
    this.statusEffects = [];
    this.pathProgress = 0;
    this.waypoints = [];
    this.currentWaypoint = 0;
    this.reachedGoal = false;
  }

  addStatusEffect(effect: StatusEffect): void {
    // Remove existing effect of same type
    this.statusEffects = this.statusEffects.filter(e => e.type !== effect.type);

    // Add new effect
    this.statusEffects.push({
      ...effect,
      lastTick: 0
    });
  }

  updateStatusEffects(dt: number): void {
    this.statusEffects = this.statusEffects.filter(effect => {
      effect.duration -= dt;

      // Handle DOT effects
      if (effect.type === 'poison' || effect.type === 'burn') {
        if (!effect.lastTick) effect.lastTick = 0;
        if (!effect.tickInterval) effect.tickInterval = 0.5;

        effect.lastTick += dt;
        if (effect.lastTick >= effect.tickInterval) {
          // Apply DOT damage (this would be handled by the combat system)
          effect.lastTick = 0;
        }
      }

      return effect.duration > 0;
    });

    // Update current speed based on slow effects
    this.updateSpeed();
  }

  private updateSpeed(): void {
    let speedMultiplier = 1.0;

    for (const effect of this.statusEffects) {
      if (effect.type === 'slow') {
        speedMultiplier *= (1 - effect.strength);
      }
    }

    this.currentSpeed = this.baseSpeed * speedMultiplier;
  }

  hasImmunity(effectType: string): boolean {
    return this.config.abilities?.immunity?.includes(effectType) || false;
  }

  takeDamage(damage: number): number {
    // Apply armor reduction
    const reducedDamage = Math.max(1, damage - this.armor);
    return reducedDamage;
  }

  getStatusEffect(type: string): StatusEffect | undefined {
    return this.statusEffects.find(effect => effect.type === type);
  }
}

export class EnemyFactory {
  private world: World;
  private grid: Grid;
  private pathManager: PathManager;
  private enemyPool: EnemyPool;
  private enemyConfigs: Map<string, EnemyConfigData> = new Map();
  private enemyData: Map<number, EnemyData> = new Map();

  constructor(world: World, grid: Grid, pathManager: PathManager, poolSize: number = 500) {
    this.world = world;
    this.grid = grid;
    this.pathManager = pathManager;
    this.enemyPool = new EnemyPool(poolSize, world);
    this.loadEnemyConfigs();
  }

  private loadEnemyConfigs(): void {
    for (const config of enemyData as EnemyConfigData[]) {
      this.enemyConfigs.set(config.id, config);
    }
  }

  getEnemyConfig(id: string): EnemyConfigData | undefined {
    return this.enemyConfigs.get(id);
  }

  getAllEnemyConfigs(): EnemyConfigData[] {
    return Array.from(this.enemyConfigs.values());
  }

  spawnEnemy(enemyType: string, spawnPos?: GridPos): Entity | null {
    const config = this.enemyConfigs.get(enemyType);
    if (!config) {
      console.error(`Unknown enemy type: ${enemyType}`);
      return null;
    }

    // Use provided spawn position or get from grid
    const spawn = spawnPos || this.grid.getSpawn();
    if (!spawn) {
      console.error('No spawn position available');
      return null;
    }

    const worldPos = this.grid.gridToWorld(spawn);

    // Create enemy using pool
    const enemyConfig: EnemyConfig = {
      type: config.type,
      health: config.health,
      speed: config.speed,
      texture: config.texture,
      bounty: config.bounty,
      armor: config.armor
    };

    const enemy = this.enemyPool.spawn(enemyConfig, worldPos.x, worldPos.y);
    if (!enemy) {
      return null;
    }

    // Create enemy data
    const enemyDataInstance = new EnemyData(config);
    this.enemyData.set(enemy.id, enemyDataInstance);

    // Set up pathfinding
    this.setupEnemyPath(enemy.id);

    return enemy;
  }

  private setupEnemyPath(enemyId: number): void {
    const goal = this.grid.getGoal();
    if (!goal) return;

    // Compute flow field if needed
    this.pathManager.computeFlowField(goal);

    // Enemy will use flow field for pathfinding
    // Path setup is handled by the movement system
  }

  destroyEnemy(enemyId: number): number {
    const enemyData = this.enemyData.get(enemyId);
    if (!enemyData) {
      return 0;
    }

    const bounty = enemyData.bounty;

    // Remove enemy data
    this.enemyData.delete(enemyId);

    // Despawn from pool
    this.enemyPool.despawn(enemyId);

    return bounty;
  }

  getEnemyData(enemyId: number): EnemyData | undefined {
    return this.enemyData.get(enemyId);
  }

  updateEnemy(enemyId: number, dt: number): boolean {
    const enemyData = this.enemyData.get(enemyId);
    if (!enemyData) {
      return false;
    }

    // Update status effects
    enemyData.updateStatusEffects(dt);

    // Update movement speed component
    const movement = this.world.getComponent<Movement>(enemyId, 'Movement');
    if (movement) {
      movement.setSpeed(enemyData.currentSpeed);
    }

    // Handle regeneration
    if (enemyData.config.abilities?.regeneration) {
      const health = this.world.getComponent<Health>(enemyId, 'Health');
      if (health && !health.isDead()) {
        health.heal(enemyData.config.abilities.regeneration * dt);
      }
    }

    return true;
  }

  applyDamage(enemyId: number, damage: number): boolean {
    const enemyData = this.enemyData.get(enemyId);
    const health = this.world.getComponent<Health>(enemyId, 'Health');

    if (!enemyData || !health) {
      return false;
    }

    // Apply armor reduction
    const finalDamage = enemyData.takeDamage(damage);

    // Apply damage
    const isDead = health.takeDamage(finalDamage);

    return isDead;
  }

  applyStatusEffect(enemyId: number, effect: StatusEffect): void {
    const enemyData = this.enemyData.get(enemyId);
    if (!enemyData) return;

    // Check immunity
    if (enemyData.hasImmunity(effect.type)) {
      return;
    }

    enemyData.addStatusEffect(effect);
  }

  // Spell/effect application methods
  applySlow(enemyId: number, slowPercent: number, duration: number): void {
    this.applyStatusEffect(enemyId, {
      type: 'slow',
      duration,
      strength: slowPercent
    });
  }

  applyPoison(enemyId: number, dps: number, duration: number, tickInterval: number = 0.5): void {
    this.applyStatusEffect(enemyId, {
      type: 'poison',
      duration,
      strength: dps,
      tickInterval
    });
  }

  // Get all active enemies
  getActiveEnemies(): Set<number> {
    return this.enemyPool.getActiveEnemies();
  }

  // Get pool statistics
  getPoolStats(): { available: number; used: number; total: number } {
    return this.enemyPool.getPoolStats();
  }

  // Clear all enemies
  clear(): void {
    // Clear enemy data
    this.enemyData.clear();

    // Clear pool
    this.enemyPool.clear();
  }

  // Scaling methods for wave progression
  scaleEnemyStats(enemyType: string, healthMultiplier: number, speedMultiplier: number): EnemyConfigData | null {
    const baseConfig = this.enemyConfigs.get(enemyType);
    if (!baseConfig) return null;

    return {
      ...baseConfig,
      health: Math.floor(baseConfig.health * healthMultiplier),
      speed: baseConfig.speed * speedMultiplier,
      bounty: Math.floor(baseConfig.bounty * Math.sqrt(healthMultiplier))
    };
  }
}