# Implementation Roadmap - Phase-by-Phase Build Guide

## Overview

This roadmap breaks down the Glow Wars minimalistic prototype into manageable phases. Each phase builds on the previous one and can be tested independently. Estimated total time: 3-5 days for a complete prototype.

## Phase 1: Foundation Setup (2-3 hours)

### Goals
- Set up PixiJS v8 application
- Create basic game loop
- Implement input handling
- Establish project structure

### Tasks
1. **Project Initialization**
   ```bash
   pnpm create vite glow-wars-prototype --template react-ts
   cd glow-wars-prototype
   pnpm add pixi.js@^8.0.0 @pixi/react@^8.0.0
   pnpm add -D @types/node
   ```

2. **Basic PixiJS Setup**
   - Create `GameCanvas.tsx` component
   - Initialize PixiJS Application
   - Set up resize handling
   - Configure dark background

3. **Game Loop Implementation**
   - Create ticker with fixed timestep
   - Implement update/render separation
   - Add FPS counter for debugging

4. **Input System**
   - Keyboard input handling (WASD/Arrows)
   - Mouse/touch support for future
   - Input state management

### Deliverables
- [ ] Running PixiJS application
- [ ] Black screen with FPS counter
- [ ] Console logs showing input

### Code Structure
```
src/
├── components/
│   └── GameCanvas.tsx
├── game/
│   ├── Game.ts
│   ├── systems/
│   │   └── InputManager.ts
│   └── utils/
│       └── Constants.ts
```

## Phase 2: Player Implementation (3-4 hours)

### Goals
- Create glowing circle player
- Implement smooth movement
- Add visual effects (glow rings)
- Handle arena boundaries

### Tasks
1. **Basic Player Class**
   - Glowing circle with 3 rings
   - Position and velocity
   - Color customization

2. **Movement System**
   - 8-directional movement
   - Speed constants
   - Smooth acceleration/deceleration

3. **Visual Polish**
   - Additive blending for glow
   - Pulse effect on spawn
   - Direction indicator

4. **Boundary Collision**
   - Arena bounds checking
   - Bounce off walls
   - Visual feedback on collision

### Deliverables
- [ ] Controllable glowing circle
- [ ] Smooth movement with momentum
- [ ] Wall collision with bounce

### Test Criteria
```typescript
// Movement should feel responsive
const PLAYER_SPEED = 200; // pixels/second
const ACCELERATION = 0.15; // lerp factor
const FRICTION = 0.05; // deceleration
```

## Phase 3: Trail System (2-3 hours)

### Goals
- Implement fading trail behind player
- Optimize for performance
- Add trail collision detection

### Tasks
1. **Trail Point Management**
   - Circular buffer for trail points
   - Position and lifetime tracking
   - Automatic cleanup

2. **Trail Rendering**
   - Fading circles approach
   - Size reduction over time
   - Blend mode for glow effect

3. **Trail Collision**
   - Point-to-line distance checking
   - Self-collision after 3 seconds
   - Other player collision

4. **Performance Optimization**
   - Object pooling for trail points
   - Batch rendering
   - LOD system for distant trails

### Deliverables
- [ ] Visible trail following player
- [ ] Trail fades over 1 second
- [ ] Collision detection working

### Visual Example
```
Player: ●
Trail:  ●●●●○○○○····
        (100% → 0% opacity)
```

## Phase 4: Territory System (4-5 hours)

### Goals
- Implement grid-based territory
- Paint cells as player moves
- Calculate territory percentages
- Render with transparency

### Tasks
1. **Territory Grid**
   - Create 2D grid structure
   - 32x32 pixel cells
   - Efficient data structure

2. **Painting Mechanics**
   - Paint cells under player
   - Handle overlapping claims
   - Edge detection

3. **Territory Rendering**
   - Semi-transparent rectangles
   - Batch rendering for performance
   - Color-coded by player

4. **Score Calculation**
   - Count owned cells
   - Calculate percentages
   - Update in real-time

### Deliverables
- [ ] Visible territory painting
- [ ] Territory persists
- [ ] Score tracking works

### Performance Target
- Handle 1000+ painted cells at 60fps
- Update only changed cells

## Phase 5: Multiple Players (3-4 hours)

### Goals
- Support 8 simultaneous players
- Add AI for testing
- Implement collision system
- Visual distinction

### Tasks
1. **Player Management**
   - Player registry system
   - Unique colors for each
   - ID assignment

2. **Basic AI Players**
   - Random movement
   - Boundary avoidance
   - Territory seeking behavior

3. **Collision System**
   - Player-to-player collision
   - Trail collision for all
   - Elimination mechanics

4. **Visual Feedback**
   - Collision burst effect
   - Screen shake
   - Elimination animation

### Deliverables
- [ ] 8 players on screen
- [ ] AI players moving
- [ ] Collisions eliminate players

### AI Behavior
```typescript
// Simple AI states
enum AIState {
  EXPLORING,    // Random movement
  CLAIMING,     // Painting territory
  HUNTING,      // Following players
  ESCAPING      // Avoiding danger
}
```

## Phase 6: Power-Ups (4-5 hours)

### Goals
- Implement all 5 power-up types
- Spawn system
- Collection effects
- Apply power-up mechanics

### Tasks
1. **Power-Up Entities**
   - Geometric shapes for each type
   - Floating animation
   - Glow effects

2. **Spawn System**
   - Random spawn locations
   - Timed spawning
   - Avoid occupied spaces

3. **Collection & Effects**
   - Proximity detection
   - Collection burst
   - Sound effect triggers

4. **Power-Up Implementation**
   - Speed Boost: 2x speed
   - Shield: Collision immunity
   - Mega Glow: 3x territory paint
   - Phase Shift: Pass through trails
   - Energy Burst: Clear nearby area

### Deliverables
- [ ] All 5 power-ups visible
- [ ] Collection works
- [ ] Effects apply correctly

### Power-Up Schedule
```
Speed:   ▲  Duration: 5s  Cooldown: 10s
Shield:  ⬢  Duration: 3s  Cooldown: 15s
Mega:    ★  Duration: 4s  Cooldown: 20s
Phase:   ◆  Duration: 2s  Cooldown: 12s
Burst:   ⬟  Instant      Cooldown: 18s
```

## Phase 7: UI & HUD (3-4 hours)

### Goals
- Score display for all players
- Game timer
- Power-up indicators
- Minimap

### Tasks
1. **Score Panel**
   - Player list with colors
   - Territory percentages
   - Real-time updates

2. **Game Timer**
   - Countdown from 3:00
   - Color changes < 30s
   - Pulse effect < 10s

3. **Power-Up HUD**
   - Active power-ups
   - Cooldown timers
   - Ready indicators

4. **Minimap**
   - 150x150 pixel overview
   - Player positions
   - Territory visualization

### Deliverables
- [ ] Complete HUD visible
- [ ] All information readable
- [ ] Updates smoothly

### Layout
```
┌─────────────────────────────────┐
│ Scores  │  Timer  │   Minimap   │
├─────────┴─────────┴─────────────┤
│                                  │
│          Game Area               │
│                                  │
├──────────────────────────────────┤
│ [Speed] [Shield] [Mega] [Phase]  │
└──────────────────────────────────┘
```

## Phase 8: Visual Polish (2-3 hours)

### Goals
- Add particle effects
- Implement screen shake
- Polish all transitions
- Add juice to interactions

### Tasks
1. **Particle Systems**
   - Collision bursts
   - Trail particles
   - Power-up effects
   - Victory celebration

2. **Screen Effects**
   - Camera shake on collision
   - Flash on elimination
   - Smooth camera follow

3. **Animation Polish**
   - Ease all movements
   - Smooth color transitions
   - Power-up pickup effects

4. **Audio Triggers**
   - Define sound event points
   - Visual feedback for audio

### Deliverables
- [ ] Particles on all events
- [ ] Screen shake working
- [ ] Game feels responsive

## Phase 9: Game Flow (2-3 hours)

### Goals
- Main menu
- Game states
- Victory screen
- Restart flow

### Tasks
1. **Menu System**
   - Start screen
   - Player selection
   - Settings (basic)

2. **Game States**
   - Waiting for players
   - Countdown start
   - Playing
   - Game over

3. **Victory Screen**
   - Winner announcement
   - Final scores
   - Territory recap
   - Play again option

4. **Polish**
   - Smooth transitions
   - Loading states
   - Error handling

### Deliverables
- [ ] Complete game flow
- [ ] Can play multiple rounds
- [ ] Clean transitions

## Phase 10: Convex Integration (4-5 hours)

### Goals
- Connect to Convex backend
- Real-time multiplayer
- State synchronization
- Network optimization

### Tasks
1. **Convex Setup**
   - Initialize client
   - Auth integration
   - Game session creation

2. **State Sync**
   - Player positions
   - Territory updates
   - Power-up spawns
   - Game timer

3. **Network Optimization**
   - Client prediction
   - Lag compensation
   - Interpolation
   - Delta compression

4. **Testing**
   - Multiple clients
   - Latency simulation
   - Edge cases

### Deliverables
- [ ] Multiplayer working
- [ ] Smooth with 100ms latency
- [ ] State stays synchronized

### Architecture
```typescript
// Client prediction
class NetworkedPlayer {
  serverState: PlayerState;
  predictedState: PlayerState;
  stateBuffer: StateSnapshot[];
  
  reconcile() {
    // Apply server corrections
    // Replay local inputs
  }
}
```

## Testing Checklist

### Performance Targets
- [ ] 60 FPS with 8 players
- [ ] < 100ms input latency
- [ ] < 50MB memory usage
- [ ] Works on 2018+ devices

### Gameplay Feel
- [ ] Movement feels responsive
- [ ] Collisions are fair
- [ ] Power-ups are balanced
- [ ] Victory conditions clear

### Visual Quality
- [ ] Glow effects visible
- [ ] Colors distinguishable
- [ ] UI readable at distance
- [ ] Animations smooth

## Common Issues & Solutions

### Performance Problems
- **Too many draw calls**: Batch similar graphics
- **Trail lag**: Reduce trail length or points
- **Territory slow**: Use dirty rectangles

### Visual Issues
- **Glow not visible**: Check blend modes
- **Colors too similar**: Adjust palette
- **UI hard to read**: Add backgrounds

### Gameplay Issues
- **Movement sluggish**: Increase acceleration
- **Collisions unfair**: Add grace period
- **AI too hard**: Reduce reaction time

## Next Steps After Prototype

1. **Gather Feedback**
   - Playtest sessions
   - Record metrics
   - Survey players

2. **Iterate on Feel**
   - Adjust speeds
   - Tweak timings
   - Balance power-ups

3. **Prepare for Production**
   - Asset pipeline
   - Sprite creation
   - Sound design
   - Polish plan

This roadmap provides a clear path from empty project to playable prototype. Each phase is self-contained and testable, allowing for iterative development and early feedback.