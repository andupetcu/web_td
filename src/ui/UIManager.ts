import * as Phaser from 'phaser';
import { eventBus } from '@/core/EventBus';
import { GameManager } from '@/gameplay/GameManager';
import { WaveState } from '@/gameplay/WaveManager';

export interface UITheme {
  primary: number;
  secondary: number;
  success: number;
  warning: number;
  error: number;
  background: number;
  text: number;
  textSecondary: number;
}

export class UIManager {
  private scene: Phaser.Scene;
  private gameManager: GameManager;

  // UI Elements
  private healthBars: Map<number, { bg: Phaser.GameObjects.Rectangle, fill: Phaser.GameObjects.Rectangle }> = new Map();
  private rangeCircles: Map<number, Phaser.GameObjects.Arc> = new Map();
  private notifications: Phaser.GameObjects.Text[] = [];

  // HUD Elements
  private goldText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private interestProgressBar!: { bg: Phaser.GameObjects.Rectangle, fill: Phaser.GameObjects.Rectangle };
  private waveProgressBar!: { bg: Phaser.GameObjects.Rectangle, fill: Phaser.GameObjects.Rectangle };

  // Wave info panel
  private waveInfoPanel!: Phaser.GameObjects.Container;
  private nextWaveButton!: Phaser.GameObjects.Container;

  // Performance overlay
  private performanceOverlay!: Phaser.GameObjects.Container;
  private showPerformance: boolean = false;

  private theme: UITheme = {
    primary: 0x3498db,
    secondary: 0x2c3e50,
    success: 0x27ae60,
    warning: 0xf39c12,
    error: 0xe74c3c,
    background: 0x34495e,
    text: 0xecf0f1,
    textSecondary: 0xbdc3c7
  };

  constructor(scene: Phaser.Scene, gameManager: GameManager) {
    this.scene = scene;
    this.gameManager = gameManager;
    this.setupEventListeners();
    this.createHUD();
  }

  private setupEventListeners(): void {
    // Economy events
    eventBus.on('economy:goldChanged', (data: { gold: number; change: number; source: string }) => {
      this.updateGoldDisplay(data.gold);
      if (data.change !== 0) {
        this.showFloatingText(this.goldText.x + 100, this.goldText.y,
          (data.change > 0 ? '+' : '') + data.change.toString(),
          data.change > 0 ? '#00ff00' : '#ff0000');
      }
    });

    eventBus.on('economy:interest', (data: { amount: number }) => {
      this.showFloatingText(this.goldText.x + 100, this.goldText.y,
        `+${data.amount} Interest`, '#f1c40f');
    });

    // Wave events
    eventBus.on('wave:started', (data: { wave: number; name: string; prepTime: number }) => {
      this.updateWaveDisplay(data.wave);
      this.showWaveStartNotification(data.name);
    });

    eventBus.on('wave:prepTime', (data: { wave: number; timeRemaining: number }) => {
      this.updateWavePrepTimer(data.timeRemaining);
    });

    eventBus.on('wave:completed', (data: { wave: number; bounty: number }) => {
      this.showWaveCompleteNotification(data.wave, data.bounty);
    });

    // Enemy events
    eventBus.on('enemy:spawned', (data: { enemyId: number }) => {
      this.createEnemyHealthBar(data.enemyId);
    });

    eventBus.on('enemy:killed', (data: { enemyId: number; bounty: number }) => {
      this.removeEnemyHealthBar(data.enemyId);
    });

    // Tower events
    eventBus.on('tower:selected', (data: { entityId: number }) => {
      this.showTowerRange(data.entityId);
    });

    eventBus.on('tower:deselected', () => {
      this.hideAllTowerRanges();
    });

    // Game state events
    eventBus.on('game:over', (data: { wave: number; score: number }) => {
      this.showGameOverScreen(data.wave, data.score);
    });
  }

  private createHUD(): void {
    const { width, height } = this.scene.cameras.main;
    const hudHeight = 120;

    // HUD Background
    const hudBg = this.scene.add.rectangle(width / 2, height - hudHeight / 2, width, hudHeight, this.theme.background, 0.9);

    // Gold display with icon
    const goldIcon = this.scene.add.circle(30, height - hudHeight + 30, 12, 0xf1c40f);
    this.goldText = this.scene.add.text(50, height - hudHeight + 30, 'Gold: 0', {
      fontSize: '20px',
      color: '#f1c40f',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    });

    // Lives display with icon
    const livesIcon = this.scene.add.circle(30, height - hudHeight + 60, 12, 0xe74c3c);
    this.livesText = this.scene.add.text(50, height - hudHeight + 60, 'Lives: 20', {
      fontSize: '20px',
      color: '#e74c3c',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    });

    // Wave display
    this.waveText = this.scene.add.text(200, height - hudHeight + 30, 'Wave: 0', {
      fontSize: '20px',
      color: '#3498db',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    });

    // Score display
    this.scoreText = this.scene.add.text(200, height - hudHeight + 60, 'Score: 0', {
      fontSize: '20px',
      color: '#9b59b6',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    });

    // Interest progress bar
    this.createInterestProgressBar();

    // Wave progress bar
    this.createWaveProgressBar();

    // Performance overlay (hidden by default)
    this.createPerformanceOverlay();

    // Wave info panel
    this.createWaveInfoPanel();

    // Controls hint
    this.createControlsHint();
  }

  private createInterestProgressBar(): void {
    const { height } = this.scene.cameras.main;
    const x = 400;
    const y = height - 90;
    const width = 200;
    const height_bar = 8;

    this.interestProgressBar = {
      bg: this.scene.add.rectangle(x, y, width, height_bar, 0x2c3e50),
      fill: this.scene.add.rectangle(x - width/2, y, 0, height_bar, 0xf1c40f)
    };

    this.scene.add.text(x, y - 15, 'Interest Progress', {
      fontSize: '12px',
      color: '#bdc3c7',
      fontFamily: 'Arial, sans-serif'
    }).setOrigin(0.5);
  }

  private createWaveProgressBar(): void {
    const { height } = this.scene.cameras.main;
    const x = 400;
    const y = height - 50;
    const width = 200;
    const height_bar = 8;

    this.waveProgressBar = {
      bg: this.scene.add.rectangle(x, y, width, height_bar, 0x2c3e50),
      fill: this.scene.add.rectangle(x - width/2, y, 0, height_bar, 0xe74c3c)
    };

    this.scene.add.text(x, y - 15, 'Wave Progress', {
      fontSize: '12px',
      color: '#bdc3c7',
      fontFamily: 'Arial, sans-serif'
    }).setOrigin(0.5);
  }

  private createWaveInfoPanel(): void {
    const { width, height } = this.scene.cameras.main;

    this.waveInfoPanel = this.scene.add.container(width - 300, 50);

    const bg = this.scene.add.rectangle(0, 0, 280, 150, this.theme.background, 0.9);
    const title = this.scene.add.text(0, -60, 'Next Wave', {
      fontSize: '18px',
      color: '#ecf0f1',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.waveInfoPanel.add([bg, title]);
    this.waveInfoPanel.setVisible(false);
  }

  private createPerformanceOverlay(): void {
    const { width } = this.scene.cameras.main;

    this.performanceOverlay = this.scene.add.container(width - 200, 20);

    const bg = this.scene.add.rectangle(0, 0, 180, 120, 0x000000, 0.7);
    this.performanceOverlay.add(bg);
    this.performanceOverlay.setVisible(false);
  }

  private createControlsHint(): void {
    const { width, height } = this.scene.cameras.main;

    const hint = this.scene.add.text(width - 20, height - 20,
      'ESC: Menu | SPACE: Spawn Enemy | P: Performance', {
      fontSize: '12px',
      color: '#7f8c8d',
      fontFamily: 'Arial, sans-serif',
      align: 'right'
    });
    hint.setOrigin(1, 1);
  }

  // Health bar management
  private createEnemyHealthBar(enemyId: number): void {
    const position = this.gameManager.world.getComponent(enemyId, 'Position');
    if (!position) return;

    const healthBar = this.gameManager.renderSystem.createHealthBar(enemyId, position.x, position.y);
    this.healthBars.set(enemyId, healthBar);
  }

  private removeEnemyHealthBar(enemyId: number): void {
    const healthBar = this.healthBars.get(enemyId);
    if (healthBar) {
      healthBar.bg.destroy();
      healthBar.fill.destroy();
      this.healthBars.delete(enemyId);
    }
  }

  private updateHealthBars(): void {
    for (const [enemyId, healthBar] of this.healthBars) {
      const position = this.gameManager.world.getComponent(enemyId, 'Position');
      const health = this.gameManager.world.getComponent(enemyId, 'Health');

      if (position && health) {
        const healthPercent = health.getHealthPercent();
        this.gameManager.renderSystem.updateHealthBar(healthBar, healthPercent, position.x, position.y);
      }
    }
  }

  // Tower range visualization
  private showTowerRange(entityId: number): void {
    const position = this.gameManager.world.getComponent(entityId, 'Position');
    const attack = this.gameManager.world.getComponent(entityId, 'Attack');

    if (position && attack) {
      const rangeCircle = this.gameManager.renderSystem.showTowerRange(position.x, position.y, attack.range);
      this.rangeCircles.set(entityId, rangeCircle);
    }
  }

  private hideAllTowerRanges(): void {
    for (const [entityId, circle] of this.rangeCircles) {
      this.gameManager.renderSystem.hideTowerRange(circle);
    }
    this.rangeCircles.clear();
  }

  // Notification system
  private showFloatingText(x: number, y: number, text: string, color: string = '#ffffff'): void {
    this.gameManager.renderSystem.createFloatingText(x, y, text, color);
  }

  private showWaveStartNotification(waveName: string): void {
    const { width } = this.scene.cameras.main;

    const notification = this.scene.add.text(width / 2, 150, `Wave Starting: ${waveName}`, {
      fontSize: '24px',
      color: '#3498db',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    });
    notification.setOrigin(0.5);

    this.scene.tweens.add({
      targets: notification,
      alpha: 0,
      y: 100,
      duration: 3000,
      ease: 'Power2',
      onComplete: () => notification.destroy()
    });
  }

  private showWaveCompleteNotification(wave: number, bounty: number): void {
    const { width } = this.scene.cameras.main;

    const notification = this.scene.add.text(width / 2, 200, `Wave ${wave} Complete!\n+${bounty} Gold Bonus`, {
      fontSize: '20px',
      color: '#27ae60',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
      align: 'center'
    });
    notification.setOrigin(0.5);

    this.scene.tweens.add({
      targets: notification,
      alpha: 0,
      scale: 1.2,
      duration: 2500,
      ease: 'Back.easeOut',
      onComplete: () => notification.destroy()
    });
  }

  private showGameOverScreen(wave: number, score: number): void {
    const { width, height } = this.scene.cameras.main;

    // Dark overlay
    const overlay = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);

    // Game over panel
    const panel = this.scene.add.container(width / 2, height / 2);

    const bg = this.scene.add.rectangle(0, 0, 400, 300, this.theme.background);
    const title = this.scene.add.text(0, -100, 'GAME OVER', {
      fontSize: '36px',
      color: '#e74c3c',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const stats = this.scene.add.text(0, -20,
      `Final Wave: ${wave}\nFinal Score: ${score}\nTowers Built: ${this.gameManager.towerFactory.getAllTowers().size}`, {
      fontSize: '18px',
      color: '#ecf0f1',
      fontFamily: 'Arial, sans-serif',
      align: 'center'
    }).setOrigin(0.5);

    const restartButton = this.scene.add.rectangle(0, 60, 150, 40, this.theme.primary);
    const restartText = this.scene.add.text(0, 60, 'RESTART', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    restartButton.setInteractive({ useHandCursor: true });
    restartButton.on('pointerdown', () => {
      this.scene.scene.restart();
    });

    panel.add([bg, title, stats, restartButton, restartText]);
  }

  // Update methods
  private updateGoldDisplay(gold: number): void {
    this.goldText.setText(`Gold: ${gold}`);
  }

  private updateWaveDisplay(wave: number): void {
    this.waveText.setText(`Wave: ${wave}`);
  }

  private updateLivesDisplay(lives: number): void {
    this.livesText.setText(`Lives: ${lives}`);
  }

  private updateScoreDisplay(score: number): void {
    this.scoreText.setText(`Score: ${score}`);
  }

  private updateWavePrepTimer(timeRemaining: number): void {
    // Show countdown timer for wave preparation
    if (timeRemaining > 0) {
      this.showFloatingText(this.waveText.x, this.waveText.y - 30,
        `Starting in: ${Math.ceil(timeRemaining)}s`, '#3498db');
    }
  }

  private updateInterestProgress(): void {
    const progress = this.gameManager.economy.getInterestProgress();
    const fillWidth = 200 * progress.progress;

    this.interestProgressBar.fill.setSize(fillWidth, 8);
    this.interestProgressBar.fill.setPosition(
      this.interestProgressBar.bg.x - 100 + fillWidth / 2,
      this.interestProgressBar.bg.y
    );
  }

  private updateWaveProgress(): void {
    const progress = this.gameManager.waveManager.getWaveProgress();
    const total = progress.spawned;
    const remaining = progress.remaining;
    const completed = total - remaining;

    const progressPercent = total > 0 ? completed / total : 0;
    const fillWidth = 200 * progressPercent;

    this.waveProgressBar.fill.setSize(fillWidth, 8);
    this.waveProgressBar.fill.setPosition(
      this.waveProgressBar.bg.x - 100 + fillWidth / 2,
      this.waveProgressBar.bg.y
    );
  }

  private updatePerformanceOverlay(): void {
    if (!this.showPerformance) return;

    const stats = this.gameManager.getStats();
    const text = `FPS: ${Math.round(this.scene.game.loop.actualFps)}
Enemies: ${stats.enemies.used}/${stats.enemies.total}
Projectiles: ${stats.projectiles.used}/${stats.projectiles.total}
Towers: ${stats.towers}`;

    // Clear previous text
    this.performanceOverlay.removeAll(true);

    const bg = this.scene.add.rectangle(0, 0, 180, 120, 0x000000, 0.7);
    const perfText = this.scene.add.text(-80, -50, text, {
      fontSize: '12px',
      color: '#00ff00',
      fontFamily: 'monospace'
    });

    this.performanceOverlay.add([bg, perfText]);
  }

  // Public API
  update(): void {
    this.updateHealthBars();
    this.updateInterestProgress();
    this.updateWaveProgress();
    this.updatePerformanceOverlay();

    // Update displays
    this.updateLivesDisplay(this.gameManager.lives);
    this.updateScoreDisplay(this.gameManager.score);
  }

  togglePerformanceOverlay(): void {
    this.showPerformance = !this.showPerformance;
    this.performanceOverlay.setVisible(this.showPerformance);
  }

  showWaveInfo(waveConfig: any): void {
    // Show detailed wave information
    this.waveInfoPanel.setVisible(true);
  }

  hideWaveInfo(): void {
    this.waveInfoPanel.setVisible(false);
  }

  destroy(): void {
    // Clean up health bars
    for (const [entityId, healthBar] of this.healthBars) {
      healthBar.bg.destroy();
      healthBar.fill.destroy();
    }
    this.healthBars.clear();

    // Clean up range circles
    this.hideAllTowerRanges();

    // Clean up notifications
    this.notifications.forEach(notification => notification.destroy());
    this.notifications = [];
  }
}