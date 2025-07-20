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
  }).index('by_status', ['status']),

  gamePlayers: defineTable({
    gameId: v.id('games'),
    playerId: v.id('players'),
    position: v.object({ x: v.number(), y: v.number() }),
    glowRadius: v.number(),
    isAlive: v.boolean(),
    score: v.number(),
    joinedAt: v.number(),
  })
    .index('by_game_and_player', ['gameId', 'playerId'])
    .index('by_game', ['gameId']),

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
})
