export class Pool<T> {
  private available: T[] = [];
  private createFn: () => T;
  private resetFn: (obj: T) => void;
  private capacity: number;

  constructor(capacity: number, createFn: () => T, resetFn: (obj: T) => void) {
    this.capacity = capacity;
    this.createFn = createFn;
    this.resetFn = resetFn;

    // Pre-allocate objects
    for (let i = 0; i < capacity; i++) {
      this.available.push(this.createFn());
    }
  }

  request(): T | null {
    if (this.available.length === 0) {
      return null; // Pool exhausted
    }

    return this.available.pop()!;
  }

  recycle(obj: T): void {
    if (this.available.length >= this.capacity) {
      return; // Pool is full
    }

    this.resetFn(obj);
    this.available.push(obj);
  }

  getAvailableCount(): number {
    return this.available.length;
  }

  getUsedCount(): number {
    return this.capacity - this.available.length;
  }
}