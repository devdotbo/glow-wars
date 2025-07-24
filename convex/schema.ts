import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  posts: defineTable({
    id: v.string(),
    title: v.string(),
    body: v.string(),
  }).index('id', ['id']),

  tasks: defineTable({
    text: v.string(),
    isCompleted: v.boolean(),
  }),

  // Glow Wars tables
  players: defineTable({
    name: v.string(),
    color: v.string(), // Hex color format
    createdAt: v.number(),
  }).index('by_name', ['name']),

  games: defineTable({
    name: v.string(),
    status: v.union(
      v.literal('waiting'),
      v.literal('active'),
      v.literal('finished'),
    ),
    maxPlayers: v.number(),
    mapType: v.string(),
    createdBy: v.id('players'),
    startedAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
    winnerId: v.optional(v.id('players')),
    winCondition: v.optional(v.union(
      v.literal('territory'),
      v.literal('elimination'),
      v.literal('time_limit'),
    )),
    timeLimit: v.number(), // Duration in milliseconds (default 600000 = 10 minutes)
    lastActivity: v.optional(v.number()), // For smart scheduling optimization
  })
    .index('by_status', ['status'])
    .index('by_status_and_activity', ['status', 'lastActivity']),

  gamePlayers: defineTable({
    gameId: v.id('games'),
    playerId: v.id('players'),
    position: v.object({ x: v.number(), y: v.number() }),
    glowRadius: v.number(),
    isAlive: v.boolean(),
    score: v.number(),
    joinedAt: v.number(),
    finalScore: v.optional(v.number()),
    finalTerritory: v.optional(v.number()),
    eliminatedAt: v.optional(v.number()),
    placement: v.optional(v.number()), // 1st, 2nd, 3rd, etc.
  })
    .index('by_game_and_player', ['gameId', 'playerId'])
    .index('by_game', ['gameId'])
    .index('by_player', ['playerId']),

  // Real-time position tracking
  positions: defineTable({
    gameId: v.id('games'),
    playerId: v.id('players'),
    x: v.number(),
    y: v.number(),
    timestamp: v.number(),
  })
    .index('by_game_and_player', ['gameId', 'playerId'])
    .index('by_game', ['gameId']),

  // Territory ownership grid
  territory: defineTable({
    gameId: v.id('games'),
    gridX: v.number(),
    gridY: v.number(),
    ownerId: v.optional(v.id('players')),
    paintedAt: v.number(),
  })
    .index('by_game_and_position', ['gameId', 'gridX', 'gridY'])
    .index('by_game', ['gameId']),

  // AI entities (sparks, creepers, etc)
  aiEntities: defineTable({
    gameId: v.id('games'),
    type: v.string(),
    position: v.object({ x: v.number(), y: v.number() }),
    state: v.string(),
    targetId: v.optional(v.id('players')),
    health: v.number(),
  })
    .index('by_game', ['gameId'])
    .index('by_game_and_type', ['gameId', 'type']),

  // Power-ups that can be collected
  powerups: defineTable({
    gameId: v.id('games'),
    type: v.union(
      v.literal('prism_shield'),
      v.literal('nova_burst'),
      v.literal('shadow_cloak'),
      v.literal('hyper_glow'),
      v.literal('speed_surge'),
    ),
    position: v.object({ x: v.number(), y: v.number() }),
    spawnedAt: v.number(),
  }).index('by_game', ['gameId']),

  // Active effects on players
  playerEffects: defineTable({
    gameId: v.id('games'),
    playerId: v.id('players'),
    effect: v.union(
      v.literal('prism_shield'),
      v.literal('nova_burst'),
      v.literal('shadow_cloak'),
      v.literal('hyper_glow'),
      v.literal('speed_surge'),
    ),
    expiresAt: v.number(),
    metadata: v.optional(v.object({
      speedMultiplier: v.optional(v.number()),
      glowMultiplier: v.optional(v.number()),
    })),
  })
    .index('by_game_and_player', ['gameId', 'playerId'])
    .index('by_expires_at', ['expiresAt'])
    .index('by_game', ['gameId']), // For efficient batch effect queries
})
