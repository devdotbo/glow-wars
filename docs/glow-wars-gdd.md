# Glow Wars - Game Design Document

## Overview
**Title:** Glow Wars  
**Genre:** Real-time Multiplayer Territory Control  
**Platform:** Web Browser  
**Players:** 2-8 concurrent players  
**Session Length:** 5-10 minutes  
**Target Audience:** Casual gamers, ages 13+

## Core Concept
Players control glowing orbs in a dark arena, painting territory with their unique neon color while consuming smaller AI-controlled "spark" entities to grow larger. The twist: your glow radius shrinks over time, forcing constant movement and strategic decisions. Last player with territory wins.

## Gameplay Mechanics

### Basic Controls
- **Mouse/Touch:** Move your orb
- **Spacebar/Tap:** Boost (consumes glow energy)
- **Right Click/Double Tap:** Drop a light bomb (special ability)

### Core Mechanics
1. **Territory Painting:** Players automatically paint the ground beneath them with their color
2. **Glow System:** 
   - Your orb emits light in a radius
   - Radius decreases over time (1% per second)
   - Consume "sparks" to increase glow radius
   - Larger glow = faster painting speed
3. **Collision Rules:**
   - Smaller orbs can hide in darkness
   - Larger orbs move slower but paint faster
   - Colliding with a larger opponent eliminates you
   - Equal-sized orbs bounce off each other

### AI-Controlled Elements

1. **Sparks** (Neutral AI):
   - Small glowing entities that wander randomly
   - Flee from players when detected
   - Behavior patterns:
     - Wander: Random movement when no threats
     - Flee: Move away from nearest player
     - Cluster: Occasionally group together for protection

2. **Shadow Creepers** (Hostile AI):
   - Appear in unpainted areas
   - Chase players who enter darkness
   - Behavior:
     - Patrol dark zones
     - Aggressive pursuit when player detected
     - Return to darkness when player escapes

3. **Glow Moths** (Beneficial AI):
   - Attracted to the brightest player
   - Grant temporary power-ups when caught
   - Behavior:
     - Circle around bright players
     - Flee when approached directly
     - Spawn near map edges

### Power-Ups (Dropped by AI)
1. **Prism Shield:** Reflects light, temporary invincibility
2. **Nova Burst:** Instantly paint large area
3. **Shadow Cloak:** Become invisible for 5 seconds
4. **Hyper Glow:** Double glow radius for 10 seconds
5. **Speed Surge:** 50% movement speed increase

### Victory Conditions
- **Territory Control:** Own 60% of the map
- **Last Orb Standing:** All other players eliminated
- **Time Limit:** Player with most territory after 10 minutes

## Maps/Arenas
1. **Neon Grid:** Standard square arena with geometric obstacles
2. **Spiral Galaxy:** Circular arena with rotating sections
3. **Crystal Caverns:** Irregular shape with reflective walls
4. **The Void:** Open space with floating platforms

## Visual Style & Required Sprites

### Player Sprites
- **Orb Base:** Circular gradient sprite (8 color variants)
- **Glow Aura:** Semi-transparent radial gradient
- **Boost Trail:** Particle effect sprite sheet
- **Death Animation:** Explosion/shatter effect (6 frames)

### AI Entity Sprites
- **Sparks:** Small star-shaped sprites with glow
- **Shadow Creepers:** Dark, wispy creatures (4 frame animation)
- **Glow Moths:** Butterfly-like sprites with luminescent wings (6 frames)

### Environment Sprites
- **Floor Tiles:** Dark base texture
- **Painted Tiles:** 8 color variants with glow effect
- **Obstacles:** Geometric shapes (walls, pillars)
- **Power-up Icons:** 5 unique power-up sprites

### UI Elements
- **Health/Glow Bar:** Circular progress indicator
- **Minimap:** Simplified territory view
- **Score Display:** Neon-styled numbers
- **Player Indicators:** Arrow sprites for off-screen players

## Technical AI Behavior Specifications

### Spark AI (Simple Rule-Based)
```
State: WANDER
- Move in random direction
- Change direction every 2-3 seconds
- If player within 100 pixels → State: FLEE

State: FLEE  
- Calculate direction away from nearest player
- Move at 150% speed
- If no player within 150 pixels → State: WANDER
```

### Shadow Creeper AI
```
State: PATROL
- Move along unpainted territory edges
- If player detected in darkness → State: HUNT

State: HUNT
- Pathfind toward player
- Move at 120% player speed
- If player reaches light → State: RETURN

State: RETURN
- Move back to nearest dark area
- Resume State: PATROL
```

## Monetization Strategy (Future)
- Cosmetic orb skins
- Trail effects
- Victory animations
- Season pass with unique visual themes

## Social Features
- Quick emotes (mapped to number keys)
- Post-match statistics
- Rematch voting
- Friends list integration

## Performance Considerations
- Maximum 100 AI entities per match
- Efficient territory tracking using grid system
- Simplified collision detection for better performance
- Progressive detail reduction for slower devices

## Audio Requirements (Future)
- Ambient electronic soundtrack
- Territory claim sound effects
- Power-up collection sounds
- Player elimination effects
- AI entity sounds (sparks chirping, creepers hissing)

---

This game leverages Convex's real-time capabilities perfectly, with constant position updates, territory changes, and AI entity synchronization. The simple rule-based AI keeps server load manageable while providing engaging gameplay dynamics.