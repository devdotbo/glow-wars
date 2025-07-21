import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { GameId, PlayerId } from './types'

const POWERUP_TYPES = [
  'prism_shield',
  'nova_burst', 
  'shadow_cloak',
  'hyper_glow',
  'speed_surge',
] as const

const EFFECT_DURATIONS = {
  prism_shield: 10000, // 10 seconds
  nova_burst: 0, // Instant effect
  shadow_cloak: 5000, // 5 seconds
  hyper_glow: 10000, // 10 seconds
  speed_surge: 8000, // 8 seconds
}

const COLLECTION_DISTANCE = 15
const POWERUP_LIFETIME = 30000 // 30 seconds before despawn

export const spawnPowerup = mutation({
  args: {
    gameId: v.id('games'),
    position: v.object({ x: v.number(), y: v.number() }),
    type: v.optional(v.union(
      v.literal('prism_shield'),
      v.literal('nova_burst'),
      v.literal('shadow_cloak'),
      v.literal('hyper_glow'),
      v.literal('speed_surge'),
    )),
  },
  returns: v.id('powerups'),
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId)
    if (!game || game.status !== 'active') {
      throw new Error('Game not active')
    }

    // Random type if not specified
    const type = args.type || POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)]
    
    const powerupId = await ctx.db.insert('powerups', {
      gameId: args.gameId,
      type,
      position: args.position,
      spawnedAt: Date.now(),
    })

    return powerupId
  },
})

export const collectPowerup = mutation({
  args: {
    powerupId: v.id('powerups'),
    playerId: v.id('players'),
  },
  returns: v.object({
    type: v.union(
      v.literal('prism_shield'),
      v.literal('nova_burst'),
      v.literal('shadow_cloak'),
      v.literal('hyper_glow'),
      v.literal('speed_surge'),
    ),
    applied: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const powerup = await ctx.db.get(args.powerupId)
    if (!powerup) {
      throw new Error('Powerup not found')
    }

    // Get player position
    const position = await ctx.db
      .query('positions')
      .withIndex('by_game_and_player', q =>
        q.eq('gameId', powerup.gameId).eq('playerId', args.playerId)
      )
      .order('desc')
      .first()

    if (!position) {
      throw new Error('Player position not found')
    }

    // Check collection distance
    const distance = Math.sqrt(
      Math.pow(position.x - powerup.position.x, 2) +
      Math.pow(position.y - powerup.position.y, 2)
    )

    if (distance > COLLECTION_DISTANCE) {
      throw new Error('Too far to collect powerup')
    }

    // Get game player
    const gamePlayer = await ctx.db
      .query('gamePlayers')
      .withIndex('by_game_and_player', q =>
        q.eq('gameId', powerup.gameId).eq('playerId', args.playerId)
      )
      .unique()

    if (!gamePlayer || !gamePlayer.isAlive) {
      throw new Error('Player not alive')
    }

    // Delete the powerup
    await ctx.db.delete(args.powerupId)

    // Apply the effect
    const applied = await applyEffectHelper(ctx, {
      gameId: powerup.gameId,
      playerId: args.playerId,
      effect: powerup.type,
      gamePlayer,
    })

    return { type: powerup.type, applied }
  },
})

export const applyEffect = mutation({
  args: {
    gameId: v.id('games'),
    playerId: v.id('players'),
    effect: v.union(
      v.literal('prism_shield'),
      v.literal('nova_burst'),
      v.literal('shadow_cloak'),
      v.literal('hyper_glow'),
      v.literal('speed_surge'),
    ),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const gamePlayer = await ctx.db
      .query('gamePlayers')
      .withIndex('by_game_and_player', (q: any) =>
        q.eq('gameId', args.gameId).eq('playerId', args.playerId)
      )
      .unique()

    if (!gamePlayer || !gamePlayer.isAlive) {
      return false
    }

    return await applyEffectHelper(ctx, {
      ...args,
      gamePlayer,
    })
  },
})

// Helper function to apply effects
async function applyEffectHelper(
  ctx: any,
  args: {
    gameId: GameId,
    playerId: PlayerId,
    effect: 'prism_shield' | 'nova_burst' | 'shadow_cloak' | 'hyper_glow' | 'speed_surge',
    gamePlayer: any,
  }
): Promise<boolean> {
  const duration = EFFECT_DURATIONS[args.effect]

  // Handle instant effects
  if (args.effect === 'nova_burst') {
    // Paint large area around player
    const position = await ctx.db
      .query('positions')
      .withIndex('by_game_and_player', (q: any) =>
        q.eq('gameId', args.gameId).eq('playerId', args.playerId)
      )
      .order('desc')
      .first()

    if (!position) return false

    // Paint in a 5x5 grid around player (50 unit radius)
    const radius = 5
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const gridX = Math.floor((position.x + dx * 10) / 10)
        const gridY = Math.floor((position.y + dy * 10) / 10)
        
        if (gridX >= 0 && gridX < 100 && gridY >= 0 && gridY < 100) {
          // Check if cell exists
          const existing = await ctx.db
            .query('territory')
            .withIndex('by_game_and_position', (q: any) =>
              q.eq('gameId', args.gameId).eq('gridX', gridX).eq('gridY', gridY)
            )
            .unique()

          if (existing) {
            await ctx.db.patch(existing._id, {
              ownerId: args.playerId,
              paintedAt: Date.now(),
            })
          } else {
            await ctx.db.insert('territory', {
              gameId: args.gameId,
              gridX,
              gridY,
              ownerId: args.playerId,
              paintedAt: Date.now(),
            })
          }
        }
      }
    }
    return true
  }

  // Check for existing effect of same type
  const existingEffect = await ctx.db
    .query('playerEffects')
    .withIndex('by_game_and_player', (q: any) =>
      q.eq('gameId', args.gameId).eq('playerId', args.playerId)
    )
    .filter((q: any) => q.eq(q.field('effect'), args.effect))
    .first()

  if (existingEffect) {
    // Extend duration
    await ctx.db.patch(existingEffect._id, {
      expiresAt: Date.now() + duration,
    })
  } else {
    // Create new effect
    const metadata: Record<string, any> = {}
    
    if (args.effect === 'speed_surge') {
      metadata.speedMultiplier = 1.5
    } else if (args.effect === 'hyper_glow') {
      metadata.glowMultiplier = 2
      // Apply immediate glow boost
      await ctx.db.patch(args.gamePlayer._id, {
        glowRadius: Math.min(200, args.gamePlayer.glowRadius * 2),
      })
    }

    await ctx.db.insert('playerEffects', {
      gameId: args.gameId,
      playerId: args.playerId,
      effect: args.effect,
      expiresAt: Date.now() + duration,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    })
  }

  return true
}

export const getActivePowerups = query({
  args: {
    gameId: v.id('games'),
  },
  returns: v.array(
    v.object({
      _id: v.id('powerups'),
      type: v.union(
        v.literal('prism_shield'),
        v.literal('nova_burst'),
        v.literal('shadow_cloak'),
        v.literal('hyper_glow'),
        v.literal('speed_surge'),
      ),
      position: v.object({ x: v.number(), y: v.number() }),
      age: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const powerups = await ctx.db
      .query('powerups')
      .withIndex('by_game', q => q.eq('gameId', args.gameId))
      .collect()

    const now = Date.now()
    return powerups.map(p => ({
      _id: p._id,
      type: p.type,
      position: p.position,
      age: now - p.spawnedAt,
    }))
  },
})

export const getPlayerEffects = query({
  args: {
    gameId: v.id('games'),
    playerId: v.id('players'),
  },
  returns: v.array(
    v.object({
      effect: v.union(
        v.literal('prism_shield'),
        v.literal('nova_burst'),
        v.literal('shadow_cloak'),
        v.literal('hyper_glow'),
        v.literal('speed_surge'),
      ),
      remainingTime: v.number(),
      metadata: v.optional(v.object({
        speedMultiplier: v.optional(v.number()),
        glowMultiplier: v.optional(v.number()),
      })),
    })
  ),
  handler: async (ctx, args) => {
    const effects = await ctx.db
      .query('playerEffects')
      .withIndex('by_game_and_player', (q: any) =>
        q.eq('gameId', args.gameId).eq('playerId', args.playerId)
      )
      .collect()

    const now = Date.now()
    return effects
      .filter(e => e.expiresAt > now)
      .map(e => ({
        effect: e.effect,
        remainingTime: e.expiresAt - now,
        metadata: e.metadata,
      }))
  },
})

export const expireEffects = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const now = Date.now()
    const expiredEffects = await ctx.db
      .query('playerEffects')
      .withIndex('by_expires_at')
      .filter(q => q.lte(q.field('expiresAt'), now))
      .collect()

    let removed = 0
    for (const effect of expiredEffects) {
      // Handle effect removal side effects
      if (effect.effect === 'hyper_glow') {
        // Restore normal glow radius
        const gamePlayer = await ctx.db
          .query('gamePlayers')
          .withIndex('by_game_and_player', q =>
            q.eq('gameId', effect.gameId).eq('playerId', effect.playerId)
          )
          .unique()

        if (gamePlayer && gamePlayer.glowRadius > 100) {
          await ctx.db.patch(gamePlayer._id, {
            glowRadius: Math.max(10, gamePlayer.glowRadius / 2),
          })
        }
      }

      await ctx.db.delete(effect._id)
      removed++
    }

    return removed
  },
})

export const cleanupOldPowerups = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const now = Date.now()
    const oldPowerups = await ctx.db
      .query('powerups')
      .filter(q => q.lte(q.field('spawnedAt'), now - POWERUP_LIFETIME))
      .collect()

    let removed = 0
    for (const powerup of oldPowerups) {
      await ctx.db.delete(powerup._id)
      removed++
    }

    return removed
  },
})

// Helper for testing
export const hasEffect = query({
  args: {
    gameId: v.id('games'),
    playerId: v.id('players'),
    effect: v.union(
      v.literal('prism_shield'),
      v.literal('nova_burst'),
      v.literal('shadow_cloak'),
      v.literal('hyper_glow'),
      v.literal('speed_surge'),
    ),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const now = Date.now()
    const effect = await ctx.db
      .query('playerEffects')
      .withIndex('by_game_and_player', (q: any) =>
        q.eq('gameId', args.gameId).eq('playerId', args.playerId)
      )
      .filter(q => q.eq(q.field('effect'), args.effect))
      .filter(q => q.gt(q.field('expiresAt'), now))
      .first()

    return effect !== null
  },
})