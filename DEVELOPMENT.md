# Development Guide

This guide provides detailed information for developers working on the Web Tower Defense game.

## 🏗️ Architecture Overview

### Entity-Component-System (ECS)

The game uses a custom ECS architecture for optimal performance and maintainability:

```typescript
// Example: Creating an entity with components
const entityId = world.createEntity();
world.addComponent(entityId, new Position(100, 100));
world.addComponent(entityId, new Health(100));
world.addComponent(entityId, new Team(TeamType.ENEMY));
```

#### Core ECS Classes
- `World` - Manages entities and components
- `Entity` - Unique identifier (number)
- `Component` - Data containers
- `System` - Logic processors

### Event-Driven Architecture

All game systems communicate through a central event bus:

```typescript
// Emit events
eventBus.emit('enemy:killed', { entityId, bounty: 10 });

// Listen for events
eventBus.on('wave:completed', (data) => {
  // Handle wave completion
});
```

### Performance Systems

#### Object Pooling
- `EnemyPool` - Reuses enemy entities
- `ProjectilePool` - Reuses projectile entities
- `EffectPool` - Reuses visual effects

#### Spatial Optimization
- `CollisionManager` - Spatial hash grid for collision detection
- `PathManager` - Flow field pathfinding
- `PerformanceManager` - LOD and adaptive quality

## 🎮 Game Systems

### Core Gameplay Loop

1. **Wave Management** - Spawn enemies according to wave configuration
2. **Tower Targeting** - Towers acquire and engage targets
3. **Projectile Simulation** - Projectiles move and hit targets
4. **Economy** - Gold generation and spending
5. **Performance Monitoring** - FPS tracking and quality adjustment

### Data Flow

```
User Input → Event Bus → Game Systems → ECS World → Render System → Display
```

## 🔧 Configuration System

### Game Configuration

Located in `src/config/GameConfig.json`:

```json
{
  "gridSize": 32,
  "mapWidth": 25,
  "mapHeight": 18,
  "startingGold": 100,
  "ui": {
    "hudHeight": 100,
    "towerPaletteWidth": 150
  },
  "performance": {
    "maxProjectiles": 1000,
    "spatialHashCellSize": 64
  }
}
```

### Tower Configuration

Each tower type has its own configuration file in `src/config/towers/`:

```json
{
  "id": "basic",
  "name": "Basic Tower",
  "cost": 10,
  "range": 80,
  "damage": 25,
  "fireRate": 1.0,
  "upgrades": [
    {
      "tier": 1,
      "cost": 15,
      "damage": 35,
      "range": 90
    }
  ]
}
```

### Wave Configuration

Wave progression defined in `src/config/waves/`:

```json
{
  "wave": 1,
  "name": "First Wave",
  "enemies": [
    {
      "type": "normal",
      "count": 10,
      "interval": 1.0,
      "delay": 0
    }
  ],
  "bounty": 20
}
```

## 🎨 Rendering System

### Phaser 3 Integration

The game uses Phaser 3 for rendering with a custom ECS integration:

```typescript
class RenderSystem extends System {
  update(world: World): void {
    const entities = world.getEntitiesWithComponents(['Position', 'Sprite']);

    entities.forEach(entityId => {
      const position = world.getComponent<Position>(entityId, 'Position');
      const sprite = world.getComponent<Sprite>(entityId, 'Sprite');

      sprite.sprite.setPosition(position.x, position.y);
    });
  }
}
```

### Visual Effects

- Health bars with smooth animations
- Tower range indicators
- Projectile trails and impacts
- Damage number pop-ups

## 💾 Save System

### Save Data Structure

```typescript
interface GameSaveData {
  version: string;
  timestamp: number;
  lives: number;
  score: number;
  currentWave: number;
  economy: EconomyData;
  towers: TowerSaveData[];
  gridState: CellData[][];
  settings: GameSettings;
  stats: GameStatistics;
}
```

### Serialization Strategy

1. **Game State** - Core gameplay variables
2. **Tower Data** - Tower positions, types, and upgrades
3. **Economy** - Gold and transaction history
4. **Settings** - User preferences and options
5. **Statistics** - Gameplay metrics and achievements

## 🎵 Audio System

### Audio Manager

Handles all game audio with volume controls and categories:

```typescript
class AudioManager {
  private masterVolume: number = 1.0;
  private sfxVolume: number = 1.0;
  private musicVolume: number = 1.0;

  playSound(soundId: string, volume?: number): void {
    // Play sound with volume mixing
  }
}
```

### Sound Categories

- **SFX** - Gameplay sounds (shooting, explosions)
- **Music** - Background music and ambiance
- **UI** - Interface sounds (clicks, notifications)

## 🔍 Performance Optimization

### Level of Detail (LOD)

Distance-based quality reduction:

```typescript
getEntityLOD(x: number, y: number): number {
  const distance = calculateDistance(x, y, camera);

  if (distance < lodDistance * 0.5) return 0; // High detail
  if (distance < lodDistance) return 1;       // Medium detail
  if (distance < lodDistance * 2) return 2;   // Low detail
  return 3; // Very low detail or cull
}
```

### Adaptive Quality

Automatic quality adjustment based on performance:

```typescript
if (avgFPS < targetFPS * 0.8) {
  // Reduce quality settings
  reduceParticleCount();
  increaseLODDistance();
  disableNonEssentialEffects();
}
```

### Memory Management

- Object pooling prevents garbage collection spikes
- Texture atlasing reduces memory usage
- Spatial culling reduces active entities

## 🧪 Testing Strategy

### Unit Testing Areas

1. **ECS System** - Component management and entity operations
2. **Pathfinding** - Flow field generation and navigation
3. **Economy** - Gold calculations and interest
4. **Save/Load** - Data serialization and restoration
5. **Performance** - LOD calculations and quality adjustments

### Integration Testing

1. **Game Flow** - Complete wave progression
2. **Tower Mechanics** - Placement, targeting, and upgrades
3. **UI Integration** - Settings and save/load functionality
4. **Performance** - FPS targets under various conditions

## 🚀 Deployment

### Build Process

```bash
npm run build
```

Creates optimized production build in `dist/` directory.

### Build Output

- `index.html` - Main entry point
- `assets/` - Bundled JavaScript, CSS, and assets
- `config/` - Game configuration files
- `sounds/` - Audio files

### Deployment Targets

#### Static Hosting
- GitHub Pages
- Netlify
- Vercel
- AWS S3 + CloudFront

#### Game Platforms
- Itch.io
- Newgrounds
- Kongregate

### Environment Configuration

```typescript
// Environment-specific settings
const config = {
  development: {
    debug: true,
    showPerformanceOverlay: true
  },
  production: {
    debug: false,
    showPerformanceOverlay: false
  }
};
```

## 📊 Analytics and Monitoring

### Performance Metrics

Track key performance indicators:

- Average FPS
- Memory usage
- Load times
- User retention
- Gameplay statistics

### Error Handling

```typescript
window.addEventListener('error', (event) => {
  // Log errors for debugging
  console.error('Game Error:', event.error);

  // Attempt graceful recovery
  if (gameManager) {
    gameManager.pauseGame();
    showErrorDialog(event.error.message);
  }
});
```

## 🛠️ Development Tools

### Browser Developer Tools

- **Performance Tab** - Profile game performance
- **Memory Tab** - Monitor memory usage and leaks
- **Network Tab** - Analyze asset loading

### Debug Features

```typescript
// Debug mode features
if (DEBUG_MODE) {
  showFPSCounter();
  enablePerformanceOverlay();
  addDebugKeyBindings();
  enableEntityInspector();
}
```

### Useful Debug Commands

```javascript
// Access game manager in browser console
window.gameManager = gameManager;

// Spawn enemies for testing
gameManager.spawnEnemy('normal');

// Add gold for testing
gameManager.economy.addGold(1000);

// Skip to specific wave
gameManager.waveManager.setWave(10);
```

## 📝 Code Style Guide

### TypeScript Standards

```typescript
// Use interfaces for data structures
interface TowerConfig {
  id: string;
  name: string;
  cost: number;
  range: number;
}

// Use enums for constants
enum TeamType {
  PLAYER = 'player',
  ENEMY = 'enemy'
}

// Use type guards for runtime type checking
function isEnemy(entity: Entity): entity is Enemy {
  return entity.team === TeamType.ENEMY;
}
```

### Event Naming Convention

```typescript
// Format: subject:action or subject:state
'tower:placed'
'enemy:killed'
'wave:started'
'wave:completed'
'ui:goldUpdate'
'performance:warning'
```

### File Organization

```
src/
├── core/          # Core engine systems
├── ecs/           # Entity-Component-System
├── gameplay/      # Game logic and rules
├── towers/        # Tower-specific code
├── enemies/       # Enemy-specific code
├── ui/            # User interface
├── audio/         # Audio management
├── scenes/        # Phaser scenes
└── config/        # Configuration files
```

## 🔄 Contributing Workflow

1. **Fork** the repository
2. **Create** feature branch (`git checkout -b feature/new-tower-type`)
3. **Implement** changes with tests
4. **Test** thoroughly in browser
5. **Commit** with descriptive messages
6. **Push** to your fork
7. **Create** pull request

### Commit Message Format

```
type(scope): description

feat(towers): add laser tower with continuous beam
fix(pathfinding): resolve diagonal movement bug
docs(readme): update installation instructions
style(eslint): fix code formatting
test(economy): add interest calculation tests
```

## 🐛 Common Issues and Solutions

### Performance Issues

1. **Low FPS**: Enable adaptive quality or reduce effect count
2. **Memory Leaks**: Check for proper cleanup in destroy methods
3. **Startup Lag**: Optimize asset loading and initialization

### Build Issues

1. **TypeScript Errors**: Run `npx tsc --noEmit` to check types
2. **Module Resolution**: Verify path aliases in `tsconfig.json`
3. **Asset Loading**: Check file paths and case sensitivity

### Runtime Issues

1. **Black Screen**: Check browser console for JavaScript errors
2. **No Audio**: Verify browser autoplay policies
3. **Save/Load**: Clear localStorage if data corruption suspected

---

This development guide provides the foundation for contributing to and extending the Web Tower Defense game. For specific implementation questions, refer to the source code documentation and inline comments.