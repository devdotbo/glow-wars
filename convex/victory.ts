import { mutation, query, internalMutation } from './_generated/server'
import { v } from 'convex/values'
import { api } from './_generated/api'

// Constants
const TERRITORY_WIN_PERCENTAGE = 60
const TIME_LIMIT_DEFAULT = 600000 // 10 minutes in milliseconds
const VICTORY_BONUS = 500
const TERRITORY_POINT_MULTIPLIER = 10
const ELIMINATION_POINT_MULTIPLIER = 100
const SURVIVAL_POINT_MULTIPLIER = 1

// Helper function to check territory victory
async function checkTerritoryVictoryHelper(ctx: any, gameId: any) {
  const stats = await ctx.runQuery(api.territory.calculateTerritoryStats, { gameId })
  
  for (const playerStat of stats.playerStats) {
    if (playerStat.percentage >= TERRITORY_WIN_PERCENTAGE) {
      return {
        hasWinner: true,
        winnerId: playerStat.playerId,
        winCondition: 'territory' as const,
      }
    }
  }
  
  return { hasWinner: false }
}

// Helper function to check elimination victory
async function checkEliminationVictoryHelper(ctx: any, gameId: any) {
  const gamePlayers = await ctx.db
    .query('gamePlayers')
    .withIndex('by_game', (q: any) => q.eq('gameId', gameId))
    .collect()
  
  const alivePlayers = gamePlayers.filter(p => p.isAlive)
  
  if (alivePlayers.length === 1) {
    return {
      hasWinner: true,
      winnerId: alivePlayers[0].playerId,
      winCondition: 'elimination' as const,
    }
  }
  
  if (alivePlayers.length === 0) {
    // Edge case: all players eliminated simultaneously
    // Winner is the last eliminated
    const lastEliminated = gamePlayers
      .filter(p => p.eliminatedAt)
      .sort((a, b) => b.eliminatedAt! - a.eliminatedAt!)[0]
    
    if (lastEliminated) {
      return {
        hasWinner: true,
        winnerId: lastEliminated.playerId,
        winCondition: 'elimination' as const,
      }
    }
  }
  
  return { hasWinner: false }
}

// Helper function to check time limit victory
async function checkTimeLimitHelper(ctx: any, gameId: any) {
  const game = await ctx.db.get(gameId)
  if (!game || !game.startedAt) return { hasWinner: false }
  
  const currentTime = Date.now()
  const gameTime = currentTime - game.startedAt
  
  if (gameTime >= game.timeLimit) {
    // Get player with most territory
    const stats = await ctx.runQuery(api.territory.calculateTerritoryStats, { gameId })
    
    if (stats.playerStats.length > 0) {
      // Already sorted by territory count descending
      const winner = stats.playerStats[0]
      return {
        hasWinner: true,
        winnerId: winner.playerId,
        winCondition: 'time_limit' as const,
      }
    }
  }
  
  return { hasWinner: false }
}

// Calculate final score for a player
async function calculateFinalScoreHelper(
  ctx: any,
  gameId: any,
  playerId: any,
  isWinner: boolean
) {
  const gamePlayer = await ctx.db
    .query('gamePlayers')
    .withIndex('by_game_and_player', (q: any) =>
      q.eq('gameId', gameId).eq('playerId', playerId)
    )
    .unique()
  
  if (!gamePlayer) return 0
  
  const game = await ctx.db.get(gameId)
  if (!game || !game.startedAt) return 0
  
  // Get territory count
  const stats = await ctx.runQuery(api.territory.calculateTerritoryStats, { gameId })
  const playerStat = stats.playerStats.find(s => s.playerId === playerId)
  const territoryCount = playerStat?.cellCount || 0
  
  // Calculate survival time
  const endTime = gamePlayer.eliminatedAt || Date.now()
  const survivalTime = Math.floor((endTime - game.startedAt) / 1000) // seconds
  
  // TODO: Track eliminations in future (requires tracking who eliminated whom)
  const eliminations = 0
  
  // Calculate final score
  let score = 0
  score += territoryCount * TERRITORY_POINT_MULTIPLIER
  score += eliminations * ELIMINATION_POINT_MULTIPLIER
  score += survivalTime * SURVIVAL_POINT_MULTIPLIER
  
  if (isWinner) {
    score += VICTORY_BONUS
  }
  
  return score
}

// Main mutation to end the game
export const endGame = internalMutation({
  args: {
    gameId: v.id('games'),
    winnerId: v.id('players'),
    winCondition: v.union(
      v.literal('territory'),
      v.literal('elimination'),
      v.literal('time_limit')
    ),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId)
    if (!game || game.status !== 'active') {
      return
    }
    
    // Update game status
    await ctx.db.patch(args.gameId, {
      status: 'finished',
      finishedAt: Date.now(),
      winnerId: args.winnerId,
      winCondition: args.winCondition,
    })
    
    // Get all game players
    const gamePlayers = await ctx.db
      .query('gamePlayers')
      .withIndex('by_game', (q) => q.eq('gameId', args.gameId))
      .collect()
    
    // Calculate final scores and territory for each player
    const playerScores = []
    for (const gamePlayer of gamePlayers) {
      const isWinner = gamePlayer.playerId === args.winnerId
      const finalScore = await calculateFinalScoreHelper(
        ctx,
        args.gameId,
        gamePlayer.playerId,
        isWinner
      )
      
      const stats = await ctx.runQuery(api.territory.calculateTerritoryStats, { 
        gameId: args.gameId 
      })
      const playerStat = stats.playerStats.find(s => s.playerId === gamePlayer.playerId)
      const finalTerritory = playerStat?.cellCount || 0
      
      playerScores.push({
        gamePlayerId: gamePlayer._id,
        playerId: gamePlayer.playerId,
        finalScore,
        finalTerritory,
      })
    }
    
    // Sort by final score to assign placements
    playerScores.sort((a, b) => b.finalScore - a.finalScore)
    
    // Update each player with final stats and placement
    for (let i = 0; i < playerScores.length; i++) {
      const playerScore = playerScores[i]
      await ctx.db.patch(playerScore.gamePlayerId, {
        finalScore: playerScore.finalScore,
        finalTerritory: playerScore.finalTerritory,
        placement: i + 1,
      })
    }
    
    return {
      winnerId: args.winnerId,
      winCondition: args.winCondition,
      playerCount: gamePlayers.length,
    }
  },
})

// Public mutation to check victory conditions
export const checkVictoryConditions = internalMutation({
  args: {
    gameId: v.id('games'),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId)
    if (!game || game.status !== 'active') {
      return { checked: false }
    }
    
    // Check territory victory
    const territoryResult = await checkTerritoryVictoryHelper(ctx, args.gameId)
    if (territoryResult.hasWinner) {
      await ctx.runMutation(api.victory.endGame, {
        gameId: args.gameId,
        winnerId: territoryResult.winnerId,
        winCondition: territoryResult.winCondition,
      })
      return { checked: true, hasWinner: true }
    }
    
    // Check elimination victory
    const eliminationResult = await checkEliminationVictoryHelper(ctx, args.gameId)
    if (eliminationResult.hasWinner) {
      await ctx.runMutation(api.victory.endGame, {
        gameId: args.gameId,
        winnerId: eliminationResult.winnerId,
        winCondition: eliminationResult.winCondition,
      })
      return { checked: true, hasWinner: true }
    }
    
    // Check time limit victory
    const timeLimitResult = await checkTimeLimitHelper(ctx, args.gameId)
    if (timeLimitResult.hasWinner) {
      await ctx.runMutation(api.victory.endGame, {
        gameId: args.gameId,
        winnerId: timeLimitResult.winnerId,
        winCondition: timeLimitResult.winCondition,
      })
      return { checked: true, hasWinner: true }
    }
    
    return { checked: true, hasWinner: false }
  },
})

// Internal mutation to check all active games
export const checkAllActiveGames = internalMutation({
  args: {},
  handler: async (ctx) => {
    const activeGames = await ctx.db
      .query('games')
      .withIndex('by_status', (q) => q.eq('status', 'active'))
      .collect()
    
    let gamesChecked = 0
    let winnersFound = 0
    
    for (const game of activeGames) {
      const result = await ctx.runMutation(api.victory.checkVictoryConditions, {
        gameId: game._id,
      })
      
      if (result.checked) {
        gamesChecked++
        if (result.hasWinner) {
          winnersFound++
        }
      }
    }
    
    return { gamesChecked, winnersFound }
  },
})

// Query to get game results
export const getGameResult = query({
  args: {
    gameId: v.id('games'),
  },
  returns: v.optional(v.object({
    game: v.object({
      _id: v.id('games'),
      name: v.string(),
      status: v.string(),
      winnerId: v.optional(v.id('players')),
      winCondition: v.optional(v.string()),
      startedAt: v.optional(v.number()),
      finishedAt: v.optional(v.number()),
      duration: v.optional(v.number()),
    }),
    players: v.array(v.object({
      playerId: v.id('players'),
      placement: v.number(),
      finalScore: v.number(),
      finalTerritory: v.number(),
      isWinner: v.boolean(),
      playerName: v.string(),
      playerColor: v.string(),
    })),
  })),
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId)
    if (!game || game.status !== 'finished') {
      return undefined
    }
    
    const gamePlayers = await ctx.db
      .query('gamePlayers')
      .withIndex('by_game', (q) => q.eq('gameId', args.gameId))
      .collect()
    
    // Sort by placement
    gamePlayers.sort((a, b) => (a.placement || 999) - (b.placement || 999))
    
    const players = []
    for (const gamePlayer of gamePlayers) {
      const player = await ctx.db.get(gamePlayer.playerId)
      if (player) {
        players.push({
          playerId: gamePlayer.playerId,
          placement: gamePlayer.placement || 999,
          finalScore: gamePlayer.finalScore || 0,
          finalTerritory: gamePlayer.finalTerritory || 0,
          isWinner: gamePlayer.playerId === game.winnerId,
          playerName: player.name,
          playerColor: player.color,
        })
      }
    }
    
    const duration = game.startedAt && game.finishedAt
      ? game.finishedAt - game.startedAt
      : undefined
    
    return {
      game: {
        _id: game._id,
        name: game.name,
        status: game.status,
        winnerId: game.winnerId,
        winCondition: game.winCondition,
        startedAt: game.startedAt,
        finishedAt: game.finishedAt,
        duration,
      },
      players,
    }
  },
})

// Admin/testing mutation to force end a game
export const forceEndGame = mutation({
  args: {
    gameId: v.id('games'),
    winnerId: v.id('players'),
    winCondition: v.union(
      v.literal('territory'),
      v.literal('elimination'),
      v.literal('time_limit')
    ),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    await ctx.runMutation(api.victory.endGame, args)
    return { success: true }
  },
})

// Testing mutation to set game start time
export const setGameStartTime = internalMutation({
  args: {
    gameId: v.id('games'),
    startedAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.gameId, {
      startedAt: args.startedAt,
    })
  },
})