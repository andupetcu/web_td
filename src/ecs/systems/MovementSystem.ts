import { System, World } from '@/core/types';
import { Position } from '../components/Position';
import { Movement } from '../components/Movement';
import { PathManager } from '@/gameplay/PathManager';
import { EnemyFactory } from '@/enemies/EnemyFactory';

export class MovementSystem implements System {
  private pathManager: PathManager;
  private enemyFactory: EnemyFactory;

  constructor(pathManager: PathManager, enemyFactory: EnemyFactory) {
    this.pathManager = pathManager;
    this.enemyFactory = enemyFactory;
  }

  update(dt: number, world: World): void {
    const entities = world.getEntitiesWithComponents('Position', 'Movement');

    for (const entity of entities) {
      const position = world.getComponent<Position>(entity.id, 'Position')!;
      const movement = world.getComponent<Movement>(entity.id, 'Movement')!;

      // Update enemy movement using flow field
      const enemyData = this.enemyFactory.getEnemyData(entity.id);
      if (enemyData) {
        this.updateEnemyMovement(entity.id, position, movement, dt);
      } else {
        // Regular movement for projectiles
        this.updateRegularMovement(position, movement, dt);
      }
    }
  }

  private updateEnemyMovement(entityId: number, position: Position, movement: Movement, dt: number): void {
    const enemyData = this.enemyFactory.getEnemyData(entityId);
    if (!enemyData) return;

    // Get flow direction from path manager
    const currentPos = { x: position.x, y: position.y };
    const flowDirection = this.pathManager.getInterpolatedFlow(currentPos);

    // Apply flow field direction
    if (flowDirection.x !== 0 || flowDirection.y !== 0) {
      movement.setDirection(flowDirection);
    }

    // Update position
    const velocity = movement.velocity;
    position.x += velocity.x * dt;
    position.y += velocity.y * dt;

    // Update enemy status effects
    this.enemyFactory.updateEnemy(entityId, dt);
  }

  private updateRegularMovement(position: Position, movement: Movement, dt: number): void {
    const velocity = movement.velocity;
    position.x += velocity.x * dt;
    position.y += velocity.y * dt;
  }
}