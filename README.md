# Web Tower Defense Game

A modern browser-based tower defense game built with Phaser 3, TypeScript, and Vite. Features advanced ECS architecture, performance optimization, and comprehensive gameplay systems.

## 🎮 Features

### Core Gameplay
- **Tower Defense Mechanics**: Place and upgrade towers to defend against waves of enemies
- **Three Tower Types**: Basic, AOE, and Slow towers with unique abilities
- **Wave Management**: Progressive difficulty with adaptive scaling
- **Economy System**: Gold management with 2% interest every 15 seconds
- **Lives System**: Strategic gameplay with limited lives

### Advanced Systems
- **Entity-Component-System (ECS)**: Efficient game architecture for performance
- **Flow-Field Pathfinding**: Smart enemy navigation with dynamic path recalculation
- **Object Pooling**: Zero-allocation systems for enemies and projectiles
- **Spatial Hash Grid**: O(1) collision detection for optimal performance
- **Performance Manager**: LOD system with adaptive quality based on FPS

### User Experience
- **Settings System**: Comprehensive audio, graphics, gameplay, and controls options
- **Save/Load System**: Multiple save slots with game state persistence
- **Keyboard Shortcuts**: Quick tower selection and game controls
- **Help System**: In-game help panel with controls reference
- **Visual Feedback**: Health bars, tower ranges, and effect systems

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- Modern web browser with WebGL support

### Installation
```bash
# Clone the repository
git clone https://github.com/andupetcu/web_td.git
cd web_td

# Install dependencies
npm install

# Start development server
npm run dev
```

### Build for Production
```bash
npm run build
npm run preview
```

## 🎯 Controls

### Keyboard Shortcuts
- **1, 2, 3** - Select tower types (Basic, AOE, Slow)
- **Space** - Start next wave
- **P** - Pause/Resume game
- **ESC** - Open settings menu
- **?** - Toggle help panel

### Mouse Controls
- **Click Grid** - Place selected tower or upgrade existing tower
- **Click Tower** - Upgrade tower (when no tower type selected)
- **Click UI** - Interact with buttons and menus

## 🏗️ Architecture

### Core Systems
- **Engine** (`src/core/Engine.ts`) - Phaser 3 game initialization
- **ECS World** (`src/ecs/World.ts`) - Entity-Component-System implementation
- **Event Bus** (`src/core/EventBus.ts`) - Decoupled event-driven communication
- **Performance Manager** (`src/core/PerformanceManager.ts`) - FPS monitoring and LOD

### Gameplay Systems
- **Game Manager** (`src/gameplay/GameManager.ts`) - Central game coordination
- **Wave Manager** (`src/gameplay/WaveManager.ts`) - Enemy wave progression
- **Economy** (`src/gameplay/Economy.ts`) - Gold and transaction management
- **Grid System** (`src/gameplay/Grid.ts`) - Spatial grid with pathfinding
- **Save System** (`src/gameplay/SaveSystem.ts`) - Game state persistence

### Factories & Pools
- **Tower Factory** (`src/towers/TowerFactory.ts`) - Tower creation and management
- **Enemy Factory** (`src/enemies/EnemyFactory.ts`) - Enemy spawning and pooling
- **Projectile Pool** (`src/ecs/pools/ProjectilePool.ts`) - Projectile recycling

### User Interface
- **UI Manager** (`src/ui/UIManager.ts`) - Health bars and visual effects
- **Settings Scene** (`src/scenes/SettingsScene.ts`) - Comprehensive options menu
- **Play Scene** (`src/scenes/PlayScene.ts`) - Main gameplay interface

## 📁 Project Structure

```
src/
├── core/              # Core engine and systems
│   ├── Engine.ts      # Phaser 3 initialization
│   ├── EventBus.ts    # Event system
│   └── PerformanceManager.ts  # Performance optimization
├── ecs/               # Entity-Component-System
│   ├── World.ts       # ECS world management
│   ├── components/    # Game components
│   ├── systems/       # Game systems
│   └── pools/         # Object pooling
├── gameplay/          # Core gameplay logic
│   ├── GameManager.ts # Game coordination
│   ├── WaveManager.ts # Wave progression
│   ├── Economy.ts     # Economic system
│   ├── Grid.ts        # Spatial grid
│   └── SaveSystem.ts  # Persistence
├── towers/            # Tower system
├── enemies/           # Enemy system
├── scenes/            # Phaser scenes
├── ui/                # User interface
├── audio/             # Audio management
└── config/            # Configuration files
```

## ⚡ Performance Features

### Optimization Systems
- **Level of Detail (LOD)**: Distance-based quality reduction
- **Adaptive Quality**: Automatic quality adjustment based on FPS
- **Object Pooling**: Reuse game objects to prevent garbage collection
- **Spatial Partitioning**: Efficient collision detection and queries
- **Flow Field Pathfinding**: Optimized enemy movement calculations

### Performance Monitoring
- Real-time FPS tracking
- Memory usage monitoring
- Garbage collection detection
- Performance metrics overlay (in settings)

## 🎨 Customization

### Configuration
Game settings are stored in `src/config/GameConfig.json`:
```json
{
  "gridSize": 32,
  "mapWidth": 25,
  "mapHeight": 18,
  "startingGold": 100,
  "performance": {
    "maxProjectiles": 1000,
    "spatialHashCellSize": 64
  }
}
```

### Tower Configuration
Towers are defined in `src/config/towers/`:
- `basic.json` - Basic tower configuration
- `aoe.json` - Area of effect tower
- `slow.json` - Slowing tower

### Wave Configuration
Enemy waves in `src/config/waves/`:
- Wave progression and enemy types
- Scaling difficulty parameters
- Spawn timing and patterns

## 🛠️ Development

### Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint (if configured)
- `npm run type-check` - Run TypeScript compiler check

### Code Style
- TypeScript with strict mode
- ESM modules
- Functional programming patterns
- Event-driven architecture
- Component-based design

## 📊 Technical Specifications

### Dependencies
- **Phaser 3** - Game engine
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool
- **Howler.js** - Audio management

### Browser Support
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

### Performance Targets
- 60 FPS on modern hardware
- 30 FPS minimum on older devices
- < 100MB memory usage
- Instant startup time

## 🚧 Future Enhancements

### Potential Features
- [ ] Multiplayer support
- [ ] More tower types and abilities
- [ ] Boss enemies and special events
- [ ] Achievement system
- [ ] Cloud save synchronization
- [ ] Mobile touch controls
- [ ] Map editor
- [ ] Mod support

### Technical Improvements
- [ ] WebGL shader effects
- [ ] Web Workers for background processing
- [ ] Progressive Web App (PWA) support
- [ ] Analytics and telemetry
- [ ] Error reporting and crash handling

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 💫 Acknowledgments

Built with modern web technologies and best practices for game development. Special thanks to the Phaser community for excellent documentation and examples.

---

**Game is fully playable at**: http://localhost:3000 (when running `npm run dev`)