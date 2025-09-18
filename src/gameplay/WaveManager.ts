import { EnemyFactory } from '@/enemies/EnemyFactory';
import { eventBus } from '@/core/EventBus';
import waveData from '@/config/waves.json';

export interface WaveEnemySpawn {
  type: string;
  count: number;
  interval: number;
  delay?: number;
}

export interface WaveConfig {
  id: number;
  name: string;
  enemies: WaveEnemySpawn[];
  bounty: number;
  prepTime: number;
}

export interface WaveScaling {
  mode: 'linear' | 'exponential' | 'adaptive';
  baseMultiplier: number;
  healthScaling: number;
  speedScaling: number;
  bountyScaling: number;
  deltaPct: number;
}

export enum WaveState {
  WAITING = 'waiting',
  PREPARING = 'preparing',
  SPAWNING = 'spawning',
  ACTIVE = 'active',
  COMPLETED = 'completed'
}

export class WaveManager {
  private enemyFactory: EnemyFactory;
  private waves: WaveConfig[] = [];
  private scaling: WaveScaling;
  private currentWave: number = 0;
  private waveState: WaveState = WaveState.WAITING;

  // Timing
  private prepTimer: number = 0;
  private spawnTimer: number = 0;
  private currentSpawnGroup: number = 0;
  private enemiesSpawnedInGroup: number = 0;

  // Wave tracking
  private totalEnemiesSpawned: number = 0;
  private totalEnemiesKilled: number = 0;
  private waveStartTime: number = 0;

  // Auto-start settings
  private autoStart: boolean = false;
  private autoStartDelay: number = 3.0;

  constructor(enemyFactory: EnemyFactory) {
    this.enemyFactory = enemyFactory;
    this.loadWaveData();
    this.setupEventListeners();
  }

  private loadWaveData(): void {
    this.waves = waveData.waves as WaveConfig[];
    this.scaling = waveData.scaling as WaveScaling;
  }

  private setupEventListeners(): void {
    eventBus.on('enemy:killed', () => {
      this.totalEnemiesKilled++;
      this.checkWaveCompletion();
    });

    eventBus.on('enemy:reachedGoal', () => {
      // Enemy reached goal - handled by GameManager for life loss
      this.totalEnemiesKilled++; // Count as "removed" for wave completion
      this.checkWaveCompletion();
    });
  }

  update(dt: number): void {
    switch (this.waveState) {
      case WaveState.PREPARING:
        this.updatePreparing(dt);
        break;
      case WaveState.SPAWNING:
        this.updateSpawning(dt);
        break;
      case WaveState.ACTIVE:
        this.updateActive(dt);
        break;
    }
  }

  private updatePreparing(dt: number): void {
    this.prepTimer -= dt;

    eventBus.emit('wave:prepTime', {
      wave: this.currentWave,
      timeRemaining: Math.max(0, this.prepTimer)
    });

    if (this.prepTimer <= 0) {
      this.startSpawning();
    }
  }

  private updateSpawning(dt: number): void {
    const currentWaveConfig = this.getCurrentWaveConfig();
    if (!currentWaveConfig) return;

    this.spawnTimer += dt;

    // Check if we should start the next spawn group
    if (this.currentSpawnGroup < currentWaveConfig.enemies.length) {
      const spawnGroup = currentWaveConfig.enemies[this.currentSpawnGroup];
      const groupDelay = spawnGroup.delay || 0;

      if (this.spawnTimer >= groupDelay) {
        // Check if it's time to spawn the next enemy in this group
        const timeSinceGroupStart = this.spawnTimer - groupDelay;
        const expectedSpawns = Math.floor(timeSinceGroupStart / spawnGroup.interval) + 1;

        if (this.enemiesSpawnedInGroup < expectedSpawns &&
            this.enemiesSpawnedInGroup < spawnGroup.count) {
          this.spawnEnemy(spawnGroup.type);
          this.enemiesSpawnedInGroup++;
        }

        // Check if this group is complete
        if (this.enemiesSpawnedInGroup >= spawnGroup.count) {
          this.currentSpawnGroup++;
          this.enemiesSpawnedInGroup = 0;
        }
      }
    }

    // Check if all groups are complete
    if (this.currentSpawnGroup >= currentWaveConfig.enemies.length) {
      this.waveState = WaveState.ACTIVE;
      eventBus.emit('wave:spawningComplete', { wave: this.currentWave });
    }
  }

  private updateActive(dt: number): void {
    // Wave is active, waiting for all enemies to be killed
    // Completion is checked in checkWaveCompletion()
  }

  private spawnEnemy(enemyType: string): void {
    const scaledConfig = this.getScaledEnemyConfig(enemyType);
    if (scaledConfig) {
      // Create a temporary enemy config with scaled stats
      const originalConfig = this.enemyFactory.getEnemyConfig(enemyType);
      if (originalConfig) {
        // Override the config temporarily for scaling
        const scaledStats = {
          ...originalConfig,
          health: Math.floor(originalConfig.health * scaledConfig.healthMultiplier),
          speed: originalConfig.speed * scaledConfig.speedMultiplier,
          bounty: Math.floor(originalConfig.bounty * scaledConfig.bountyMultiplier)
        };

        const enemy = this.enemyFactory.spawnEnemy(enemyType);
        if (enemy) {
          // Apply scaling manually if needed
          this.totalEnemiesSpawned++;
          eventBus.emit('enemy:spawned', {
            enemyId: enemy.id,
            enemyType,
            wave: this.currentWave
          });
        }
      }
    }
  }

  private getScaledEnemyConfig(enemyType: string): { healthMultiplier: number; speedMultiplier: number; bountyMultiplier: number } | null {
    if (this.currentWave <= 1) {
      return { healthMultiplier: 1, speedMultiplier: 1, bountyMultiplier: 1 };
    }

    const waveNumber = this.currentWave;
    let healthMult = 1;
    let speedMult = 1;
    let bountyMult = 1;

    switch (this.scaling.mode) {
      case 'linear':
        healthMult = 1 + (waveNumber - 1) * this.scaling.healthScaling;
        speedMult = 1 + (waveNumber - 1) * this.scaling.speedScaling;
        bountyMult = 1 + (waveNumber - 1) * this.scaling.bountyScaling;
        break;

      case 'exponential':
        healthMult = Math.pow(1 + this.scaling.healthScaling, waveNumber - 1);
        speedMult = Math.pow(1 + this.scaling.speedScaling, waveNumber - 1);
        bountyMult = Math.pow(1 + this.scaling.bountyScaling, waveNumber - 1);
        break;

      case 'adaptive':
        // Simple adaptive scaling - could be enhanced with performance metrics
        const baseMult = 1 + (waveNumber - 1) * 0.1;
        healthMult = baseMult * (1 + this.scaling.healthScaling);
        speedMult = Math.min(2.0, 1 + (waveNumber - 1) * this.scaling.speedScaling);
        bountyMult = baseMult * (1 + this.scaling.bountyScaling);
        break;
    }

    return { healthMultiplier: healthMult, speedMultiplier: speedMult, bountyMultiplier: bountyMult };
  }

  private checkWaveCompletion(): void {
    if (this.waveState !== WaveState.ACTIVE) return;

    const activeEnemies = this.enemyFactory.getActiveEnemies().size;

    if (activeEnemies === 0 && this.totalEnemiesKilled >= this.totalEnemiesSpawned) {
      this.completeWave();
    }
  }

  private completeWave(): void {
    const waveConfig = this.getCurrentWaveConfig();
    const completionTime = (performance.now() - this.waveStartTime) / 1000;

    this.waveState = WaveState.COMPLETED;

    // Award wave completion bonus
    eventBus.emit('wave:completed', {
      wave: this.currentWave,
      bounty: waveConfig?.bounty || 0,
      completionTime,
      enemiesKilled: this.totalEnemiesKilled
    });

    // Reset for next wave
    this.totalEnemiesSpawned = 0;
    this.totalEnemiesKilled = 0;
    this.currentSpawnGroup = 0;
    this.enemiesSpawnedInGroup = 0;
    this.spawnTimer = 0;

    // Auto-start next wave if enabled
    if (this.autoStart) {
      setTimeout(() => {
        this.startNextWave();
      }, this.autoStartDelay * 1000);
    } else {
      this.waveState = WaveState.WAITING;
      eventBus.emit('wave:readyForNext', { nextWave: this.currentWave + 1 });
    }
  }

  // Public API
  startWave(waveNumber?: number): boolean {
    if (this.waveState !== WaveState.WAITING && this.waveState !== WaveState.COMPLETED) {
      return false;
    }

    if (waveNumber !== undefined) {
      this.currentWave = waveNumber;
    } else {
      this.currentWave++;
    }

    const waveConfig = this.getCurrentWaveConfig();
    if (!waveConfig) {
      // Generate endless wave
      this.generateEndlessWave();
      return true;
    }

    this.waveState = WaveState.PREPARING;
    this.prepTimer = waveConfig.prepTime;
    this.waveStartTime = performance.now();

    eventBus.emit('wave:started', {
      wave: this.currentWave,
      name: waveConfig.name,
      prepTime: waveConfig.prepTime
    });

    return true;
  }

  startNextWave(): boolean {
    return this.startWave();
  }

  private startSpawning(): void {
    this.waveState = WaveState.SPAWNING;
    this.spawnTimer = 0;
    this.currentSpawnGroup = 0;
    this.enemiesSpawnedInGroup = 0;

    eventBus.emit('wave:spawningStarted', { wave: this.currentWave });
  }

  private generateEndlessWave(): void {
    const endlessConfig = waveData.endless;
    if (!endlessConfig.enabled) return;

    const waveMultiplier = Math.floor((this.currentWave - endlessConfig.startWave) / 5) + 1;
    const template = endlessConfig.template;

    const generatedWave: WaveConfig = {
      id: this.currentWave,
      name: `Endless Wave ${this.currentWave}`,
      enemies: template.enemies.map(enemy => ({
        ...enemy,
        count: Math.floor(enemy.count * waveMultiplier)
      })),
      bounty: Math.floor(template.bounty * waveMultiplier),
      prepTime: template.prepTime
    };

    // Add to waves array temporarily
    this.waves[this.currentWave - 1] = generatedWave;

    this.waveState = WaveState.PREPARING;
    this.prepTimer = generatedWave.prepTime;
    this.waveStartTime = performance.now();

    eventBus.emit('wave:started', {
      wave: this.currentWave,
      name: generatedWave.name,
      prepTime: generatedWave.prepTime
    });
  }

  // Getters
  getCurrentWave(): number {
    return this.currentWave;
  }

  getWaveState(): WaveState {
    return this.waveState;
  }

  getCurrentWaveConfig(): WaveConfig | null {
    return this.waves[this.currentWave - 1] || null;
  }

  getNextWaveConfig(): WaveConfig | null {
    return this.waves[this.currentWave] || null;
  }

  getWaveProgress(): { spawned: number; killed: number; remaining: number } {
    const activeEnemies = this.enemyFactory.getActiveEnemies().size;
    return {
      spawned: this.totalEnemiesSpawned,
      killed: this.totalEnemiesKilled,
      remaining: activeEnemies
    };
  }

  // Settings
  setAutoStart(enabled: boolean, delay: number = 3.0): void {
    this.autoStart = enabled;
    this.autoStartDelay = delay;
  }

  // Skip current wave preparation
  skipPrep(): boolean {
    if (this.waveState === WaveState.PREPARING) {
      this.prepTimer = 0;
      return true;
    }
    return false;
  }

  // Emergency stop
  stopWave(): void {
    this.waveState = WaveState.WAITING;
    this.enemyFactory.clear();
    this.totalEnemiesSpawned = 0;
    this.totalEnemiesKilled = 0;
  }
}