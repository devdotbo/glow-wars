import { mutation, MutationCtx } from '../_generated/server'
import { v } from 'convex/values'
import { api, internal } from '../_generated/api'
import { Id } from '../_generated/dataModel'
import { getCachedGameData } from '../optimizations/cache'
import { batchUpdateAIEntities, batchGetTerritoryCells } from '../optimizations/batch'
import { getEntitiesInRange, buildSpatialIndex, findUnpaintedSectors } from '../optimizations/spatial'
import { GameId, PlayerId, GamePlayerData, CachedPlayerData, Position, TerritoryCell, GameMutationCtx } from '../types'

const CREEPER_DETECTION_RADIUS = 100
const CREEPER_SPEED = 3
const CREEPER_HEALTH = 20
const CREEPER_DAMAGE = 10
const CREEPER_CONTACT_DISTANCE = 10
const MAP_SIZE = 1000
const GRID_SIZE = 10

export async function findDarkAreas(
  ctx: GameMutationCtx,
  gameId: GameId
): Promise<Position[]> {
  // Get all painted territories
  const territories = await ctx.db
    .query('territory')
    .withIndex('by_game', (q: any) => q.eq('gameId', gameId))
    .collect()
  
  // Create set of painted cells
  const paintedCells = new Set<string>()
  territories.forEach((t) => {
    paintedCells.add(`${t.gridX},${t.gridY}`)
  })
  
  // Find unpainted cells (sample for performance)
  const darkAreas: Position[] = []
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
  ctx: GameMutationCtx,
  gameId: GameId,
  position: Position,
  cachedPlayers?: CachedPlayerData[],
  territoryMap?: Map<string, TerritoryCell>
): Promise<{ playerId: PlayerId; gamePlayerId: Id<'gamePlayers'>; distance: number; inDarkness: boolean }[]> {
  // Use cached players if provided, otherwise fetch
  let players = cachedPlayers
  if (!players) {
    const gameData = await ctx.runMutation(internal.optimizations.cache.getCachedGameData, {
      gameId,
    })
    players = gameData.alivePlayers
  }
  
  // Build spatial index for efficient range queries
  const spatialIndex = buildSpatialIndex((players || []).map(p => ({
    id: p.gamePlayerId,
    position: p.position,
  })))
  
  // Get players in range using spatial partitioning
  const playersInRange = getEntitiesInRange(position, CREEPER_DETECTION_RADIUS, spatialIndex)
  const playerIdSet = new Set(playersInRange.map(p => p.id))
  
  // If no territory map provided, fetch territories
  if (!territoryMap) {
    const territories = await ctx.db
      .query('territory')
      .withIndex('by_game', (q) => q.eq('gameId', gameId))
      .collect()
    
    territoryMap = new Map<string, TerritoryCell>(
      territories.map((t: any) => [`${t.gridX},${t.gridY}`, t as TerritoryCell])
    )
  }
  
  const nearbyPlayers = []
  
  for (const player of players || []) {
    // Skip players not in range
    if (!playerIdSet.has(player.gamePlayerId)) {
      continue
    }
    
    // Skip cloaked players
    if (player.hasShadowCloak) {
      continue
    }
    
    const dx = player.position.x - position.x
    const dy = player.position.y - position.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    // Check if player is in darkness
    const playerGridX = Math.floor(player.position.x / GRID_SIZE)
    const playerGridY = Math.floor(player.position.y / GRID_SIZE)
    const territoryKey = `${playerGridX},${playerGridY}`
    const inDarkness = !territoryMap.has(territoryKey)
    
    nearbyPlayers.push({
      playerId: player.playerId,
      gamePlayerId: player.gamePlayerId,
      distance,
      inDarkness,
    })
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
  ctx: GameMutationCtx,
  args: { gameId: GameId }
): Promise<{ updated: number; playersHit: number }> {
    // Get all game data in one query
    const gameData = await ctx.runMutation(internal.optimizations.cache.getCachedGameData, {
      gameId: args.gameId,
    })
    
    const creepers = gameData.aiEntities.creepers
    const players = gameData.alivePlayers
    
    // Get all territories once
    const territories = await ctx.db
      .query('territory')
      .withIndex('by_game', (q) => q.eq('gameId', args.gameId))
      .collect()
    
    const territoryMap = new Map<string, TerritoryCell>(
      territories.map((t: any) => [`${t.gridX},${t.gridY}`, t as TerritoryCell])
    )
    
    // Create player lookup map
    const playerMap = new Map(
      players.map((p: CachedPlayerData) => [p.playerId, p])
    )
    
    // Find dark areas once for all creepers
    const darkAreas = await findDarkAreas(ctx, args.gameId)
    
    let playersHit = 0
    const updates: Array<{
      entityId: Id<'aiEntities'>
      position: Position
      state: string
      targetId?: PlayerId
    }> = []
    
    for (const creeper of creepers) {
      // Check if creeper is in painted territory
      const gridX = Math.floor(creeper.position.x / GRID_SIZE)
      const gridY = Math.floor(creeper.position.y / GRID_SIZE)
      const territoryKey = `${gridX},${gridY}`
      const inLight = territoryMap.has(territoryKey)
      
      let newPosition = { ...creeper.position }
      let newState = creeper.state
      let targetId = creeper.targetId
      
      // Detect nearby players with cached data
      const nearbyPlayers = await detectPlayersInDarkness(
        ctx,
        args.gameId,
        creeper.position,
        players,
        territoryMap
      )
      
      // Check for contact damage
      if (nearbyPlayers.length > 0 && nearbyPlayers[0].distance < CREEPER_CONTACT_DISTANCE) {
        const gamePlayer = playerMap.get(nearbyPlayers[0].playerId)
        
        if (gamePlayer && gamePlayer.glowRadius !== undefined && gamePlayer.gamePlayerId !== undefined) {
          // Damage player
          const newGlow = Math.max(10, gamePlayer.glowRadius - CREEPER_DAMAGE)
          await ctx.db.patch(gamePlayer.gamePlayerId, {
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
      if (inLight) {
        // Creeper is in light - must return to darkness
        newState = 'return'
        targetId = undefined
        
        // Use pre-fetched dark areas
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
        
        // Use cached player data
        const gamePlayer = playerMap.get(targetId)
        
        if (gamePlayer && gamePlayer.position !== undefined) {
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
      
      // Collect update for batch processing
      updates.push({
        entityId: creeper.id,
        position: newPosition,
        state: newState,
        targetId: targetId || undefined,
      })
    }
    
    // Batch update all creepers
    let updated = 0
    if (updates.length > 0) {
      const result = await ctx.runMutation(internal.optimizations.batch.batchUpdateAIEntities, {
        updates,
      })
      updated = result.updated
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