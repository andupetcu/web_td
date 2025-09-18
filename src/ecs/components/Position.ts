import { Component, Vec2 } from '@/core/types';

export class Position implements Component {
  public readonly type = 'Position';
  public x: number;
  public y: number;

  constructor(x: number = 0, y: number = 0) {
    this.x = x;
    this.y = y;
  }

  set(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  copy(other: Vec2): void {
    this.x = other.x;
    this.y = other.y;
  }

  toVec2(): Vec2 {
    return { x: this.x, y: this.y };
  }
}