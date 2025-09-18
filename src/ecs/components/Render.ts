import { Component } from '@/core/types';

export class Render implements Component {
  public readonly type = 'Render';
  public sprite?: Phaser.GameObjects.Sprite;
  public texture: string;
  public frame?: string | number;
  public visible: boolean = true;
  public scale: number = 1;
  public rotation: number = 0;

  constructor(texture: string, frame?: string | number) {
    this.texture = texture;
    this.frame = frame;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    if (this.sprite) {
      this.sprite.setVisible(visible);
    }
  }

  setScale(scale: number): void {
    this.scale = scale;
    if (this.sprite) {
      this.sprite.setScale(scale);
    }
  }

  setRotation(rotation: number): void {
    this.rotation = rotation;
    if (this.sprite) {
      this.sprite.setRotation(rotation);
    }
  }
}