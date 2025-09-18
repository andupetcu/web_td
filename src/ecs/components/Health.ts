import { Component } from '@/core/types';

export class Health implements Component {
  public readonly type = 'Health';
  public current: number;
  public max: number;

  constructor(maxHealth: number) {
    this.max = maxHealth;
    this.current = maxHealth;
  }

  takeDamage(amount: number): boolean {
    this.current = Math.max(0, this.current - amount);
    return this.current <= 0;
  }

  heal(amount: number): void {
    this.current = Math.min(this.max, this.current + amount);
  }

  isDead(): boolean {
    return this.current <= 0;
  }

  getHealthPercent(): number {
    return this.max > 0 ? this.current / this.max : 0;
  }
}