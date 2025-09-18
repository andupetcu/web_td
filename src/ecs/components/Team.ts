import { Component } from '@/core/types';

export enum TeamType {
  PLAYER = 'player',
  ENEMY = 'enemy',
  NEUTRAL = 'neutral'
}

export class Team implements Component {
  public readonly type = 'Team';
  public team: TeamType;

  constructor(team: TeamType) {
    this.team = team;
  }

  isEnemy(otherTeam: TeamType): boolean {
    if (this.team === TeamType.NEUTRAL || otherTeam === TeamType.NEUTRAL) {
      return false;
    }
    return this.team !== otherTeam;
  }
}