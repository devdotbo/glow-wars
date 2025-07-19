import { mutation } from './_generated/server'
import { v } from 'convex/values'

export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    // Clear all data from Glow Wars tables
    const players = await ctx.db.query('players').collect()
    for (const player of players) {
      await ctx.db.delete(player._id)
    }

    const games = await ctx.db.query('games').collect()
    for (const game of games) {
      await ctx.db.delete(game._id)
    }

    const gamePlayers = await ctx.db.query('gamePlayers').collect()
    for (const gamePlayer of gamePlayers) {
      await ctx.db.delete(gamePlayer._id)
    }
  },
})
