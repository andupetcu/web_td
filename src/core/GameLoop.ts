export class GameLoop {
  private isRunning: boolean = false;
  private lastTime: number = 0;
  private targetFPS: number = 60;
  private frameTime: number = 1000 / this.targetFPS;
  private updateCallback?: (dt: number) => void;
  private renderCallback?: (dt: number) => void;

  constructor(targetFPS: number = 60) {
    this.targetFPS = targetFPS;
    this.frameTime = 1000 / targetFPS;
  }

  setUpdateCallback(callback: (dt: number) => void): void {
    this.updateCallback = callback;
  }

  setRenderCallback(callback: (dt: number) => void): void {
    this.renderCallback = callback;
  }

  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop();
  }

  stop(): void {
    this.isRunning = false;
  }

  private loop = (): void => {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;

    if (deltaTime >= this.frameTime) {
      const dt = Math.min(deltaTime / 1000, 0.05); // Cap at 50ms to prevent spiral of death

      this.updateCallback?.(dt);
      this.renderCallback?.(dt);

      this.lastTime = currentTime - (deltaTime % this.frameTime);
    }

    requestAnimationFrame(this.loop);
  };
}