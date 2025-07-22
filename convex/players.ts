import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { Id } from './_generated/dataModel'

// Internal helper to validate hex color format
function isValidHexColor(color: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(color)
}

export const createPlayer = mutation({
  args: {
    name: v.string(),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate hex color format
    if (!isValidHexColor(args.color)) {
      throw new Error('Invalid hex color format. Must be #RRGGBB')
    }

    // Check for duplicate name
    const existingPlayer = await ctx.db
      .query('players')
      .withIndex('by_name', (q) => q.eq('name', args.name))
      .first()

    if (existingPlayer) {
      throw new Error('Player name already exists')
    }

    // Create the player
    const playerId = await ctx.db.insert('players', {
      name: args.name,
      color: args.color,
      createdAt: Date.now(),
    })

    return playerId
  },
})

export const getPlayer = query({
  args: {
    playerId: v.id('players'),
  },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId)
    return player
  },
})

export const listPlayers = query({
  args: {},
  handler: async (ctx) => {
    const players = await ctx.db.query('players').collect()
    return players
  },
})
