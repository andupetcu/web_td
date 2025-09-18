import { GameManager } from './GameManager';
import { eventBus } from '@/core/EventBus';

export interface SaveSlot {
  id: number;
  name: string;
  timestamp: number;
  screenshot?: string;
  gameData: GameSaveData;
}

export interface GameSaveData {
  version: string;
  timestamp: number;

  // Game state
  lives: number;
  score: number;
  isPlaying: boolean;

  // Wave data
  currentWave: number;
  waveState: string;
  totalEnemiesSpawned: number;
  totalEnemiesKilled: number;

  // Economy data
  economy: any;

  // Tower data
  towers: Array<{
    entityId: number;
    towerType: string;
    gridPosition: { x: number; y: number };
    tier: number;
    totalCost: number;
  }>;

  // Grid state
  gridState: any[][];

  // Settings
  audioSettings: any;
  gameSettings: any;

  // Statistics
  stats: {
    totalGoldEarned: number;
    totalGoldSpent: number;
    totalEnemiesKilled: number;
    totalTowersBuilt: number;
    totalUpgrades: number;
    playTime: number;
  };
}

export class SaveSystem {
  private static readonly STORAGE_KEY = 'td_save_data';
  private static readonly VERSION = '1.0.0';
  private static readonly MAX_SAVES = 5;

  private gameManager: GameManager;
  private autoSaveInterval: number = 30000; // 30 seconds
  private autoSaveTimer: number = 0;
  private autoSaveEnabled: boolean = true;

  constructor(gameManager: GameManager) {
    this.gameManager = gameManager;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Auto-save triggers
    eventBus.on('wave:completed', () => {
      if (this.autoSaveEnabled) {
        this.autoSave();
      }
    });

    eventBus.on('tower:placed', () => {
      this.resetAutoSaveTimer();
    });

    eventBus.on('game:paused', () => {
      if (this.autoSaveEnabled) {
        this.autoSave();
      }
    });

    // Save/load events
    eventBus.on('save:request', (data: { slotId: number; name?: string }) => {
      this.saveGame(data.slotId, data.name);
    });

    eventBus.on('load:request', (data: { slotId: number }) => {
      this.loadGame(data.slotId);
    });

    eventBus.on('save:delete', (data: { slotId: number }) => {
      this.deleteSave(data.slotId);
    });
  }

  update(dt: number): void {
    if (!this.autoSaveEnabled) return;

    this.autoSaveTimer += dt * 1000;
    if (this.autoSaveTimer >= this.autoSaveInterval) {
      this.autoSave();
      this.autoSaveTimer = 0;
    }
  }

  private resetAutoSaveTimer(): void {
    this.autoSaveTimer = 0;
  }

  private autoSave(): void {
    if (this.gameManager.isPlaying) {
      this.saveGame(0, 'Auto Save');
      eventBus.emit('save:autoSaved', { timestamp: Date.now() });
    }
  }

  saveGame(slotId: number, name?: string): boolean {
    try {
      const saveData = this.serializeGameState();
      const saveSlot: SaveSlot = {
        id: slotId,
        name: name || `Save ${slotId}`,
        timestamp: Date.now(),
        gameData: saveData
      };

      // Generate screenshot (placeholder)
      saveSlot.screenshot = this.captureScreenshot();

      const allSaves = this.getAllSaves();
      allSaves[slotId] = saveSlot;

      localStorage.setItem(SaveSystem.STORAGE_KEY, JSON.stringify(allSaves));

      eventBus.emit('save:completed', { slotId, name: saveSlot.name });
      return true;

    } catch (error) {
      console.error('Failed to save game:', error);
      eventBus.emit('save:failed', { slotId, error: error.message });
      return false;
    }
  }

  loadGame(slotId: number): boolean {
    try {
      const allSaves = this.getAllSaves();
      const saveSlot = allSaves[slotId];

      if (!saveSlot) {
        eventBus.emit('load:failed', { slotId, error: 'Save slot not found' });
        return false;
      }

      // Validate save version
      if (saveSlot.gameData.version !== SaveSystem.VERSION) {
        console.warn(`Save version mismatch: ${saveSlot.gameData.version} vs ${SaveSystem.VERSION}`);
        // Could implement migration logic here
      }

      this.deserializeGameState(saveSlot.gameData);

      eventBus.emit('load:completed', { slotId, name: saveSlot.name });
      return true;

    } catch (error) {
      console.error('Failed to load game:', error);
      eventBus.emit('load:failed', { slotId, error: error.message });
      return false;
    }
  }

  deleteSave(slotId: number): boolean {
    try {
      const allSaves = this.getAllSaves();

      if (!allSaves[slotId]) {
        return false;
      }

      delete allSaves[slotId];
      localStorage.setItem(SaveSystem.STORAGE_KEY, JSON.stringify(allSaves));

      eventBus.emit('save:deleted', { slotId });
      return true;

    } catch (error) {
      console.error('Failed to delete save:', error);
      return false;
    }
  }

  getAllSaves(): { [key: number]: SaveSlot } {
    try {
      const savedData = localStorage.getItem(SaveSystem.STORAGE_KEY);
      return savedData ? JSON.parse(savedData) : {};
    } catch (error) {
      console.error('Failed to load saves:', error);
      return {};
    }
  }

  getSaveSlot(slotId: number): SaveSlot | null {
    const allSaves = this.getAllSaves();
    return allSaves[slotId] || null;
  }

  private serializeGameState(): GameSaveData {
    const stats = this.gameManager.getStats();

    // Serialize towers
    const towers = [];
    for (const [entityId, towerData] of this.gameManager.towerFactory.getAllTowers()) {
      towers.push({
        entityId,
        towerType: towerData.config.id,
        gridPosition: towerData.gridPosition,
        tier: towerData.tier,
        totalCost: towerData.totalCost
      });
    }

    // Serialize grid state
    const gridState = [];
    const grid = this.gameManager.grid;
    for (let y = 0; y < grid.getHeight(); y++) {
      gridState[y] = [];
      for (let x = 0; x < grid.getWidth(); x++) {
        const cell = grid.getCell({ x, y });
        gridState[y][x] = {
          type: cell?.type,
          walkable: cell?.walkable,
          buildable: cell?.buildable,
          occupiedBy: cell?.occupiedBy
        };
      }
    }

    return {
      version: SaveSystem.VERSION,
      timestamp: Date.now(),

      // Game state
      lives: this.gameManager.lives,
      score: this.gameManager.score,
      isPlaying: this.gameManager.isPlaying,

      // Wave data
      currentWave: this.gameManager.waveManager.getCurrentWave(),
      waveState: this.gameManager.waveManager.getWaveState(),
      totalEnemiesSpawned: stats.waveProgress.spawned,
      totalEnemiesKilled: stats.waveProgress.spawned - stats.waveProgress.remaining,

      // Economy data
      economy: this.gameManager.economy.serialize(),

      // Tower data
      towers,

      // Grid state
      gridState,

      // Settings
      audioSettings: this.gameManager.audioManager.getSettings(),
      gameSettings: {
        autoSaveEnabled: this.autoSaveEnabled,
        autoSaveInterval: this.autoSaveInterval
      },

      // Statistics
      stats: {
        totalGoldEarned: this.gameManager.economy.getTotalEarned(),
        totalGoldSpent: this.gameManager.economy.getTotalSpent(),
        totalEnemiesKilled: stats.waveProgress.spawned - stats.waveProgress.remaining,
        totalTowersBuilt: towers.length,
        totalUpgrades: towers.reduce((sum, tower) => sum + tower.tier, 0),
        playTime: Date.now() - (this.gameManager as any).startTime || 0
      }
    };
  }

  private deserializeGameState(saveData: GameSaveData): void {
    // Pause game during loading
    const wasPlaying = this.gameManager.isPlaying;
    this.gameManager.pauseGame();

    // Clear current state
    this.gameManager.enemyFactory.clear();
    this.gameManager.projectilePool.clear();

    // Restore basic game state
    this.gameManager.lives = saveData.lives;
    this.gameManager.score = saveData.score;

    // Restore economy
    this.gameManager.economy.deserialize(saveData.economy);

    // Restore wave state
    // Note: This is complex and might require wave manager modifications

    // Restore towers
    for (const towerSave of saveData.towers) {
      const tower = this.gameManager.towerFactory.createTower(
        towerSave.towerType,
        towerSave.gridPosition
      );

      if (tower) {
        // Restore upgrades
        for (let i = 0; i < towerSave.tier; i++) {
          this.gameManager.towerFactory.upgradeTower(tower.id);
        }
      }
    }

    // Restore grid state (if needed)
    // This is complex as it involves pathfinding recalculation

    // Restore settings
    if (saveData.audioSettings) {
      // Apply audio settings
      const audioSettings = saveData.audioSettings;
      this.gameManager.audioManager.setMasterVolume(audioSettings.masterVolume);
      this.gameManager.audioManager.setSfxVolume(audioSettings.sfxVolume);
      this.gameManager.audioManager.setMusicVolume(audioSettings.musicVolume);
      this.gameManager.audioManager.setMuted(audioSettings.muted);
    }

    if (saveData.gameSettings) {
      this.autoSaveEnabled = saveData.gameSettings.autoSaveEnabled;
      this.autoSaveInterval = saveData.gameSettings.autoSaveInterval;
    }

    // Recalculate pathfinding
    this.gameManager.pathManager.markDirty();
    const goal = this.gameManager.grid.getGoal();
    if (goal) {
      this.gameManager.pathManager.computeFlowField(goal);
    }

    // Resume if was playing
    if (wasPlaying && saveData.isPlaying) {
      this.gameManager.resumeGame();
    }
  }

  private captureScreenshot(): string {
    // In a real implementation, this would capture the game canvas
    // For now, return a placeholder
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI/hEsyewAAAABJRU5ErkJggg==';
  }

  // Settings
  setAutoSaveEnabled(enabled: boolean): void {
    this.autoSaveEnabled = enabled;
    eventBus.emit('save:autoSaveToggled', { enabled });
  }

  setAutoSaveInterval(interval: number): void {
    this.autoSaveInterval = Math.max(10000, interval); // Minimum 10 seconds
    this.autoSaveTimer = 0; // Reset timer
  }

  // Utility methods
  exportSave(slotId: number): string | null {
    const saveSlot = this.getSaveSlot(slotId);
    if (!saveSlot) return null;

    return JSON.stringify(saveSlot, null, 2);
  }

  importSave(saveData: string, slotId: number): boolean {
    try {
      const saveSlot: SaveSlot = JSON.parse(saveData);

      // Validate save structure
      if (!saveSlot.gameData || !saveSlot.gameData.version) {
        throw new Error('Invalid save format');
      }

      saveSlot.id = slotId; // Override slot ID

      const allSaves = this.getAllSaves();
      allSaves[slotId] = saveSlot;

      localStorage.setItem(SaveSystem.STORAGE_KEY, JSON.stringify(allSaves));

      eventBus.emit('save:imported', { slotId });
      return true;

    } catch (error) {
      console.error('Failed to import save:', error);
      eventBus.emit('save:importFailed', { error: error.message });
      return false;
    }
  }

  // Cloud save functionality (placeholder)
  async uploadToCloud(slotId: number): Promise<boolean> {
    // Placeholder for cloud save functionality
    const saveSlot = this.getSaveSlot(slotId);
    if (!saveSlot) return false;

    // Would upload to cloud service
    console.log('Cloud save not implemented');
    return false;
  }

  async downloadFromCloud(cloudId: string): Promise<boolean> {
    // Placeholder for cloud load functionality
    console.log('Cloud load not implemented');
    return false;
  }

  // Statistics
  getTotalPlayTime(): number {
    const allSaves = this.getAllSaves();
    let totalTime = 0;

    for (const save of Object.values(allSaves)) {
      totalTime += save.gameData.stats.playTime || 0;
    }

    return totalTime;
  }

  getAchievements(): any[] {
    // Placeholder for achievement system
    return [];
  }
}