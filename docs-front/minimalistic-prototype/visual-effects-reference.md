# Visual Effects Reference

## Overview

This reference covers all visual effects achievable using only PixiJS primitives. Each effect includes implementation details, performance considerations, and visual examples.

## Glow Effects

### Basic Glow
```typescript
// Simple glow using concentric circles
class BasicGlow {
  private graphics: Graphics;
  
  draw(x: number, y: number, color: number, radius: number) {
    this.graphics.clear();
    
    // Draw multiple rings with decreasing opacity
    for (let i = 3; i >= 0; i--) {
      const ringRadius = radius + (i * 10);
      const alpha = 0.3 / (i + 1);
      
      this.graphics.circle(x, y, ringRadius);
      this.graphics.fill({ color, alpha });
    }
    
    // Core bright center
    this.graphics.circle(x, y, radius);
    this.graphics.fill({ color, alpha: 1 });
  }
}
```

### Animated Pulse Glow
```typescript
class PulseGlow {
  private time: number = 0;
  
  update(deltaTime: number) {
    this.time += deltaTime * 0.001;
    
    const baseRadius = 20;
    const pulseAmount = Math.sin(this.time * 2) * 5;
    const radius = baseRadius + pulseAmount;
    
    // Also pulse opacity
    const alpha = 0.8 + Math.sin(this.time * 3) * 0.2;
    
    this.draw(radius, alpha);
  }
}
```

### Multi-Color Glow (Rainbow)
```typescript
class RainbowGlow {
  private hue: number = 0;
  
  update(deltaTime: number) {
    this.hue = (this.hue + deltaTime * 0.1) % 360;
    
    for (let i = 0; i < 6; i++) {
      const offsetHue = (this.hue + i * 60) % 360;
      const color = hslToRgb(offsetHue, 100, 50);
      const angle = (i / 6) * Math.PI * 2;
      
      const x = Math.cos(angle) * 10;
      const y = Math.sin(angle) * 10;
      
      this.graphics.circle(x, y, 15);
      this.graphics.fill({ color, alpha: 0.5 });
    }
  }
}
```

## Blend Mode Effects

### Additive Blending
```typescript
// Creates bright, neon-like overlaps
container.blendMode = 'add';

// Best for:
// - Glow effects
// - Light sources
// - Energy effects
// - Neon aesthetics
```

### Screen Blending
```typescript
// Softer than additive, good for atmospheric effects
container.blendMode = 'screen';

// Best for:
// - Fog effects
// - Soft glows
// - Atmospheric lighting
```

### Multiply Blending
```typescript
// Darkens overlapping areas
container.blendMode = 'multiply';

// Best for:
// - Shadows
// - Dark energy
// - Void effects
```

## Animation Techniques

### Smooth Interpolation
```typescript
class SmoothAnimation {
  private current: number = 0;
  private target: number = 0;
  private speed: number = 0.1;
  
  setTarget(value: number) {
    this.target = value;
  }
  
  update() {
    // Exponential smoothing
    this.current += (this.target - this.current) * this.speed;
    
    // Alternative: Spring physics
    const spring = 0.1;
    const damping = 0.8;
    const force = (this.target - this.current) * spring;
    this.velocity = (this.velocity + force) * damping;
    this.current += this.velocity;
  }
}
```

### Easing Functions
```typescript
const Easing = {
  // Smooth start and stop
  easeInOutCubic: (t: number) => {
    return t < 0.5 
      ? 4 * t * t * t 
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  },
  
  // Bounce effect
  easeOutBounce: (t: number) => {
    if (t < 1 / 2.75) {
      return 7.5625 * t * t;
    } else if (t < 2 / 2.75) {
      t -= 1.5 / 2.75;
      return 7.5625 * t * t + 0.75;
    } else if (t < 2.5 / 2.75) {
      t -= 2.25 / 2.75;
      return 7.5625 * t * t + 0.9375;
    } else {
      t -= 2.625 / 2.75;
      return 7.5625 * t * t + 0.984375;
    }
  },
  
  // Elastic overshoot
  easeOutElastic: (t: number) => {
    if (t === 0 || t === 1) return t;
    const p = 0.3;
    return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
  }
};
```

## Color Effects

### Color Transitions
```typescript
class ColorTransition {
  private startColor: number;
  private endColor: number;
  private progress: number = 0;
  
  getCurrentColor(): number {
    // Extract RGB components
    const r1 = (this.startColor >> 16) & 0xFF;
    const g1 = (this.startColor >> 8) & 0xFF;
    const b1 = this.startColor & 0xFF;
    
    const r2 = (this.endColor >> 16) & 0xFF;
    const g2 = (this.endColor >> 8) & 0xFF;
    const b2 = this.endColor & 0xFF;
    
    // Interpolate
    const r = Math.round(r1 + (r2 - r1) * this.progress);
    const g = Math.round(g1 + (g2 - g1) * this.progress);
    const b = Math.round(b1 + (b2 - b1) * this.progress);
    
    return (r << 16) | (g << 8) | b;
  }
}
```

### HSL Color Cycling
```typescript
class ColorCycle {
  private hue: number = 0;
  
  update(deltaTime: number) {
    this.hue = (this.hue + deltaTime * 0.05) % 360;
    return hslToRgb(this.hue, 100, 50);
  }
}

function hslToRgb(h: number, s: number, l: number): number {
  h /= 360;
  s /= 100;
  l /= 100;
  
  let r, g, b;
  
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  return (Math.round(r * 255) << 16) | 
         (Math.round(g * 255) << 8) | 
         Math.round(b * 255);
}
```

## Screen Effects

### Screen Shake
```typescript
class ScreenShake {
  private intensity: number = 0;
  private duration: number = 0;
  private elapsed: number = 0;
  private originalX: number;
  private originalY: number;
  
  trigger(intensity: number, duration: number) {
    this.intensity = intensity;
    this.duration = duration;
    this.elapsed = 0;
  }
  
  update(deltaTime: number, container: Container) {
    if (this.elapsed >= this.duration) {
      container.x = this.originalX;
      container.y = this.originalY;
      return;
    }
    
    this.elapsed += deltaTime;
    
    // Reduce intensity over time
    const progress = this.elapsed / this.duration;
    const currentIntensity = this.intensity * (1 - progress);
    
    // Random shake
    container.x = this.originalX + (Math.random() - 0.5) * currentIntensity;
    container.y = this.originalY + (Math.random() - 0.5) * currentIntensity;
  }
}
```

### Screen Flash
```typescript
class ScreenFlash {
  private overlay: Graphics;
  private flashAlpha: number = 0;
  
  constructor(width: number, height: number) {
    this.overlay = new Graphics();
    this.overlay.rect(0, 0, width, height);
    this.overlay.fill({ color: 0xFFFFFF });
    this.overlay.alpha = 0;
  }
  
  flash(color: number = 0xFFFFFF, duration: number = 200) {
    this.overlay.tint = color;
    this.flashAlpha = 1;
    
    const fade = () => {
      this.flashAlpha -= 0.05;
      this.overlay.alpha = this.flashAlpha;
      
      if (this.flashAlpha > 0) {
        requestAnimationFrame(fade);
      }
    };
    
    fade();
  }
}
```

### Chromatic Aberration
```typescript
class ChromaticAberration {
  private redLayer: Container;
  private greenLayer: Container;
  private blueLayer: Container;
  
  applyEffect(intensity: number) {
    // Offset RGB channels
    this.redLayer.x = -intensity;
    this.greenLayer.x = 0;
    this.blueLayer.x = intensity;
    
    // Apply color filters
    this.redLayer.tint = 0xFF0000;
    this.greenLayer.tint = 0x00FF00;
    this.blueLayer.tint = 0x0000FF;
    
    // Blend modes
    this.redLayer.blendMode = 'add';
    this.greenLayer.blendMode = 'add';
    this.blueLayer.blendMode = 'add';
  }
}
```

## Particle Effects

### Fountain Effect
```typescript
class FountainEffect {
  emit(x: number, y: number, color: number) {
    for (let i = 0; i < 20; i++) {
      const angle = -Math.PI/2 + (Math.random() - 0.5) * Math.PI/3;
      const speed = 100 + Math.random() * 200;
      
      const particle = {
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: -200, // Negative for upward float
        life: 1.0,
        color
      };
      
      this.particles.push(particle);
    }
  }
}
```

### Explosion Ring
```typescript
class ExplosionRing {
  create(x: number, y: number, color: number) {
    const particleCount = 30;
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const speed = 200;
      
      // Create expanding ring
      const particle = {
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        size: 4,
        color
      };
      
      this.particles.push(particle);
    }
  }
}
```

### Trail Particles
```typescript
class TrailParticles {
  private lastEmitPosition: {x: number, y: number} | null = null;
  
  emit(x: number, y: number, color: number) {
    if (!this.lastEmitPosition) {
      this.lastEmitPosition = {x, y};
      return;
    }
    
    // Calculate emission direction (opposite of movement)
    const dx = x - this.lastEmitPosition.x;
    const dy = y - this.lastEmitPosition.y;
    const angle = Math.atan2(dy, dx) + Math.PI;
    
    // Emit particles
    for (let i = 0; i < 3; i++) {
      const spread = (Math.random() - 0.5) * 0.5;
      const particleAngle = angle + spread;
      const speed = 50 + Math.random() * 50;
      
      this.particles.push({
        x, y,
        vx: Math.cos(particleAngle) * speed,
        vy: Math.sin(particleAngle) * speed,
        life: 0.5,
        size: 2,
        color
      });
    }
    
    this.lastEmitPosition = {x, y};
  }
}
```

## Motion Effects

### Motion Blur
```typescript
class MotionBlur {
  private previousFrames: Graphics[] = [];
  private maxFrames: number = 5;
  
  addFrame(graphics: Graphics) {
    // Clone current graphics
    const frame = graphics.clone();
    frame.alpha = 0.2;
    
    this.previousFrames.push(frame);
    
    if (this.previousFrames.length > this.maxFrames) {
      const old = this.previousFrames.shift();
      old?.destroy();
    }
    
    // Update alphas
    this.previousFrames.forEach((frame, i) => {
      frame.alpha = (i / this.previousFrames.length) * 0.5;
    });
  }
}
```

### Speed Lines
```typescript
class SpeedLines {
  create(x: number, y: number, direction: number, color: number) {
    const lineCount = 5;
    
    for (let i = 0; i < lineCount; i++) {
      const offset = (i - lineCount/2) * 10;
      const perpendicular = direction + Math.PI/2;
      
      const startX = x + Math.cos(perpendicular) * offset;
      const startY = y + Math.sin(perpendicular) * offset;
      
      const length = 50 + Math.random() * 50;
      const endX = startX - Math.cos(direction) * length;
      const endY = startY - Math.sin(direction) * length;
      
      this.graphics.moveTo(startX, startY);
      this.graphics.lineTo(endX, endY);
      this.graphics.stroke({
        width: 2,
        color,
        alpha: 0.5
      });
    }
  }
}
```

## Distortion Effects

### Ripple Effect
```typescript
class RippleEffect {
  private ripples: Array<{x: number, y: number, radius: number, maxRadius: number}> = [];
  
  create(x: number, y: number) {
    this.ripples.push({
      x, y,
      radius: 0,
      maxRadius: 100
    });
  }
  
  update(deltaTime: number) {
    this.graphics.clear();
    
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const ripple = this.ripples[i];
      ripple.radius += deltaTime * 0.2;
      
      if (ripple.radius > ripple.maxRadius) {
        this.ripples.splice(i, 1);
        continue;
      }
      
      const alpha = 1 - (ripple.radius / ripple.maxRadius);
      
      this.graphics.circle(ripple.x, ripple.y, ripple.radius);
      this.graphics.stroke({
        width: 2,
        color: 0xFFFFFF,
        alpha: alpha * 0.5
      });
    }
  }
}
```

### Shockwave Effect
```typescript
class ShockwaveEffect {
  create(x: number, y: number, color: number) {
    // Create multiple expanding rings
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        this.createRing(x, y, color, i);
      }, i * 100);
    }
  }
  
  private createRing(x: number, y: number, color: number, index: number) {
    const ring = new Graphics();
    const maxRadius = 200 + index * 50;
    let radius = 0;
    
    const expand = () => {
      radius += 5;
      const progress = radius / maxRadius;
      
      ring.clear();
      ring.circle(x, y, radius);
      ring.stroke({
        width: 3 - index,
        color,
        alpha: (1 - progress) * 0.7
      });
      
      if (radius < maxRadius) {
        requestAnimationFrame(expand);
      } else {
        ring.destroy();
      }
    };
    
    expand();
  }
}
```

## Performance Tips

### Effect LOD System
```typescript
class EffectLOD {
  static getQualityLevel(distance: number): 'high' | 'medium' | 'low' | 'off' {
    if (distance < 200) return 'high';
    if (distance < 500) return 'medium';
    if (distance < 800) return 'low';
    return 'off';
  }
  
  static applyLOD(effect: VisualEffect, quality: string) {
    switch (quality) {
      case 'high':
        effect.particleCount = 50;
        effect.updateFrequency = 1;
        effect.complexity = 'full';
        break;
      case 'medium':
        effect.particleCount = 25;
        effect.updateFrequency = 2;
        effect.complexity = 'reduced';
        break;
      case 'low':
        effect.particleCount = 10;
        effect.updateFrequency = 4;
        effect.complexity = 'minimal';
        break;
      case 'off':
        effect.enabled = false;
        break;
    }
  }
}
```

### Batch Effect Rendering
```typescript
class EffectBatcher {
  private effectsByType: Map<string, VisualEffect[]> = new Map();
  
  add(type: string, effect: VisualEffect) {
    if (!this.effectsByType.has(type)) {
      this.effectsByType.set(type, []);
    }
    this.effectsByType.get(type)!.push(effect);
  }
  
  render() {
    // Render all effects of same type together
    this.effectsByType.forEach((effects, type) => {
      // Set up render state for this type
      this.setupRenderState(type);
      
      // Batch render
      effects.forEach(effect => effect.render());
    });
  }
}
```

This visual effects reference provides all the tools needed to create stunning visual effects using only primitives!