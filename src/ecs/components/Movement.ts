import { Component, Vec2 } from '@/core/types';

export class Movement implements Component {
  public readonly type = 'Movement';
  public velocity: Vec2;
  public speed: number;
  public direction: Vec2;

  constructor(speed: number = 0) {
    this.speed = speed;
    this.velocity = { x: 0, y: 0 };
    this.direction = { x: 0, y: 0 };
  }

  setDirection(dir: Vec2): void {
    this.direction = { ...dir };
    this.updateVelocity();
  }

  setSpeed(speed: number): void {
    this.speed = speed;
    this.updateVelocity();
  }

  private updateVelocity(): void {
    this.velocity.x = this.direction.x * this.speed;
    this.velocity.y = this.direction.y * this.speed;
  }
}