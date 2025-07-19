# Glow Wars - Technical Implementation Document

## Overview

This document breaks down the Glow Wars game implementation into atomic, committable tasks. Each task is designed to use less than 10k tokens and includes comprehensive testing with real Convex functions (no mocks).

## Implementation Philosophy

- **Incremental Development**: Each task produces a working, testable feature
- **Real Testing**: All tests use actual Convex functions and database operations
- **Atomic Commits**: Each task results in one meaningful commit
- **Progressive Enhancement**: Later tasks build on earlier foundations

## Task Breakdown

### Task 1: Core Database Schema & Player Management

**Token Estimate**: ~3k tokens  
**Dependencies**: None  
**Deliverables**:

- Schema definition with all tables
- Player creation and retrieval functions
- Basic player data validation

**Files to Create/Modify**:

- `convex/schema.ts` - Complete database schema
- `convex/players.ts` - Player CRUD operations
- `convex/players.test.ts` - Integration tests

**Schema Tables**:

```typescript
players: {
  name: v.string(),
  color: v.string(), // Hex color
  createdAt: v.number(),
}

games: {
  name: v.string(),
  status: v.union(v.literal("waiting"), v.literal("active"), v.literal("finished")),
  maxPlayers: v.number(),
  mapType: v.string(),
  startedAt: v.optional(v.number()),
  finishedAt: v.optional(v.number()),
}

gamePlayers: {
  gameId: v.id("games"),
  playerId: v.id("players"),
  position: v.object({ x: v.number(), y: v.number() }),
  glowRadius: v.number(),
  isAlive: v.boolean(),
  score: v.number(),
}
```

**Test Cases**:

1. Create player with valid data
2. Retrieve player by ID
3. List all players
4. Validate color format
5. Handle duplicate names

---

### Task 2: Game Session Management

**Token Estimate**: ~4k tokens  
**Dependencies**: Task 1  
**Deliverables**:

- Game creation with configuration
- Player joining/leaving mechanics
- Game state transitions

**Files to Create/Modify**:

- `convex/games.ts` - Game session operations
- `convex/games.test.ts` - Integration tests

**Key Functions**:

- `createGame`: Initialize new game session
- `joinGame`: Add player to game
- `leaveGame`: Remove player from game
- `startGame`: Transition to active state
- `listAvailableGames`: Find joinable games

**Test Cases**:

1. Create game with valid config
2. Join game as player
3. Prevent joining full games
4. Start game with minimum players
5. Handle player disconnection

---

### Task 3: Real-time Position Updates & Territory System

**Token Estimate**: ~5k tokens  
**Dependencies**: Tasks 1-2  
**Deliverables**:

- Position update system
- Territory grid management
- Territory ownership tracking

**Files to Create/Modify**:

- `convex/movement.ts` - Position update functions
- `convex/territory.ts` - Territory painting logic
- `convex/territory.test.ts` - Integration tests

**New Schema**:

```typescript
positions: {
  gameId: v.id("games"),
  playerId: v.id("players"),
  x: v.number(),
  y: v.number(),
  timestamp: v.number(),
}

territory: {
  gameId: v.id("games"),
  gridX: v.number(),
  gridY: v.number(),
  ownerId: v.optional(v.id("players")),
  paintedAt: v.number(),
}
```

**Test Cases**:

1. Update player position
2. Paint territory at position
3. Calculate territory ownership percentages
4. Handle concurrent position updates
5. Validate position boundaries

---

### Task 4: Glow System & Resource Management

**Token Estimate**: ~3k tokens  
**Dependencies**: Tasks 1-3  
**Deliverables**:

- Glow radius decay system
- Boost mechanics
- Resource consumption

**Files to Create/Modify**:

- `convex/glow.ts` - Glow system functions
- `convex/glow.test.ts` - Integration tests
- `convex/crons.ts` - Scheduled glow decay

**Key Functions**:

- `decayGlow`: Reduce all player glow radii
- `boost`: Consume glow for speed
- `updatePaintingSpeed`: Calculate based on glow

**Test Cases**:

1. Glow decay over time
2. Boost consumption mechanics
3. Minimum glow radius enforcement
4. Painting speed calculations

---

### Task 5: Basic AI Entity System (Sparks)

**Token Estimate**: ~5k tokens  
**Dependencies**: Tasks 1-4  
**Deliverables**:

- Spark entity spawning
- Basic wander behavior
- Player detection system

**Files to Create/Modify**:

- `convex/ai/sparks.ts` - Spark AI logic
- `convex/ai/entities.ts` - Entity management
- `convex/ai/sparks.test.ts` - Integration tests

**New Schema**:

```typescript
aiEntities: {
  gameId: v.id("games"),
  type: v.string(),
  position: v.object({ x: v.number(), y: v.number() }),
  state: v.string(),
  targetId: v.optional(v.id("players")),
  health: v.number(),
}
```

**Test Cases**:

1. Spawn sparks at intervals
2. Wander movement pattern
3. Player detection radius
4. State transitions (wander→flee)
5. Consumption by players

---

### Task 6: Collision Detection & Player Elimination

**Token Estimate**: ~4k tokens  
**Dependencies**: Tasks 1-5  
**Deliverables**:

- Player-player collision
- Player-AI collision
- Elimination mechanics

**Files to Create/Modify**:

- `convex/collision.ts` - Collision detection
- `convex/elimination.ts` - Player removal
- `convex/collision.test.ts` - Integration tests

**Test Cases**:

1. Detect player collisions
2. Size-based elimination
3. Equal-size bounce mechanics
4. AI entity collection
5. Respawn or spectator mode

---

### Task 7: Advanced AI - Shadow Creepers

**Token Estimate**: ~4k tokens  
**Dependencies**: Tasks 1-6  
**Deliverables**:

- Shadow Creeper spawning in dark areas
- Hunt behavior implementation
- Territory-aware patrolling

**Files to Create/Modify**:

- `convex/ai/creepers.ts` - Creeper AI logic
- `convex/ai/creepers.test.ts` - Integration tests

**Test Cases**:

1. Spawn in unpainted areas
2. Patrol dark territories
3. Chase players in darkness
4. Return to darkness behavior
5. Damage players on contact

---

### Task 8: Power-up System

**Token Estimate**: ~4k tokens  
**Dependencies**: Tasks 1-7  
**Deliverables**:

- Power-up spawning from AI
- Power-up effects implementation
- Duration management

**Files to Create/Modify**:

- `convex/powerups.ts` - Power-up system
- `convex/powerups.test.ts` - Integration tests

**New Schema**:

```typescript
powerups: {
  gameId: v.id("games"),
  type: v.string(),
  position: v.object({ x: v.number(), y: v.number() }),
  spawnedAt: v.number(),
}

playerEffects: {
  gameId: v.id("games"),
  playerId: v.id("players"),
  effect: v.string(),
  expiresAt: v.number(),
}
```

**Test Cases**:

1. Drop power-ups from AI
2. Collect power-ups
3. Apply effects (shield, speed, etc.)
4. Effect expiration
5. Multiple effect stacking

---

### Task 9: Victory Conditions & Game End

**Token Estimate**: ~3k tokens  
**Dependencies**: Tasks 1-8  
**Deliverables**:

- Territory victory check
- Last player standing check
- Game end and cleanup

**Files to Create/Modify**:

- `convex/victory.ts` - Victory condition checks
- `convex/victory.test.ts` - Integration tests

**Test Cases**:

1. Check 60% territory control
2. Detect last player alive
3. Handle time limit victory
4. Clean up game data
5. Record final scores

---

### Task 10: Performance Optimizations

**Token Estimate**: ~3k tokens  
**Dependencies**: Tasks 1-9  
**Deliverables**:

- Batch position updates
- Efficient territory queries
- Client-side prediction helpers

**Files to Create/Modify**:

- `convex/optimizations.ts` - Performance utilities
- Update existing queries for efficiency

**Test Cases**:

1. Batch update performance
2. Territory query optimization
3. Reduced database reads
4. Efficient AI updates

---

## Testing Strategy

### Integration Test Structure

Each test file follows this pattern:

```typescript
// 1. Setup test game and players
// 2. Execute function being tested
// 3. Verify database state changes
// 4. Clean up test data
```

### No Mocks Policy

- All tests use real Convex ctx object
- Database operations are real
- Scheduled functions are tested with time advancement
- No external API mocks (game is self-contained)

## Development Workflow

1. **Read Technical Spec** for current task
2. **Implement Schema** changes if needed
3. **Write Tests First** (TDD approach)
4. **Implement Functions** to pass tests
5. **Run All Tests** to ensure no regressions
6. **Commit** with descriptive message

## Token Usage Guidelines

To stay under 10k tokens per task:

- Focus on one feature at a time
- Reuse existing utilities
- Keep tests focused and concise
- Avoid over-engineering
- Comment only critical logic

## Success Metrics

Each task is complete when:

- All tests pass
- Code follows project style
- No TypeScript errors
- Feature works in isolation
- Ready for production use

---

This incremental approach ensures steady progress while maintaining quality and testability throughout development.
