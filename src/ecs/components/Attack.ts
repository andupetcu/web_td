import { Component } from '@/core/types';

export class Attack implements Component {
  public readonly type = 'Attack';
  public damage: number;
  public range: number;
  public fireRate: number;
  public lastAttackTime: number = 0;

  constructor(damage: number, range: number, fireRate: number) {
    this.damage = damage;
    this.range = range;
    this.fireRate = fireRate;
  }

  canAttack(currentTime: number): boolean {
    return currentTime - this.lastAttackTime >= 1000 / this.fireRate;
  }

  attack(currentTime: number): void {
    this.lastAttackTime = currentTime;
  }
}