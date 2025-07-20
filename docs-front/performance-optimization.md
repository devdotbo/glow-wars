# Glow Wars Performance Optimization Guide

## Performance Targets

### Desktop
- **Resolution**: 1920x1080
- **FPS**: 60 (consistent)
- **Memory**: < 200MB
- **Load Time**: < 3 seconds
- **GPU**: GTX 1060 or equivalent

### Mobile
- **Resolution**: Device native
- **FPS**: 30+ (minimum), 60 (target)
- **Memory**: < 100MB
- **Load Time**: < 5 seconds on 4G
- **Devices**: iPhone 12, Samsung S20, or equivalent

## Rendering Optimization

### 1. Sprite Batching

```typescript
// app/game/optimization/SpriteBatcher.ts
import { Container, ParticleContainer, Sprite, Texture } from 'pixi.js'

export class SpriteBatcher {
  private batches: Map<string, ParticleContainer> = new Map()
  private readonly MAX_BATCH_SIZE = 1000

  constructor(private parent: Container) {}

  addSprite(sprite: Sprite, batchKey: string) {
    let batch = this.batches.get(batchKey)
    
    if (!batch) {
      batch = new ParticleContainer(this.MAX_BATCH_SIZE, {
        scale: true,
        position: true,
        rotation: true,
        tint: true,
        alpha: true,
      })
      this.batches.set(batchKey, batch)
      this.parent.addChild(batch)
    }
    
    // Move sprite to batch container
    if (sprite.parent) {
      sprite.parent.removeChild(sprite)
    }
    batch.addChild(sprite)
  }

  clearBatch(batchKey: string) {
    const batch = this.batches.get(batchKey)
    if (batch) {
      batch.removeChildren()
    }
  }

  destroy() {
    this.batches.forEach(batch => batch.destroy())
    this.batches.clear()
  }
}

// Usage example:
const batcher = new SpriteBatcher(app.stage)

// Batch similar sprites together
players.forEach(player => {
  batcher.addSprite(player.sprite, 'players')
})

powerUps.forEach(powerUp => {
  batcher.addSprite(powerUp.sprite, 'powerups')
})
```

### 2. Object Pooling

```typescript
// app/game/optimization/ObjectPool.ts
export class ObjectPool<T> {
  private available: T[] = []
  private inUse: Set<T> = new Set()
  private createFn: () => T
  private resetFn: (obj: T) => void
  private maxSize: number

  constructor(
    createFn: () => T,
    resetFn: (obj: T) => void,
    initialSize = 10,
    maxSize = 1000
  ) {
    this.createFn = createFn
    this.resetFn = resetFn
    this.maxSize = maxSize

    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      this.available.push(createFn())
    }
  }

  acquire(): T | null {
    let obj = this.available.pop()
    
    if (!obj && this.inUse.size < this.maxSize) {
      obj = this.createFn()
    }
    
    if (obj) {
      this.inUse.add(obj)
      return obj
    }
    
    return null
  }

  release(obj: T) {
    if (this.inUse.has(obj)) {
      this.inUse.delete(obj)
      this.resetFn(obj)
      this.available.push(obj)
    }
  }

  clear() {
    this.available.forEach(obj => {
      if (obj instanceof PIXI.DisplayObject) {
        obj.destroy()
      }
    })
    this.available = []
    this.inUse.clear()
  }

  getStats() {
    return {
      available: this.available.length,
      inUse: this.inUse.size,
      total: this.available.length + this.inUse.size,
    }
  }
}

// Particle pool example
const particlePool = new ObjectPool(
  () => new Sprite(particleTexture),
  (sprite) => {
    sprite.alpha = 1
    sprite.scale.set(1)
    sprite.rotation = 0
    sprite.visible = false
  },
  100, // Initial size
  1000 // Max size
)
```

### 3. Render Texture Caching

```typescript
// app/game/optimization/TextureCache.ts
import { RenderTexture, Sprite, Graphics, Renderer } from 'pixi.js'

export class TextureCache {
  private cache: Map<string, RenderTexture> = new Map()
  private renderer: Renderer

  constructor(renderer: Renderer) {
    this.renderer = renderer
  }

  getOrCreate(
    key: string,
    width: number,
    height: number,
    drawFn: (graphics: Graphics) => void
  ): RenderTexture {
    let texture = this.cache.get(key)
    
    if (!texture) {
      texture = RenderTexture.create({ width, height })
      const graphics = new Graphics()
      drawFn(graphics)
      this.renderer.render(graphics, { renderTexture: texture })
      graphics.destroy()
      this.cache.set(key, texture)
    }
    
    return texture
  }

  clear(key?: string) {
    if (key) {
      const texture = this.cache.get(key)
      texture?.destroy(true)
      this.cache.delete(key)
    } else {
      this.cache.forEach(texture => texture.destroy(true))
      this.cache.clear()
    }
  }

  // Pre-render complex territory shapes
  prerenderTerritories(territories: TerritoryData[]) {
    territories.forEach((territory, index) => {
      this.getOrCreate(
        `territory_${index}`,
        territory.width,
        territory.height,
        (g) => {
          // Draw territory shape once
          territory.cells.forEach(cell => {
            g.beginFill(territory.color, 0.3)
            g.drawRect(cell.x * CELL_SIZE, cell.y * CELL_SIZE, CELL_SIZE, CELL_SIZE)
            g.endFill()
          })
        }
      )
    })
  }
}
```

### 4. LOD (Level of Detail) System

```typescript
// app/game/optimization/LODSystem.ts
export class LODSystem {
  private camera: { x: number; y: number; zoom: number }
  
  constructor(camera: typeof this.camera) {
    this.camera = camera
  }

  getDetailLevel(object: { x: number; y: number }): DetailLevel {
    const distance = this.getDistanceFromCamera(object)
    const adjustedDistance = distance / this.camera.zoom
    
    if (adjustedDistance < 200) return DetailLevel.HIGH
    if (adjustedDistance < 500) return DetailLevel.MEDIUM
    if (adjustedDistance < 1000) return DetailLevel.LOW
    return DetailLevel.VERY_LOW
  }

  private getDistanceFromCamera(object: { x: number; y: number }): number {
    const dx = object.x - this.camera.x
    const dy = object.y - this.camera.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  // Apply LOD to particles
  getParticleCount(baseCount: number, position: { x: number; y: number }): number {
    const detail = this.getDetailLevel(position)
    switch (detail) {
      case DetailLevel.HIGH: return baseCount
      case DetailLevel.MEDIUM: return Math.floor(baseCount * 0.5)
      case DetailLevel.LOW: return Math.floor(baseCount * 0.25)
      case DetailLevel.VERY_LOW: return 0
    }
  }

  // Apply LOD to effects
  shouldRenderEffect(position: { x: number; y: number }, priority: EffectPriority): boolean {
    const detail = this.getDetailLevel(position)
    
    if (priority === EffectPriority.CRITICAL) return true
    if (priority === EffectPriority.HIGH && detail >= DetailLevel.LOW) return true
    if (priority === EffectPriority.MEDIUM && detail >= DetailLevel.MEDIUM) return true
    if (priority === EffectPriority.LOW && detail === DetailLevel.HIGH) return true
    
    return false
  }
}

enum DetailLevel {
  VERY_LOW,
  LOW,
  MEDIUM,
  HIGH,
}

enum EffectPriority {
  LOW,
  MEDIUM,
  HIGH,
  CRITICAL,
}
```

## Mobile-Specific Optimizations

### 1. Resolution Scaling

```typescript
// app/game/optimization/MobileOptimizer.ts
export class MobileOptimizer {
  static getOptimalResolution(): number {
    const pixelRatio = window.devicePixelRatio || 1
    const screenWidth = window.innerWidth
    const gpu = this.detectGPUTier()
    
    // Cap resolution based on device capability
    if (gpu === 'low') {
      return Math.min(pixelRatio, 1.5)
    } else if (gpu === 'medium') {
      return Math.min(pixelRatio, 2)
    } else {
      return Math.min(pixelRatio, 3)
    }
  }

  static detectGPUTier(): 'low' | 'medium' | 'high' {
    // Simple detection based on WebGL capabilities
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    
    if (!gl) return 'low'
    
    const renderer = gl.getParameter(gl.RENDERER)
    const vendor = gl.getParameter(gl.VENDOR)
    
    // Known low-end GPUs
    if (renderer.includes('Mali-4') || renderer.includes('Adreno 3')) {
      return 'low'
    }
    
    // High-end GPUs
    if (renderer.includes('Apple') || renderer.includes('Adreno 6')) {
      return 'high'
    }
    
    return 'medium'
  }

  static applyMobileSettings(app: Application) {
    if (!this.isMobile()) return
    
    // Reduce texture resolution
    app.renderer.resolution = this.getOptimalResolution()
    
    // Disable antialias on low-end devices
    if (this.detectGPUTier() === 'low') {
      app.renderer.options.antialias = false
    }
    
    // Reduce render frequency for UI
    app.ticker.maxFPS = 30
  }

  static isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    )
  }
}
```

### 2. Texture Compression

```typescript
// app/game/optimization/TextureOptimizer.ts
export class TextureOptimizer {
  static async optimizeTexture(url: string): Promise<Texture> {
    const format = this.getSupportedFormat()
    
    if (format === 'webp' && url.endsWith('.png')) {
      // Try loading WebP version first
      const webpUrl = url.replace('.png', '.webp')
      try {
        return await Texture.fromURL(webpUrl)
      } catch {
        // Fall back to PNG
      }
    }
    
    const texture = await Texture.fromURL(url)
    
    // Apply compression settings
    if (this.isMobile()) {
      texture.baseTexture.scaleMode = SCALE_MODES.LINEAR
      texture.baseTexture.mipmap = MIPMAP_MODES.OFF
    }
    
    return texture
  }

  static getSupportedFormat(): 'webp' | 'png' {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    
    return canvas.toDataURL('image/webp').includes('image/webp') ? 'webp' : 'png'
  }

  static isMobile(): boolean {
    return window.innerWidth < 768
  }
}
```

## Memory Management

### 1. Resource Lifecycle

```typescript
// app/game/optimization/ResourceManager.ts
export class ResourceManager {
  private resources: Map<string, IDestroyable> = new Map()
  private memoryLimit: number
  private currentMemory = 0

  constructor(memoryLimitMB = 200) {
    this.memoryLimit = memoryLimitMB * 1024 * 1024
    this.startMemoryMonitoring()
  }

  register(key: string, resource: IDestroyable, estimatedSize: number) {
    this.resources.set(key, resource)
    this.currentMemory += estimatedSize
    
    if (this.currentMemory > this.memoryLimit) {
      this.performCleanup()
    }
  }

  unregister(key: string) {
    const resource = this.resources.get(key)
    if (resource) {
      resource.destroy()
      this.resources.delete(key)
    }
  }

  private performCleanup() {
    console.warn('Memory limit exceeded, performing cleanup')
    
    // Remove least recently used resources
    const sortedResources = Array.from(this.resources.entries())
      .sort((a, b) => a[1].lastUsed - b[1].lastUsed)
    
    // Remove oldest 20% of resources
    const toRemove = Math.floor(sortedResources.length * 0.2)
    for (let i = 0; i < toRemove; i++) {
      this.unregister(sortedResources[i][0])
    }
  }

  private startMemoryMonitoring() {
    if ('performance' in window && 'memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory
        console.log('Memory usage:', {
          used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
          limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024),
        })
      }, 10000)
    }
  }
}

interface IDestroyable {
  destroy(): void
  lastUsed: number
}
```

### 2. Texture Atlas Management

```typescript
// app/game/optimization/AtlasManager.ts
export class AtlasManager {
  private atlases: Map<string, BaseTexture> = new Map()
  
  async loadAtlas(name: string, jsonUrl: string, imageUrl: string) {
    // Load atlas data
    const [json, image] = await Promise.all([
      fetch(jsonUrl).then(r => r.json()),
      Texture.fromURL(imageUrl),
    ])
    
    // Parse frames
    Object.entries(json.frames).forEach(([frameName, frameData]: [string, any]) => {
      const texture = new Texture(
        image.baseTexture,
        new Rectangle(
          frameData.frame.x,
          frameData.frame.y,
          frameData.frame.w,
          frameData.frame.h
        )
      )
      
      Texture.addToCache(texture, frameName)
    })
    
    this.atlases.set(name, image.baseTexture)
  }
  
  unloadAtlas(name: string) {
    const baseTexture = this.atlases.get(name)
    if (baseTexture) {
      baseTexture.destroy()
      this.atlases.delete(name)
    }
  }
}
```

## Performance Monitoring

### 1. FPS Monitor

```typescript
// app/game/optimization/PerformanceMonitor.ts
import Stats from 'stats.js'

export class PerformanceMonitor {
  private stats: Stats
  private fpsHistory: number[] = []
  private frameTimes: number[] = []
  private lastTime = performance.now()
  
  constructor(private onPerformanceIssue?: (metrics: PerformanceMetrics) => void) {
    this.stats = new Stats()
    this.stats.showPanel(0) // FPS
    document.body.appendChild(this.stats.dom)
  }

  begin() {
    this.stats.begin()
    this.lastTime = performance.now()
  }

  end() {
    this.stats.end()
    
    const currentTime = performance.now()
    const frameTime = currentTime - this.lastTime
    
    this.frameTimes.push(frameTime)
    if (this.frameTimes.length > 60) {
      this.frameTimes.shift()
    }
    
    this.fpsHistory.push(this.stats.values.fps)
    if (this.fpsHistory.length > 60) {
      this.fpsHistory.shift()
    }
    
    // Check for performance issues
    if (this.fpsHistory.length === 60) {
      const avgFPS = this.fpsHistory.reduce((a, b) => a + b) / 60
      const avgFrameTime = this.frameTimes.reduce((a, b) => a + b) / 60
      
      if (avgFPS < 30 || avgFrameTime > 33) {
        this.onPerformanceIssue?.({
          avgFPS,
          avgFrameTime,
          minFPS: Math.min(...this.fpsHistory),
          maxFrameTime: Math.max(...this.frameTimes),
        })
      }
    }
  }

  getMetrics(): PerformanceMetrics {
    return {
      avgFPS: this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length,
      avgFrameTime: this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length,
      minFPS: Math.min(...this.fpsHistory),
      maxFrameTime: Math.max(...this.frameTimes),
    }
  }

  destroy() {
    document.body.removeChild(this.stats.dom)
  }
}

interface PerformanceMetrics {
  avgFPS: number
  avgFrameTime: number
  minFPS: number
  maxFrameTime: number
}
```

### 2. Profiling Utilities

```typescript
// app/game/optimization/Profiler.ts
export class Profiler {
  private marks: Map<string, number> = new Map()
  private measures: Map<string, number[]> = new Map()

  mark(name: string) {
    this.marks.set(name, performance.now())
  }

  measure(name: string, startMark: string) {
    const start = this.marks.get(startMark)
    if (!start) return

    const duration = performance.now() - start
    
    if (!this.measures.has(name)) {
      this.measures.set(name, [])
    }
    
    const measures = this.measures.get(name)!
    measures.push(duration)
    
    // Keep only last 100 measures
    if (measures.length > 100) {
      measures.shift()
    }
  }

  getReport(): ProfileReport {
    const report: ProfileReport = {}
    
    this.measures.forEach((durations, name) => {
      const sorted = [...durations].sort((a, b) => a - b)
      report[name] = {
        avg: durations.reduce((a, b) => a + b) / durations.length,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        p50: sorted[Math.floor(sorted.length * 0.5)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        count: durations.length,
      }
    })
    
    return report
  }

  logReport() {
    console.table(this.getReport())
  }
}

interface ProfileReport {
  [key: string]: {
    avg: number
    min: number
    max: number
    p50: number
    p95: number
    count: number
  }
}

// Usage
const profiler = new Profiler()

// In game loop
profiler.mark('frame-start')
updateGame()
profiler.measure('game-update', 'frame-start')

profiler.mark('render-start')
renderGame()
profiler.measure('game-render', 'render-start')

// Log report every 5 seconds
setInterval(() => profiler.logReport(), 5000)
```

## Bundle Optimization

### Vite Configuration

```typescript
// vite.config.ts
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'pixi': ['pixi.js'],
          'game-engine': [
            './src/game/engine',
            './src/game/systems',
            './src/game/entities',
          ],
          'ui': [
            './src/game/ui',
            './src/components/game',
          ],
        },
      },
    },
    // Enable compression
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: ['pixi.js'],
    exclude: ['@pixi/particle-emitter'], // Load on demand
  },
}
```

### Lazy Loading

```typescript
// Lazy load non-critical features
const loadParticleSystem = () => import('@pixi/particle-emitter')
const loadSoundSystem = () => import('./systems/SoundSystem')

// Load when needed
async function enableParticles() {
  const { ParticleEmitter } = await loadParticleSystem()
  // Use particle system
}
```

## Testing Performance

```typescript
// app/game/__tests__/performance.test.ts
describe('Performance Tests', () => {
  it('should maintain 60 FPS with 100 entities', async () => {
    const monitor = new PerformanceMonitor()
    const game = new Game()
    
    // Spawn 100 entities
    for (let i = 0; i < 100; i++) {
      game.spawnPlayer()
    }
    
    // Run for 1000 frames
    for (let i = 0; i < 1000; i++) {
      monitor.begin()
      game.update(16.67)
      game.render()
      monitor.end()
    }
    
    const metrics = monitor.getMetrics()
    expect(metrics.avgFPS).toBeGreaterThan(55)
    expect(metrics.maxFrameTime).toBeLessThan(20)
  })
})
```