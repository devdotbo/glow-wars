# Technical Architecture - Minimalistic Glow Wars Prototype

## PixiJS v8 Setup and Configuration

### Installation
```bash
pnpm add pixi.js@^8.0.0 @pixi/react@^8.0.0
pnpm add -D @types/node vite
```

### Basic Application Setup
```typescript
// src/game/app.ts
import { Application, Container } from 'pixi.js';

export class GlowWarsApp {
  app: Application;
  
  async init(canvas: HTMLCanvasElement) {
    // Create PixiJS application with v8 syntax
    this.app = new Application();
    
    await this.app.init({
      canvas,
      width: 1280,
      height: 720,
      backgroundColor: 0x0A0A0A, // Near-black background
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      powerPreference: 'high-performance'
    });
    
    // Enable advanced blend modes
    this.app.renderer.background.color = 0x0A0A0A;
  }
}
```

### Vite Configuration for PixiJS
```javascript
// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    include: ['pixi.js']
  },
  build: {
    target: 'es2020',
    assetsInlineLimit: 0 // Don't inline any assets
  }
});
```

## Core Game Loop Structure

### Main Game Class Architecture
```typescript
// src/game/GlowWarsGame.ts
import { Application, Container, Ticker } from 'pixi.js';
import { InputManager } from './systems/InputManager';
import { RenderingSystem } from './systems/RenderingSystem';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { NetworkSystem } from './systems/NetworkSystem';
import { GameState } from './state/GameState';

export class GlowWarsGame {
  private app: Application;
  private gameState: GameState;
  private systems: {
    input: InputManager;
    rendering: RenderingSystem;
    physics: PhysicsSystem;
    network: NetworkSystem;
  };
  
  // Layer containers for proper z-ordering
  private layers: {
    background: Container;
    territory: Container;
    entities: Container;
    effects: Container;
    ui: Container;
  };
  
  constructor(app: Application) {
    this.app = app;
    this.initializeLayers();
    this.initializeSystems();
    this.setupGameLoop();
  }
  
  private initializeLayers() {
    this.layers = {
      background: new Container(),
      territory: new Container(),
      entities: new Container(),
      effects: new Container(),
      ui: new Container()
    };
    
    // Add layers in correct order
    Object.values(this.layers).forEach(layer => {
      this.app.stage.addChild(layer);
    });
  }
  
  private setupGameLoop() {
    this.app.ticker.add((ticker) => {
      const deltaTime = ticker.deltaTime;
      const elapsedMS = ticker.elapsedMS;
      
      // Fixed timestep with interpolation
      this.fixedUpdate(deltaTime);
      this.update(deltaTime);
      this.lateUpdate(deltaTime);
      this.render();
    });
  }
  
  private fixedUpdate(dt: number) {
    // Physics and game logic at fixed 60Hz
    const FIXED_TIMESTEP = 1000 / 60;
    this.accumulator += dt * 16.67; // Convert to ms
    
    while (this.accumulator >= FIXED_TIMESTEP) {
      this.systems.physics.update(FIXED_TIMESTEP);
      this.accumulator -= FIXED_TIMESTEP;
    }
  }
  
  private update(dt: number) {
    // Variable rate updates
    this.systems.input.update();
    this.systems.network.update();
    this.gameState.update(dt);
  }
  
  private lateUpdate(dt: number) {
    // Post-update logic
    this.systems.rendering.updateCameras(dt);
  }
  
  private render() {
    // Rendering is automatic in PixiJS
    // But we can trigger custom render passes here
    this.systems.rendering.updateVisuals();
  }
}
```

## Component Architecture

### Entity Component System (ECS) Design
```typescript
// src/game/ecs/Entity.ts
export class Entity {
  id: string;
  components: Map<string, Component>;
  
  constructor(id: string) {
    this.id = id;
    this.components = new Map();
  }
  
  addComponent<T extends Component>(component: T): T {
    this.components.set(component.constructor.name, component);
    return component;
  }
  
  getComponent<T extends Component>(type: new() => T): T | undefined {
    return this.components.get(type.name) as T;
  }
}

// src/game/ecs/Component.ts
export abstract class Component {
  entity: Entity | null = null;
}

// Example Components
export class Transform extends Component {
  x: number = 0;
  y: number = 0;
  rotation: number = 0;
  scale: number = 1;
}

export class Velocity extends Component {
  vx: number = 0;
  vy: number = 0;
  angular: number = 0;
}

export class Renderable extends Component {
  container: Container;
  color: number = 0xFFFFFF;
  alpha: number = 1;
}
```

### System Architecture
```typescript
// src/game/ecs/System.ts
export abstract class System {
  protected entities: Set<Entity> = new Set();
  
  abstract requiredComponents: Array<new() => Component>;
  
  addEntity(entity: Entity) {
    const hasAll = this.requiredComponents.every(
      comp => entity.getComponent(comp)
    );
    if (hasAll) this.entities.add(entity);
  }
  
  removeEntity(entity: Entity) {
    this.entities.delete(entity);
  }
  
  abstract update(dt: number): void;
}

// Example: Movement System
export class MovementSystem extends System {
  requiredComponents = [Transform, Velocity];
  
  update(dt: number) {
    this.entities.forEach(entity => {
      const transform = entity.getComponent(Transform)!;
      const velocity = entity.getComponent(Velocity)!;
      
      transform.x += velocity.vx * dt;
      transform.y += velocity.vy * dt;
      transform.rotation += velocity.angular * dt;
    });
  }
}
```

## State Management Approach

### Game State Structure
```typescript
// src/game/state/GameState.ts
export interface PlayerState {
  id: string;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  color: number;
  trail: Array<{ x: number; y: number; life: number }>;
  powerUps: Map<PowerUpType, PowerUpState>;
  score: number;
  territoryCount: number;
}

export interface GameState {
  players: Map<string, PlayerState>;
  territory: TerritoryGrid;
  powerUps: Map<string, PowerUpSpawn>;
  gamePhase: 'waiting' | 'playing' | 'ended';
  timeRemaining: number;
  winner: string | null;
}

// State Manager with change detection
export class GameStateManager {
  private state: GameState;
  private listeners: Set<(state: GameState) => void> = new Set();
  private dirty: Set<string> = new Set(); // Track what changed
  
  updatePlayer(id: string, updates: Partial<PlayerState>) {
    const player = this.state.players.get(id);
    if (player) {
      Object.assign(player, updates);
      this.dirty.add(`player:${id}`);
      this.notifyListeners();
    }
  }
  
  subscribe(listener: (state: GameState) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.state));
  }
}
```

### Territory Grid System
```typescript
// src/game/state/TerritoryGrid.ts
export class TerritoryGrid {
  private grid: Uint8Array; // Player IDs (0-8, 0 = unclaimed)
  private width: number;
  private height: number;
  private cellSize: number;
  
  constructor(width: number, height: number, cellSize: number = 32) {
    this.width = Math.ceil(width / cellSize);
    this.height = Math.ceil(height / cellSize);
    this.cellSize = cellSize;
    this.grid = new Uint8Array(this.width * this.height);
  }
  
  paintCell(x: number, y: number, playerId: number) {
    const gridX = Math.floor(x / this.cellSize);
    const gridY = Math.floor(y / this.cellSize);
    
    if (this.isValidCell(gridX, gridY)) {
      const index = gridY * this.width + gridX;
      this.grid[index] = playerId;
    }
  }
  
  getCellOwner(x: number, y: number): number {
    const gridX = Math.floor(x / this.cellSize);
    const gridY = Math.floor(y / this.cellSize);
    
    if (this.isValidCell(gridX, gridY)) {
      const index = gridY * this.width + gridX;
      return this.grid[index];
    }
    return 0;
  }
  
  calculateTerritoryPercentages(): Map<number, number> {
    const counts = new Map<number, number>();
    
    for (let i = 0; i < this.grid.length; i++) {
      const owner = this.grid[i];
      counts.set(owner, (counts.get(owner) || 0) + 1);
    }
    
    const total = this.grid.length;
    const percentages = new Map<number, number>();
    
    counts.forEach((count, playerId) => {
      if (playerId !== 0) { // Skip unclaimed
        percentages.set(playerId, (count / total) * 100);
      }
    });
    
    return percentages;
  }
}
```

## Convex Integration Patterns

### Real-time Sync Architecture
```typescript
// src/game/network/ConvexSync.ts
import { ConvexClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';

export class ConvexGameSync {
  private client: ConvexClient;
  private subscriptions: Map<string, () => void> = new Map();
  
  constructor(url: string) {
    this.client = new ConvexClient(url);
  }
  
  async connect(gameId: string, playerId: string) {
    // Subscribe to game state
    const unsubGame = this.client.onUpdate(
      api.game.watchGameState,
      { gameId },
      (gameState) => this.handleGameStateUpdate(gameState)
    );
    
    // Subscribe to player updates with optimistic updates
    const unsubPlayers = this.client.onUpdate(
      api.game.watchPlayers,
      { gameId },
      (players) => this.handlePlayersUpdate(players)
    );
    
    this.subscriptions.set('game', unsubGame);
    this.subscriptions.set('players', unsubPlayers);
  }
  
  // Optimistic updates for local player
  async movePlayer(direction: { x: number; y: number }) {
    // Update local state immediately
    this.applyOptimisticMove(direction);
    
    // Send to server
    await this.client.mutation(api.game.movePlayer, {
      direction,
      timestamp: Date.now()
    });
  }
}
```

### Network Message Queue
```typescript
// src/game/network/MessageQueue.ts
export class MessageQueue {
  private queue: NetworkMessage[] = [];
  private sending: boolean = false;
  private batchSize: number = 10;
  private batchDelay: number = 16; // ms
  
  push(message: NetworkMessage) {
    this.queue.push(message);
    this.processBatch();
  }
  
  private async processBatch() {
    if (this.sending || this.queue.length === 0) return;
    
    this.sending = true;
    const batch = this.queue.splice(0, this.batchSize);
    
    try {
      await this.sendBatch(batch);
    } catch (error) {
      // Re-queue failed messages
      this.queue.unshift(...batch);
    }
    
    this.sending = false;
    
    // Process next batch after delay
    if (this.queue.length > 0) {
      setTimeout(() => this.processBatch(), this.batchDelay);
    }
  }
}
```

## Performance Considerations

### Object Pooling
```typescript
// src/game/utils/ObjectPool.ts
export class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn: (obj: T) => void;
  
  constructor(
    createFn: () => T,
    resetFn: (obj: T) => void,
    initialSize: number = 100
  ) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    
    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(createFn());
    }
  }
  
  get(): T {
    return this.pool.pop() || this.createFn();
  }
  
  release(obj: T) {
    this.resetFn(obj);
    this.pool.push(obj);
  }
}
```

### Memory Management
```typescript
// Regular cleanup of unused objects
export class MemoryManager {
  private cleanupInterval: number = 5000; // 5 seconds
  private lastCleanup: number = 0;
  
  update(currentTime: number) {
    if (currentTime - this.lastCleanup > this.cleanupInterval) {
      this.performCleanup();
      this.lastCleanup = currentTime;
    }
  }
  
  private performCleanup() {
    // Remove expired trail points
    // Clear particle pools
    // Destroy unused graphics
    // Compact territory grid if needed
  }
}
```

## Architecture Diagrams

### System Communication Flow
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Input     │────▶│  Game State │────▶│  Rendering  │
│  Manager    │     │   Manager   │     │   System    │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   Network   │
                    │   System    │◀────── Convex Backend
                    └─────────────┘
```

### Layer Hierarchy
```
Stage (root)
├── Background Layer
│   └── Grid Graphics
├── Territory Layer  
│   └── Territory Graphics (per cell)
├── Entity Layer
│   ├── Players
│   │   ├── Body Graphics
│   │   ├── Glow Graphics
│   │   └── Trail Graphics
│   └── PowerUps
│       └── Shape Graphics
├── Effects Layer
│   └── ParticleContainer
└── UI Layer
    ├── Score Display
    ├── Timer
    └── Minimap
```

This architecture provides a solid foundation for building the minimalistic prototype while maintaining clean separation of concerns and excellent performance.