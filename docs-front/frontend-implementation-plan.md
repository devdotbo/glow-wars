# Glow Wars Frontend Implementation Plan

## Overview

This document outlines the complete frontend implementation for Glow Wars using PixiJS v8, TanStack Start, and TypeScript. Each phase is designed to be atomic, testable, and completable within 10k tokens.

## Technology Stack

- **Rendering Engine**: PixiJS v8 (WebGL/WebGPU)
- **Framework**: TanStack Start (React 19)
- **Language**: TypeScript 5.x
- **State Management**: Convex real-time subscriptions
- **Build Tool**: Vite
- **Testing**: Vitest + Playwright

## Implementation Phases

### Phase 1: PixiJS Integration Setup

**Goal**: Integrate PixiJS with TanStack Start and establish the rendering pipeline.

**Tasks**:
1. Install dependencies:
   ```bash
   pnpm add pixi.js@^8.0.0 @pixi/react@^8.0.0
   pnpm add -D @types/pixi.js
   ```

2. Create game canvas component with proper lifecycle management
3. Set up responsive canvas sizing with device pixel ratio support
4. Implement game loop with requestAnimationFrame
5. Create PixiJS application singleton
6. Add FPS counter for development

**Deliverables**:
- `app/components/game/GameCanvas.tsx`
- `app/game/pixiApp.ts`
- `app/game/gameLoop.ts`
- Working canvas that resizes properly

**Success Criteria**:
- Canvas renders at 60 FPS
- Proper cleanup on unmount
- Responsive to window resize
- No memory leaks

### Phase 2: Asset Pipeline

**Goal**: Set up asset loading system with progress tracking.

**Tasks**:
1. Download initial assets from Kenney.nl Space Shooter Redux
2. Create sprite atlas using TexturePacker or free alternative
3. Implement asset manifest system
4. Create loading screen with progress bar
5. Set up texture caching
6. Implement error handling for failed loads

**Deliverables**:
- `public/assets/sprites/` directory structure
- `app/game/assets/assetManifest.ts`
- `app/game/assets/assetLoader.ts`
- `app/components/game/LoadingScreen.tsx`

**Success Criteria**:
- All assets load before game starts
- Loading progress displayed to user
- Graceful handling of load failures
- Textures properly cached

### Phase 3: Core Game Rendering

**Goal**: Implement player rendering, movement interpolation, and territory visualization.

**Tasks**:
1. Create Player sprite class with glow effect
2. Implement movement interpolation for smooth 60 FPS
3. Create territory rendering system using Graphics API
4. Add trail particle system behind players
5. Implement camera following for local player
6. Create minimap overlay

**Deliverables**:
- `app/game/entities/Player.ts`
- `app/game/entities/Territory.ts`
- `app/game/systems/MovementSystem.ts`
- `app/game/systems/CameraSystem.ts`
- `app/game/ui/Minimap.ts`

**Success Criteria**:
- Smooth player movement at 60 FPS
- Territory updates in real-time
- Trail effects render correctly
- Camera follows player smoothly

### Phase 4: Visual Effects System

**Goal**: Implement all visual effects including glow, particles, and power-ups.

**Tasks**:
1. Create custom glow shader filter
2. Implement particle system for:
   - Player trails
   - Collision effects
   - Power-up pickups
   - Energy burst waves
3. Add power-up visual indicators
4. Create phase shift distortion effect
5. Implement shield bubble graphics
6. Add victory celebration effects

**Deliverables**:
- `app/game/effects/GlowFilter.ts`
- `app/game/effects/ParticleSystem.ts`
- `app/game/effects/PowerUpEffects.ts`
- `app/game/effects/shaders/glow.frag`
- `app/game/effects/shaders/distortion.frag`

**Success Criteria**:
- Glow effects customizable per player color
- Particle effects performant (1000+ particles)
- Power-up effects clearly visible
- No frame drops with all effects active

### Phase 5: UI Layer Implementation

**Goal**: Create all UI elements including HUD, menus, and overlays.

**Tasks**:
1. Implement HUD with:
   - Score display for all players
   - Timer countdown
   - Territory percentage bars
   - Power-up cooldown indicators
2. Create game state overlays:
   - Waiting for players screen
   - Victory/defeat screen
   - Pause menu (if applicable)
3. Add responsive touch controls for mobile
4. Implement settings panel
5. Create spectator mode UI

**Deliverables**:
- `app/game/ui/HUD.tsx`
- `app/game/ui/GameStateOverlay.tsx`
- `app/game/ui/TouchControls.tsx`
- `app/game/ui/Settings.tsx`
- `app/game/ui/SpectatorUI.tsx`

**Success Criteria**:
- UI readable at all resolutions
- Touch controls responsive on mobile
- Smooth transitions between states
- Settings properly saved

### Phase 6: Performance Optimization

**Goal**: Optimize rendering performance for smooth gameplay on all devices.

**Tasks**:
1. Implement sprite batching for similar objects
2. Create object pooling for particles and effects
3. Add render texture caching for static elements
4. Implement LOD system for particle density
5. Add performance monitoring and auto-quality adjustment
6. Optimize for mobile devices

**Deliverables**:
- `app/game/optimization/SpriteBatcher.ts`
- `app/game/optimization/ObjectPool.ts`
- `app/game/optimization/QualityManager.ts`
- `app/game/optimization/MobileOptimizer.ts`

**Success Criteria**:
- 60 FPS on desktop (GTX 1060 or better)
- 30+ FPS on mobile (iPhone 12 or equivalent)
- Automatic quality adjustment working
- No memory leaks over extended play

## Testing Strategy

Each phase includes:
1. Unit tests for game logic
2. Visual regression tests for rendering
3. Performance benchmarks
4. Cross-browser testing
5. Mobile device testing

## Dependencies

### NPM Packages
```json
{
  "pixi.js": "^8.0.0",
  "@pixi/react": "^8.0.0",
  "@pixi/filter-glow": "^6.0.0",
  "@pixi/particle-emitter": "^5.0.0",
  "stats.js": "^0.17.0"
}
```

### External Resources
- Kenney.nl Space Shooter Redux (CC0)
- OpenGameArt neon effects (CC0)
- Custom shader files (included in project)

## File Structure
```
app/
├── components/
│   └── game/
│       ├── GameCanvas.tsx
│       ├── LoadingScreen.tsx
│       └── GameContainer.tsx
├── game/
│   ├── pixiApp.ts
│   ├── gameLoop.ts
│   ├── assets/
│   ├── entities/
│   ├── systems/
│   ├── effects/
│   ├── ui/
│   └── optimization/
└── routes/
    └── _authed/
        └── game/
            └── $gameId.tsx
```

## Performance Targets

- **Desktop**: 60 FPS @ 1920x1080
- **Mobile**: 30+ FPS @ device resolution
- **Load Time**: < 3 seconds on 4G
- **Memory Usage**: < 200MB
- **Network**: Works on 3G connections

## Notes for Implementation

1. Always test on low-end devices
2. Profile performance after each phase
3. Keep bundle size under 2MB
4. Use WebP for images where supported
5. Implement progressive enhancement
6. Consider WebGPU fallback to WebGL