import * as Phaser from 'phaser';
import { eventBus } from '@/core/EventBus';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x2c3e50);

    // Title
    const title = this.add.text(width / 2, height / 3, 'Tower Defense', {
      fontSize: '48px',
      color: '#ecf0f1',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    });
    title.setOrigin(0.5);

    // Start button
    const startButton = this.add.rectangle(width / 2, height / 2, 200, 60, 0x3498db);
    startButton.setInteractive({ useHandCursor: true });

    const startText = this.add.text(width / 2, height / 2, 'START GAME', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    });
    startText.setOrigin(0.5);

    // Button hover effects
    startButton.on('pointerover', () => {
      startButton.setFillStyle(0x2980b9);
    });

    startButton.on('pointerout', () => {
      startButton.setFillStyle(0x3498db);
    });

    startButton.on('pointerdown', () => {
      this.scene.start('PlayScene');
    });

    // Instructions
    const instructions = this.add.text(width / 2, height * 0.7,
      'Build towers to defend against waves of enemies!\n\nClick and drag to place towers\nEarn gold to upgrade your defenses', {
      fontSize: '18px',
      color: '#bdc3c7',
      fontFamily: 'Arial, sans-serif',
      align: 'center'
    });
    instructions.setOrigin(0.5);

    // Version info
    const version = this.add.text(width - 10, height - 10, 'v0.1.0', {
      fontSize: '12px',
      color: '#7f8c8d',
      fontFamily: 'Arial, sans-serif'
    });
    version.setOrigin(1, 1);
  }
}