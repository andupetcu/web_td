import { World } from '@/ecs/World';
import { Grid } from './Grid';
import { PathManager } from './PathManager';
import { CollisionManager } from './CollisionManager';
import { WaveManager } from './WaveManager';
import { Economy, EconomyConfig } from './Economy';
import { TowerFactory } from '@/towers/TowerFactory';
import { EnemyFactory } from '@/enemies/EnemyFactory';
import { EnemyPool } from '@/ecs/pools/EnemyPool';
import { ProjectilePool } from '@/ecs/pools/ProjectilePool';
import { Position } from '@/ecs/components/Position';
import { Team } from '@/ecs/components/Team';
import { AudioManager } from '@/audio/AudioManager';

// Systems
import { MovementSystem } from '@/ecs/systems/MovementSystem';
import { TargetingSystem } from '@/ecs/systems/TargetingSystem';
import { RenderSystem } from '@/ecs/systems/RenderSystem';
import { ProjectileSystem } from '@/ecs/systems/ProjectileSystem';

import gameConfig from '@/config/GameConfig.json';
import { eventBus } from '@/core/EventBus';

export class GameManager {
  // Core systems
  public world: World;
  public grid: Grid;
  public pathManager: PathManager;
  public collisionManager: CollisionManager;
  public waveManager: WaveManager;
  public economy: Economy;
  public audioManager: AudioManager;

  // Factories
  public towerFactory: TowerFactory;
  public enemyFactory: EnemyFactory;
  public projectilePool: ProjectilePool;

  // ECS Systems
  public movementSystem: MovementSystem;
  public targetingSystem: TargetingSystem;
  public renderSystem: RenderSystem;
  public projectileSystem: ProjectileSystem;

  // Game state
  public lives: number = 20;
  public isPlaying: boolean = false;
  public score: number = 0;

  constructor(scene: Phaser.Scene) {
    // Initialize core systems
    this.world = new World();
    this.grid = new Grid(gameConfig.mapWidth, gameConfig.mapHeight, gameConfig.gridSize);
    this.pathManager = new PathManager(this.grid);
    this.collisionManager = new CollisionManager(gameConfig.performance.spatialHashCellSize);

    // Initialize audio
    this.audioManager = new AudioManager();
    this.audioManager.initialize();

    // Initialize economy
    const economyConfig: EconomyConfig = {
      startingGold: gameConfig.startingGold,
      interestRate: 0.02,
      interestInterval: 15.0,
      maxInterestGold: 1000,
      killBountyMultiplier: 1.0,
      waveBountyMultiplier: 1.0,
      sellRefundRate: 0.7
    };
    this.economy = new Economy(economyConfig);

    // Initialize factories
    this.towerFactory = new TowerFactory(this.world, this.grid);
    this.enemyFactory = new EnemyFactory(this.world, this.grid, this.pathManager);
    this.projectilePool = new ProjectilePool(gameConfig.performance.maxProjectiles, this.world);

    // Initialize wave manager
    this.waveManager = new WaveManager(this.enemyFactory);

    // Initialize ECS systems
    this.renderSystem = new RenderSystem(scene);
    this.movementSystem = new MovementSystem(this.pathManager, this.enemyFactory);
    this.targetingSystem = new TargetingSystem(this.collisionManager, this.towerFactory, this.projectilePool);
    this.projectileSystem = new ProjectileSystem(this.projectilePool, this.collisionManager, this.enemyFactory, this.renderSystem, this.world);

    // Add systems to world
    this.world.addSystem(this.movementSystem);
    this.world.addSystem(this.targetingSystem);
    this.world.addSystem(this.renderSystem);
    this.world.addSystem(this.projectileSystem);

    // Setup event listeners
    this.setupEventListeners();

    // Compute initial flow field
    const goal = this.grid.getGoal();
    if (goal) {
      this.pathManager.computeFlowField(goal);
    }
  }

  private setupEventListeners(): void {
    // Tower events
    eventBus.on('tower:place', (data: { towerType: string; gridX: number; gridY: number }) => {
      this.placeTower(data.towerType, { x: data.gridX, y: data.gridY });
    });

    eventBus.on('tower:upgrade', (data: { entityId: number }) => {
      this.upgradeTower(data.entityId);
    });

    // Wave events
    eventBus.on('wave:start', () => {
      this.waveManager.startNextWave();
    });

    eventBus.on('wave:completed', (data: { bounty: number; wave: number }) => {
      this.score += data.bounty * 10; // Score bonus for wave completion
    });

    // Enemy events
    eventBus.on('enemy:killed', (data: { bounty: number; enemyType: string; enemyId: number }) => {
      this.score += data.bounty;
    });

    eventBus.on('enemy:reachedGoal', () => {
      this.lives--;
      if (this.lives <= 0) {
        this.gameOver();
      }
    });

    // Economy events
    eventBus.on('economy:goldChanged', (data: { gold: number }) => {
      eventBus.emit('ui:goldUpdate', { gold: data.gold });
    });
  }

  update(dt: number): void {
    if (!this.isPlaying) return;

    // Update core systems
    this.waveManager.update(dt);
    this.economy.update(dt);

    // Update ECS world
    this.world.update(dt);

    // Update spatial grid with current entity positions
    this.updateSpatialGrid();

    // Recalculate tower buffs
    this.towerFactory.calculateBuffs();

    // Check for wave completion or game over conditions
    this.checkGameState();
  }

  private updateSpatialGrid(): void {
    // Clear and repopulate spatial grid
    this.collisionManager.clear();

    // Add all enemies to spatial grid
    const activeEnemies = this.enemyFactory.getActiveEnemies();
    for (const enemyId of activeEnemies) {
      const position = this.world.getComponent<Position>(enemyId, 'Position');
      const team = this.world.getComponent<Team>(enemyId, 'Team');

      if (position && team) {
        this.collisionManager.addObject({
          entityId: enemyId,
          position: { x: position.x, y: position.y },
          radius: 12,
          team: team.team
        });
      }
    }
  }

  placeTower(towerType: string, gridPos: { x: number; y: number }): boolean {
    const cost = this.towerFactory.getTowerCost(towerType);

    if (!this.economy.canAfford(cost)) {
      eventBus.emit('notification', { message: 'Not enough gold!', type: 'error' });
      return false;
    }

    const tower = this.towerFactory.createTower(towerType, gridPos);
    if (!tower) {
      eventBus.emit('notification', { message: 'Cannot place tower here!', type: 'error' });
      return false;
    }

    this.economy.spendGold(cost, `${towerType} tower`);
    this.pathManager.markDirty(); // Recompute pathfinding

    eventBus.emit('tower:purchased', { cost, towerType });
    eventBus.emit('tower:placed');
    eventBus.emit('notification', { message: `${towerType} tower placed!`, type: 'success' });

    return true;
  }

  upgradeTower(entityId: number): boolean {
    const cost = this.towerFactory.getUpgradeCost(entityId);

    if (!this.economy.canAfford(cost)) {
      eventBus.emit('notification', { message: 'Not enough gold to upgrade!', type: 'error' });
      return false;
    }

    const towerData = this.towerFactory.getTowerData(entityId);
    if (this.towerFactory.upgradeTower(entityId)) {
      this.economy.spendGold(cost, `${towerData?.config.name || 'Tower'} upgrade`);
      eventBus.emit('tower:upgraded', { cost, towerType: towerData?.config.name || 'Unknown' });
      eventBus.emit('notification', { message: 'Tower upgraded!', type: 'success' });
      return true;
    }

    return false;
  }

  spawnEnemy(enemyType: string): boolean {
    const enemy = this.enemyFactory.spawnEnemy(enemyType);
    if (enemy) {
      eventBus.emit('enemy:spawned', { enemyId: enemy.id, enemyType });
      return true;
    }
    return false;
  }

  private checkGameState(): void {
    // Check if all enemies are dead and wave is complete
    const activeEnemies = this.enemyFactory.getActiveEnemies();

    if (activeEnemies.size === 0) {
      // Wave complete logic would go here
    }

    // Check for game over
    if (this.lives <= 0) {
      this.gameOver();
    }
  }

  startGame(): void {
    this.isPlaying = true;
    this.currentWave = 1;
    eventBus.emit('game:started');
  }

  pauseGame(): void {
    this.isPlaying = false;
    eventBus.emit('game:paused');
  }

  resumeGame(): void {
    this.isPlaying = true;
    eventBus.emit('game:resumed');
  }

  gameOver(): void {
    this.isPlaying = false;
    eventBus.emit('game:over', { wave: this.currentWave, gold: this.gold });
  }

  // Utility methods
  getStats(): any {
    return {
      gold: this.economy.getGold(),
      lives: this.lives,
      wave: this.waveManager.getCurrentWave(),
      score: this.score,
      enemies: this.enemyFactory.getPoolStats(),
      projectiles: this.projectilePool.getPoolStats(),
      towers: this.towerFactory.getAllTowers().size,
      waveState: this.waveManager.getWaveState(),
      waveProgress: this.waveManager.getWaveProgress()
    };
  }

  getTowerAt(gridPos: { x: number; y: number }): number | null {
    const cell = this.grid.getCell(gridPos);
    return cell?.occupiedBy || null;
  }

  destroy(): void {
    this.renderSystem.destroy();
    this.enemyFactory.clear();
    this.projectilePool.clear();
    this.audioManager.destroy();
    eventBus.clear();
  }
}