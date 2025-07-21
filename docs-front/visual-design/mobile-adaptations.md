# Glow Wars - Mobile Adaptations

## Overview

Mobile devices present unique challenges and opportunities for Glow Wars. This document details all visual adaptations to ensure the game looks stunning and performs smoothly on phones and tablets.

## Device Categories

### Target Devices

```typescript
const deviceTiers = {
  highEnd: {
    examples: ['iPhone 14+', 'Samsung S23', 'iPad Pro'],
    minRAM: 6,  // GB
    targetFPS: 60,
    pixelRatio: 3,
    features: 'all'
  },
  midRange: {
    examples: ['iPhone SE', 'Samsung A54', 'iPad Air'],
    minRAM: 4,
    targetFPS: 30,
    pixelRatio: 2,
    features: 'most'
  },
  lowEnd: {
    examples: ['Budget Android', 'Older iPhones'],
    minRAM: 2,
    targetFPS: 30,
    pixelRatio: 1.5,
    features: 'essential'
  }
}
```

## Screen Adaptations

### Portrait Layout (Primary)

```
iPhone 14 Pro (393x852 @3x)
┌─────────────────────┐
│ ┌─────┬─────┬─────┐ │ <- Compressed HUD
│ │Score│Timer│ Map │ │
│ └─────┴─────┴─────┘ │
│                     │
│    GAME VIEWPORT    │ <- Square aspect
│     (393x393)       │    maintained
│                     │
│ ┌─────────────────┐ │
│ │   Power-Ups     │ │ <- Horizontal bar
│ └─────────────────┘ │
│                     │
│ ┌─────────────────┐ │
│ │ Virtual Joystick│ │ <- Touch controls
│ └─────────────────┘ │
└─────────────────────┘
```

### Landscape Layout (Secondary)

```
iPhone 14 Pro Landscape (852x393 @3x)
┌──────────────────────────────────────┐
│┌─────┐ ┌──────────────────┐ ┌─────┐ │
││Score│ │                  │ │ Map │ │
│└─────┘ │   GAME VIEWPORT  │ └─────┘ │
│┌─────┐ │                  │ ┌─────┐ │
││Timer│ │                  │ │Power│ │
│└─────┘ └──────────────────┘ └─────┘ │
│ [◀] [▲]                   (A) (B)   │ <- Controls on sides
│ [▼] [▶]                             │
└──────────────────────────────────────┘
```

## Touch Control System

### Virtual Joystick Design

```
Idle State:           Active State:
   ┌─────┐              ┌─────┐
  ╱       ╲            ╱   •   ╲  <- Thumb position
 │    ○    │          │  ╱│╲   │  <- Direction indicator
  ╲       ╱            ╲ ← ○ → ╱  <- Base remains
   └─────┘              └─────┘

Properties:
- Size: 120px diameter
- Position: 100px from bottom-left
- Opacity: 0.3 idle, 0.6 active
- Dead zone: 15% center
- Visual feedback: Glow intensifies with distance
```

### Gesture Controls

```typescript
const touchGestures = {
  tap: {
    action: 'use_powerup',
    visualFeedback: 'ripple_effect',
    zone: 'right_half_screen'
  },
  doubleTap: {
    action: 'boost_if_available',
    visualFeedback: 'flash_effect',
    maxDelay: 300  // ms
  },
  swipe: {
    action: 'quick_turn',
    minDistance: 50,  // pixels
    visualFeedback: 'trail_brightening'
  },
  pinch: {
    action: 'toggle_zoom',  // Tablet only
    minDelta: 20,
    visualFeedback: 'viewport_scale'
  }
}
```

## Visual Quality Scaling

### Dynamic LOD System

```typescript
class MobileQualityManager {
  // Automatically adjust based on performance
  qualityLevels = {
    ultra: {
      particles: 100,
      glowPasses: 2,
      trailLength: 30,
      shadowQuality: 'high',
      postProcessing: true
    },
    high: {
      particles: 50,
      glowPasses: 1,
      trailLength: 20,
      shadowQuality: 'medium',
      postProcessing: true
    },
    medium: {
      particles: 25,
      glowPasses: 1,
      trailLength: 15,
      shadowQuality: 'low',
      postProcessing: false
    },
    low: {
      particles: 10,
      glowPasses: 0,  // Use pre-baked glow
      trailLength: 10,
      shadowQuality: 'none',
      postProcessing: false
    }
  }
}
```

### Adaptive Resolution

```typescript
const resolutionScaling = {
  detect: () => {
    const pixelRatio = window.devicePixelRatio
    const gpu = detectGPUTier()
    
    if (gpu === 'high' && pixelRatio > 2) {
      return Math.min(pixelRatio, 3)  // Cap at 3x
    } else if (gpu === 'medium') {
      return Math.min(pixelRatio, 2)  // Cap at 2x
    } else {
      return 1.5  // Low-end gets 1.5x max
    }
  }
}
```

## UI Adjustments

### Scaled Elements

```
Desktop → Mobile Scaling:

Fonts:
16px → 14px (base)
32px → 24px (headers)
48px → 36px (victory)

Buttons:
36px height → 44px (touch target)
8px padding → 12px
1px border → 2px (visibility)

Spacing:
20px margins → 12px
12px gaps → 8px

Glows:
20px radius → 12px
2px spread → 1px
```

### Compressed HUD

```
Desktop Score Panel:          Mobile Score Panel:
┌────────────────┐           ┌──────────┐
│ ¤ Player 1     │           │ ¤ P1 45% │
│ ████████ 45%   │    →      └──────────┘
│ Score: 1,250   │           (Score hidden)
└────────────────┘           

Timer Display:                Compact Timer:
┌─────────┐                  ┌─────┐
│  2:30   │         →        │ 2:30│
└─────────┘                  └─────┘
```

### Mobile-Specific UI

```
Power-Up Bar (Bottom):
[⚡3s] [⬡RDY] [★12s] [◈RDY] [✦5s]
- Larger touch targets (48x48px)
- Clear countdown text
- Haptic feedback on activation

Quick Actions (Top-Right):
[⚙️] [🔊] [❌]
- Settings, Sound, Quit
- 44x44px minimum
- High contrast icons
```

## Performance Optimizations

### Render Optimizations

```typescript
const mobileRenderConfig = {
  // Reduce particle counts
  maxParticlesPerPlayer: 50,  // vs 200 desktop
  
  // Simplify shaders
  glowShader: 'mobile_optimized',  // Single pass
  
  // Batch more aggressively
  spriteBatchSize: 2000,  // vs 1000 desktop
  
  // Lower update frequencies
  trailUpdateRate: 30,  // FPS
  uiUpdateRate: 20,     // FPS
  
  // Texture compression
  textureFormat: 'PVRTC',  // iOS
  textureFormat: 'ETC2',   // Android
}
```

### Battery Optimization

```typescript
const batterySettings = {
  lowPowerMode: {
    targetFPS: 30,
    reducedEffects: true,
    dimBackground: 0.8,  // Darker = less power
    disableVibration: true
  },
  
  // Auto-enable after 10 minutes
  autoLowPower: {
    threshold: 600000,  // ms
    gradualReduction: true
  }
}
```

## Mobile-Specific Effects

### Simplified Glow

```
Desktop Glow:              Mobile Glow:
Multi-pass blur       →    Pre-baked texture
Real-time intensity   →    Fixed intensity
Per-pixel lighting    →    Vertex lighting
```

### Optimized Particles

```typescript
class MobileParticle extends Particle {
  // Use sprite sheet animation instead of real-time
  update(delta: number) {
    this.frameIndex = Math.floor(this.life / this.frameTime)
    this.sprite.texture = this.frames[this.frameIndex]
    // No physics calculation, pre-baked motion
  }
}
```

### Touch Feedback Effects

```
Tap Ripple:
     Frame 1    Frame 2    Frame 3
       ·         ◦         ○
               ·◦·       ◦○◦
                       ·◦○◦·

Hold Indicator:
  ┌───┐     ┌───┐     ┌───┐
  │   │ →   │░░░│ →   │███│
  └───┘     └───┘     └───┘
  Empty    Filling    Ready
```

## Network Considerations

### Visual Lag Compensation

```typescript
const lagCompensation = {
  // Show predicted position immediately
  predictiveRendering: true,
  
  // Visual interpolation for smooth movement
  interpolationBuffer: 100,  // ms
  
  // Connection quality indicators
  pingDisplay: {
    good: { color: '#00FF00', icon: '●●●' },    // <50ms
    medium: { color: '#FFAA00', icon: '●●○' },  // 50-150ms
    poor: { color: '#FF0000', icon: '●○○' }     // >150ms
  }
}
```

## Device-Specific Features

### iOS Optimizations

```swift
// Haptic Feedback
- Light impact for UI interactions
- Medium impact for collisions
- Heavy impact for eliminations
- Custom patterns for power-ups

// Safe Areas
- Respect notch/dynamic island
- Account for home indicator
- Proper keyboard avoidance
```

### Android Optimizations

```kotlin
// Navigation Modes
- Gesture navigation support
- Button navigation compatibility
- Immersive mode for gameplay

// Performance Profiles
- Detect thermal throttling
- Adjust quality dynamically
- GameMode API integration
```

## Accessibility on Mobile

### Visual Accessibility

```
High Contrast Mode:
- Increase glow intensity 50%
- Add white outlines to all entities
- Darken background to pure black
- Increase UI element sizes 20%

Reduced Motion:
- Disable screen shake
- Simplify particle systems
- Remove parallax effects
- Static UI elements only
```

### Touch Accessibility

```
Assistive Touch Support:
- Larger hit boxes (+20%)
- Adjustable joystick position
- One-handed mode option
- Custom gesture mapping

Voice Control:
- "Move up/down/left/right"
- "Use power-up"
- "Pause game"
- Screen reader support
```

## Testing Matrix

| Device | Resolution | FPS Target | Quality | Features |
|--------|------------|------------|---------|----------|
| iPhone 14 Pro | 2532×1170 | 60 | Ultra | All |
| iPhone SE | 1334×750 | 30 | High | Most |
| iPad Pro | 2732×2048 | 60 | Ultra | All+Zoom |
| Samsung S23 | 2340×1080 | 60 | Ultra | All |
| Budget Android | 1280×720 | 30 | Low | Essential |

## Progressive Enhancement

```typescript
// Start with basics, add features based on capability
const progressiveFeatures = {
  essential: ['movement', 'collision', 'territory'],
  enhanced: ['particles', 'glow', 'powerups'],
  premium: ['advanced_effects', 'haptics', 'ar_mode']
}

// Detect and enable
features.forEach(feature => {
  if (device.canSupport(feature)) {
    enable(feature)
  }
})
```

## Future Mobile Features

1. **AR Mode**: Use camera for real-world arena
2. **Gyroscope Control**: Tilt to steer option
3. **Multiplayer Rooms**: Local WiFi games
4. **Mobile Tournaments**: Optimized competitive mode
5. **Cloud Save**: Sync between devices