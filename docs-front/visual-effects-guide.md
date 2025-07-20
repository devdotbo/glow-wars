# Glow Wars Visual Effects Guide

## Overview

This guide covers all visual effects in Glow Wars, including shaders, particles, and post-processing effects. All effects are designed to run at 60 FPS on modern hardware and 30+ FPS on mobile devices.

## Core Effects

### 1. Glow Shader System

#### Basic Glow Filter

```typescript
// app/game/effects/GlowFilter.ts
import { Filter, FilterSystem, RenderTexture, CLEAR_MODES } from 'pixi.js'
import { vertex, fragment } from './shaders/glow'

export interface GlowFilterOptions {
  distance?: number
  outerStrength?: number
  innerStrength?: number
  color?: number
  quality?: number
  knockout?: boolean
}

export class GlowFilter extends Filter {
  constructor(options: GlowFilterOptions = {}) {
    const {
      distance = 10,
      outerStrength = 4,
      innerStrength = 0,
      color = 0xffffff,
      quality = 0.1,
      knockout = false,
    } = options

    super(vertex, fragment)

    this.uniforms.glowColor = new Float32Array([1, 1, 1])
    this.uniforms.distance = distance
    this.uniforms.outerStrength = outerStrength
    this.uniforms.innerStrength = innerStrength
    this.uniforms.knockout = knockout

    Object.assign(this, { distance, outerStrength, innerStrength, color, quality, knockout })
  }

  get color(): number {
    return this._color
  }

  set color(value: number) {
    this._color = value
    const [r, g, b] = hex2rgb(value)
    this.uniforms.glowColor[0] = r
    this.uniforms.glowColor[1] = g
    this.uniforms.glowColor[2] = b
  }

  apply(filterManager: FilterSystem, input: RenderTexture, output: RenderTexture, clear: CLEAR_MODES): void {
    // Multi-pass blur for quality
    const renderTarget = filterManager.getFilterTexture()
    
    // Horizontal pass
    this.uniforms.horizontal = true
    filterManager.applyFilter(this, input, renderTarget, CLEAR_MODES.CLEAR)
    
    // Vertical pass
    this.uniforms.horizontal = false
    filterManager.applyFilter(this, renderTarget, output, clear)
    
    filterManager.returnFilterTexture(renderTarget)
  }
}
```

#### Glow Shader (GLSL)

```glsl
// app/game/effects/shaders/glow.frag
precision highp float;

uniform sampler2D uSampler;
uniform vec3 glowColor;
uniform float outerStrength;
uniform float innerStrength;
uniform float distance;
uniform bool knockout;
uniform bool horizontal;

varying vec2 vTextureCoord;

const float PI = 3.14159265358979323846264;
const float SAMPLES = 12.0;

vec4 blur(vec2 coord) {
    vec4 color = vec4(0.0);
    float total = 0.0;
    float offset = 0.0;
    
    for (float t = -SAMPLES; t <= SAMPLES; t++) {
        float percent = t / SAMPLES;
        float weight = exp(-percent * percent * 4.0);
        vec2 sampleCoord = coord;
        
        if (horizontal) {
            sampleCoord.x += percent * distance / 100.0;
        } else {
            sampleCoord.y += percent * distance / 100.0;
        }
        
        vec4 sample = texture2D(uSampler, sampleCoord);
        sample.rgb *= sample.a;
        color += sample * weight;
        total += weight;
    }
    
    return color / total;
}

void main(void) {
    vec4 original = texture2D(uSampler, vTextureCoord);
    vec4 blurred = blur(vTextureCoord);
    
    float glow = blurred.a * outerStrength;
    vec3 glowRGB = glowColor * glow;
    
    if (knockout) {
        float alpha = original.a * innerStrength;
        gl_FragColor = vec4(glowRGB, glow);
    } else {
        vec3 color = mix(glowRGB, original.rgb, original.a);
        float alpha = clamp(original.a + glow, 0.0, 1.0);
        gl_FragColor = vec4(color, alpha);
    }
}
```

### 2. Particle System

#### Trail Particles

```typescript
// app/game/effects/TrailParticles.ts
import { Container, Texture, ParticleContainer, Sprite } from 'pixi.js'
import { ParticlePool } from './ParticlePool'

export interface TrailConfig {
  texture: Texture
  color: number
  lifespan: number
  fadeSpeed: number
  size: number
  emissionRate: number
  velocityVariance: number
}

export class TrailSystem {
  private container: ParticleContainer
  private pool: ParticlePool
  private particles: TrailParticle[] = []
  private config: TrailConfig

  constructor(config: TrailConfig, maxParticles = 1000) {
    this.config = config
    this.container = new ParticleContainer(maxParticles, {
      scale: true,
      position: true,
      rotation: true,
      alpha: true,
      tint: true,
    })
    
    this.pool = new ParticlePool(config.texture, maxParticles)
  }

  emit(x: number, y: number, direction: number) {
    if (Math.random() > this.config.emissionRate) return

    const particle = this.pool.get()
    if (!particle) return

    // Initialize particle
    particle.x = x
    particle.y = y
    particle.scale.set(this.config.size)
    particle.tint = this.config.color
    particle.alpha = 1

    // Add velocity variance
    const variance = (Math.random() - 0.5) * this.config.velocityVariance
    particle.vx = Math.cos(direction + variance) * 2
    particle.vy = Math.sin(direction + variance) * 2
    particle.life = this.config.lifespan

    this.particles.push(particle)
    this.container.addChild(particle)
  }

  update(deltaTime: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i]
      
      // Update position
      particle.x += particle.vx * deltaTime
      particle.y += particle.vy * deltaTime
      
      // Update life and alpha
      particle.life -= deltaTime
      particle.alpha = particle.life / this.config.lifespan
      
      // Fade out
      particle.scale.set(particle.scale.x * (1 - this.config.fadeSpeed * deltaTime))
      
      // Remove dead particles
      if (particle.life <= 0 || particle.alpha <= 0) {
        this.container.removeChild(particle)
        this.pool.release(particle)
        this.particles.splice(i, 1)
      }
    }
  }

  destroy() {
    this.container.destroy()
    this.pool.destroy()
  }
}
```

#### Collision Burst Effect

```typescript
// app/game/effects/CollisionBurst.ts
import { AnimatedSprite, Texture, Container } from 'pixi.js'

export class CollisionBurst {
  private static textures: Texture[] = []
  
  static async loadTextures() {
    // Load sprite sheet frames
    for (let i = 0; i < 8; i++) {
      const texture = await Texture.fromURL(`/assets/effects/burst_${i}.png`)
      this.textures.push(texture)
    }
  }

  static create(x: number, y: number, color: number, container: Container) {
    const burst = new AnimatedSprite(this.textures)
    burst.x = x
    burst.y = y
    burst.anchor.set(0.5)
    burst.scale.set(2)
    burst.tint = color
    burst.loop = false
    burst.animationSpeed = 0.5
    
    burst.onComplete = () => {
      container.removeChild(burst)
      burst.destroy()
    }
    
    container.addChild(burst)
    burst.play()
  }
}
```

### 3. Power-Up Visual Effects

#### Shield Bubble

```typescript
// app/game/effects/ShieldEffect.ts
import { Graphics, Container, filters } from 'pixi.js'

export class ShieldEffect extends Container {
  private bubble: Graphics
  private pulseTime = 0

  constructor(radius: number, color: number) {
    super()
    
    this.bubble = new Graphics()
    this.drawBubble(radius, color)
    this.addChild(this.bubble)
    
    // Add distortion filter for energy feel
    const displacementFilter = new filters.DisplacementFilter()
    this.filters = [displacementFilter]
  }

  private drawBubble(radius: number, color: number) {
    this.bubble.clear()
    
    // Outer ring
    this.bubble.lineStyle(3, color, 0.8)
    this.bubble.drawCircle(0, 0, radius)
    
    // Inner gradient
    for (let r = radius; r > 0; r -= 5) {
      const alpha = (radius - r) / radius * 0.3
      this.bubble.beginFill(color, alpha)
      this.bubble.drawCircle(0, 0, r)
      this.bubble.endFill()
    }
  }

  update(deltaTime: number) {
    this.pulseTime += deltaTime
    
    // Pulsing effect
    const scale = 1 + Math.sin(this.pulseTime * 3) * 0.05
    this.scale.set(scale)
    
    // Rotation for energy effect
    this.rotation += deltaTime * 0.5
  }
}
```

#### Phase Shift Distortion

```typescript
// app/game/effects/PhaseShiftEffect.ts
import { Filter } from 'pixi.js'

const phaseShiftFrag = `
precision highp float;

uniform sampler2D uSampler;
uniform float time;
uniform float intensity;

varying vec2 vTextureCoord;

void main(void) {
    vec2 coord = vTextureCoord;
    
    // Wave distortion
    float wave = sin(coord.y * 20.0 + time * 5.0) * 0.01 * intensity;
    coord.x += wave;
    
    // Chromatic aberration
    vec4 r = texture2D(uSampler, coord + vec2(0.002 * intensity, 0.0));
    vec4 g = texture2D(uSampler, coord);
    vec4 b = texture2D(uSampler, coord - vec2(0.002 * intensity, 0.0));
    
    gl_FragColor = vec4(r.r, g.g, b.b, g.a);
}
`

export class PhaseShiftFilter extends Filter {
  constructor() {
    super(undefined, phaseShiftFrag)
    this.uniforms.time = 0
    this.uniforms.intensity = 0
  }

  update(deltaTime: number) {
    this.uniforms.time += deltaTime
  }

  setIntensity(intensity: number) {
    this.uniforms.intensity = intensity
  }
}
```

### 4. Territory Effects

#### Territory Edge Glow

```typescript
// app/game/effects/TerritoryGlow.ts
import { Graphics, Container, BlurFilter } from 'pixi.js'

export class TerritoryGlow {
  static createGlowEdge(territory: number[][], tileSize: number, color: number): Container {
    const container = new Container()
    const edges = new Graphics()
    
    // Find edges
    for (let y = 0; y < territory.length; y++) {
      for (let x = 0; x < territory[y].length; x++) {
        if (territory[y][x] === 0) continue
        
        // Check if edge tile
        const isEdge = 
          (y === 0 || territory[y-1][x] === 0) ||
          (y === territory.length-1 || territory[y+1][x] === 0) ||
          (x === 0 || territory[y][x-1] === 0) ||
          (x === territory[y].length-1 || territory[y][x+1] === 0)
        
        if (isEdge) {
          edges.beginFill(color, 1)
          edges.drawRect(x * tileSize, y * tileSize, tileSize, tileSize)
          edges.endFill()
        }
      }
    }
    
    // Apply blur for glow
    edges.filters = [new BlurFilter(8, 4)]
    container.addChild(edges)
    
    return container
  }
}
```

## Performance Optimization

### Effect Quality Levels

```typescript
// app/game/effects/QualitySettings.ts
export enum EffectQuality {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  ULTRA = 'ultra',
}

export const QUALITY_PRESETS = {
  [EffectQuality.LOW]: {
    particleCount: 50,
    glowDistance: 5,
    glowQuality: 0.3,
    trailLength: 10,
    enableShaders: false,
  },
  [EffectQuality.MEDIUM]: {
    particleCount: 200,
    glowDistance: 10,
    glowQuality: 0.5,
    trailLength: 20,
    enableShaders: true,
  },
  [EffectQuality.HIGH]: {
    particleCount: 500,
    glowDistance: 15,
    glowQuality: 0.7,
    trailLength: 30,
    enableShaders: true,
  },
  [EffectQuality.ULTRA]: {
    particleCount: 1000,
    glowDistance: 20,
    glowQuality: 1.0,
    trailLength: 50,
    enableShaders: true,
  },
}
```

### Dynamic Quality Adjustment

```typescript
// app/game/effects/DynamicQuality.ts
export class DynamicQualityManager {
  private targetFPS = 60
  private currentQuality = EffectQuality.HIGH
  private fpsHistory: number[] = []
  private adjustmentCooldown = 0

  update(fps: number, deltaTime: number) {
    this.fpsHistory.push(fps)
    if (this.fpsHistory.length > 60) {
      this.fpsHistory.shift()
    }

    this.adjustmentCooldown -= deltaTime
    if (this.adjustmentCooldown > 0) return

    const avgFPS = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length

    if (avgFPS < this.targetFPS * 0.8) {
      this.decreaseQuality()
    } else if (avgFPS > this.targetFPS * 0.95) {
      this.increaseQuality()
    }
  }

  private decreaseQuality() {
    const qualities = Object.values(EffectQuality)
    const currentIndex = qualities.indexOf(this.currentQuality)
    
    if (currentIndex > 0) {
      this.currentQuality = qualities[currentIndex - 1]
      this.adjustmentCooldown = 5 // Wait 5 seconds before next adjustment
      console.log(`Decreased quality to ${this.currentQuality}`)
    }
  }

  private increaseQuality() {
    const qualities = Object.values(EffectQuality)
    const currentIndex = qualities.indexOf(this.currentQuality)
    
    if (currentIndex < qualities.length - 1) {
      this.currentQuality = qualities[currentIndex + 1]
      this.adjustmentCooldown = 5
      console.log(`Increased quality to ${this.currentQuality}`)
    }
  }

  getSettings() {
    return QUALITY_PRESETS[this.currentQuality]
  }
}
```

## Integration Examples

### Player with Full Effects

```typescript
// app/game/entities/EffectPlayer.ts
import { Container, Sprite } from 'pixi.js'
import { GlowFilter } from '../effects/GlowFilter'
import { TrailSystem } from '../effects/TrailParticles'
import { ShieldEffect } from '../effects/ShieldEffect'

export class EffectPlayer extends Container {
  private sprite: Sprite
  private trail: TrailSystem
  private shield?: ShieldEffect
  private glowFilter: GlowFilter

  constructor(texture: Texture, color: number) {
    super()
    
    // Base sprite
    this.sprite = new Sprite(texture)
    this.sprite.anchor.set(0.5)
    this.addChild(this.sprite)
    
    // Glow effect
    this.glowFilter = new GlowFilter({
      distance: 15,
      outerStrength: 2,
      color: color,
    })
    this.filters = [this.glowFilter]
    
    // Trail system
    this.trail = new TrailSystem({
      texture: Texture.from('particle'),
      color: color,
      lifespan: 1000,
      fadeSpeed: 0.5,
      size: 0.5,
      emissionRate: 0.8,
      velocityVariance: 0.5,
    })
  }

  activateShield(duration: number) {
    if (this.shield) return
    
    this.shield = new ShieldEffect(40, this.tint)
    this.addChild(this.shield)
    
    setTimeout(() => {
      this.removeChild(this.shield!)
      this.shield!.destroy()
      this.shield = undefined
    }, duration)
  }

  update(deltaTime: number, x: number, y: number) {
    // Update position
    this.x = x
    this.y = y
    
    // Emit trail particles
    const direction = Math.atan2(this.y - this.lastY, this.x - this.lastX)
    this.trail.emit(x, y, direction + Math.PI)
    
    // Update effects
    this.trail.update(deltaTime)
    this.shield?.update(deltaTime)
    
    this.lastX = x
    this.lastY = y
  }
}
```

## Testing Effects

### Performance Testing

```typescript
// app/game/effects/__tests__/performance.test.ts
describe('Visual Effects Performance', () => {
  it('should maintain 60 FPS with 100 players', async () => {
    const app = new Application()
    const players: EffectPlayer[] = []
    
    // Create 100 players with effects
    for (let i = 0; i < 100; i++) {
      const player = new EffectPlayer(texture, 0x00ff00)
      players.push(player)
      app.stage.addChild(player)
    }
    
    // Run for 1000 frames
    let frameCount = 0
    let totalTime = 0
    
    app.ticker.add((delta) => {
      players.forEach(p => p.update(delta, Math.random() * 800, Math.random() * 600))
      frameCount++
      totalTime += delta
      
      if (frameCount >= 1000) {
        const avgFPS = frameCount / (totalTime / 60)
        expect(avgFPS).toBeGreaterThan(55)
      }
    })
  })
})
```

## Mobile Optimization

### Touch-Specific Effects

```typescript
// Reduce particle count on mobile
if (isMobile()) {
  trailConfig.emissionRate *= 0.5
  trailConfig.maxParticles = 500
}

// Simplify shaders on mobile
if (isMobile() && !hasWebGL2()) {
  // Use simpler glow approximation
  sprite.filters = [new BlurFilter(4, 2)]
}

// Reduce texture resolution
if (isMobile()) {
  app.renderer.resolution = Math.min(window.devicePixelRatio, 2)
}
```