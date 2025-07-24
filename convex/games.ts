import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { api } from './_generated/api'

const INITIAL_GLOW_RADIUS = 50
const MIN_PLAYERS_TO_START = 1

// Helper function to generate random position
function generateRandomPosition(mapSize: number = 1000): { x: number; y: number } {
  return {
    x: Math.floor(Math.random() * mapSize),
    y: Math.floor(Math.random() * mapSize),
  }
}

export const createGame = mutation({
  args: {
    name: v.string(),
    maxPlayers: v.number(),
    mapType: v.string(),
    createdBy: v.id('players'),
  },
  returns: v.id('games'),
  handler: async (ctx, args) => {
    // Validate max players
    if (args.maxPlayers < 2 || args.maxPlayers > 8) {
      throw new Error('Max players must be between 2 and 8')
    }

    // Create the game
    const gameId = await ctx.db.insert('games', {
      name: args.name,
      status: 'waiting',
      maxPlayers: args.maxPlayers,
      mapType: args.mapType,
      createdBy: args.createdBy,
      timeLimit: 600000, // 10 minutes default
    })

    // Auto-join the creator to the game
    await ctx.db.insert('gamePlayers', {
      gameId,
      playerId: args.createdBy,
      position: generateRandomPosition(),
      glowRadius: INITIAL_GLOW_RADIUS,
      isAlive: true,
      score: 0,
      joinedAt: Date.now(),
    })

    return gameId
  },
})

export const joinGame = mutation({
  args: {
    gameId: v.id('games'),
    playerId: v.id('players'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get the game
    const game = await ctx.db.get(args.gameId)
    if (!game) {
      throw new Error('Game not found')
    }

    // Check if game is waiting for players
    if (game.status !== 'waiting') {
      throw new Error('Game is not accepting new players')
    }

    // Check if player is already in the game
    const existingPlayer = await ctx.db
      .query('gamePlayers')
      .withIndex('by_game_and_player', q =>
        q.eq('gameId', args.gameId).eq('playerId', args.playerId)
      )
      .first()

    if (existingPlayer) {
      throw new Error('Player is already in this game')
    }

    // Count current players
    const currentPlayers = await ctx.db
      .query('gamePlayers')
      .withIndex('by_game', q => q.eq('gameId', args.gameId))
      .collect()

    if (currentPlayers.length >= game.maxPlayers) {
      throw new Error('Game is full')
    }

    // Add player to game
    await ctx.db.insert('gamePlayers', {
      gameId: args.gameId,
      playerId: args.playerId,
      position: generateRandomPosition(),
      glowRadius: INITIAL_GLOW_RADIUS,
      isAlive: true,
      score: 0,
      joinedAt: Date.now(),
    })

    return null
  },
})

export const leaveGame = mutation({
  args: {
    gameId: v.id('games'),
    playerId: v.id('players'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Find and remove the player from the game
    const gamePlayer = await ctx.db
      .query('gamePlayers')
      .withIndex('by_game_and_player', q =>
        q.eq('gameId', args.gameId).eq('playerId', args.playerId)
      )
      .first()

    if (!gamePlayer) {
      throw new Error('Player not in this game')
    }

    await ctx.db.delete(gamePlayer._id)

    // Get the game
    const game = await ctx.db.get(args.gameId)
    if (!game) {
      return null
    }

    // If this was the creator and game is waiting, delete the game
    if (game.status === 'waiting' && game.createdBy === args.playerId) {
      // Remove all remaining players
      const remainingPlayers = await ctx.db
        .query('gamePlayers')
        .withIndex('by_game', q => q.eq('gameId', args.gameId))
        .collect()

      for (const player of remainingPlayers) {
        await ctx.db.delete(player._id)
      }

      // Delete the game
      await ctx.db.delete(args.gameId)
    }

    return null
  },
})

export const startGame = mutation({
  args: {
    gameId: v.id('games'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId)
    if (!game) {
      throw new Error('Game not found')
    }

    if (game.status !== 'waiting') {
      throw new Error('Game is not in waiting state')
    }

    // Count players
    const players = await ctx.db
      .query('gamePlayers')
      .withIndex('by_game', q => q.eq('gameId', args.gameId))
      .collect()

    if (players.length < MIN_PLAYERS_TO_START) {
      throw new Error(`Minimum ${MIN_PLAYERS_TO_START} players required to start`)
    }

    // Update game status
    await ctx.db.patch(args.gameId, {
      status: 'active',
      startedAt: Date.now(),
    })

    // Check if single player mode
    const isSinglePlayer = players.length === 1
    
    if (isSinglePlayer) {
      // Spawn AI entities for single player mode
      // Start with some friendly sparks
      await ctx.scheduler.runAfter(0, api.ai.sparks.spawnSparks, {
        gameId: args.gameId,
        count: 8, // More sparks for single player
      })
      
      // Add some challenge with creepers after a short delay
      await ctx.scheduler.runAfter(3000, api.ai.creepers.spawnCreepers, {
        gameId: args.gameId,
        count: 3, // Balanced number of creepers
      })
      
      // Schedule periodic spawning to maintain gameplay
      // More sparks every 30 seconds
      await ctx.scheduler.runAfter(30000, api.ai.sparks.spawnSparks, {
        gameId: args.gameId,
        count: 4,
      })
      
      // Additional creeper every minute for increasing difficulty
      await ctx.scheduler.runAfter(60000, api.ai.creepers.spawnCreepers, {
        gameId: args.gameId,
        count: 1,
      })
    }

    return null
  },
})

export const getGame = query({
  args: {
    gameId: v.id('games'),
  },
  returns: v.union(
    v.object({
      _id: v.id('games'),
      _creationTime: v.number(),
      name: v.string(),
      status: v.union(
        v.literal('waiting'),
        v.literal('active'),
        v.literal('finished')
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
        v.literal('time_limit')
      )),
      finalStats: v.optional(v.object({
        duration: v.number(),
        totalTerritory: v.number(),
        playerStats: v.array(v.object({
          playerId: v.id('players'),
          score: v.number(),
          territoryCaptured: v.number(),
          eliminations: v.number(),
          survivalTime: v.number(),
          placement: v.number(),
        })),
      })),
      timeLimit: v.number(),
      lastActivity: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.gameId)
  },
})

export const getGamePlayers = query({
  args: {
    gameId: v.id('games'),
  },
  returns: v.array(
    v.object({
      _id: v.id('gamePlayers'),
      _creationTime: v.number(),
      gameId: v.id('games'),
      playerId: v.id('players'),
      position: v.object({ x: v.number(), y: v.number() }),
      glowRadius: v.number(),
      isAlive: v.boolean(),
      score: v.number(),
      joinedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('gamePlayers')
      .withIndex('by_game', q => q.eq('gameId', args.gameId))
      .collect()
  },
})

export const getGamePlayersWithInfo = query({
  args: {
    gameId: v.id('games'),
  },
  returns: v.array(
    v.object({
      _id: v.id('gamePlayers'),
      _creationTime: v.number(),
      gameId: v.id('games'),
      playerId: v.id('players'),
      position: v.object({ x: v.number(), y: v.number() }),
      glowRadius: v.number(),
      isAlive: v.boolean(),
      score: v.number(),
      joinedAt: v.number(),
      player: v.object({
        _id: v.id('players'),
        _creationTime: v.number(),
        name: v.string(),
        color: v.string(),
      }),
    })
  ),
  handler: async (ctx, args) => {
    const gamePlayers = await ctx.db
      .query('gamePlayers')
      .withIndex('by_game', q => q.eq('gameId', args.gameId))
      .collect()

    // Join with player data
    const gamePlayersWithInfo = await Promise.all(
      gamePlayers.map(async (gp) => {
        const player = await ctx.db.get(gp.playerId)
        if (!player) {
          throw new Error(`Player ${gp.playerId} not found`)
        }
        return {
          ...gp,
          player: {
            _id: player._id,
            _creationTime: player._creationTime,
            name: player.name,
            color: player.color,
          },
        }
      })
    )

    return gamePlayersWithInfo
  },
})

export const listAvailableGames = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('games'),
      _creationTime: v.number(),
      name: v.string(),
      status: v.literal('waiting'),
      maxPlayers: v.number(),
      mapType: v.string(),
      createdBy: v.id('players'),
      playerCount: v.number(),
    })
  ),
  handler: async (ctx) => {
    // Get all waiting games
    const waitingGames = await ctx.db
      .query('games')
      .withIndex('by_status', q => q.eq('status', 'waiting'))
      .collect()

    // Add player count to each game and filter out full games
    const gamesWithPlayerCount = await Promise.all(
      waitingGames.map(async game => {
        const players = await ctx.db
          .query('gamePlayers')
          .withIndex('by_game', q => q.eq('gameId', game._id))
          .collect()

        // Explicitly return only waiting games with required fields
        if (game.status === 'waiting') {
          return {
            _id: game._id,
            _creationTime: game._creationTime,
            name: game.name,
            status: game.status as 'waiting',
            maxPlayers: game.maxPlayers,
            mapType: game.mapType,
            createdBy: game.createdBy,
            playerCount: players.length,
          }
        }
        // This should never happen since we queried for waiting games
        throw new Error('Unexpected non-waiting game')
      })
    )

    // Filter out games that are full
    const availableGames = gamesWithPlayerCount.filter(
      game => game.playerCount < game.maxPlayers
    )

    return availableGames
  },
})

export const getActiveGameForPlayer = query({
  args: {
    playerId: v.id('players'),
  },
  returns: v.union(
    v.object({
      gameId: v.id('games'),
      game: v.object({
        _id: v.id('games'),
        _creationTime: v.number(),
        name: v.string(),
        status: v.union(
          v.literal('waiting'),
          v.literal('active'),
          v.literal('finished')
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
          v.literal('time_limit')
        )),
        finalStats: v.optional(v.object({
          duration: v.number(),
          totalTerritory: v.number(),
          playerStats: v.array(v.object({
            playerId: v.id('players'),
            score: v.number(),
            territoryCaptured: v.number(),
            eliminations: v.number(),
            survivalTime: v.number(),
            placement: v.number(),
          })),
        })),
        timeLimit: v.number(),
        lastActivity: v.optional(v.number()),
      }),
      isHost: v.boolean(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // Find game where player is participating
    const gamePlayer = await ctx.db
      .query('gamePlayers')
      .withIndex('by_player', q => q.eq('playerId', args.playerId))
      .first()
    
    if (!gamePlayer) {
      return null
    }
    
    const game = await ctx.db.get(gamePlayer.gameId)
    if (!game || game.status === 'finished') {
      return null
    }
    
    return {
      gameId: gamePlayer.gameId,
      game,
      isHost: game.createdBy === args.playerId,
    }
  },
})