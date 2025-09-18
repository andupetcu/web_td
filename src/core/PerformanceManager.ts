import { eventBus } from './EventBus';

export interface PerformanceConfig {
  targetFPS: number;
  minFPS: number;
  maxEntities: number;
  lodDistance: number;
  adaptiveQuality: boolean;
  gcOptimization: boolean;
}

export interface PerformanceMetrics {
  fps: number;
  avgFPS: number;
  frameTime: number;
  gcTime: number;
  entityCount: number;
  visibleEntities: number;
  drawCalls: number;
  memoryUsage: number;
}

export enum QualityLevel {
  LOW = 0,
  MEDIUM = 1,
  HIGH = 2,
  ULTRA = 3
}

export interface QualitySettings {
  level: QualityLevel;
  particleCount: number;
  shadowQuality: number;
  effectDetail: number;
  animationRate: number;
  lodMultiplier: number;
  maxVisibleHealth: number;
  maxVisibleProjectiles: number;
}

export class PerformanceManager {
  private config: PerformanceConfig;
  private metrics: PerformanceMetrics;
  private qualitySettings: QualitySettings;

  // Performance tracking
  private frameTimeHistory: number[] = [];
  private lastGCTime: number = 0;
  private performanceCheckInterval: number = 1000; // 1 second
  private lastPerformanceCheck: number = 0;

  // Adaptive quality
  private qualityAdjustmentDelay: number = 5000; // 5 seconds
  private lastQualityAdjustment: number = 0;
  private consecutiveLowFrames: number = 0;
  private consecutiveGoodFrames: number = 0;

  // LOD (Level of Detail) system
  private lodCamera: { x: number; y: number; zoom: number } = { x: 0, y: 0, zoom: 1 };
  private visibilityGrid: Map<string, boolean> = new Map();

  // Entity culling
  private cullBounds: { left: number; right: number; top: number; bottom: number } =
    { left: 0, right: 1280, top: 0, bottom: 720 };

  constructor(config: PerformanceConfig) {
    this.config = config;
    this.metrics = this.createDefaultMetrics();
    this.qualitySettings = this.getQualityPreset(QualityLevel.HIGH);

    this.setupPerformanceMonitoring();
    this.setupEventListeners();
  }

  private createDefaultMetrics(): PerformanceMetrics {
    return {
      fps: 60,
      avgFPS: 60,
      frameTime: 16.67,
      gcTime: 0,
      entityCount: 0,
      visibleEntities: 0,
      drawCalls: 0,
      memoryUsage: 0
    };
  }

  private getQualityPreset(level: QualityLevel): QualitySettings {
    const presets: { [key in QualityLevel]: QualitySettings } = {
      [QualityLevel.LOW]: {
        level: QualityLevel.LOW,
        particleCount: 10,
        shadowQuality: 0,
        effectDetail: 0.5,
        animationRate: 0.5,
        lodMultiplier: 2.0,
        maxVisibleHealth: 20,
        maxVisibleProjectiles: 50
      },
      [QualityLevel.MEDIUM]: {
        level: QualityLevel.MEDIUM,
        particleCount: 25,
        shadowQuality: 1,
        effectDetail: 0.75,
        animationRate: 0.75,
        lodMultiplier: 1.5,
        maxVisibleHealth: 50,
        maxVisibleProjectiles: 100
      },
      [QualityLevel.HIGH]: {
        level: QualityLevel.HIGH,
        particleCount: 50,
        shadowQuality: 2,
        effectDetail: 1.0,
        animationRate: 1.0,
        lodMultiplier: 1.0,
        maxVisibleHealth: 100,
        maxVisibleProjectiles: 200
      },
      [QualityLevel.ULTRA]: {
        level: QualityLevel.ULTRA,
        particleCount: 100,
        shadowQuality: 3,
        effectDetail: 1.5,
        animationRate: 1.0,
        lodMultiplier: 0.8,
        maxVisibleHealth: -1, // Unlimited
        maxVisibleProjectiles: -1 // Unlimited
      }
    };

    return presets[level];
  }

  private setupPerformanceMonitoring(): void {
    // Monitor garbage collection
    if ('performance' in window && 'measureUserAgentSpecificMemory' in performance) {
      setInterval(() => {
        this.measureMemoryUsage();
      }, 5000);
    }
  }

  private setupEventListeners(): void {
    eventBus.on('camera:moved', (data: { x: number; y: number; zoom: number }) => {
      this.updateLODCamera(data.x, data.y, data.zoom);
    });

    eventBus.on('performance:setQuality', (data: { level: QualityLevel }) => {
      this.setQualityLevel(data.level);
    });

    eventBus.on('performance:toggleAdaptive', (data: { enabled: boolean }) => {
      this.config.adaptiveQuality = data.enabled;
    });
  }

  update(dt: number, gameTime: number): void {
    this.updateMetrics(dt, gameTime);
    this.checkPerformance(gameTime);

    if (this.config.adaptiveQuality) {
      this.adaptiveQualityAdjustment(gameTime);
    }

    this.updateVisibilityGrid();
  }

  private updateMetrics(dt: number, gameTime: number): void {
    // Calculate FPS
    const frameTime = dt * 1000;
    this.metrics.frameTime = frameTime;
    this.metrics.fps = 1000 / frameTime;

    // Maintain frame time history
    this.frameTimeHistory.push(frameTime);
    if (this.frameTimeHistory.length > 60) { // Keep last 60 frames
      this.frameTimeHistory.shift();
    }

    // Calculate average FPS
    const avgFrameTime = this.frameTimeHistory.reduce((sum, time) => sum + time, 0) / this.frameTimeHistory.length;
    this.metrics.avgFPS = 1000 / avgFrameTime;

    // Detect GC pauses (frame time spikes)
    if (frameTime > 50) { // Frame took longer than 50ms
      this.metrics.gcTime = gameTime;
      this.lastGCTime = gameTime;
    }
  }

  private checkPerformance(gameTime: number): void {
    if (gameTime - this.lastPerformanceCheck < this.performanceCheckInterval) {
      return;
    }

    this.lastPerformanceCheck = gameTime;

    // Performance checks
    const isLowPerformance = this.metrics.avgFPS < this.config.minFPS;
    const isGoodPerformance = this.metrics.avgFPS > this.config.targetFPS * 0.9;

    if (isLowPerformance) {
      this.consecutiveLowFrames++;
      this.consecutiveGoodFrames = 0;
    } else if (isGoodPerformance) {
      this.consecutiveGoodFrames++;
      this.consecutiveLowFrames = 0;
    } else {
      this.consecutiveLowFrames = 0;
      this.consecutiveGoodFrames = 0;
    }

    // Emit performance events
    eventBus.emit('performance:metrics', this.metrics);

    if (this.consecutiveLowFrames >= 3) {
      eventBus.emit('performance:warning', {
        fps: this.metrics.avgFPS,
        target: this.config.targetFPS
      });
    }
  }

  private adaptiveQualityAdjustment(gameTime: number): void {
    if (gameTime - this.lastQualityAdjustment < this.qualityAdjustmentDelay) {
      return;
    }

    // Lower quality if consistently low FPS
    if (this.consecutiveLowFrames >= 5 && this.qualitySettings.level > QualityLevel.LOW) {
      this.setQualityLevel(this.qualitySettings.level - 1);
      this.lastQualityAdjustment = gameTime;
      eventBus.emit('performance:qualityAdjusted', {
        direction: 'down',
        level: this.qualitySettings.level,
        reason: 'Low FPS'
      });
    }
    // Raise quality if consistently good FPS
    else if (this.consecutiveGoodFrames >= 10 && this.qualitySettings.level < QualityLevel.ULTRA) {
      this.setQualityLevel(this.qualitySettings.level + 1);
      this.lastQualityAdjustment = gameTime;
      eventBus.emit('performance:qualityAdjusted', {
        direction: 'up',
        level: this.qualitySettings.level,
        reason: 'Good FPS'
      });
    }
  }

  private updateLODCamera(x: number, y: number, zoom: number): void {
    this.lodCamera.x = x;
    this.lodCamera.y = y;
    this.lodCamera.zoom = zoom;

    // Update cull bounds based on camera
    const viewWidth = 1280 / zoom;
    const viewHeight = 720 / zoom;

    this.cullBounds = {
      left: x - viewWidth / 2,
      right: x + viewWidth / 2,
      top: y - viewHeight / 2,
      bottom: y + viewHeight / 2
    };
  }

  private updateVisibilityGrid(): void {
    // Clear previous visibility
    this.visibilityGrid.clear();

    // This would be called with actual entity positions
    // For now, it's a placeholder for the visibility culling system
  }

  private async measureMemoryUsage(): Promise<void> {
    try {
      if ('measureUserAgentSpecificMemory' in performance) {
        const memory = await (performance as any).measureUserAgentSpecificMemory();
        this.metrics.memoryUsage = memory.bytes;
      }
    } catch (error) {
      // Fallback to basic memory info if available
      if ('memory' in performance) {
        this.metrics.memoryUsage = (performance as any).memory.usedJSHeapSize;
      }
    }
  }

  // Public API
  setQualityLevel(level: QualityLevel): void {
    this.qualitySettings = this.getQualityPreset(level);
    eventBus.emit('performance:qualityChanged', this.qualitySettings);
  }

  getCurrentQuality(): QualitySettings {
    return { ...this.qualitySettings };
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  // LOD and culling
  isEntityVisible(x: number, y: number, radius: number = 0): boolean {
    return x + radius >= this.cullBounds.left &&
           x - radius <= this.cullBounds.right &&
           y + radius >= this.cullBounds.top &&
           y - radius <= this.cullBounds.bottom;
  }

  getEntityLOD(x: number, y: number): number {
    const dx = x - this.lodCamera.x;
    const dy = y - this.lodCamera.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const lodDistance = this.config.lodDistance * this.qualitySettings.lodMultiplier;

    if (distance < lodDistance * 0.5) return 0; // High detail
    if (distance < lodDistance) return 1; // Medium detail
    if (distance < lodDistance * 2) return 2; // Low detail
    return 3; // Very low detail or cull
  }

  shouldShowHealthBar(entityId: number, x: number, y: number): boolean {
    if (this.qualitySettings.maxVisibleHealth === -1) return true;
    if (this.qualitySettings.maxVisibleHealth === 0) return false;

    if (!this.isEntityVisible(x, y)) return false;

    // Count visible health bars (simplified)
    const visibleCount = Array.from(this.visibilityGrid.values()).filter(v => v).length;
    return visibleCount < this.qualitySettings.maxVisibleHealth;
  }

  shouldShowEffect(x: number, y: number, effectType: string): boolean {
    if (!this.isEntityVisible(x, y)) return false;

    const lod = this.getEntityLOD(x, y);

    switch (effectType) {
      case 'explosion':
        return lod <= 1 && this.qualitySettings.effectDetail >= 0.5;
      case 'muzzleFlash':
        return lod === 0 && this.qualitySettings.effectDetail >= 1.0;
      case 'particles':
        return lod <= 2 && this.qualitySettings.particleCount > 0;
      default:
        return true;
    }
  }

  getAnimationRate(x: number, y: number): number {
    const lod = this.getEntityLOD(x, y);
    const baseRate = this.qualitySettings.animationRate;

    switch (lod) {
      case 0: return baseRate;
      case 1: return baseRate * 0.8;
      case 2: return baseRate * 0.5;
      case 3: return baseRate * 0.2;
      default: return 0;
    }
  }

  // Performance optimization helpers
  optimizeForFrameRate(): void {
    if (this.metrics.avgFPS < this.config.minFPS) {
      // Emergency performance optimizations
      this.setQualityLevel(QualityLevel.LOW);

      eventBus.emit('performance:emergencyOptimization', {
        previousQuality: this.qualitySettings.level,
        newQuality: QualityLevel.LOW
      });
    }
  }

  // Statistics and debugging
  getPerformanceReport(): any {
    return {
      metrics: this.metrics,
      quality: this.qualitySettings,
      frameHistory: this.frameTimeHistory.slice(-30), // Last 30 frames
      gcEvents: this.lastGCTime > 0 ? Date.now() - this.lastGCTime : null,
      lodCamera: this.lodCamera,
      cullBounds: this.cullBounds
    };
  }

  // Settings
  setTargetFPS(fps: number): void {
    this.config.targetFPS = Math.max(30, Math.min(120, fps));
  }

  setAdaptiveQuality(enabled: boolean): void {
    this.config.adaptiveQuality = enabled;
    if (!enabled) {
      this.consecutiveLowFrames = 0;
      this.consecutiveGoodFrames = 0;
    }
  }

  // Cleanup
  destroy(): void {
    this.frameTimeHistory = [];
    this.visibilityGrid.clear();
  }
}