# Glow Wars - Visual Mockups

## Screen Layout Overview

### Full Game Screen (1920x1080)
```
┌─────────────────────────────────────────────────────────────────────────┐
│ ┌─────────────┐         ┌─────────┐         ┌─────────────┐            │ 
│ │ LEADERBOARD │         │  TIMER  │         │   MINIMAP   │            │ 
│ │ ¤ P1 - 45%  │         │  2:30   │         │ ┌─────────┐ │            │ 
│ │ ¤ P2 - 30%  │         └─────────┘         │ │ ·¤·○··¤ │ │            │ 
│ │ ○ P3 - 15%  │                             │ │ ···█···· │ │            │ 
│ │ × P4 - 10%  │                             │ │ ·×·····¤ │ │            │ 
│ └─────────────┘                             │ └─────────┘ │            │ 
│                                             └─────────────┘            │ 
│                                                                         │ 
│                          ╔═══════════════════╗                         │ 
│                          ║                   ║                         │ 
│      ¤→→→→→→→           ║   GAME ARENA      ║        ○→→→→→           │ 
│         ↘                ║                   ║           ↙             │ 
│          →→→            ║  ████████████     ║        →→→              │ 
│                         ║  ████████████     ║                         │ 
│    ×←←←←←←              ║      ⚡            ║                         │ 
│        ↖                ║                   ║      ¤←←←←←←            │ 
│         ←←←←            ║         ★         ║          ↗              │ 
│                         ║                   ║       ←←←               │ 
│                         ╚═══════════════════╝                         │ 
│                                                                         │ 
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │ 
│ │  SPEED   │ │  SHIELD  │ │   MEGA   │ │  PHASE   │ │  BURST   │    │ 
│ │    ⚡    │ │    ⬡     │ │    ★     │ │    ◈     │ │    ✦     │    │ 
│ │   3.2s   │ │  READY   │ │   12s    │ │  READY   │ │   5.1s   │    │ 
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘    │ 
└─────────────────────────────────────────────────────────────────────────┘

Legend:
¤ ○ × = Players (different shapes/colors)
→ ← ↘ ↗ = Movement trails
████ = Territory ownership
⚡★⬡◈✦ = Power-ups
```

## Detailed Component Mockups

### Player with Trail Effect
```
   Recent ←────── Movement Direction ────────→ Oldest
   
   ¤●●●○○○○····· 
   
   ▲ ▲ ▲ ▲ ▲
   │ │ │ │ └─ Faded particle (10% opacity)
   │ │ │ └─── Fading particle (25% opacity)  
   │ │ └───── Mid particle (50% opacity)
   │ └─────── Bright particle (75% opacity)
   └───────── Player (100% opacity + glow)
```

### Territory Painting Visualization
```
   Before Movement:          After Movement:
   
   ░░░░░░░░░░              ░░░░████░░
   ░░░░░░░░░░              ░░░░████░░
   ░░░░¤░░░░░     →        ░░░░████░░
   ░░░░░░░░░░              ░░░░████░░
   ░░░░░░░░░░              ░░░░░░░░░░
   
   ░ = Unclaimed space
   █ = Claimed territory (30% opacity player color)
   ¤ = Player position
```

### Collision Effect Mockup
```
   Frame 1:        Frame 2:        Frame 3:        Frame 4:
   
      ¤○             ¤○            · × ·           ·   ·
                    ████           ×¤○×          ·  · ·  ·
                   IMPACT!         × × ×         · · · · ·
                                  · × ·           ·   ·
   
   Two players    Collision      Explosion      Particles
   approaching     moment         burst          disperse
```

### Power-Up Visual States
```
   Idle State:           Collection:          Active Effect:
   
   ┌─────┐              ┌─────┐              Player with effect:
   │  ⚡  │              │ ·⚡· │              
   │     │ (rotating)   │·*⚡*·│ (burst)      ¤═══════  (speed trail)
   └─────┘              │ ·⚡· │              
                        └─────┘
```

## Game State Mockups

### Game Start - Lobby View
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                      GLOW WARS                              │
│                   ═══════════════                           │
│                                                             │
│                    GAME CODE: XKCD                          │
│                                                             │
│     ┌─────────────────────────────────────────────┐       │
│     │  PLAYERS (3/8)                              │       │
│     │                                             │       │
│     │  ¤ Player1 (Host)              ✓ READY     │       │
│     │  ○ Player2                     ✓ READY     │       │
│     │  × Player3                     ⟳ WAITING   │       │
│     │  · Empty Slot                              │       │
│     │  · Empty Slot                              │       │
│     │                                             │       │
│     └─────────────────────────────────────────────┘       │
│                                                             │
│            [  START GAME  ]    [ LEAVE ]                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Active Gameplay - Intense Moment
```
┌─────────────────────────────────────────────────────────────┐
│ P1:45% P2:30% P3:15% P4:10%    0:47    [mini][map][here]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ¤→→→→→→→→→→████████████                                   │
│      ↘      ████████████         ○←←←←←←←←←               │
│       →→→→→→████¤███████            ↖                      │
│             ████████████             ←←←←○○○○○○○○○         │
│             ████████████                                    │
│                  ⚡                  ×→→→→→→→→              │
│                                         ↘                   │
│      ████████                           →→→×××××××××       │
│      ████████        ★                  ××××××××××××       │
│      ████████                           ××××××××××××       │
│      ███○████                                               │
│      ████████                      ¤←←←←←←←←←              │
│      ████████                          ↗                    │
│                                     ←←←←¤¤¤¤¤¤¤¤¤          │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ [⚡3s] [⬡RDY] [★15s] [◈RDY] [✦8s]                          │
└─────────────────────────────────────────────────────────────┘
```

### Victory Screen
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    ✨ VICTORY! ✨                           │
│                                                             │
│                 ╔═══════════════════╗                       │
│                 ║                   ║                       │
│                 ║    ¤ PLAYER 1     ║                       │
│                 ║                   ║                       │
│                 ║   DOMINATED WITH  ║                       │
│                 ║    67% CONTROL    ║                       │
│                 ║                   ║                       │
│                 ╚═══════════════════╝                       │
│                                                             │
│  FINAL STANDINGS:                                           │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ 67% - Player 1         │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ 28% - Player 2                          │
│  ▓▓▓ 5% - Player 3                                         │
│  ▓ 0% - Player 4 (Eliminated)                              │
│                                                             │
│         [ PLAY AGAIN ]         [ MAIN MENU ]               │
│                                                             │
└─────────────────────────────────────────────────────────────┘

(Imagine particle effects: ✨ * ✦ · ✨ falling everywhere)
```

## Mobile Layout (Portrait - 390x844)
```
┌───────────────────┐
│ ┌───┬───────┬───┐ │
│ │P1 │ 1:30  │Map│ │
│ │45%│       │   │ │
│ └───┴───────┴───┘ │
│                   │
│                   │
│    ¤→→→→→        │
│      ↘            │
│       →→█████     │
│         █████     │
│                   │
│     ⚡       ○←←← │
│                ↗  │
│             ←←←   │
│                   │
│  ×→→→             │
│    ↘              │
│     →→→→          │
│                   │
│                   │
│ ┌───┬───┬───┬───┐ │
│ │ ⚡│ ⬡ │ ★ │ ◈ │ │
│ └───┴───┴───┴───┘ │
│                   │
│  ◐              ▲ │  <- Virtual controls
│ ◀ ◑            ● │
│  ◒              ▼ │
└───────────────────┘
```

## Visual Moment Descriptions

### "The Chase"
Two players, one chasing the other. The pursuer's trail grows brighter as they gain ground. The fleeing player drops a phase shift, leaving a distortion wake as they teleport away, their trail momentarily fragmenting into scattered particles.

### "Territory War"
Four players converge on the center, each painting frantically. The territories blend at the edges creating gradient boundaries. A mega glow power-up appears, and all four rush for it, their trails creating a perfect cross pattern.

### "The Final Showdown"
Timer at 0:10. Two players left, circling each other. The arena is 90% painted in their colors. Every movement is critical. One activates shield, glowing hexagonal barrier pulsing. The other boosts, leaving an intense speed trail. They collide in a massive burst of particles.

### "Shadow Creeper Ambush"
A player confidently painting territory doesn't notice the purple-tinged Shadow Creeper approaching from their blind spot. At the last second, they spot it and swerve, leaving a sharp angle in their trail. The Creeper's ethereal form phases through the trail, continuing its relentless pursuit.

## Particle and Effect Density

### Performance Levels
```
ULTRA (Desktop High-end):
- 200 trail particles per player
- 50 particle collision burst
- Full resolution glow shaders
- All effects enabled

HIGH (Desktop Standard):
- 100 trail particles per player  
- 30 particle collision burst
- Standard glow shaders
- Most effects enabled

MEDIUM (Mobile/Low-end):
- 50 trail particles per player
- 15 particle collision burst
- Simplified glow
- Core effects only

LOW (Minimum):
- 20 trail particles per player
- 5 particle collision burst
- Basic glow overlay
- Essential effects only
```

## The Living Arena

The arena isn't just a game space - it's a canvas that tells the story of the battle. By the end of a match, you can see:
- High-traffic areas glowing brighter from accumulated particles
- Territory boundaries showing the ebb and flow of control
- Trail patterns revealing player strategies and routes
- Power-up locations marked by collection burst remnants

This creates a unique "heat map" of the match that's both beautiful and informative.