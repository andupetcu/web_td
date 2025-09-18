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
  private helpPanel!: Phaser.GameObjects.Container;
  private helpVisible: boolean = false;

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

    // HUD area - modern design with gradient effect
    const hudHeight = gameConfig.ui.hudHeight;
    const hudBackground = this.add.graphics();
    hudBackground.fillGradientStyle(0x2c3e50, 0x2c3e50, 0x34495e, 0x34495e, 1, 1, 1, 1);
    hudBackground.fillRect(0, height - hudHeight, width, hudHeight);

    // Add a subtle border
    hudBackground.lineStyle(2, 0x3498db, 0.6);
    hudBackground.strokeRect(0, height - hudHeight, width, hudHeight);

    // UI Text elements with better styling
    this.goldText = this.add.text(30, height - hudHeight + 25, `💰 Gold: ${this.gameManager.economy.getGold()}`, {
      fontSize: '20px',
      color: '#f1c40f',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      stroke: '#2c3e50',
      strokeThickness: 2
    });

    this.waveText = this.add.text(220, height - hudHeight + 25, `🌊 Wave: ${this.gameManager.waveManager.getCurrentWave()}`, {
      fontSize: '20px',
      color: '#e74c3c',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      stroke: '#2c3e50',
      strokeThickness: 2
    });

    this.livesText = this.add.text(400, height - hudHeight + 25, `❤️ Lives: ${this.gameManager.lives}`, {
      fontSize: '20px',
      color: '#e67e22',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      stroke: '#2c3e50',
      strokeThickness: 2
    });

    // Tower palette with modern styling
    const paletteWidth = gameConfig.ui.towerPaletteWidth;
    const paletteBackground = this.add.graphics();
    paletteBackground.fillGradientStyle(0x2c3e50, 0x34495e, 0x2c3e50, 0x34495e, 1, 1, 1, 1);
    paletteBackground.fillRoundedRect(width - paletteWidth, 0, paletteWidth, height - hudHeight, 8);
    paletteBackground.lineStyle(2, 0x3498db, 0.6);
    paletteBackground.strokeRoundedRect(width - paletteWidth, 0, paletteWidth, height - hudHeight, 8);

    this.createTowerPalette();

    // Setup event listeners
    this.setupEventListeners();

    // Settings scene lifecycle
    eventBus.on('settings:closed', () => {
      this.gameManager.resumeGame();
    });

    // Controls
    this.setupControls();

    // Start the game
    this.gameManager.startGame();

    // Add modern wave control button
    const startWaveButton = this.add.graphics();
    startWaveButton.fillGradientStyle(0x27ae60, 0x2ecc71, 0x27ae60, 0x2ecc71, 1, 1, 1, 1);
    startWaveButton.fillRoundedRect(500 - 75, height - hudHeight + 10, 150, 50, 8);
    startWaveButton.lineStyle(2, 0x1abc9c, 0.8);
    startWaveButton.strokeRoundedRect(500 - 75, height - hudHeight + 10, 150, 50, 8);
    startWaveButton.setInteractive(new Phaser.Geom.Rectangle(500 - 75, height - hudHeight + 10, 150, 50), Phaser.Geom.Rectangle.Contains);
    startWaveButton.on('pointerdown', () => {
      eventBus.emit('wave:start');
      eventBus.emit('ui:click');
    });
    startWaveButton.on('pointerover', () => {
      startWaveButton.setScale(1.05);
    });
    startWaveButton.on('pointerout', () => {
      startWaveButton.setScale(1.0);
    });

    this.add.text(500, height - hudHeight + 35, '🌊 START WAVE', {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      stroke: '#2c3e50',
      strokeThickness: 2
    }).setOrigin(0.5);

    // Settings button
    const settingsButton = this.add.rectangle(width - 50, 30, 40, 40, 0x7f8c8d);
    settingsButton.setInteractive({ useHandCursor: true });
    settingsButton.on('pointerdown', () => {
      this.gameManager.pauseGame();
      this.scene.launch('SettingsScene');
      eventBus.emit('ui:click');
    });

    this.add.text(width - 50, 30, '⚙', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif'
    }).setOrigin(0.5);

    // Help button
    const helpButton = this.add.rectangle(width - 100, 30, 40, 40, 0x7f8c8d);
    helpButton.setInteractive({ useHandCursor: true });
    helpButton.on('pointerdown', () => {
      this.toggleHelpPanel();
      eventBus.emit('ui:click');
    });

    this.add.text(width - 100, 30, '?', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);
  }

  update(time: number, delta: number): void {
    const dt = delta / 1000;
    this.gameManager.update(dt, time);
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
    // ESC to toggle settings or return to menu
    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.scene.isActive('SettingsScene')) {
        eventBus.emit('settings:close');
      } else {
        this.gameManager.pauseGame();
        this.scene.launch('SettingsScene');
      }
    });

    // Grid interaction
    this.input.on('pointerdown', this.onGridClick, this);

    // Space to start next wave
    this.input.keyboard?.on('keydown-SPACE', () => {
      eventBus.emit('wave:start');
    });

    // Number keys for quick tower selection
    this.input.keyboard?.on('keydown-ONE', () => {
      this.selectTowerType('basic');
    });

    this.input.keyboard?.on('keydown-TWO', () => {
      this.selectTowerType('aoe');
    });

    this.input.keyboard?.on('keydown-THREE', () => {
      this.selectTowerType('slow');
    });

    // P for pause/resume
    this.input.keyboard?.on('keydown-P', () => {
      if (this.gameManager.isPlaying) {
        this.gameManager.pauseGame();
        this.showNotification('Game Paused', 'info');
      } else {
        this.gameManager.resumeGame();
        this.showNotification('Game Resumed', 'info');
      }
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
    this.createTowerButton(paletteX, startY, 'basic', '⚡', 'Basic\n$10\n[1]', 0x4a90e2);

    // AOE Tower
    this.createTowerButton(paletteX, startY + 90, 'aoe', '💥', 'AOE\n$25\n[2]', 0xe74c3c);

    // Slow Tower
    this.createTowerButton(paletteX, startY + 180, 'slow', '❄️', 'Slow\n$15\n[3]', 0x3498db);
  }

  private createTowerButton(x: number, y: number, towerType: string, icon: string, description: string, color: number): void {
    // Create rounded button background
    const button = this.add.graphics();
    button.fillGradientStyle(color, color * 0.8, color, color * 0.8, 1, 1, 1, 1);
    button.fillRoundedRect(x - 35, y - 25, 70, 50, 8);
    button.lineStyle(2, 0xffffff, 0.8);
    button.strokeRoundedRect(x - 35, y - 25, 70, 50, 8);

    button.setInteractive(new Phaser.Geom.Rectangle(x - 35, y - 25, 70, 50), Phaser.Geom.Rectangle.Contains);
    button.on('pointerdown', () => this.selectTowerType(towerType));
    button.on('pointerover', () => {
      button.setScale(1.05);
    });
    button.on('pointerout', () => {
      button.setScale(1.0);
    });

    // Add icon
    this.add.text(x, y - 10, icon, {
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif'
    }).setOrigin(0.5);

    // Add description
    this.add.text(x, y + 20, description, {
      fontSize: '10px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      align: 'center',
      stroke: '#2c3e50',
      strokeThickness: 1
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

  private toggleHelpPanel(): void {
    if (!this.helpPanel) {
      this.createHelpPanel();
    }

    this.helpVisible = !this.helpVisible;
    this.helpPanel.setVisible(this.helpVisible);

    if (this.helpVisible) {
      this.gameManager.pauseGame();
    } else {
      this.gameManager.resumeGame();
    }
  }

  private createHelpPanel(): void {
    const { width, height } = this.cameras.main;

    this.helpPanel = this.add.container(width / 2, height / 2);

    // Background
    const bg = this.add.rectangle(0, 0, 400, 300, 0x2c3e50, 0.95);
    bg.setStrokeStyle(2, 0x34495e);
    this.helpPanel.add(bg);

    // Title
    const title = this.add.text(0, -120, 'CONTROLS', {
      fontSize: '24px',
      color: '#ecf0f1',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.helpPanel.add(title);

    // Controls text
    const controls = [
      '1, 2, 3 - Select tower types',
      'Space - Start next wave',
      'P - Pause/Resume game',
      'ESC - Settings menu',
      '? - Toggle this help',
      '',
      'Click towers to upgrade',
      'Click grid to place towers'
    ].join('\\n');

    const controlsText = this.add.text(0, -20, controls, {
      fontSize: '14px',
      color: '#bdc3c7',
      fontFamily: 'Arial, sans-serif',
      align: 'center'
    }).setOrigin(0.5);
    this.helpPanel.add(controlsText);

    // Close button
    const closeButton = this.add.rectangle(0, 110, 100, 30, 0xe74c3c);
    closeButton.setInteractive({ useHandCursor: true });
    closeButton.on('pointerdown', () => this.toggleHelpPanel());
    this.helpPanel.add(closeButton);

    const closeText = this.add.text(0, 110, 'CLOSE', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.helpPanel.add(closeText);

    this.helpPanel.setVisible(false);
  }
}