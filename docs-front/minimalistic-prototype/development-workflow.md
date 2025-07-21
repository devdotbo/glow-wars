# Development Workflow Guide

## Overview

This guide covers the development workflow for building the Glow Wars minimalistic prototype, including setup, tooling, debugging, and best practices.

## Local Development Setup

### Prerequisites
```bash
# Required tools
node --version  # v18+ required
pnpm --version  # v8+ recommended

# Install pnpm if needed
npm install -g pnpm
```

### Initial Setup
```bash
# Clone repository
git clone <repository-url>
cd glow-wars-prototype

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local

# Edit .env.local with your Convex URL
VITE_CONVEX_URL=https://your-instance.convex.cloud
```

### Project Structure
```
glow-wars-prototype/
├── src/
│   ├── game/               # Game logic
│   │   ├── entities/       # Player, PowerUp, etc.
│   │   ├── systems/        # Physics, Rendering, etc.
│   │   ├── network/        # Convex integration
│   │   └── utils/          # Helpers
│   ├── components/         # React components
│   │   ├── GameCanvas.tsx  # Main game component
│   │   ├── Menu.tsx        # Menu screens
│   │   └── HUD.tsx         # UI overlay
│   └── main.tsx           # Entry point
├── convex/                 # Backend functions
│   ├── game.ts            # Game logic
│   ├── schema.ts          # Database schema
│   └── _generated/        # Generated types
├── public/                 # Static assets
└── package.json
```

## Development Commands

### Core Commands
```bash
# Start development (frontend + backend)
pnpm dev

# Start only frontend
pnpm dev:client

# Start only Convex backend
pnpm dev:convex

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Format code
pnpm format

# Run tests
pnpm test
```

### Build Commands
```bash
# Production build
pnpm build

# Preview production build
pnpm preview

# Deploy to Convex
pnpm convex deploy
```

## Hot Reloading Configuration

### Vite Configuration
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true, // Allow external connections
  },
  optimizeDeps: {
    include: ['pixi.js'], // Pre-bundle PixiJS
  },
  build: {
    sourcemap: true, // Enable source maps
    target: 'es2020',
  },
});
```

### PixiJS Hot Reload Handler
```typescript
// src/game/Game.ts
export class Game {
  private app: Application;
  
  constructor() {
    // Hot reload handling
    if (import.meta.hot) {
      import.meta.hot.accept(() => {
        console.log('Game module updated');
        this.handleHotReload();
      });
      
      import.meta.hot.dispose(() => {
        this.cleanup();
      });
    }
  }
  
  private handleHotReload() {
    // Save game state
    const state = this.saveState();
    
    // Cleanup
    this.cleanup();
    
    // Reinitialize
    this.init();
    
    // Restore state
    this.restoreState(state);
  }
  
  private cleanup() {
    // Destroy PixiJS resources
    this.app.destroy(true, { children: true });
    
    // Clear event listeners
    this.removeEventListeners();
    
    // Stop timers
    this.stopTimers();
  }
}
```

## Testing Strategies

### Unit Testing Setup
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/'],
    },
  },
});
```

### Game Logic Tests
```typescript
// src/game/entities/__tests__/Player.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { Player } from '../Player';

describe('Player', () => {
  let player: Player;
  
  beforeEach(() => {
    const container = new Container();
    player = new Player('test-id', 0xFF0000, container);
  });
  
  it('should initialize with correct position', () => {
    expect(player.x).toBe(0);
    expect(player.y).toBe(0);
  });
  
  it('should update position based on velocity', () => {
    player.velocity = { x: 100, y: 0 };
    player.update(16); // 16ms frame
    
    expect(player.x).toBeCloseTo(1.6); // 100 * 0.016
  });
  
  it('should detect collision correctly', () => {
    const other = new Player('other', 0x00FF00, container);
    other.position.set(30, 0); // Within collision range
    
    expect(player.checkCollision(other)).toBe(true);
  });
});
```

### Visual Testing
```typescript
// src/test/visual-test.ts
export class VisualTestRunner {
  private scenarios: Map<string, () => void> = new Map();
  
  register(name: string, setup: () => void) {
    this.scenarios.set(name, setup);
  }
  
  run(scenarioName: string) {
    const setup = this.scenarios.get(scenarioName);
    if (!setup) throw new Error(`Scenario ${scenarioName} not found`);
    
    // Clear stage
    this.app.stage.removeChildren();
    
    // Run scenario
    setup();
    
    // Take screenshot for comparison
    this.takeScreenshot(scenarioName);
  }
}

// Register test scenarios
visualTest.register('player-glow', () => {
  const player = new Player('test', 0x00FF00);
  player.position.set(400, 300);
  app.stage.addChild(player);
});

visualTest.register('collision-effect', () => {
  const particles = new ParticleSystem();
  particles.createCollisionEffect(400, 300, 0xFF0000, 0x00FF00);
  app.stage.addChild(particles);
});
```

## Debugging Techniques

### Debug Mode
```typescript
// src/game/utils/Debug.ts
export class Debug {
  static enabled = import.meta.env.DEV;
  static showFPS = true;
  static showHitboxes = false;
  static showGrid = false;
  static logNetworkEvents = false;
  
  static init(app: Application) {
    if (!this.enabled) return;
    
    // Add debug UI
    const gui = new dat.GUI();
    gui.add(this, 'showFPS');
    gui.add(this, 'showHitboxes');
    gui.add(this, 'showGrid');
    gui.add(this, 'logNetworkEvents');
    
    // FPS counter
    if (this.showFPS) {
      const fpsText = new Text({ text: 'FPS: 0' });
      app.stage.addChild(fpsText);
      
      app.ticker.add(() => {
        fpsText.text = `FPS: ${Math.round(app.ticker.FPS)}`;
      });
    }
  }
  
  static drawHitbox(graphics: Graphics, entity: Entity) {
    if (!this.showHitboxes) return;
    
    graphics.lineStyle(1, 0xFF0000, 0.5);
    graphics.drawCircle(entity.x, entity.y, entity.radius);
  }
  
  static log(category: string, ...args: any[]) {
    if (!this.enabled) return;
    
    if (category === 'network' && !this.logNetworkEvents) return;
    
    console.log(`[${category}]`, ...args);
  }
}
```

### Performance Profiling
```typescript
// src/game/utils/Profiler.ts
export class Profiler {
  private marks: Map<string, number> = new Map();
  private measures: Map<string, number[]> = new Map();
  
  mark(name: string) {
    this.marks.set(name, performance.now());
  }
  
  measure(name: string, startMark: string) {
    const start = this.marks.get(startMark);
    if (!start) return;
    
    const duration = performance.now() - start;
    
    if (!this.measures.has(name)) {
      this.measures.set(name, []);
    }
    
    const measurements = this.measures.get(name)!;
    measurements.push(duration);
    
    // Keep last 100 measurements
    if (measurements.length > 100) {
      measurements.shift();
    }
  }
  
  getStats(name: string) {
    const measurements = this.measures.get(name);
    if (!measurements || measurements.length === 0) return null;
    
    const sorted = [...measurements].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    
    return {
      avg: sum / sorted.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }
  
  logStats() {
    console.table(
      Array.from(this.measures.keys()).map(name => ({
        name,
        ...this.getStats(name),
      }))
    );
  }
}

// Usage
profiler.mark('update-start');
this.updateEntities();
profiler.measure('entity-update', 'update-start');
```

### Network Debugging
```typescript
// src/game/network/NetworkDebugger.ts
export class NetworkDebugger {
  private events: NetworkEvent[] = [];
  private maxEvents: number = 100;
  
  logEvent(type: string, data: any) {
    this.events.push({
      type,
      data,
      timestamp: Date.now(),
      direction: type.startsWith('send') ? 'out' : 'in',
    });
    
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }
    
    // Console output if enabled
    if (Debug.logNetworkEvents) {
      console.log(`[Network] ${type}`, data);
    }
  }
  
  getLatencyStats() {
    const pings = this.events
      .filter(e => e.type === 'ping')
      .map(e => e.data.latency);
    
    if (pings.length === 0) return null;
    
    return {
      current: pings[pings.length - 1],
      average: pings.reduce((a, b) => a + b) / pings.length,
      min: Math.min(...pings),
      max: Math.max(...pings),
    };
  }
  
  exportLog() {
    const log = this.events.map(e => ({
      time: new Date(e.timestamp).toISOString(),
      type: e.type,
      direction: e.direction,
      data: JSON.stringify(e.data),
    }));
    
    // Download as JSON
    const blob = new Blob([JSON.stringify(log, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `network-log-${Date.now()}.json`;
    a.click();
  }
}
```

## Iteration Guidelines

### Rapid Prototyping Workflow
1. **Make Changes**: Edit code with hot reload
2. **Visual Check**: See immediate results
3. **Test Gameplay**: Play test the change
4. **Profile**: Check performance impact
5. **Commit**: Save working state

### Feature Development Cycle
```bash
# 1. Create feature branch
git checkout -b feature/power-up-effects

# 2. Implement incrementally
# - Start with basic version
# - Test and commit
# - Add polish
# - Test and commit

# 3. Performance check
pnpm build
pnpm preview
# Check FPS with all players

# 4. Merge when stable
git checkout main
git merge feature/power-up-effects
```

### Debugging Workflow
```typescript
// 1. Enable debug mode
Debug.enabled = true;
Debug.showHitboxes = true;

// 2. Add breakpoints
debugger; // Browser will pause here

// 3. Use conditional breakpoints
if (player.id === 'problematic-player') {
  debugger;
}

// 4. Log specific events
Debug.log('collision', {
  player1: player1.id,
  player2: player2.id,
  position: { x, y },
});

// 5. Profile performance
profiler.mark('render-start');
// ... rendering code
profiler.measure('render', 'render-start');
profiler.logStats();
```

## Browser DevTools Integration

### Performance Tab
```javascript
// Mark custom events in timeline
performance.mark('game-loop-start');
// ... game loop
performance.mark('game-loop-end');
performance.measure('game-loop', 'game-loop-start', 'game-loop-end');
```

### Memory Profiling
```javascript
// Take heap snapshots
if (window.performance && window.performance.memory) {
  console.log({
    totalJSHeapSize: window.performance.memory.totalJSHeapSize,
    usedJSHeapSize: window.performance.memory.usedJSHeapSize,
    jsHeapSizeLimit: window.performance.memory.jsHeapSizeLimit,
  });
}
```

### Network Tab
- Monitor WebSocket messages
- Check Convex sync frequency
- Analyze payload sizes

## Common Issues & Solutions

### Issue: Hot reload breaks game state
```typescript
// Solution: Implement proper cleanup
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    // Clean up event listeners
    window.removeEventListener('keydown', this.handleKeyDown);
    
    // Clear timers
    clearInterval(this.gameTimer);
    
    // Destroy PixiJS resources
    this.app.destroy(true);
  });
}
```

### Issue: Memory leaks
```typescript
// Solution: Proper resource management
class ResourceManager {
  private textures: Map<string, Texture> = new Map();
  
  getTexture(key: string): Texture {
    // Reuse existing textures
    return this.textures.get(key) || this.createTexture(key);
  }
  
  cleanup() {
    // Destroy all textures
    this.textures.forEach(texture => texture.destroy(true));
    this.textures.clear();
  }
}
```

### Issue: Laggy performance
```typescript
// Solution: Profile and optimize
// 1. Check draw calls
console.log('Draw calls:', app.renderer.plugins.batch.drawCalls);

// 2. Monitor texture swaps
let lastTexture = null;
app.renderer.on('prerender', () => {
  const currentTexture = app.renderer.texture.current;
  if (currentTexture !== lastTexture) {
    textureSwaps++;
    lastTexture = currentTexture;
  }
});

// 3. Use Chrome DevTools Performance tab
```

## Best Practices

### Code Organization
- Keep files small and focused
- Use TypeScript interfaces
- Document complex logic
- Follow naming conventions

### Performance
- Profile before optimizing
- Use object pools
- Batch similar operations
- Minimize texture switches

### Testing
- Write tests for game logic
- Visual test effects
- Performance test with max players
- Network test with latency

### Version Control
- Commit working increments
- Use descriptive messages
- Branch for experiments
- Tag stable versions

This workflow ensures smooth development and quick iteration on the minimalistic prototype!