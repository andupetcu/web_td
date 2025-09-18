import { Entity } from './Entity';
import { Component, System } from '@/core/types';

export class World {
  private entities: Map<number, Entity> = new Map();
  private components: Map<string, Map<number, Component>> = new Map();
  private systems: System[] = [];
  private nextEntityId: number = 1;

  createEntity(): Entity {
    const entity = new Entity(this.nextEntityId++);
    this.entities.set(entity.id, entity);
    return entity;
  }

  destroyEntity(entityId: number): void {
    const entity = this.entities.get(entityId);
    if (!entity) return;

    // Remove all components
    for (const componentType of entity.components) {
      this.removeComponent(entityId, componentType);
    }

    this.entities.delete(entityId);
  }

  addComponent<T extends Component>(entityId: number, component: T): void {
    const entity = this.entities.get(entityId);
    if (!entity) return;

    if (!this.components.has(component.type)) {
      this.components.set(component.type, new Map());
    }

    this.components.get(component.type)!.set(entityId, component);
    entity.addComponent(component);
  }

  removeComponent(entityId: number, componentType: string): void {
    const entity = this.entities.get(entityId);
    if (!entity) return;

    const componentMap = this.components.get(componentType);
    if (componentMap) {
      componentMap.delete(entityId);
    }

    entity.removeComponent(componentType);
  }

  getComponent<T extends Component>(entityId: number, componentType: string): T | undefined {
    const componentMap = this.components.get(componentType);
    return componentMap?.get(entityId) as T | undefined;
  }

  getEntitiesWithComponents(...componentTypes: string[]): Entity[] {
    const result: Entity[] = [];

    for (const entity of this.entities.values()) {
      if (entity.hasComponents(...componentTypes)) {
        result.push(entity);
      }
    }

    return result;
  }

  addSystem(system: System): void {
    this.systems.push(system);
  }

  removeSystem(system: System): void {
    const index = this.systems.indexOf(system);
    if (index > -1) {
      this.systems.splice(index, 1);
    }
  }

  update(dt: number): void {
    for (const system of this.systems) {
      system.update(dt, this);
    }
  }

  getEntities(): Map<number, Entity> {
    return this.entities;
  }

  getComponents(): Map<string, Map<number, Component>> {
    return this.components;
  }
}