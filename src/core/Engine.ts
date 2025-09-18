import * as Phaser from 'phaser';
import { GameLoop } from './GameLoop';
import { eventBus } from './EventBus';
import { BootScene } from '@/scenes/BootScene';
import { MainMenuScene } from '@/scenes/MainMenuScene';
import { PlayScene } from '@/scenes/PlayScene';

export class Engine {
  private phaserGame: Phaser.Game;
  private gameLoop: GameLoop;

  constructor(container: HTMLElement) {
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 1280,
      height: 720,
      parent: container,
      backgroundColor: '#2c3e50',
      scene: [BootScene, MainMenuScene, PlayScene],
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false
        }
      },
      render: {
        antialias: true,
        pixelArt: false,
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 1280,
        height: 720,
      }
    };

    this.phaserGame = new Phaser.Game(config);
    this.gameLoop = new GameLoop(60);

    this.setupEventListeners();
  }

  start(): void {
    this.gameLoop.start();
  }

  stop(): void {
    this.gameLoop.stop();
    this.phaserGame.destroy(true);
  }

  private setupEventListeners(): void {
    eventBus.on('game:pause', () => {
      this.phaserGame.scene.pause();
    });

    eventBus.on('game:resume', () => {
      this.phaserGame.scene.resume();
    });
  }
}