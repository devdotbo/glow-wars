# PixiJS v8 Setup Guide for Glow Wars

## Installation

```bash
# Core PixiJS packages
pnpm add pixi.js@^8.0.0
pnpm add @pixi/react@^8.0.0

# Additional packages for effects
pnpm add @pixi/filter-glow@^6.0.0
pnpm add @pixi/particle-emitter@^5.0.0

# Development dependencies
pnpm add -D @types/pixi.js
pnpm add -D stats.js @types/stats.js

# Asset building tools (optional)
pnpm add -D @assetpack/core @assetpack/plugin-texture-packer
```

## TypeScript Configuration

Add to `tsconfig.json`:
```json
{
  "compilerOptions": {
    "types": ["@types/pixi.js"],
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  }
}
```

## Core Setup Files

### 1. PixiJS Application Singleton (`app/game/pixiApp.ts`)

```typescript
import { Application, ApplicationOptions } from 'pixi.js'

let app: Application | null = null

export interface PixiAppConfig extends Partial<ApplicationOptions> {
  containerId: string
  onReady?: (app: Application) => void
}

export async function createPixiApp(config: PixiAppConfig): Promise<Application> {
  // Destroy existing app if any
  if (app) {
    await destroyPixiApp()
  }

  const container = document.getElementById(config.containerId)
  if (!container) {
    throw new Error(`Container with id ${config.containerId} not found`)
  }

  // Default options optimized for Glow Wars
  const options: ApplicationOptions = {
    resizeTo: container,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    backgroundColor: 0x0a0a0a, // Dark background for neon effect
    backgroundAlpha: 1,
    powerPreference: 'high-performance',
    ...config,
  }

  // Create application
  app = new Application()
  await app.init(options)

  // Add canvas to container
  container.appendChild(app.canvas)

  // Set up resize handling
  setupResizeHandling(app, container)

  // Call ready callback
  config.onReady?.(app)

  return app
}

export function getPixiApp(): Application {
  if (!app) {
    throw new Error('PixiJS app not initialized')
  }
  return app
}

export async function destroyPixiApp(): Promise<void> {
  if (app) {
    app.destroy(true, { children: true, texture: true, baseTexture: true })
    app = null
  }
}

function setupResizeHandling(app: Application, container: HTMLElement) {
  const resize = () => {
    const parent = container.parentElement
    if (parent) {
      app.renderer.resize(parent.clientWidth, parent.clientHeight)
    }
  }

  window.addEventListener('resize', resize)
  
  // Clean up on destroy
  app.ticker.add(() => {
    if (app.stage === null) {
      window.removeEventListener('resize', resize)
    }
  }, null, -1)
}
```

### 2. Game Loop Manager (`app/game/gameLoop.ts`)

```typescript
import { Application, Ticker } from 'pixi.js'
import Stats from 'stats.js'

export interface GameLoopCallbacks {
  update: (deltaTime: number) => void
  render: () => void
  fixedUpdate?: (fixedDelta: number) => void
}

export class GameLoop {
  private app: Application
  private callbacks: GameLoopCallbacks
  private stats?: Stats
  private accumulator = 0
  private readonly FIXED_TIMESTEP = 1000 / 60 // 60 FPS for physics
  private lastTime = 0
  private isRunning = false

  constructor(app: Application, callbacks: GameLoopCallbacks, showStats = false) {
    this.app = app
    this.callbacks = callbacks

    if (showStats && typeof window !== 'undefined') {
      this.setupStats()
    }
  }

  private setupStats() {
    this.stats = new Stats()
    this.stats.showPanel(0) // 0: fps, 1: ms, 2: mb
    document.body.appendChild(this.stats.dom)
    this.stats.dom.style.left = 'auto'
    this.stats.dom.style.right = '0px'
  }

  start() {
    if (this.isRunning) return
    
    this.isRunning = true
    this.lastTime = performance.now()
    
    this.app.ticker.add(this.tick, this)
  }

  stop() {
    this.isRunning = false
    this.app.ticker.remove(this.tick, this)
  }

  private tick = () => {
    if (!this.isRunning) return

    this.stats?.begin()

    const currentTime = performance.now()
    const frameTime = currentTime - this.lastTime
    this.lastTime = currentTime

    // Cap frame time to prevent spiral of death
    const cappedFrameTime = Math.min(frameTime, 100)

    // Variable update for rendering
    this.callbacks.update(cappedFrameTime / 1000)

    // Fixed timestep for physics
    if (this.callbacks.fixedUpdate) {
      this.accumulator += cappedFrameTime

      while (this.accumulator >= this.FIXED_TIMESTEP) {
        this.callbacks.fixedUpdate(this.FIXED_TIMESTEP / 1000)
        this.accumulator -= this.FIXED_TIMESTEP
      }
    }

    // Render
    this.callbacks.render()

    this.stats?.end()
  }

  destroy() {
    this.stop()
    if (this.stats) {
      document.body.removeChild(this.stats.dom)
    }
  }
}
```

### 3. React Integration Component (`app/components/game/GameCanvas.tsx`)

```typescript
import { useEffect, useRef, useState } from 'react'
import { Application } from 'pixi.js'
import { createPixiApp, destroyPixiApp, getPixiApp } from '~/game/pixiApp'
import { GameLoop } from '~/game/gameLoop'

interface GameCanvasProps {
  gameId: string
  onReady?: (app: Application) => void
  showStats?: boolean
}

export function GameCanvas({ gameId, onReady, showStats = false }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const gameLoopRef = useRef<GameLoop | null>(null)

  useEffect(() => {
    let mounted = true

    async function initPixi() {
      if (!containerRef.current || !mounted) return

      try {
        setIsLoading(true)
        setError(null)

        const app = await createPixiApp({
          containerId: containerRef.current.id,
          onReady: (app) => {
            if (!mounted) return

            // Initialize game loop
            gameLoopRef.current = new GameLoop(
              app,
              {
                update: (deltaTime) => {
                  // Update game logic here
                  // This will be connected to game systems
                },
                render: () => {
                  // Render is handled automatically by PixiJS
                },
                fixedUpdate: (fixedDelta) => {
                  // Fixed timestep updates for physics
                },
              },
              showStats
            )

            gameLoopRef.current.start()
            setIsLoading(false)
            onReady?.(app)
          },
        })
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize PixiJS')
          setIsLoading(false)
        }
      }
    }

    initPixi()

    return () => {
      mounted = false
      gameLoopRef.current?.destroy()
      destroyPixiApp()
    }
  }, [gameId, onReady, showStats])

  return (
    <div className="relative w-full h-full bg-gray-900">
      <div
        ref={containerRef}
        id={`game-canvas-${gameId}`}
        className="w-full h-full"
      />
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-white">Initializing game engine...</div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900/50">
          <div className="text-white">Error: {error}</div>
        </div>
      )}
    </div>
  )
}
```

### 4. Game Container with Convex Integration (`app/components/game/GameContainer.tsx`)

```typescript
import { useQuery } from 'convex/react'
import { api } from '~/convex/_generated/api'
import { GameCanvas } from './GameCanvas'
import { Application } from 'pixi.js'
import { useEffect, useRef } from 'react'

interface GameContainerProps {
  gameId: string
}

export function GameContainer({ gameId }: GameContainerProps) {
  const gameState = useQuery(api.games.getGameState, { gameId })
  const positions = useQuery(api.positions.streamPositions, { gameId })
  const appRef = useRef<Application | null>(null)

  const handlePixiReady = (app: Application) => {
    appRef.current = app
    
    // Initialize game systems here
    // This will be expanded in Phase 3
  }

  useEffect(() => {
    if (!appRef.current || !gameState || !positions) return

    // Update game state in PixiJS
    // This will be implemented in Phase 3
  }, [gameState, positions])

  if (!gameState) {
    return <div>Loading game...</div>
  }

  return (
    <div className="w-full h-screen">
      <GameCanvas
        gameId={gameId}
        onReady={handlePixiReady}
        showStats={process.env.NODE_ENV === 'development'}
      />
    </div>
  )
}
```

## Vite Configuration

Add to `vite.config.ts`:
```typescript
export default {
  optimizeDeps: {
    include: ['pixi.js'],
    esbuildOptions: {
      target: 'es2020',
    },
  },
  build: {
    target: 'es2020',
  },
}
```

## Environment Setup

### Development Features
```typescript
// app/game/config.ts
export const GAME_CONFIG = {
  debug: {
    showStats: process.env.NODE_ENV === 'development',
    showHitboxes: false,
    logPerformance: false,
  },
  rendering: {
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    targetFPS: 60,
  },
  viewport: {
    worldWidth: 2000,
    worldHeight: 2000,
    minZoom: 0.5,
    maxZoom: 2,
  },
}
```

## Common Issues and Solutions

### 1. Canvas Blur on High DPI Displays
```typescript
// Ensure resolution and autoDensity are set
resolution: window.devicePixelRatio || 1,
autoDensity: true,
```

### 2. Memory Leaks
- Always destroy PixiJS app on unmount
- Remove event listeners
- Destroy textures when not needed
- Use object pooling for frequently created/destroyed objects

### 3. Performance Issues
- Use sprite batching
- Minimize texture swaps
- Use render textures for complex static graphics
- Profile with Chrome DevTools

### 4. WebGL Context Loss
```typescript
app.renderer.on('contextlost', () => {
  console.error('WebGL context lost')
  // Implement recovery strategy
})

app.renderer.on('contextrestored', () => {
  console.log('WebGL context restored')
  // Reinitialize resources
})
```

## Testing Setup

```typescript
// app/game/__tests__/pixiApp.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createPixiApp, destroyPixiApp } from '../pixiApp'

describe('PixiJS App', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    container.id = 'test-container'
    document.body.appendChild(container)
  })

  afterEach(async () => {
    await destroyPixiApp()
    document.body.removeChild(container)
  })

  it('should create PixiJS app', async () => {
    const app = await createPixiApp({
      containerId: 'test-container',
    })
    
    expect(app).toBeDefined()
    expect(app.stage).toBeDefined()
    expect(app.renderer).toBeDefined()
  })
})
```

## Next Steps

After completing this setup:
1. Implement asset loading system (Phase 2)
2. Create game entities and systems (Phase 3)
3. Add visual effects (Phase 4)
4. Build UI layer (Phase 5)
5. Optimize performance (Phase 6)