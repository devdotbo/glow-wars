# Performance Optimization Guide

## Overview

This guide covers essential performance optimization techniques for the Glow Wars minimalistic prototype. The goal is to maintain 60 FPS with 8 players, hundreds of particles, and thousands of territory cells.

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Frame Rate | 60 FPS stable | Chrome DevTools Performance |
| Frame Time | <16.67ms | Performance.now() |
| Memory Usage | <100MB | Chrome Memory Profiler |
| Draw Calls | <100 per frame | SpectorJS |
| Input Latency | <50ms | Custom timing |

## Rendering Optimizations

### 1. Graphics Batching

```typescript
// BAD: Creating new Graphics each frame
update() {
  const graphics = new Graphics();
  graphics.circle(x, y, radius);
  graphics.fill(color);
}

// GOOD: Reuse Graphics object
private graphics = new Graphics();

update() {
  this.graphics.clear();
  this.graphics.circle(x, y, radius);
  this.graphics.fill(color);
}
```

### 2. ParticleContainer Usage

```typescript
// For large numbers of similar sprites
const particleContainer = new ParticleContainer(10000, {
  scale: true,
  position: true,
  rotation: false,    // Disable if not needed
  uvs: false,        // Disable for single texture
  tint: true,
  alpha: true
});

// Properties affect performance:
// - scale/position: Usually needed
// - rotation: Only if particles rotate
// - uvs: Only for texture atlases
// - tint/alpha: For color/fade effects
```

### 3. Render Texture Caching

```typescript
// Cache complex graphics that don't change often
class TerritoryRenderer {
  private renderTexture: RenderTexture;
  private sprite: Sprite;
  private isDirty: boolean = false;
  
  constructor(width: number, height: number) {
    this.renderTexture = RenderTexture.create({ width, height });
    this.sprite = new Sprite(this.renderTexture);
  }
  
  markDirty() {
    this.isDirty = true;
  }
  
  update(renderer: Renderer) {
    if (!this.isDirty) return;
    
    // Render to texture only when changed
    renderer.render({
      container: this.territoryGraphics,
      target: this.renderTexture,
      clear: true
    });
    
    this.isDirty = false;
  }
}
```

### 4. Culling and LOD

```typescript
class LODSystem {
  private camera: Rectangle;
  
  updateEntity(entity: Entity, camera: Rectangle) {
    const distance = this.getDistanceToCamera(entity, camera);
    
    if (distance > 1000) {
      // Far away - hide or simplify
      entity.visible = false;
      return;
    }
    
    entity.visible = true;
    
    // Adjust detail based on distance
    if (distance < 200) {
      entity.setLOD('high');   // All effects
    } else if (distance < 500) {
      entity.setLOD('medium'); // Reduced effects
    } else {
      entity.setLOD('low');    // Minimal graphics
    }
  }
}
```

## Memory Management

### 1. Object Pooling

```typescript
class ObjectPool<T> {
  private available: T[] = [];
  private active: Set<T> = new Set();
  private createFn: () => T;
  private resetFn: (obj: T) => void;
  
  constructor(
    createFn: () => T,
    resetFn: (obj: T) => void,
    initialSize: number = 100
  ) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    
    // Pre-populate
    for (let i = 0; i < initialSize; i++) {
      this.available.push(createFn());
    }
  }
  
  acquire(): T {
    let obj = this.available.pop();
    
    if (!obj) {
      obj = this.createFn();
      console.warn('Pool exhausted, creating new object');
    }
    
    this.active.add(obj);
    return obj;
  }
  
  release(obj: T) {
    if (!this.active.has(obj)) return;
    
    this.active.delete(obj);
    this.resetFn(obj);
    this.available.push(obj);
  }
  
  releaseAll() {
    this.active.forEach(obj => {
      this.resetFn(obj);
      this.available.push(obj);
    });
    this.active.clear();
  }
  
  get stats() {
    return {
      available: this.available.length,
      active: this.active.size,
      total: this.available.length + this.active.size
    };
  }
}

// Usage example
const particlePool = new ObjectPool(
  () => new Particle(),
  (p) => p.reset(),
  1000
);
```

### 2. Trail Point Optimization

```typescript
class OptimizedTrail {
  private points: Float32Array;  // More efficient than object array
  private pointCount: number = 0;
  private maxPoints: number = 50;
  private pointSize: number = 4; // x, y, life, size
  
  constructor(maxPoints: number) {
    this.maxPoints = maxPoints;
    this.points = new Float32Array(maxPoints * this.pointSize);
  }
  
  addPoint(x: number, y: number) {
    // Ring buffer approach
    const index = this.pointCount % this.maxPoints;
    const offset = index * this.pointSize;
    
    this.points[offset] = x;
    this.points[offset + 1] = y;
    this.points[offset + 2] = 1.0;     // life
    this.points[offset + 3] = 8.0;     // size
    
    this.pointCount++;
  }
  
  update(deltaTime: number) {
    const decay = deltaTime * 0.001;
    const startIndex = Math.max(0, this.pointCount - this.maxPoints);
    
    for (let i = startIndex; i < this.pointCount; i++) {
      const index = i % this.maxPoints;
      const offset = index * this.pointSize;
      
      this.points[offset + 2] -= decay; // Update life
      this.points[offset + 3] *= 0.99;  // Shrink size
    }
  }
}
```

### 3. Territory Grid Optimization

```typescript
class OptimizedTerritoryGrid {
  private grid: Uint8Array;
  private dirtyRegions: Set<number> = new Set();
  private dirtyBounds: Rectangle | null = null;
  
  paintCell(x: number, y: number, playerId: number) {
    const index = this.getIndex(x, y);
    if (this.grid[index] === playerId) return;
    
    this.grid[index] = playerId;
    this.dirtyRegions.add(index);
    
    // Track dirty bounds for batch updates
    if (!this.dirtyBounds) {
      this.dirtyBounds = new Rectangle(x, y, 1, 1);
    } else {
      this.dirtyBounds.enlarge(x, y);
    }
  }
  
  render(graphics: Graphics) {
    if (this.dirtyRegions.size === 0) return;
    
    // Only clear and redraw dirty region
    if (this.dirtyBounds) {
      graphics.clear();
      
      const startX = Math.floor(this.dirtyBounds.x);
      const startY = Math.floor(this.dirtyBounds.y);
      const endX = Math.ceil(this.dirtyBounds.right);
      const endY = Math.ceil(this.dirtyBounds.bottom);
      
      for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
          const index = this.getIndex(x, y);
          if (this.dirtyRegions.has(index)) {
            this.drawCell(graphics, x, y, this.grid[index]);
          }
        }
      }
    }
    
    this.dirtyRegions.clear();
    this.dirtyBounds = null;
  }
}
```

## Update Loop Optimizations

### 1. Fixed Timestep with Interpolation

```typescript
class GameLoop {
  private accumulator: number = 0;
  private fixedTimestep: number = 1000 / 60; // 60 Hz
  private maxSubSteps: number = 5;
  
  update(deltaTime: number) {
    this.accumulator += deltaTime;
    
    // Prevent spiral of death
    if (this.accumulator > this.fixedTimestep * this.maxSubSteps) {
      this.accumulator = this.fixedTimestep * this.maxSubSteps;
    }
    
    // Fixed timestep updates
    while (this.accumulator >= this.fixedTimestep) {
      this.fixedUpdate(this.fixedTimestep);
      this.accumulator -= this.fixedTimestep;
    }
    
    // Interpolation factor for rendering
    const alpha = this.accumulator / this.fixedTimestep;
    this.render(alpha);
  }
  
  private fixedUpdate(dt: number) {
    // Physics, collisions, game logic
    this.physics.update(dt);
    this.collisions.update(dt);
  }
  
  private render(alpha: number) {
    // Interpolate positions for smooth rendering
    this.entities.forEach(entity => {
      entity.interpolatedX = entity.x + entity.vx * alpha;
      entity.interpolatedY = entity.y + entity.vy * alpha;
    });
  }
}
```

### 2. System Priority and Throttling

```typescript
class SystemScheduler {
  private systems: Array<{
    system: System;
    priority: number;
    frequency: number;
    lastUpdate: number;
  }> = [];
  
  registerSystem(system: System, priority: number, frequency: number) {
    this.systems.push({
      system,
      priority,
      frequency,
      lastUpdate: 0
    });
    
    // Sort by priority
    this.systems.sort((a, b) => b.priority - a.priority);
  }
  
  update(currentTime: number) {
    for (const entry of this.systems) {
      // Check if system should update
      if (currentTime - entry.lastUpdate >= entry.frequency) {
        entry.system.update(currentTime - entry.lastUpdate);
        entry.lastUpdate = currentTime;
      }
    }
  }
}

// Usage
scheduler.registerSystem(physics, 100, 16);      // Every frame
scheduler.registerSystem(particles, 90, 16);     // Every frame
scheduler.registerSystem(ui, 50, 33);           // 30 FPS
scheduler.registerSystem(minimap, 30, 100);     // 10 FPS
scheduler.registerSystem(analytics, 10, 1000);  // 1 FPS
```

## GPU Optimizations

### 1. Batch Rendering Setup

```typescript
// Group similar draw operations
class BatchRenderer {
  private batches: Map<string, Batch> = new Map();
  
  addToBatch(sprite: Sprite, batchKey: string) {
    let batch = this.batches.get(batchKey);
    
    if (!batch) {
      batch = new Batch();
      this.batches.set(batchKey, batch);
    }
    
    batch.add(sprite);
  }
  
  render() {
    // Render each batch together
    this.batches.forEach(batch => {
      batch.render();
    });
  }
}

// Batch similar sprites by texture and blend mode
const batchKey = `${sprite.texture.uid}_${sprite.blendMode}`;
```

### 2. Shader Optimization

```glsl
// Optimized glow shader
precision mediump float;

varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform vec4 glowColor;
uniform float intensity;

void main(void) {
    vec4 color = texture2D(uSampler, vTextureCoord);
    
    // Simple glow without expensive operations
    float alpha = color.a;
    vec3 glow = glowColor.rgb * alpha * intensity;
    
    gl_FragColor = vec4(
        color.rgb + glow,
        color.a
    );
}
```

### 3. Texture Atlas Usage

```typescript
class TextureManager {
  private atlas: Texture;
  private frames: Map<string, Rectangle> = new Map();
  
  loadAtlas(atlasPath: string, dataPath: string) {
    // Load texture atlas for batching
    this.atlas = Texture.from(atlasPath);
    
    // Define frames
    this.frames.set('particle', new Rectangle(0, 0, 8, 8));
    this.frames.set('star', new Rectangle(8, 0, 16, 16));
    // ... more frames
  }
  
  getTexture(frameName: string): Texture {
    const frame = this.frames.get(frameName);
    if (!frame) throw new Error(`Frame ${frameName} not found`);
    
    return new Texture({
      source: this.atlas.source,
      frame
    });
  }
}
```

## Network Performance

### 1. Delta Compression

```typescript
interface PlayerSnapshot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  powerUps: number; // Bit flags
}

class NetworkOptimizer {
  private lastSnapshots: Map<string, PlayerSnapshot> = new Map();
  
  createDelta(current: PlayerSnapshot, playerId: string): any {
    const last = this.lastSnapshots.get(playerId);
    
    if (!last) {
      this.lastSnapshots.set(playerId, {...current});
      return current; // Full snapshot
    }
    
    // Only send changed fields
    const delta: any = {};
    
    if (Math.abs(current.x - last.x) > 0.1) delta.x = current.x;
    if (Math.abs(current.y - last.y) > 0.1) delta.y = current.y;
    if (current.vx !== last.vx) delta.vx = current.vx;
    if (current.vy !== last.vy) delta.vy = current.vy;
    if (current.powerUps !== last.powerUps) delta.powerUps = current.powerUps;
    
    // Update last snapshot
    Object.assign(last, current);
    
    return delta;
  }
}
```

### 2. Update Throttling

```typescript
class NetworkThrottler {
  private updateQueue: NetworkUpdate[] = [];
  private lastSendTime: number = 0;
  private sendRate: number = 50; // ms between updates
  
  queueUpdate(update: NetworkUpdate) {
    // Merge with existing updates
    const existing = this.updateQueue.find(u => u.type === update.type);
    
    if (existing) {
      Object.assign(existing.data, update.data);
    } else {
      this.updateQueue.push(update);
    }
  }
  
  update(currentTime: number) {
    if (currentTime - this.lastSendTime < this.sendRate) return;
    
    if (this.updateQueue.length > 0) {
      this.sendBatch(this.updateQueue);
      this.updateQueue = [];
      this.lastSendTime = currentTime;
    }
  }
}
```

## Profiling and Monitoring

### 1. Performance Monitor

```typescript
class PerformanceMonitor {
  private frameStart: number = 0;
  private frameTimes: number[] = [];
  private maxSamples: number = 60;
  
  beginFrame() {
    this.frameStart = performance.now();
  }
  
  endFrame() {
    const frameTime = performance.now() - this.frameStart;
    this.frameTimes.push(frameTime);
    
    if (this.frameTimes.length > this.maxSamples) {
      this.frameTimes.shift();
    }
  }
  
  getStats() {
    if (this.frameTimes.length === 0) return null;
    
    const sorted = [...this.frameTimes].sort((a, b) => a - b);
    const avg = sorted.reduce((a, b) => a + b) / sorted.length;
    
    return {
      fps: Math.round(1000 / avg),
      avg: avg.toFixed(2),
      min: sorted[0].toFixed(2),
      max: sorted[sorted.length - 1].toFixed(2),
      p95: sorted[Math.floor(sorted.length * 0.95)].toFixed(2)
    };
  }
}
```

### 2. Memory Tracking

```typescript
class MemoryTracker {
  private checkInterval: number = 5000;
  private lastCheck: number = 0;
  
  update(currentTime: number) {
    if (currentTime - this.lastCheck < this.checkInterval) return;
    
    if (performance.memory) {
      const mb = 1024 * 1024;
      console.log({
        used: (performance.memory.usedJSHeapSize / mb).toFixed(2) + ' MB',
        total: (performance.memory.totalJSHeapSize / mb).toFixed(2) + ' MB',
        limit: (performance.memory.jsHeapSizeLimit / mb).toFixed(2) + ' MB'
      });
    }
    
    this.lastCheck = currentTime;
  }
}
```

## Common Performance Pitfalls

### 1. Creating Objects in Loops
```typescript
// BAD
for (let i = 0; i < 1000; i++) {
  const point = { x: i, y: i }; // New object each iteration
  processPoint(point);
}

// GOOD
const point = { x: 0, y: 0 };
for (let i = 0; i < 1000; i++) {
  point.x = i;
  point.y = i;
  processPoint(point);
}
```

### 2. Unnecessary Calculations
```typescript
// BAD
for (let enemy of enemies) {
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance < radius) { /* ... */ }
}

// GOOD - Use squared distance
const radiusSq = radius * radius;
for (let enemy of enemies) {
  const distanceSq = dx * dx + dy * dy;
  if (distanceSq < radiusSq) { /* ... */ }
}
```

### 3. Inefficient Filters
```typescript
// BAD
container.filters = [
  new BlurFilter(),
  new GlowFilter(),
  new ColorMatrixFilter()
];

// GOOD - Combine into single custom filter
container.filters = [new CombinedEffectFilter()];
```

## Performance Checklist

- [ ] Object pooling for frequently created/destroyed objects
- [ ] ParticleContainer for large numbers of sprites
- [ ] RenderTexture caching for static content
- [ ] Proper culling and LOD systems
- [ ] Batch rendering for similar objects
- [ ] Fixed timestep with interpolation
- [ ] System update throttling based on priority
- [ ] Network delta compression
- [ ] Memory usage monitoring
- [ ] Frame time profiling
- [ ] GPU state change minimization

Following these optimizations will ensure the Glow Wars prototype runs smoothly even on lower-end devices!