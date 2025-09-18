import { Entity } from '@/ecs/Entity';
import { World } from '@/ecs/World';
import { Position } from '@/ecs/components/Position';
import { Attack } from '@/ecs/components/Attack';
import { Render } from '@/ecs/components/Render';
import { Team, TeamType } from '@/ecs/components/Team';
import { GridPos } from '@/core/types';
import { Grid } from '@/gameplay/Grid';
import towerData from '@/config/towers.json';

export interface TowerConfig {
  id: string;
  name: string;
  type: string;
  baseDamage: number;
  range: number;
  fireRate: number;
  cost: number;
  texture: string;
  projectileType: string;
  description: string;
  splash?: {
    radius: number;
    falloff: number;
  };
  slow?: {
    pct: number;
    duration: number;
  };
  dot?: {
    dps: number;
    tick: number;
    duration: number;
  };
  buffs?: {
    dmg: number;
    firerate: number;
    radius: number;
  };
  upgrades: Array<{
    tier: number;
    damageMult: number;
    rangeMult: number;
    fireRateMult: number;
    cost: number;
  }>;
}

export class TowerData {
  public tier: number = 0;
  public totalCost: number = 0;
  public config: TowerConfig;
  public gridPosition: GridPos;
  public lastTargetId?: number;
  public buffedDamage: number = 0;
  public buffedFireRate: number = 0;

  constructor(config: TowerConfig, gridPos: GridPos) {
    this.config = config;
    this.gridPosition = gridPos;
    this.totalCost = config.cost;
    this.buffedDamage = config.baseDamage;
    this.buffedFireRate = config.fireRate;
  }

  getCurrentDamage(): number {
    const upgrade = this.config.upgrades[this.tier - 1];
    const baseDamage = this.config.baseDamage * (upgrade?.damageMult || 1);
    return Math.floor(baseDamage + this.buffedDamage);
  }

  getCurrentRange(): number {
    const upgrade = this.config.upgrades[this.tier - 1];
    return this.config.range * (upgrade?.rangeMult || 1);
  }

  getCurrentFireRate(): number {
    const upgrade = this.config.upgrades[this.tier - 1];
    const baseFireRate = this.config.fireRate * (upgrade?.fireRateMult || 1);
    return baseFireRate + this.buffedFireRate;
  }

  getUpgradeCost(): number {
    if (this.tier >= this.config.upgrades.length) {
      return 0; // Max level
    }
    return this.config.upgrades[this.tier].cost;
  }

  canUpgrade(): boolean {
    return this.tier < this.config.upgrades.length;
  }

  upgrade(): boolean {
    if (!this.canUpgrade()) {
      return false;
    }

    this.totalCost += this.getUpgradeCost();
    this.tier++;
    return true;
  }

  applyBuffs(damageBonus: number, fireRateBonus: number): void {
    this.buffedDamage = damageBonus;
    this.buffedFireRate = fireRateBonus;
  }
}

export class TowerFactory {
  private world: World;
  private grid: Grid;
  private towerConfigs: Map<string, TowerConfig> = new Map();
  private towerData: Map<number, TowerData> = new Map();

  constructor(world: World, grid: Grid) {
    this.world = world;
    this.grid = grid;
    this.loadTowerConfigs();
  }

  private loadTowerConfigs(): void {
    for (const config of towerData as TowerConfig[]) {
      this.towerConfigs.set(config.id, config);
    }
  }

  getTowerConfig(id: string): TowerConfig | undefined {
    return this.towerConfigs.get(id);
  }

  getAllTowerConfigs(): TowerConfig[] {
    return Array.from(this.towerConfigs.values());
  }

  createTower(towerType: string, gridPos: GridPos): Entity | null {
    const config = this.towerConfigs.get(towerType);
    if (!config) {
      console.error(`Unknown tower type: ${towerType}`);
      return null;
    }

    // Check if position is buildable
    if (!this.grid.isBuildable(gridPos)) {
      console.warn(`Cannot build tower at ${gridPos.x}, ${gridPos.y}`);
      return null;
    }

    // Create entity
    const entity = this.world.createEntity();

    // Convert grid position to world position
    const worldPos = this.grid.gridToWorld(gridPos);

    // Add components
    this.world.addComponent(entity.id, new Position(worldPos.x, worldPos.y));
    this.world.addComponent(entity.id, new Attack(config.baseDamage, config.range, config.fireRate));
    this.world.addComponent(entity.id, new Render(config.texture));
    this.world.addComponent(entity.id, new Team(TeamType.PLAYER));

    // Create tower data
    const towerData = new TowerData(config, gridPos);
    this.towerData.set(entity.id, towerData);

    // Place tower on grid
    if (!this.grid.placeTower(gridPos, entity.id)) {
      // Failed to place - clean up
      this.world.destroyEntity(entity.id);
      this.towerData.delete(entity.id);
      return null;
    }

    return entity;
  }

  destroyTower(entityId: number): boolean {
    const towerData = this.towerData.get(entityId);
    if (!towerData) {
      return false;
    }

    // Remove from grid
    this.grid.removeTower(towerData.gridPosition);

    // Remove tower data
    this.towerData.delete(entityId);

    // Destroy entity
    this.world.destroyEntity(entityId);

    return true;
  }

  upgradeTower(entityId: number): boolean {
    const towerData = this.towerData.get(entityId);
    if (!towerData || !towerData.canUpgrade()) {
      return false;
    }

    // Upgrade the tower
    towerData.upgrade();

    // Update components with new stats
    const attack = this.world.getComponent<Attack>(entityId, 'Attack');
    if (attack) {
      attack.damage = towerData.getCurrentDamage();
      attack.range = towerData.getCurrentRange();
      attack.fireRate = towerData.getCurrentFireRate();
    }

    return true;
  }

  getTowerData(entityId: number): TowerData | undefined {
    return this.towerData.get(entityId);
  }

  getTowerCost(towerType: string): number {
    const config = this.towerConfigs.get(towerType);
    return config?.cost || 0;
  }

  getUpgradeCost(entityId: number): number {
    const towerData = this.towerData.get(entityId);
    return towerData?.getUpgradeCost() || 0;
  }

  getSellValue(entityId: number): number {
    const towerData = this.towerData.get(entityId);
    if (!towerData) return 0;

    // Return 70% of total cost invested
    return Math.floor(towerData.totalCost * 0.7);
  }

  // Get all towers for buff calculations
  getAllTowers(): Map<number, TowerData> {
    return this.towerData;
  }

  // Calculate buffs from support towers
  calculateBuffs(): void {
    const supportTowers: Array<{ entityId: number; data: TowerData; position: Position }> = [];
    const allTowers: Array<{ entityId: number; data: TowerData; position: Position }> = [];

    // Collect all towers and identify support towers
    for (const [entityId, towerData] of this.towerData) {
      const position = this.world.getComponent<Position>(entityId, 'Position');
      if (!position) continue;

      const towerInfo = { entityId, data: towerData, position };
      allTowers.push(towerInfo);

      if (towerData.config.type === 'support') {
        supportTowers.push(towerInfo);
      }
    }

    // Reset all buffs
    for (const tower of allTowers) {
      tower.data.applyBuffs(0, 0);
    }

    // Apply support tower buffs
    for (const supportTower of supportTowers) {
      const supportConfig = supportTower.data.config;
      if (!supportConfig.buffs) continue;

      const buffRange = supportTower.data.getCurrentRange();

      for (const tower of allTowers) {
        if (tower.entityId === supportTower.entityId) continue;

        // Calculate distance
        const dx = tower.position.x - supportTower.position.x;
        const dy = tower.position.y - supportTower.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= buffRange) {
          // Apply buffs
          const damageBonus = (supportConfig.buffs.dmg - 1) * tower.data.config.baseDamage;
          const fireRateBonus = (supportConfig.buffs.firerate - 1) * tower.data.config.fireRate;

          tower.data.applyBuffs(
            tower.data.buffedDamage + damageBonus,
            tower.data.buffedFireRate + fireRateBonus
          );
        }
      }
    }

    // Update attack components with buffed values
    for (const tower of allTowers) {
      const attack = this.world.getComponent<Attack>(tower.entityId, 'Attack');
      if (attack) {
        attack.damage = tower.data.getCurrentDamage();
        attack.fireRate = tower.data.getCurrentFireRate();
      }
    }
  }
}