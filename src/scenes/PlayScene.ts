import * as Phaser from 'phaser';
import { World } from '@/ecs/World';
import { eventBus } from '@/core/EventBus';
import gameConfig from '@/config/GameConfig.json';

export class PlayScene extends Phaser.Scene {
  private world!: World;
  private gridGraphics!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'PlayScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Initialize ECS World
    this.world = new World();

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x2c3e50);

    // Create grid graphics
    this.gridGraphics = this.add.graphics();
    this.drawGrid();

    // HUD area
    const hudHeight = gameConfig.ui.hudHeight;
    const hudBackground = this.add.rectangle(width / 2, height - hudHeight / 2, width, hudHeight, 0x34495e);

    // Gold display
    const goldText = this.add.text(20, height - hudHeight + 20, `Gold: ${gameConfig.startingGold}`, {
      fontSize: '24px',
      color: '#f1c40f',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    });

    // Wave info
    const waveText = this.add.text(200, height - hudHeight + 20, 'Wave: 1', {
      fontSize: '24px',
      color: '#e74c3c',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    });

    // Lives display
    const livesText = this.add.text(350, height - hudHeight + 20, 'Lives: 20', {
      fontSize: '24px',
      color: '#e67e22',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    });

    // Tower palette
    const paletteWidth = gameConfig.ui.towerPaletteWidth;
    const paletteBackground = this.add.rectangle(width - paletteWidth / 2, height / 2 - hudHeight / 2, paletteWidth, height - hudHeight, 0x2c3e50);

    this.createTowerPalette();

    // ESC to return to menu
    this.input.keyboard?.on('keydown-ESC', () => {
      this.scene.start('MainMenuScene');
    });

    // Grid interaction
    this.input.on('pointerdown', this.onGridClick, this);
  }

  update(time: number, delta: number): void {
    const dt = delta / 1000;
    this.world.update(dt);
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
    this.add.text(paletteX, startY + 40, 'Basic\n$10', {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      align: 'center'
    }).setOrigin(0.5);

    // AOE Tower
    const aoeTower = this.add.rectangle(paletteX, startY + 100, 60, 60, 0xe74c3c);
    aoeTower.setInteractive({ useHandCursor: true });
    this.add.text(paletteX, startY + 140, 'AOE\n$25', {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      align: 'center'
    }).setOrigin(0.5);

    // Slow Tower
    const slowTower = this.add.rectangle(paletteX, startY + 200, 60, 60, 0x3498db);
    slowTower.setInteractive({ useHandCursor: true });
    this.add.text(paletteX, startY + 240, 'Slow\n$15', {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      align: 'center'
    }).setOrigin(0.5);
  }

  private onGridClick(pointer: Phaser.Input.Pointer): void {
    const { width } = this.cameras.main;
    const paletteWidth = gameConfig.ui.towerPaletteWidth;
    const gridSize = gameConfig.gridSize;

    // Ignore clicks in palette area
    if (pointer.x > width - paletteWidth) return;

    // Snap to grid
    const gridX = Math.floor(pointer.x / gridSize);
    const gridY = Math.floor(pointer.y / gridSize);

    console.log(`Grid clicked: ${gridX}, ${gridY}`);

    // TODO: Place tower logic will go here
  }
}