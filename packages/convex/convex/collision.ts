import { mutation } from './_generated/server'
import { v } from 'convex/values'
import { MutationCtx } from './_generated/server'
import { Id } from './_generated/dataModel'
import { api, internal } from './_generated/api'
import { detectCollisionPairs } from './optimizations/spatial'

const COLLISION_DISTANCE = 15
const SIZE_DIFFERENCE_THRESHOLD = 5
const BOUNCE_FORCE = 20
const GLOW_TRANSFER_RATIO = 0.3

interface CollisionPair {
  player1: {
    id: Id<'gamePlayers'>
    playerId: Id<'players'>
    position: { x: number; y: number }
    glowRadius: number
  }
  player2: {
    id: Id<'gamePlayers'>
    playerId: Id<'players'>
    position: { x: number; y: number }
    glowRadius: number
  }
  distance: number
}

export async function detectPlayerCollisions(
  ctx: MutationCtx,
  gameId: Id<'games'>
): Promise<CollisionPair[]> {
  const alivePlayers = await ctx.db
    .query('gamePlayers')
    .withIndex('by_game', q => q.eq('gameId', gameId))
    .filter(q => q.eq(q.field('isAlive'), true))
    .collect()

  // Use spatial partitioning for efficient collision detection
  // Map to expected format for spatial partitioning
  const entities = alivePlayers.map(player => ({
    id: player._id,
    position: player.position,
    glowRadius: player.glowRadius,
    playerId: player.playerId,
  }))
  
  const collisionPairs = detectCollisionPairs(entities, COLLISION_DISTANCE)
  
  // Convert to expected format
  const collisions: CollisionPair[] = collisionPairs.map(pair => ({
    player1: {
      id: pair.entity1.id,
      playerId: (pair.entity1 as any).playerId,
      position: pair.entity1.position,
      glowRadius: (pair.entity1 as any).glowRadius,
    },
    player2: {
      id: pair.entity2.id,
      playerId: (pair.entity2 as any).playerId,
      position: pair.entity2.position,
      glowRadius: (pair.entity2 as any).glowRadius,
    },
    distance: pair.distance,
  }))

  return collisions
}

export async function eliminatePlayer(
  ctx: MutationCtx,
  loserId: Id<'gamePlayers'>,
  winnerId: Id<'gamePlayers'>
): Promise<void> {
  const loser = await ctx.db.get(loserId)
  const winner = await ctx.db.get(winnerId)

  if (!loser || !winner) {
    throw new Error('Player not found')
  }

  await ctx.db.patch(loserId, {
    isAlive: false,
    eliminatedAt: Date.now(),
  })

  const glowTransfer = Math.floor(loser.glowRadius * GLOW_TRANSFER_RATIO)
  await ctx.db.patch(winnerId, {
    glowRadius: Math.min(winner.glowRadius + glowTransfer, 100),
    score: winner.score + 1,
  })
}

export async function applyBounce(
  ctx: MutationCtx,
  player1Id: Id<'gamePlayers'>,
  player2Id: Id<'gamePlayers'>,
  player1Pos: { x: number; y: number },
  player2Pos: { x: number; y: number }
): Promise<void> {
  const dx = player2Pos.x - player1Pos.x
  const dy = player2Pos.y - player1Pos.y
  const distance = Math.sqrt(dx * dx + dy * dy)

  if (distance === 0) {
    await ctx.db.patch(player1Id, {
      position: {
        x: Math.max(0, Math.min(1000, player1Pos.x - BOUNCE_FORCE)),
        y: player1Pos.y,
      },
    })
    await ctx.db.patch(player2Id, {
      position: {
        x: Math.max(0, Math.min(1000, player2Pos.x + BOUNCE_FORCE)),
        y: player2Pos.y,
      },
    })
    return
  }

  const normalX = dx / distance
  const normalY = dy / distance

  await ctx.db.patch(player1Id, {
    position: {
      x: Math.max(0, Math.min(1000, player1Pos.x - normalX * BOUNCE_FORCE)),
      y: Math.max(0, Math.min(1000, player1Pos.y - normalY * BOUNCE_FORCE)),
    },
  })

  await ctx.db.patch(player2Id, {
    position: {
      x: Math.max(0, Math.min(1000, player2Pos.x + normalX * BOUNCE_FORCE)),
      y: Math.max(0, Math.min(1000, player2Pos.y + normalY * BOUNCE_FORCE)),
    },
  })
}

export async function checkCollisionsHelper(
  ctx: MutationCtx,
  args: { gameId: Id<'games'> }
): Promise<{
  collisions: number
  eliminations: number
  bounces: number
}> {
  const collisionPairs = await detectPlayerCollisions(ctx, args.gameId)

  let eliminations = 0
  let bounces = 0

  // Batch fetch all prism shield effects for the game
  const now = Date.now()
  const prismShields = await ctx.db
    .query('playerEffects')
    .withIndex('by_game', q => q.eq('gameId', args.gameId))
    .filter(q => q.eq(q.field('effect'), 'prism_shield'))
    .filter(q => q.gt(q.field('expiresAt'), now))
    .collect()
  
  // Create a map for quick lookup
  const shieldedPlayers = new Set(prismShields.map(e => e.playerId))

  for (const collision of collisionPairs) {
    const sizeDiff = Math.abs(collision.player1.glowRadius - collision.player2.glowRadius)

    if (sizeDiff > SIZE_DIFFERENCE_THRESHOLD) {
      // Check for prism shield effects using cached data
      const player1Shield = shieldedPlayers.has(collision.player1.playerId)
      const player2Shield = shieldedPlayers.has(collision.player2.playerId)

      if (collision.player1.glowRadius > collision.player2.glowRadius) {
        // Player 1 would eliminate Player 2
        if (!player2Shield) {
          await eliminatePlayer(ctx, collision.player2.id, collision.player1.id)
          eliminations++
        } else {
          // Player 2 has shield, just bounce
          await applyBounce(
            ctx,
            collision.player1.id,
            collision.player2.id,
            collision.player1.position,
            collision.player2.position
          )
          bounces++
        }
      } else {
        // Player 2 would eliminate Player 1
        if (!player1Shield) {
          await eliminatePlayer(ctx, collision.player1.id, collision.player2.id)
          eliminations++
        } else {
          // Player 1 has shield, just bounce
          await applyBounce(
            ctx,
            collision.player1.id,
            collision.player2.id,
            collision.player1.position,
            collision.player2.position
          )
          bounces++
        }
      }
    } else {
      await applyBounce(
        ctx,
        collision.player1.id,
        collision.player2.id,
        collision.player1.position,
        collision.player2.position
      )
      bounces++
    }
  }

  // Check for victory conditions if there were eliminations
  if (eliminations > 0) {
    await ctx.runMutation(internal.victory.checkVictoryConditions, {
      gameId: args.gameId,
    })
  }

  return {
    collisions: collisionPairs.length,
    eliminations,
    bounces,
  }
}

export const checkCollisions = mutation({
  args: {
    gameId: v.id('games'),
  },
  returns: v.object({
    collisions: v.number(),
    eliminations: v.number(),
    bounces: v.number(),
  }),
  handler: async (ctx, args) => {
    return await checkCollisionsHelper(ctx, args)
  },
})

export const checkAllActiveGames = mutation({
  args: {},
  returns: v.object({
    gamesChecked: v.number(),
    totalCollisions: v.number(),
    totalEliminations: v.number(),
    totalBounces: v.number(),
  }),
  handler: async (ctx) => {
    const activeGames = await ctx.db
      .query('games')
      .withIndex('by_status', q => q.eq('status', 'active'))
      .collect()

    let gamesChecked = 0
    let totalCollisions = 0
    let totalEliminations = 0
    let totalBounces = 0

    for (const game of activeGames) {
      const result = await checkCollisionsHelper(ctx, { gameId: game._id })
      gamesChecked++
      totalCollisions += result.collisions
      totalEliminations += result.eliminations
      totalBounces += result.bounces
    }

    return {
      gamesChecked,
      totalCollisions,
      totalEliminations,
      totalBounces,
    }
  },
})