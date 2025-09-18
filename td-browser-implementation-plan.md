# AI Coding Agent — Step‑by‑Step Implementation Plan
**Project:** Browser‑based, Warcraft TD‑inspired Tower Defense (HTML5)  
**Primary stack:** Phaser 3 (WebGL fallback to Canvas) + Vite + TypeScript + Howler.js + (optional) Matter.js  
**Architecture:** ECS + State Machines + Event Bus + Object Pooling + Spatial Hash Grid + Flow‑Field Pathfinding  
**Goal:** Deliver a performant, scalable TD game with progressive feature tiers (Core → Depth → Polish).

---

## 0) Ground Rules for the AI Coding Agent
- Use **TypeScript** everywhere. Enforce strict mode.
- Keep **single‑responsibility** modules. No god objects.
- Treat **config as data**: towers, enemies, waves, balance in JSON.
- Prefer **data‑driven factories** and **dependency injection**.
- Enforce **60 FPS desktop / 30 FPS mobile** target. Profile every phase.
- Each task ends with **Acceptance Tests** and a **short demo** (URL).
- Commit after each numbered task with the exact **conventional commit** message provided.

---

## 1) Workspace & Tooling
**Task 1.1 — Initialize repo and toolchain**
- Create repo with branches: `main`, `dev`.
- `npm create vite@latest --template vanilla-ts`
- Add Phaser 3, Howler.js, and optional Matter.js:
  ```bash
  cd td-game
  npm i phaser howler
  npm i -D typescript @types/howler eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin vite-tsconfig-paths
  # Optional physics
  npm i matter-js
  ```
- Add `vite.config.ts` with `vite-tsconfig-paths` and dev server tuning.
- Add `tsconfig.json` (strict true, path aliases).

**Acceptance**
- `npm run dev` serves a blank canvas at `/` at 60 FPS idle.

**Commit**
- `chore: bootstrap Vite+TS project with Phaser and Howler`

---

## 2) Project Structure & Core Scaffolding
**Task 2.1 — Directory layout**
```
src/
├─ core/
│  ├─ Engine.ts
│  ├─ GameLoop.ts
│  ├─ EventBus.ts
│  └─ types.ts
├─ ecs/
│  ├─ components/
│  ├─ systems/
│  ├─ Entity.ts
│  ├─ World.ts
│  └─ Pool.ts
├─ gameplay/
│  ├─ Grid.ts
│  ├─ PathManager.ts
│  ├─ WaveManager.ts
│  ├─ CollisionManager.ts
│  └─ Economy.ts
├─ towers/
│  ├─ TowerFactory.ts
│  └─ systems/
├─ enemies/
│  ├─ EnemyFactory.ts
│  └─ systems/
├─ ui/
│  ├─ UIManager.ts
│  └─ HUD.ts
├─ config/
│  ├─ GameConfig.json
│  ├─ BalanceConfig.json
│  ├─ towers.json
│  ├─ enemies.json
│  └─ waves.json
└─ scenes/
   ├─ BootScene.ts
   ├─ MainMenuScene.ts
   └─ PlayScene.ts
```
**Acceptance**
- Compiles & runs with empty scenes and EventBus.

**Commit**
- `feat: scaffold core architecture, ECS folders, scenes, configs`

---

## 3) Phaser Engine Boot & Scenes
**Task 3.1 — Boot, MainMenu, Play**
- Boot loads minimal atlas + font. MainMenu has **Start** button. Play shows grid background.
- Phaser config enables **WebGL** with Canvas fallback.

**Acceptance**
- Start button transitions to PlayScene. Resize works.

**Commit**
- `feat: implement Boot/MainMenu/Play scenes with WebGL setup`

---

## 4) ECS Foundation
**Task 4.1 — Minimal ECS**
- Implement `Entity`, `World`, `Component` map, and `System` interface.
- Systems iterate by component signature.
- Add `Pool<T>` for pooled entities.

**Task 4.2 — Core components**
- `Position`, `Health`, `Movement`, `Attack`, `Render`, `Team`.
- Add **state tags** (e.g., `EnemyState`, `TowerState`).

**Acceptance**
- Spawn dummy entities; systems tick and log order deterministically.

**Commit**
- `feat: introduce ECS core with base components and systems`

---

## 5) Grid & Map
**Task 5.1 — Grid implementation**
- Tile sizes: **64×64**. Support maps: 14×7 (small), 15×15 (medium).
- Cells store walkable/buildable flags.
- Render grid overlay toggle.

**Task 5.2 — Path validation**
- Ensure **at least one path** from spawn to goal remains (mazing guard).

**Acceptance**
- Visual grid + placement validation highlights.

**Commit**
- `feat: add grid system with path validation and overlay`

---

## 6) Flow‑Field Pathfinding
**Task 6.1 — Compute flow field**
- Generate cost field from goal; derive flow vectors per cell.
- Recompute on **dirty** flag when towers alter topology.

**Task 6.2 — Enemy steering**
- Enemies sample local flow vector; smooth by interpolation.

**Acceptance**
- 200+ enemies follow field to goal stably at 60 FPS desktop.

**Commit**
- `feat: implement flow-field pathfinding with dirty updates`

---

## 7) Spatial Hash & Collision
**Task 7.1 — Spatial Hash Grid**
- Cell size ≈ typical tower range. Support insert/remove/update.

**Task 7.2 — Targeting & projectile queries**
- Towers query nearby enemies via hash grid; projectiles test hits.

**Acceptance**
- O(1) average neighborhood queries; profiler confirms low GC.

**Commit**
- `feat: add spatial hash grid and integrate with targeting/collisions`

---

## 8) Object Pooling
**Task 8.1 — Pools for enemies/projectiles**
- Pre‑allocate **100–500 enemies**, **50–200 projectiles**.
- `request()`/`recycle()` API with reset hooks.

**Acceptance**
- Zero allocations in hot paths (verified via DevTools).

**Commit**
- `perf: introduce object pools for enemies and projectiles`

---

## 9) Towers & Enemies (Factories + Systems)
**Task 9.1 — Data‑driven factories**
- Factories read from `towers.json` / `enemies.json`.
- Implement **Basic**, **AOE**, **Slow**, **Poison/DOT**, **Support** towers.

**Task 9.2 — Enemy archetypes**
- Normal, Fast, Heavy (armor), Swarm, Boss. Stats driven by JSON.

**Acceptance**
- Place towers; run test wave; observe expected effects and DPS.

**Commit**
- `feat: add tower/enemy factories with five tower archetypes`

---

## 10) Combat Loop & Formulas
**Task 10.1 — Damage model**
- Single‑target & splash (`primary 100%`, `secondary 50–75%` within radius).
- Slow: `speed *= (1 - slowPct)` for duration.
- DOT: tick every 0.5–1s for N seconds; armor‑agnostic.
- Support buffs: damage and fire‑rate multipliers in radius.

**Acceptance**
- Unit tests validate formulas; in‑game numbers match expected tables.

**Commit**
- `feat: implement combat formulas for damage, splash, slow, DOT, buffs`

---

## 11) Wave System & Difficulty Scaling
**Task 11.1 — WaveManager**
- JSON‑driven waves; preview next wave; countdown timers.
- Scaling options: linear, exponential, adaptive (+/‑20%).

**Task 11.2 — Goal Defense heuristic**
- Implement `(8+N)×L >= h×N` guard to tune spawn counts/HP.

**Acceptance**
- 30 continuous waves run; difficulty feels consistent.

**Commit**
- `feat: wave manager with progressive and adaptive scaling`

---

## 12) Economy & Interest
**Task 12.1 — Gold flow**
- Start gold: 60. Average per wave: 90 (configurable).
- Interest: **+2% every 15s** on unspent gold. No sell/rebuild abuse.

**Acceptance**
- Interest ticks visible; earnings match formula; no exploit via sell cycles.

**Commit**
- `feat: implement gold economy with 2% timed interest`

---

## 13) Tower Upgrades
**Task 13.1 — Linear path**
- `Cost(n) = base * 2.2^n`; damage 1.5–2×/tier; range +10–30%; fire‑rate +10–50%.

**Task 13.2 — Branching paths**
- Two specializations at T2; lock rules similar to BTD6 if 3‑path system enabled.

**Acceptance**
- UI shows upgrade tree; costs/benefits apply; lock rules enforced.

**Commit**
- `feat: add linear and branching upgrade systems with UI`

---

## 14) UI/UX & Controls
**Task 14.1 — Placement UI**
- Tower palette with costs. Drag‑and‑drop. Range preview. Valid/invalid feedback.

**Task 14.2 — HUD**
- Gold, lives, wave info, timers. Floating damage numbers. Health bars.

**Task 14.3 — Input schemes**
- Desktop: LMB select, RMB cancel, wheel zoom. Mobile: tap/long‑press/pinch.

**Acceptance**
- Usable on 1920×1080 and ≥800×600 mobile effective area.

**Commit**
- `feat: implement placement UI, HUD, and responsive controls`

---

## 15) Audio
**Task 15.1 — Howler integration**
- Audio sprite for SFX; OGG with MP3 fallback. Positional effects for towers.

**Acceptance**
- Volume mix stable; no stutter; concurrent SFX OK under load.

**Commit**
- `feat: add audio sprites with Howler and positional SFX`

---

## 16) Performance Toolkit
**Task 16.1 — WebGL batching & atlases**
- Use texture atlases (2048–4096). Instance identical sprites where possible.

**Task 16.2 — LOD & adaptive quality**
- Lower animation rate off‑screen; reduce effects under 30 FPS.

**Task 16.3 — Web Workers**
- Move flow‑field recomputation and wave planning to a Worker.

**Acceptance**
- 500+ active units hold 43+ FPS on mid‑range laptops.

**Commit**
- `perf: batching, atlases, LOD, and workerized pathfinding`

---

## 17) Save/Load & Config Hot‑Reload (Dev)
**Task 17.1 — Save slots (localStorage)**
- Save map, wave, gold, towers, RNG seed; load reliably.

**Task 17.2 — Hot‑reload configs**
- Dev‑only: watch JSON; re‑seed enemies/towers without full reload.

**Acceptance**
- Quick iteration loop confirmed; save/load resilient.

**Commit**
- `feat: add save/load and dev hot-reload for JSON configs`

---

## 18) Optional: Multiplayer Co‑op (Phase 2)
**Task 18.1 — Networking layer (stub)**
- Socket layer (e.g., Socket.IO) with room sync, shared bounty events.

**Task 18.2 — Deterministic sim or server authority**
- Deterministic lockstep (seeded RNG) **or** server‑authoritative spawn.

**Acceptance**
- Two clients sync waves and gold gains; disconnect redistribution works.

**Commit**
- `feat: co-op foundation with shared bounty synchronization`

---

## 19) Data Contracts (JSON Schemas)
**towers.json (excerpt)**
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "array",
  "items": {
    "type": "object",
    "required": ["id","name","type","baseDamage","range","fireRate","cost"],
    "properties": {
      "id": {"type":"string"},
      "name": {"type":"string"},
      "type": {"enum":["basic","aoe","slow","dot","support","special"]},
      "baseDamage": {"type":"number"},
      "range": {"type":"number"},
      "fireRate": {"type":"number"},
      "splash": {"type":"object","properties":{"radius":{"type":"number"},"falloff":{"type":"number"}}},
      "slow": {"type":"object","properties":{"pct":{"type":"number"},"duration":{"type":"number"}}},
      "dot": {"type":"object","properties":{"dps":{"type":"number"},"tick":{"type":"number"},"duration":{"type":"number"}}},
      "buffs": {"type":"object","properties":{"dmg":{"type":"number"},"firerate":{"type":"number"},"radius":{"type":"number"}}},
      "upgrades": {"type":"array","items":{"type":"object","properties":{"mult":{"type":"number"},"cost":{"type":"number"}}}}
    }
  }
}
```

**waves.json (excerpt)**
```json
{
  "waves": [
    {"id":1,"enemies":[{"type":"normal","count":15,"interval":0.6}],"bounty":90},
    {"id":2,"enemies":[{"type":"fast","count":20,"interval":0.5}],"bounty":90}
  ],
  "scaling": {"mode":"adaptive","deltaPct":0.2}
}
```

---

## 20) Testing & QA
**Unit tests**
- Formulas for damage, slow, DOT, buffs, interest, upgrade costs.
- Grid/path invariants: at least one path remains; flow vectors finite.

**Performance tests**
- Spawn sweeps (100→1,000 enemies), frame budget reports, GC churn.

**UX tests**
- Placement affordances, touch targets ≥44 px, readability at 800×600.

**Commit**
- `test: add unit/perf/ux tests and CI script`

---

## 21) Build, Packaging, PWA
**Task 21.1 — Production build**
- `npm run build` creates minified bundle. Analyze bundle size.

**Task 21.2 — PWA**
- Manifest + service worker (asset caching, offline play for single‑player).

**Acceptance**
- Installs as PWA; loads offline; performance ≥ Lighthouse 90.

**Commit**
- `build: optimize bundle and add PWA manifest+service worker`

---

## 22) Milestones & Demos
- **M1 (Week 1–2):** Core boot + ECS + Grid + Flow field prototype.
- **M2 (Week 3–4):** Towers/Enemies + Wave loop + Economy + UI.
- **M3 (Week 5–6):** Upgrades + Audio + Performance toolkit.
- **M4 (Week 7–8):** Save/Load + Balancing pass + PWA packaging.
- **M5 (Phase 2):** Co‑op foundation (optional).

---

## 23) Definition of Done (per feature)
- Deterministic behavior, tests passing, no runtime errors.
- Frame time budget within targets under stress test.
- Configurable via JSON; no constants hard‑coded.
- Accessibility: color‑safe HUD, keyboard navigation fallback.

---

## 24) Risk & Mitigation
- **Pathfinding spikes:** Workerize recalculation; dirty‑rect updates.
- **GC pauses:** Strict pooling; no allocations in hot loops.
- **Mobile thermal throttling:** Aggressive LOD; capped particle counts.
- **Balance drift:** Snapshot configs; scripted balance sweeps.

---

## 25) Example Signatures (stubs)
```ts
// gameplay/PathManager.ts
export class PathManager {
  computeFlowField(goal: GridPos): void {}
  getFlowAt(world: Vec2): Vec2 {}
  markDirty(rect?: Rect): void {}
}

// ecs/systems/TargetingSystem.ts
export class TargetingSystem implements System {
  update(dt: number, world: World): void {}
}

// ecs/Pool.ts
export class Pool<T> {
  constructor(capacity: number, create: () => T, reset: (o:T)=>void) {}
  request(): T {}
  recycle(o: T): void {}
}
```

---

## 26) Conventional Commits Guide (use verbatim)
- `chore: bootstrap Vite+TS project with Phaser and Howler`
- `feat: scaffold core architecture, ECS folders, scenes, configs`
- `feat: implement Boot/MainMenu/Play scenes with WebGL setup`
- `feat: introduce ECS core with base components and systems`
- `feat: add grid system with path validation and overlay`
- `feat: implement flow-field pathfinding with dirty updates`
- `feat: add spatial hash grid and integrate with targeting/collisions`
- `perf: introduce object pools for enemies and projectiles`
- `feat: add tower/enemy factories with five tower archetypes`
- `feat: implement combat formulas for damage, splash, slow, DOT, buffs`
- `feat: wave manager with progressive and adaptive scaling`
- `feat: implement gold economy with 2% timed interest`
- `feat: add linear and branching upgrade systems with UI`
- `feat: implement placement UI, HUD, and responsive controls`
- `feat: add audio sprites with Howler and positional SFX`
- `perf: batching, atlases, LOD, and workerized pathfinding`
- `feat: add save/load and dev hot-reload for JSON configs`
- `feat: co-op foundation with shared bounty synchronization`
- `test: add unit/perf/ux tests and CI script`
- `build: optimize bundle and add PWA manifest+service worker`

---

## 27) Quick Start Commands (copy/paste)
```bash
npm create vite@latest td-game -- --template vanilla-ts
cd td-game
npm i phaser howler matter-js
npm i -D typescript @types/howler eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin vite-tsconfig-paths

npm run dev
# open http://localhost:5173
```
