import * as Phaser from 'phaser';
import { GameManager } from '@/gameplay/GameManager';
import { eventBus } from '@/core/EventBus';
import gameConfig from '@/config/GameConfig.json';

export class PlayScene extends Phaser.Scene {
  private gameManager!: GameManager;
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private selectedTowerType: string | null = null;
  private goldText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'PlayScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Initialize Game Manager
    this.gameManager = new GameManager(this);

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x2c3e50);

    // Create grid graphics
    this.gridGraphics = this.add.graphics();
    this.drawGrid();

    // HUD area
    const hudHeight = gameConfig.ui.hudHeight;
    const hudBackground = this.add.rectangle(width / 2, height - hudHeight / 2, width, hudHeight, 0x34495e);

    // UI Text elements
    this.goldText = this.add.text(20, height - hudHeight + 20, `Gold: ${this.gameManager.economy.getGold()}`, {
      fontSize: '24px',
      color: '#f1c40f',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    });

    this.waveText = this.add.text(200, height - hudHeight + 20, `Wave: ${this.gameManager.waveManager.getCurrentWave()}`, {
      fontSize: '24px',
      color: '#e74c3c',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    });

    this.livesText = this.add.text(350, height - hudHeight + 20, `Lives: ${this.gameManager.lives}`, {
      fontSize: '24px',
      color: '#e67e22',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    });

    // Tower palette
    const paletteWidth = gameConfig.ui.towerPaletteWidth;
    const paletteBackground = this.add.rectangle(width - paletteWidth / 2, height / 2 - hudHeight / 2, paletteWidth, height - hudHeight, 0x2c3e50);

    this.createTowerPalette();

    // Setup event listeners
    this.setupEventListeners();

    // Controls
    this.setupControls();

    // Start the game
    this.gameManager.startGame();

    // Add wave control button
    const startWaveButton = this.add.rectangle(500, height - hudHeight + 30, 120, 40, 0x27ae60);
    startWaveButton.setInteractive({ useHandCursor: true });
    startWaveButton.on('pointerdown', () => {
      eventBus.emit('wave:start');
      eventBus.emit('ui:click');
    });

    this.add.text(500, height - hudHeight + 30, 'Start Wave', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);
  }

  update(time: number, delta: number): void {
    const dt = delta / 1000;
    this.gameManager.update(dt);
  }

  private setupEventListeners(): void {
    eventBus.on('ui:goldUpdate', (data: { gold: number }) => {
      this.goldText.setText(`Gold: ${data.gold}`);
    });

    eventBus.on('wave:started', (data: { wave: number; name: string }) => {
      this.waveText.setText(`Wave: ${data.wave}`);
      this.showNotification(`${data.name} incoming!`, 'info');
    });

    eventBus.on('wave:completed', (data: { wave: number; bounty: number }) => {
      this.showNotification(`Wave ${data.wave} completed! +${data.bounty} gold`, 'success');
    });

    eventBus.on('notification', (data: { message: string; type: string }) => {
      this.showNotification(data.message, data.type);
    });
  }

  private setupControls(): void {
    // ESC to return to menu
    this.input.keyboard?.on('keydown-ESC', () => {
      this.gameManager.destroy();
      this.scene.start('MainMenuScene');
    });

    // Grid interaction
    this.input.on('pointerdown', this.onGridClick, this);

    // Space to spawn enemy (for testing)
    this.input.keyboard?.on('keydown-SPACE', () => {
      this.gameManager.spawnEnemy('normal');
    });
  }

  private showNotification(message: string, type: string): void {
    const color = type === 'error' ? '#ff0000' : type === 'success' ? '#00ff00' : type === 'info' ? '#3498db' : '#ffffff';

    const notification = this.add.text(this.cameras.main.width / 2, 100, message, {
      fontSize: '18px',
      color: color,
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    });
    notification.setOrigin(0.5);

    this.tweens.add({
      targets: notification,
      alpha: 0,
      y: 50,
      duration: 2000,
      onComplete: () => notification.destroy()
    });
  }

  private drawGrid(): void {
    const { width, height } = this.cameras.main;
    const gridSize = gameConfig.gridSize;
    const hudHeight = gameConfig.ui.hudHeight;
    const paletteWidth = gameConfig.ui.towerPaletteWidth;

    this.gridGraphics.clear();
    this.gridGraphics.lineStyle(1, 0x7f8c8d, 0.3);

    // Draw vertical lines
    for (let x = 0; x <= width - paletteWidth; x += gridSize) {
      this.gridGraphics.moveTo(x, 0);
      this.gridGraphics.lineTo(x, height - hudHeight);
    }

    // Draw horizontal lines
    for (let y = 0; y <= height - hudHeight; y += gridSize) {
      this.gridGraphics.moveTo(0, y);
      this.gridGraphics.lineTo(width - paletteWidth, y);
    }

    this.gridGraphics.strokePath();
  }

  private createTowerPalette(): void {
    const { width, height } = this.cameras.main;
    const paletteWidth = gameConfig.ui.towerPaletteWidth;
    const hudHeight = gameConfig.ui.hudHeight;

    const paletteX = width - paletteWidth / 2;
    const startY = 50;

    // Tower palette title
    this.add.text(paletteX, 20, 'TOWERS', {
      fontSize: '18px',
      color: '#ecf0f1',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Basic Tower
    const basicTower = this.add.rectangle(paletteX, startY, 60, 60, 0x4a90e2);
    basicTower.setInteractive({ useHandCursor: true });
    basicTower.on('pointerdown', () => this.selectTowerType('basic'));
    this.add.text(paletteX, startY + 40, 'Basic\n$10', {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      align: 'center'
    }).setOrigin(0.5);

    // AOE Tower
    const aoeTower = this.add.rectangle(paletteX, startY + 100, 60, 60, 0xe74c3c);
    aoeTower.setInteractive({ useHandCursor: true });
    aoeTower.on('pointerdown', () => this.selectTowerType('aoe'));
    this.add.text(paletteX, startY + 140, 'AOE\n$25', {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      align: 'center'
    }).setOrigin(0.5);

    // Slow Tower
    const slowTower = this.add.rectangle(paletteX, startY + 200, 60, 60, 0x3498db);
    slowTower.setInteractive({ useHandCursor: true });
    slowTower.on('pointerdown', () => this.selectTowerType('slow'));
    this.add.text(paletteX, startY + 240, 'Slow\n$15', {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      align: 'center'
    }).setOrigin(0.5);
  }

  private selectTowerType(towerType: string): void {
    this.selectedTowerType = towerType;
    this.showNotification(`Selected ${towerType} tower. Click on grid to place.`, 'success');
  }

  private onGridClick(pointer: Phaser.Input.Pointer): void {
    const { width } = this.cameras.main;
    const paletteWidth = gameConfig.ui.towerPaletteWidth;
    const gridSize = gameConfig.gridSize;
    const hudHeight = gameConfig.ui.hudHeight;

    // Ignore clicks in palette area or HUD
    if (pointer.x > width - paletteWidth || pointer.y > this.cameras.main.height - hudHeight) {
      return;
    }

    // Snap to grid
    const gridX = Math.floor(pointer.x / gridSize);
    const gridY = Math.floor(pointer.y / gridSize);

    if (this.selectedTowerType) {
      // Try to place tower
      const success = this.gameManager.placeTower(this.selectedTowerType, { x: gridX, y: gridY });
      if (success) {
        this.selectedTowerType = null; // Clear selection after successful placement
      }
    } else {
      // Check if there's a tower at this position for potential upgrade
      const towerId = this.gameManager.getTowerAt({ x: gridX, y: gridY });
      if (towerId) {
        this.gameManager.upgradeTower(towerId);
      } else {
        this.showNotification('Select a tower type first!', 'error');
      }
    }
  }
}