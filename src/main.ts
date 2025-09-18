import { Engine } from '@/core/Engine';

const gameContainer = document.getElementById('game-container');
if (!gameContainer) {
  throw new Error('Game container not found');
}

const engine = new Engine(gameContainer);
engine.start();