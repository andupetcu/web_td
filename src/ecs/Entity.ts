import { Component } from '@/core/types';

export class Entity {
  public readonly id: number;
  public components: Set<string> = new Set();

  constructor(id: number) {
    this.id = id;
  }

  addComponent<T extends Component>(component: T): void {
    this.components.add(component.type);
  }

  removeComponent(componentType: string): void {
    this.components.delete(componentType);
  }

  hasComponent(componentType: string): boolean {
    return this.components.has(componentType);
  }

  hasComponents(...componentTypes: string[]): boolean {
    return componentTypes.every(type => this.components.has(type));
  }
}