import { mutation } from '../_generated/server'
import { v } from 'convex/values'
import { api } from '../_generated/api'

const CREEPER_DETECTION_RADIUS = 100
const CREEPER_SPEED = 3
const CREEPER_HEALTH = 20
const CREEPER_DAMAGE = 10
const CREEPER_CONTACT_DISTANCE = 10
const MAP_SIZE = 1000
const GRID_SIZE = 10

export async function findDarkAreas(
  ctx: any,
  gameId: any
): Promise<{ x: number; y: number }[]> {
  // Get all painted territories
  const territories = await ctx.db
    .query('territory')
    .withIndex('by_game', (q: any) => q.eq('gameId', gameId))
    .collect()
  
  // Create set of painted cells
  const paintedCells = new Set<string>()
  territories.forEach((t: any) => {
    paintedCells.add(`${t.gridX},${t.gridY}`)
  })
  
  // Find unpainted cells (sample for performance)
  const darkAreas: { x: number; y: number }[] = []
  const SAMPLE_RATE = 10 // Sample every 10th cell
  
  for (let gridX = 0; gridX < 100; gridX += SAMPLE_RATE) {
    for (let gridY = 0; gridY < 100; gridY += SAMPLE_RATE) {
      if (!paintedCells.has(`${gridX},${gridY}`)) {
        // Convert grid to world coordinates (center of cell)
        darkAreas.push({
          x: gridX * GRID_SIZE + GRID_SIZE / 2,
          y: gridY * GRID_SIZE + GRID_SIZE / 2,
        })
      }
    }
  }
  
  return darkAreas
}

export async function detectPlayersInDarkness(
  ctx: any,
  gameId: any,
  position: { x: number; y: number }
): Promise<{ playerId: any; distance: number; inDarkness: boolean }[]> {
  const gamePlayers = await ctx.db
    .query('gamePlayers')
    .withIndex('by_game', (q: any) => q.eq('gameId', gameId))
    .filter((q: any) => q.eq(q.field('isAlive'), true))
    .collect()
  
  const nearbyPlayers = []
  
  for (const player of gamePlayers) {
    // Check if player has shadow cloak effect
    const cloakEffect = await ctx.db
      .query('playerEffects')
      .withIndex('by_game_and_player', (q: any) =>
        q.eq('gameId', gameId).eq('playerId', player.playerId)
      )
      .filter((q: any) => q.eq(q.field('effect'), 'shadow_cloak'))
      .filter((q: any) => q.gt(q.field('expiresAt'), Date.now()))
      .first()
    
    // Skip cloaked players
    if (cloakEffect) {
      continue
    }
    
    const dx = player.position.x - position.x
    const dy = player.position.y - position.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    if (distance <= CREEPER_DETECTION_RADIUS) {
      // Check if player is in darkness
      const playerGridX = Math.floor(player.position.x / GRID_SIZE)
      const playerGridY = Math.floor(player.position.y / GRID_SIZE)
      
      const territory = await ctx.db
        .query('territory')
        .withIndex('by_game_and_position', (q: any) =>
          q.eq('gameId', gameId).eq('gridX', playerGridX).eq('gridY', playerGridY)
        )
        .first()
      
      nearbyPlayers.push({
        playerId: player.playerId,
        distance,
        inDarkness: !territory,
      })
    }
  }
  
  return nearbyPlayers.sort((a, b) => a.distance - b.distance)
}

export const spawnCreepers = mutation({
  args: {
    gameId: v.id('games'),
    count: v.optional(v.number()),
    nearPosition: v.optional(v.object({ x: v.number(), y: v.number() })),
  },
  returns: v.array(v.id('aiEntities')),
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId)
    if (!game) {
      throw new Error('Game not found')
    }
    
    if (game.status !== 'active') {
      throw new Error('Game is not active')
    }
    
    const creeperCount = args.count || 3
    const entityIds = []
    
    // Find dark areas to spawn in
    const darkAreas = await findDarkAreas(ctx, args.gameId)
    
    if (darkAreas.length === 0) {
      throw new Error('No dark areas available for spawning')
    }
    
    for (let i = 0; i < creeperCount; i++) {
      let position
      
      if (args.nearPosition) {
        // Spawn near specified position (for testing)
        position = {
          x: args.nearPosition.x + (Math.random() - 0.5) * 20,
          y: args.nearPosition.y + (Math.random() - 0.5) * 20,
        }
      } else {
        // Pick random dark area
        const darkArea = darkAreas[Math.floor(Math.random() * darkAreas.length)]
        position = {
          x: darkArea.x + (Math.random() - 0.5) * GRID_SIZE,
          y: darkArea.y + (Math.random() - 0.5) * GRID_SIZE,
        }
      }
      
      // Ensure within bounds
      position.x = Math.max(10, Math.min(MAP_SIZE - 10, position.x))
      position.y = Math.max(10, Math.min(MAP_SIZE - 10, position.y))
      
      const entityId = await ctx.db.insert('aiEntities', {
        gameId: args.gameId,
        type: 'creeper',
        position,
        state: 'patrol',
        targetId: undefined,
        health: CREEPER_HEALTH,
      })
      
      entityIds.push(entityId)
    }
    
    return entityIds
  },
})

export async function updateCreeperBehaviorHelper(
  ctx: any,
  args: { gameId: any }
): Promise<{ updated: number; playersHit: number }> {
    const creepers = await ctx.db
      .query('aiEntities')
      .withIndex('by_game_and_type', (q: any) =>
        q.eq('gameId', args.gameId).eq('type', 'creeper')
      )
      .collect()
    
    let updated = 0
    let playersHit = 0
    
    for (const creeper of creepers) {
      // Check if creeper is in painted territory
      const gridX = Math.floor(creeper.position.x / GRID_SIZE)
      const gridY = Math.floor(creeper.position.y / GRID_SIZE)
      
      const territory = await ctx.db
        .query('territory')
        .withIndex('by_game_and_position', (q: any) =>
          q.eq('gameId', args.gameId).eq('gridX', gridX).eq('gridY', gridY)
        )
        .first()
      
      let newPosition = { ...creeper.position }
      let newState = creeper.state
      let targetId = creeper.targetId
      
      // Detect nearby players
      const nearbyPlayers = await detectPlayersInDarkness(ctx, args.gameId, creeper.position)
      
      // Check for contact damage
      if (nearbyPlayers.length > 0 && nearbyPlayers[0].distance < CREEPER_CONTACT_DISTANCE) {
        const gamePlayer = await ctx.db
          .query('gamePlayers')
          .withIndex('by_game_and_player', (q: any) =>
            q.eq('gameId', args.gameId).eq('playerId', nearbyPlayers[0].playerId)
          )
          .unique()
        
        if (gamePlayer && gamePlayer.isAlive) {
          // Damage player
          const newGlow = Math.max(10, gamePlayer.glowRadius - CREEPER_DAMAGE)
          await ctx.db.patch(gamePlayer._id, {
            glowRadius: newGlow,
          })
          playersHit++
          
          // 20% chance to spawn a power-up when damaging a player
          if (Math.random() < 0.2) {
            await ctx.scheduler.runAfter(0, api.powerups.spawnPowerup, {
              gameId: args.gameId,
              position: creeper.position,
            })
          }
        }
      }
      
      // State machine logic
      if (territory) {
        // Creeper is in light - must return to darkness
        newState = 'return'
        targetId = undefined
        
        // Find nearest dark area
        const darkAreas = await findDarkAreas(ctx, args.gameId)
        if (darkAreas.length > 0) {
          // Find closest dark area
          let closestDark = darkAreas[0]
          let minDist = Number.MAX_VALUE
          
          for (const dark of darkAreas) {
            const dx = dark.x - creeper.position.x
            const dy = dark.y - creeper.position.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < minDist) {
              minDist = dist
              closestDark = dark
            }
          }
          
          // Move towards darkness
          const dx = closestDark.x - creeper.position.x
          const dy = closestDark.y - creeper.position.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          if (distance > 0) {
            const moveX = (dx / distance) * CREEPER_SPEED
            const moveY = (dy / distance) * CREEPER_SPEED
            
            newPosition.x = creeper.position.x + moveX
            newPosition.y = creeper.position.y + moveY
          }
        }
      } else if (nearbyPlayers.length > 0 && nearbyPlayers[0].inDarkness) {
        // Hunt player in darkness
        newState = 'hunt'
        targetId = nearbyPlayers[0].playerId
        
        const gamePlayer = await ctx.db
          .query('gamePlayers')
          .withIndex('by_game_and_player', (q: any) =>
            q.eq('gameId', args.gameId).eq('playerId', targetId)
          )
          .unique()
        
        if (gamePlayer) {
          const dx = gamePlayer.position.x - creeper.position.x
          const dy = gamePlayer.position.y - creeper.position.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          if (distance > 0) {
            const moveX = (dx / distance) * CREEPER_SPEED
            const moveY = (dy / distance) * CREEPER_SPEED
            
            newPosition.x = creeper.position.x + moveX
            newPosition.y = creeper.position.y + moveY
          }
        }
      } else {
        // Patrol in darkness
        newState = 'patrol'
        targetId = undefined
        
        // Random movement
        const angle = Math.random() * Math.PI * 2
        const moveX = Math.cos(angle) * CREEPER_SPEED
        const moveY = Math.sin(angle) * CREEPER_SPEED
        
        newPosition.x = creeper.position.x + moveX
        newPosition.y = creeper.position.y + moveY
      }
      
      // Ensure within bounds
      newPosition.x = Math.max(10, Math.min(MAP_SIZE - 10, newPosition.x))
      newPosition.y = Math.max(10, Math.min(MAP_SIZE - 10, newPosition.y))
      
      await ctx.db.patch(creeper._id, {
        position: newPosition,
        state: newState,
        targetId,
      })
      
      updated++
    }
    
    return { updated, playersHit }
}

export const updateCreeperBehavior = mutation({
  args: {
    gameId: v.id('games'),
  },
  returns: v.object({
    updated: v.number(),
    playersHit: v.number(),
  }),
  handler: async (ctx, args) => {
    return await updateCreeperBehaviorHelper(ctx, args)
  },
})

export const updateAllCreepers = mutation({
  args: {},
  returns: v.object({
    gamesUpdated: v.number(),
    totalUpdated: v.number(),
    totalPlayersHit: v.number(),
  }),
  handler: async (ctx) => {
    const activeGames = await ctx.db
      .query('games')
      .withIndex('by_status', q => q.eq('status', 'active'))
      .collect()
    
    let gamesUpdated = 0
    let totalUpdated = 0
    let totalPlayersHit = 0
    
    for (const game of activeGames) {
      const result = await updateCreeperBehaviorHelper(ctx, { gameId: game._id })
      if (result.updated > 0 || result.playersHit > 0) {
        gamesUpdated++
        totalUpdated += result.updated
        totalPlayersHit += result.playersHit
      }
    }
    
    return { gamesUpdated, totalUpdated, totalPlayersHit }
  },
})