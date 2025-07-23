# Context for Next Session - Glow Wars Development

## 🎯 The Breakthrough

We were stuck in an endless development loop for weeks due to:
- React StrictMode double-mounting components
- PixiJS ticker memory leaks  
- Convex/React Query aggressive refetching
- Complex state synchronization issues
- Browser freezing after ~1 second

**Solution**: Created `glow-wars-demo.html` - a single HTML file with zero complexity that proves the visual concept works perfectly.

## ✅ What Works

The demo (`glow-wars-demo.html`) demonstrates:
- 5 glowing orbs with beautiful neon effects
- Smooth sine wave movement
- Particle effects
- Territory painting trails
- No freezing, no complexity

Open it with: `python3 -m http.server 8000` then visit `http://localhost:8000/glow-wars-demo.html`

## 🔧 Technical Specifics for Next.js Implementation

### PixiJS v8 API (Critical - API changed!)
```javascript
// ❌ OLD (v7)
graphics.beginFill(color);
graphics.drawCircle(x, y, radius);
graphics.endFill();
graphics.lineStyle(width, color, alpha);

// ✅ NEW (v8)
graphics.circle(x, y, radius);
graphics.fill({ color: color, alpha: alpha });
graphics.setStrokeStyle({ width: width, color: color, alpha: alpha });
```

### Working Visual Effects
```javascript
// Glow effect
for (let i = 3; i >= 0; i--) {
    const graphics = new PIXI.Graphics();
    const layerRadius = radius + (i * 10);
    const alpha = i === 0 ? 1 : 0.3 / i;
    
    graphics.circle(0, 0, layerRadius);
    graphics.fill({ color: color, alpha: alpha });
    
    if (i > 0) {
        const blurFilter = new PIXI.BlurFilter({ strength: i * 2 });
        graphics.filters = [blurFilter];
    }
}
container.blendMode = 'add'; // NOT PIXI.BLEND_MODES.ADD
```

### Key Implementation Details
- Canvas size: 800x600
- Grid size: 40px
- Player colors: `[0x00FF00, 0xFF0066, 0x00CCFF, 0xFFAA00, 0xFF00FF, 0xFFFF00]`
- Movement: Sine waves with time offsets
- Particles: Spawn 30% of frames, decay over time
- Trails: Temporary graphics, destroyed after each frame

## 📋 Next.js App Architecture

### Step 1: Minimal Setup
```bash
npx create-next-app@latest glow-wars-minimal --typescript --tailwind --app
cd glow-wars-minimal
npm install pixi.js
```

### Step 2: Single Game Component
```typescript
// app/components/GlowWarsCanvas.tsx
'use client';

import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';

export default function GlowWarsCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!canvasRef.current) return;
    
    // Port the demo code here
    // NO React state for game updates
    // Direct PIXI manipulation only
    
    return () => {
      // Proper cleanup
    };
  }, []); // Empty deps, single initialization
  
  return <canvas ref={canvasRef} />;
}
```

### Step 3: Incremental Enhancement
1. Get demo working in Next.js first
2. Add mouse control for ONE orb
3. Test thoroughly - ensure no freezing
4. Only then add collision detection
5. Then territory ownership
6. Finally, consider multiplayer

## ⚠️ Critical: What NOT to Do

1. **NO React StrictMode** - Will cause double initialization
2. **NO React state for game loop** - Use PIXI's internal state
3. **NO Convex for real-time gameplay** - Too expensive, not designed for it
4. **NO complex state management initially** - Prove each step works first
5. **NO React wrappers for PIXI** - Use PIXI directly

## 🚀 Development Strategy

### Phase 1: Port Demo (Current)
- Create Next.js app
- Copy demo logic to component
- Ensure it runs without freezing
- Should look identical to HTML demo

### Phase 2: Add Interactivity
- Mouse/touch controls for one orb
- Other orbs remain AI-controlled
- No collision detection yet

### Phase 3: Game Mechanics
- Collision detection
- Territory ownership
- Score tracking
- Win conditions

### Phase 4: Multiplayer (Future)
- WebSocket server for gameplay only
- Convex for lobbies/persistence
- Hybrid architecture

## 💡 Key Insight

The HTML demo proves the concept works. The key to success is:
1. Start with what works (the demo)
2. Add complexity incrementally
3. Test each addition thoroughly
4. Don't add the next feature until current one is stable

## 📁 Important Files

- `glow-wars-demo.html` - The working demo (your reference implementation)
- `packages/convex/convex/*` - Backend (complete, 58 tests passing)
- This document - Your guide for the next session

## 🎮 Final Note

The demo is beautiful and performant. The path forward is clear:
1. Port to Next.js
2. Add interactivity
3. Build up from there

Don't overthink it. The hard part (proving it can work) is done.