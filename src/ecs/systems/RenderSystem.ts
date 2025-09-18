import { System, World } from '@/core/types';
import { Position } from '../components/Position';
import { Render } from '../components/Render';
import * as Phaser from 'phaser';

export class RenderSystem implements System {
  private scene: Phaser.Scene;
  private spriteGroup: Phaser.GameObjects.Group;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.spriteGroup = scene.add.group();
  }

  update(dt: number, world: World): void {
    const entities = world.getEntitiesWithComponents('Position', 'Render');

    for (const entity of entities) {
      const position = world.getComponent<Position>(entity.id, 'Position')!;
      const render = world.getComponent<Render>(entity.id, 'Render')!;

      // Create sprite if it doesn't exist
      if (!render.sprite) {
        this.createSprite(entity.id, render, position);
      }

      // Update sprite position and properties
      if (render.sprite) {
        render.sprite.setPosition(position.x, position.y);
        render.sprite.setVisible(render.visible);
        render.sprite.setScale(render.scale);
        render.sprite.setRotation(render.rotation);
      }
    }

    // Clean up sprites for destroyed entities
    this.cleanupDestroyedSprites(world);
  }

  private createSprite(entityId: number, render: Render, position: Position): void {
    try {
      // Try to create sprite with texture first
      if (this.scene.textures.exists(render.texture)) {
        const sprite = this.scene.add.sprite(position.x, position.y, render.texture, render.frame);
        sprite.setOrigin(0.5, 0.5);
        sprite.setScale(render.scale);
        sprite.setRotation(render.rotation);
        sprite.setVisible(render.visible);

        // Store reference to entity ID for cleanup
        sprite.setData('entityId', entityId);

        // Add to sprite group for management
        this.spriteGroup.add(sprite);

        // Store sprite reference in render component
        render.sprite = sprite;
      } else {
        // Create placeholder rectangle if texture doesn't exist
        console.log(`Creating placeholder for missing texture: ${render.texture}`);
        this.createPlaceholderSprite(entityId, render, position);
      }
    } catch (error) {
      console.warn(`Failed to create sprite with texture '${render.texture}':`, error);
      // Create placeholder as fallback
      this.createPlaceholderSprite(entityId, render, position);
    }
  }

  private createPlaceholderSprite(entityId: number, render: Render, position: Position): void {
    // Create colored rectangle based on texture name
    let color = 0xff0000; // Default red
    let size = 20;

    if (render.texture.includes('enemy')) {
      if (render.texture.includes('normal')) {
        color = 0xff4444; // Red for normal enemies
      } else if (render.texture.includes('fast')) {
        color = 0xffff44; // Yellow for fast enemies
      } else if (render.texture.includes('heavy')) {
        color = 0x4444ff; // Blue for heavy enemies
      }
      size = 16;
    } else if (render.texture.includes('tower')) {
      color = 0x44ff44; // Green for towers
      size = 24;
    } else if (render.texture.includes('projectile')) {
      color = 0xffffff; // White for projectiles
      size = 4;
    }

    const graphics = this.scene.add.graphics();
    graphics.fillStyle(color);
    graphics.fillRoundedRect(-size/2, -size/2, size, size, 2);
    graphics.setPosition(position.x, position.y);
    graphics.setScale(render.scale);
    graphics.setRotation(render.rotation);
    graphics.setVisible(render.visible);

    // Store reference to entity ID for cleanup
    graphics.setData('entityId', entityId);

    // Add to sprite group for management
    this.spriteGroup.add(graphics);

    // Store graphics reference in render component
    render.sprite = graphics;
  }

  private cleanupDestroyedSprites(world: World): void {
    const allEntities = world.getEntities();
    const spritesToDestroy: Phaser.GameObjects.Sprite[] = [];

    // Check all sprites in the group
    this.spriteGroup.children.entries.forEach((child) => {
      const sprite = child as Phaser.GameObjects.Sprite;
      const entityId = sprite.getData('entityId');

      // If entity no longer exists, mark sprite for destruction
      if (!allEntities.has(entityId)) {
        spritesToDestroy.push(sprite);
      }
    });

    // Destroy orphaned sprites
    spritesToDestroy.forEach((sprite) => {
      this.spriteGroup.remove(sprite);
      sprite.destroy();
    });
  }

  // Utility methods for visual effects
  createFloatingText(x: number, y: number, text: string, color: string = '#ffffff'): void {
    const textObject = this.scene.add.text(x, y, text, {
      fontSize: '14px',
      color: color,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    });

    textObject.setOrigin(0.5, 0.5);

    // Animate floating text
    this.scene.tweens.add({
      targets: textObject,
      y: y - 30,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => {
        textObject.destroy();
      }
    });
  }

  createExplosionEffect(x: number, y: number, radius: number): void {
    // Create simple circle explosion effect
    const explosion = this.scene.add.circle(x, y, 5, 0xff6b6b, 0.8);

    this.scene.tweens.add({
      targets: explosion,
      radius: radius,
      alpha: 0,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        explosion.destroy();
      }
    });
  }

  createMuzzleFlash(x: number, y: number, targetX: number, targetY: number): void {
    // Calculate angle to target
    const angle = Phaser.Math.Angle.Between(x, y, targetX, targetY);

    // Create muzzle flash effect
    const flash = this.scene.add.ellipse(x, y, 15, 8, 0xffff00, 0.9);
    flash.setRotation(angle);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 100,
      ease: 'Power2',
      onComplete: () => {
        flash.destroy();
      }
    });
  }

  // Range visualization
  showTowerRange(x: number, y: number, range: number): Phaser.GameObjects.Arc {
    const rangeCircle = this.scene.add.circle(x, y, range, 0x00ff00, 0.2);
    rangeCircle.setStrokeStyle(2, 0x00ff00, 0.6);
    return rangeCircle;
  }

  hideTowerRange(rangeCircle: Phaser.GameObjects.Arc): void {
    rangeCircle.destroy();
  }

  // Health bar creation
  createHealthBar(entityId: number, x: number, y: number, width: number = 32): { bg: Phaser.GameObjects.Rectangle, fill: Phaser.GameObjects.Rectangle } {
    const height = 4;
    const offsetY = -20;

    const bg = this.scene.add.rectangle(x, y + offsetY, width, height, 0x000000, 0.8);
    const fill = this.scene.add.rectangle(x, y + offsetY, width, height, 0x00ff00, 1.0);

    bg.setData('entityId', entityId);
    fill.setData('entityId', entityId);

    return { bg, fill };
  }

  updateHealthBar(healthBar: { bg: Phaser.GameObjects.Rectangle, fill: Phaser.GameObjects.Rectangle }, healthPercent: number, x: number, y: number): void {
    const offsetY = -20;
    const width = healthBar.bg.width;

    healthBar.bg.setPosition(x, y + offsetY);
    healthBar.fill.setPosition(x - width/2 + (width * healthPercent)/2, y + offsetY);
    healthBar.fill.setSize(width * healthPercent, healthBar.fill.height);

    // Change color based on health
    if (healthPercent > 0.6) {
      healthBar.fill.setFillStyle(0x00ff00); // Green
    } else if (healthPercent > 0.3) {
      healthBar.fill.setFillStyle(0xffff00); // Yellow
    } else {
      healthBar.fill.setFillStyle(0xff0000); // Red
    }
  }

  // Cleanup method
  destroy(): void {
    this.spriteGroup.destroy(true);
  }
}