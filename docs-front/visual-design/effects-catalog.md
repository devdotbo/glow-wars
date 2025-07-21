# Glow Wars - Effects Catalog

## Overview

Every effect in Glow Wars serves both aesthetic and functional purposes. This catalog details each visual effect, its parameters, and implementation guidelines.

## Core Effects

### 1. Player Glow

The signature effect that defines each player's presence.

```typescript
interface PlayerGlow {
  baseRadius: 15,           // pixels
  pulseFrequency: 0.5,      // Hz (2 second cycle)
  pulseAmplitude: 0.1,      // 10% size variation
  colorIntensity: 2.0,      // 200% brightness
  blurPasses: 2,            // Multi-pass blur
  additiveBlend: true       // Light accumulation
}
```

**Visual Description**: Soft radial gradient emanating from player center, breathing gently like a heartbeat. The glow extends beyond the player sprite, creating a halo effect.

### 2. Movement Trail

The persistent light trail following each player.

```typescript
interface TrailParticle {
  initialSize: 8,           // pixels
  finalSize: 0,            // Shrinks to nothing
  lifetime: 1000,          // milliseconds
  emissionRate: 30,        // particles per second
  velocityInherit: 0.8,    // 80% of player velocity
  fadeEasing: 'exponential',
  renderMode: 'additive'
}
```

**Visual Flow**:
```
Player moves → Particle spawns → Inherits velocity → Fades over lifetime
    ●           ○               ◦                    ·
  100%         75%             40%                  0%
```

### 3. Territory Paint Effect

The spreading color as players claim space.

```typescript
interface TerritoryPaint {
  brushSize: 32,               // pixels
  opacity: 0.3,                // 30% transparency
  edgeFeather: 4,              // Soft edge pixels
  overlapMode: 'maximum',      // Keeps brightest color
  animationSpeed: 0,           // Instant (no animation)
  glowIntensity: 0.5          // Subtle edge glow
}
```

**Blend Behavior**:
- Same player overlap: No change
- Different player overlap: Last painter wins
- Edge meeting: Sharp boundary with slight glow

## Combat Effects

### 4. Collision Burst

The explosive effect when players collide.

```typescript
interface CollisionBurst {
  particleCount: 50,
  particleSpeed: [100, 300],   // pixels/second range
  particleLife: 500,           // milliseconds
  burstPattern: 'radial',
  angleVariance: 360,          // Full circle
  sizeRange: [4, 12],         // pixels
  colorMode: 'both_players',   // Mix both colors
  screenShake: {
    intensity: 5,              // pixels
    duration: 200,             // milliseconds
    falloff: 'linear'
  }
}
```

**Animation Sequence**:
1. Impact frame: White flash (1 frame)
2. Burst expansion: Particles fly outward
3. Fade out: Particles shrink and dim
4. Screen settles: Shake subsides

### 5. Elimination Dissolve

When a player is eliminated from the game.

```typescript
interface EliminationEffect {
  dissolveDuration: 1000,      // milliseconds
  particleMode: 'implosion',   // Particles collapse inward
  fadePattern: 'pixelated',    // Breaks into pixels
  colorShift: 'desaturate',    // Color drains away
  finalFlash: true,            // Brief bright flash
  territoryFade: 2000          // Territory fades slower
}
```

## Power-Up Effects

### 6. Power-Up Idle Animation

Floating power-ups waiting to be collected.

```typescript
interface PowerUpFloat {
  bobHeight: 5,                // pixels
  bobSpeed: 1,                 // Hz
  rotationSpeed: 60,           // degrees/second
  glowPulse: 0.5,             // Hz
  particleOrbit: {
    count: 3,
    radius: 20,
    speed: 120                 // degrees/second
  }
}
```

### 7. Collection Burst

When a power-up is collected.

```typescript
interface CollectionEffect {
  ringExpansion: {
    startRadius: 0,
    endRadius: 100,
    duration: 500,
    opacity: [1.0, 0.0],
    thickness: 3
  },
  particleSpray: {
    count: 20,
    pattern: 'fountain',
    velocity: 200,
    gravity: -100              // Floats up
  },
  flashDuration: 100
}
```

### 8. Speed Boost Trail

Enhanced trail effect during speed boost.

```typescript
interface SpeedTrail {
  particleRate: 60,            // Double normal rate
  particleSize: 12,            // 50% larger
  trailLength: 1.5,            // 50% longer
  motionBlur: {
    samples: 3,
    strength: 0.8,
    direction: 'movement'
  },
  lightningBolts: {
    frequency: 2,              // per second
    length: 50,
    branches: 3
  }
}
```

### 9. Shield Bubble

Protective barrier visualization.

```typescript
interface ShieldEffect {
  geometry: 'hexagonal',
  radius: 40,
  thickness: 2,
  opacity: 0.4,
  distortionEffect: {
    type: 'ripple',
    frequency: 2,
    amplitude: 3
  },
  hitResponse: {
    flashColor: '#FFFFFF',
    rippleSpeed: 100,
    duration: 200
  }
}
```

### 10. Mega Glow Aura

Overwhelming light effect for mega glow power-up.

```typescript
interface MegaGlowEffect {
  glowMultiplier: 3.0,         // Triple intensity
  rainbowCycle: {
    speed: 180,                // degrees/second
    saturation: 1.0,
    brightness: 1.0
  },
  coronaEffect: {
    spikes: 8,
    length: 30,
    rotation: 45               // degrees/second
  },
  environmentLight: 0.2        // Lights up nearby area
}
```

### 11. Phase Shift Distortion

Reality-bending effect for teleportation.

```typescript
interface PhaseShiftEffect {
  distortionType: 'spiral',
  chromaticAberration: 5,      // pixel offset
  opacitySequence: [
    { time: 0, value: 1.0 },
    { time: 0.3, value: 0.3 },
    { time: 0.7, value: 0.3 },
    { time: 1.0, value: 1.0 }
  ],
  afterImage: {
    count: 3,
    delay: 50,                 // milliseconds
    opacity: [0.5, 0.3, 0.1]
  }
}
```

### 12. Energy Burst Shockwave

Expanding ring of force.

```typescript
interface EnergyBurstEffect {
  shockwaveRings: 3,
  ringDelay: 100,              // milliseconds between rings
  expansionSpeed: 500,         // pixels/second
  maxRadius: 300,
  damageVisual: {
    flashIntensity: 0.8,
    knockbackTrail: true,
    sparkCount: 30
  },
  cameraShake: {
    intensity: 10,
    duration: 500,
    pattern: 'earthquake'
  }
}
```

## Environmental Effects

### 13. Arena Grid Pulse

Subtle grid animation for atmosphere.

```typescript
interface GridPulse {
  pulseOrigin: 'center',
  waveSpeed: 200,              // pixels/second
  frequency: 0.1,              // Hz (10 second cycle)
  intensityRange: [0.5, 1.0],
  pattern: 'radial_wave'
}
```

### 14. Victory Celebration

End-game visual spectacle.

```typescript
interface VictoryEffects {
  confettiSystem: {
    emitters: 5,
    particlesPerEmitter: 100,
    colors: 'all_player_colors',
    physics: {
      gravity: 100,
      wind: 50,
      tumble: true
    }
  },
  lightShow: {
    strobeFrequency: 10,       // Hz
    colorCycle: 'rainbow',
    duration: 3000
  },
  winnerHighlight: {
    glowMultiplier: 5.0,
    rotatingRays: 16,
    pulseSync: 'music_beat'
  }
}
```

## Particle System Details

### Base Particle Behavior

```typescript
class Particle {
  position: Vec2
  velocity: Vec2
  acceleration: Vec2
  life: number
  maxLife: number
  size: number
  color: Color
  alpha: number
  rotation: number
  angularVelocity: number
  
  update(deltaTime: number) {
    // Physics
    this.velocity.add(this.acceleration.mult(deltaTime))
    this.position.add(this.velocity.mult(deltaTime))
    
    // Life
    this.life -= deltaTime
    const lifeRatio = this.life / this.maxLife
    
    // Fade
    this.alpha = this.easingFunction(lifeRatio)
    
    // Rotation
    this.rotation += this.angularVelocity * deltaTime
  }
}
```

### Particle Emitter Patterns

```
FOUNTAIN:         RADIAL:           DIRECTIONAL:
    ·               · · ·               · · ·
   · ·             · ● ·                 · · ·
  · ● ·             · · ·                   · · ·
    ▲                                         →

SPIRAL:           ORBIT:            RANDOM:
  · → ·           ·   ·             ·   · ·
 ↓     ↑           ·●·               · ● · ·
  · ← ·           ·   ·             · ·   ·
```

## Performance Optimization

### Effect LOD (Level of Detail)

```typescript
const effectLOD = {
  distance: [0, 200, 500, 1000],  // pixels from camera
  particleReduction: [1.0, 0.7, 0.3, 0.0],
  glowQuality: ['ultra', 'high', 'medium', 'off'],
  updateFrequency: [1, 2, 4, 0]  // Frame skipping
}
```

### Batching Strategy

1. **Same Effect Type**: Batch all trail particles together
2. **Same Blend Mode**: Group additive effects
3. **Texture Atlas**: All particle textures in one sheet
4. **Instance Rendering**: For repeated elements

## Effect Combinations

### Synergy Examples

**Speed + Shield**: Lightning bolts bounce off shield surface
**Mega Glow + Collision**: Rainbow explosion instead of normal burst
**Phase Shift + Trail**: Trail fragments and scatters during shift
**Energy Burst + Territory**: Temporary glow boost to owned territory

## Audio-Visual Sync

Effects that respond to audio:
- Grid pulse matches bass frequency
- Victory effects sync to celebration music
- Power-up collection has pitched sound based on type
- Collision intensity affects impact sound volume

## Future Effect Ideas

1. **Weather System**: Environmental particles (stars, nebula dust)
2. **Combo Effects**: Special visuals for skilled plays
3. **Spectator Effects**: Enhanced visuals for viewing
4. **Seasonal Effects**: Holiday-themed particles
5. **Achievement Effects**: Unlock new visual styles

## Implementation Priority

1. **Essential** (MVP):
   - Player glow
   - Basic trail
   - Simple collision
   - Territory paint

2. **Enhanced** (Polish):
   - All power-up effects
   - Screen shake
   - Advanced particles
   - Victory celebration

3. **Premium** (Future):
   - Environmental effects
   - Audio sync
   - Seasonal variations
   - Custom effects