import * as Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Create simple colored rectangles as placeholders for sprites
    this.load.image('tower-basic', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==');

    // Create loading progress bar
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(240, 270, 320, 50);

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const loadingText = this.make.text({
      x: width / 2,
      y: height / 2 - 50,
      text: 'Loading...',
      style: {
        font: '20px monospace',
        color: '#ffffff'
      }
    });
    loadingText.setOrigin(0.5, 0.5);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0xffffff, 1);
      progressBar.fillRect(250, 280, 300 * value, 30);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });
  }

  create(): void {
    // Generate simple colored textures for game objects
    this.generateGameTextures();

    // Transition to main menu
    this.scene.start('MainMenuScene');
  }

  private generateGameTextures(): void {
    // Generate tower textures
    this.generateColorTexture('tower-basic', 0x4a90e2, 32, 32);
    this.generateColorTexture('tower-aoe', 0xe74c3c, 32, 32);
    this.generateColorTexture('tower-slow', 0x3498db, 32, 32);

    // Generate enemy textures
    this.generateColorTexture('enemy-normal', 0x8e44ad, 24, 24);
    this.generateColorTexture('enemy-fast', 0xf39c12, 20, 20);
    this.generateColorTexture('enemy-heavy', 0x2c3e50, 28, 28);

    // Generate projectile textures
    this.generateColorTexture('projectile-basic', 0xffffff, 4, 4);
    this.generateColorTexture('projectile-aoe', 0xff6b6b, 6, 6);

    // Generate UI textures
    this.generateColorTexture('grid-cell', 0x34495e, 64, 64);
    this.generateColorTexture('path-cell', 0x95a5a6, 64, 64);
  }

  private generateColorTexture(key: string, color: number, width: number, height: number): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(color);
    graphics.fillRect(0, 0, width, height);
    graphics.generateTexture(key, width, height);
    graphics.destroy();
  }
}