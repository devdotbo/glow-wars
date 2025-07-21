import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'
import { api } from './_generated/api'
import schema from './schema'

// Import modules explicitly for convex-test in edge-runtime
const modules = (import.meta as any).glob('./**/*.{js,ts}', {
  eager: false,
})

describe('Glow System', () => {
  test('should decay glow radius over time', async () => {
    const t = convexTest(schema, modules)
    
    // Create players and game
    const player1Id = await t.mutation(api.players.createPlayer, {
      name: 'GlowPlayer1',
      color: '#FF0000',
    })
    
    const player2Id = await t.mutation(api.players.createPlayer, {
      name: 'GlowPlayer2',
      color: '#00FF00',
    })
    
    const gameId = await t.mutation(api.games.createGame, {
      name: 'Glow Test Game',
      maxPlayers: 4,
      mapType: 'standard',
      createdBy: player1Id,
    })
    
    await t.mutation(api.games.joinGame, { gameId, playerId: player2Id })
    await t.mutation(api.games.startGame, { gameId })
    
    // Get initial glow radius
    const initialPlayers = await t.query(api.games.getGamePlayers, { gameId })
    const initialGlow = initialPlayers[0].glowRadius
    expect(initialGlow).toBe(50) // Initial glow radius
    
    // Decay glow
    await t.mutation(api.glow.decayGlow, { gameId })
    
    // Check glow has decreased
    const decayedPlayers = await t.query(api.games.getGamePlayers, { gameId })
    expect(decayedPlayers[0].glowRadius).toBe(49)
    expect(decayedPlayers[1].glowRadius).toBe(49)
  })
  
  test('should enforce minimum glow radius', async () => {
    const t = convexTest(schema, modules)
    
    // Create player and game
    const playerId = await t.mutation(api.players.createPlayer, {
      name: 'MinGlowPlayer',
      color: '#FF0000',
    })
    
    const player2Id = await t.mutation(api.players.createPlayer, {
      name: 'Player2',
      color: '#00FF00',
    })
    
    const gameId = await t.mutation(api.games.createGame, {
      name: 'Min Glow Test',
      maxPlayers: 2,
      mapType: 'standard',
      createdBy: playerId,
    })
    
    await t.mutation(api.games.joinGame, { gameId, playerId: player2Id })
    await t.mutation(api.games.startGame, { gameId })
    
    // Decay glow many times to reach minimum
    for (let i = 0; i < 50; i++) {
      await t.mutation(api.glow.decayGlow, { gameId })
    }
    
    // Check glow is at minimum
    const players = await t.query(api.games.getGamePlayers, { gameId })
    expect(players[0].glowRadius).toBe(10) // MIN_GLOW_RADIUS
  })
  
  test('should consume glow for boost', async () => {
    const t = convexTest(schema, modules)
    
    // Create player and game
    const playerId = await t.mutation(api.players.createPlayer, {
      name: 'BoostPlayer',
      color: '#FF0000',
    })
    
    const player2Id = await t.mutation(api.players.createPlayer, {
      name: 'Player2',
      color: '#00FF00',
    })
    
    const gameId = await t.mutation(api.games.createGame, {
      name: 'Boost Test',
      maxPlayers: 2,
      mapType: 'standard',
      createdBy: playerId,
    })
    
    await t.mutation(api.games.joinGame, { gameId, playerId: player2Id })
    await t.mutation(api.games.startGame, { gameId })
    
    // Get initial glow
    const beforeBoost = await t.query(api.games.getGamePlayers, { gameId })
    const initialGlow = beforeBoost.find(p => p.playerId === playerId)!.glowRadius
    
    // Use boost
    await t.mutation(api.glow.boost, { gameId, playerId })
    
    // Check glow was consumed
    const afterBoost = await t.query(api.games.getGamePlayers, { gameId })
    const boostedPlayer = afterBoost.find(p => p.playerId === playerId)!
    expect(boostedPlayer.glowRadius).toBe(initialGlow - 5) // BOOST_COST
  })
  
  test('should calculate painting speed based on glow', async () => {
    const t = convexTest(schema, modules)
    
    // Create player and game
    const playerId = await t.mutation(api.players.createPlayer, {
      name: 'SpeedPlayer',
      color: '#FF0000',
    })
    
    const gameId = await t.mutation(api.games.createGame, {
      name: 'Speed Test',
      maxPlayers: 2,
      mapType: 'standard',
      createdBy: playerId,
    })
    
    // Get painting speed calculation
    const normalSpeed = await t.query(api.glow.calculatePaintingSpeed, {
      glowRadius: 50,
    })
    
    expect(normalSpeed).toBe(2) // Base radius at 50 glow
    
    // Decay glow to minimum
    const player2Id = await t.mutation(api.players.createPlayer, {
      name: 'Player2',
      color: '#00FF00',
    })
    await t.mutation(api.games.joinGame, { gameId, playerId: player2Id })
    await t.mutation(api.games.startGame, { gameId })
    
    for (let i = 0; i < 50; i++) {
      await t.mutation(api.glow.decayGlow, { gameId })
    }
    
    const minSpeed = await t.query(api.glow.calculatePaintingSpeed, {
      glowRadius: 10,
    })
    
    expect(minSpeed).toBe(0) // No radius at minimum glow
  })
  
  test('should replenish glow from territory ownership', async () => {
    const t = convexTest(schema, modules)
    
    // Create player and game
    const playerId = await t.mutation(api.players.createPlayer, {
      name: 'TerritoryPlayer',
      color: '#FF0000',
    })
    
    const player2Id = await t.mutation(api.players.createPlayer, {
      name: 'Player2',
      color: '#00FF00',
    })
    
    const gameId = await t.mutation(api.games.createGame, {
      name: 'Territory Glow Test',
      maxPlayers: 2,
      mapType: 'standard',
      createdBy: playerId,
    })
    
    await t.mutation(api.games.joinGame, { gameId, playerId: player2Id })
    await t.mutation(api.games.startGame, { gameId })
    
    // Paint some territory
    for (let x = 0; x < 100; x += 10) {
      for (let y = 0; y < 100; y += 10) {
        await t.mutation(api.positions.updatePosition, {
          gameId,
          playerId,
          x,
          y,
        })
      }
    }
    
    // Get initial glow after painting
    const beforeReplenish = await t.query(api.games.getGamePlayers, { gameId })
    const initialGlow = beforeReplenish.find(p => p.playerId === playerId)!.glowRadius
    
    // Replenish glow based on territory
    await t.mutation(api.glow.replenishGlow, { gameId, playerId })
    
    // Check glow increased based on territory ownership
    const afterReplenish = await t.query(api.games.getGamePlayers, { gameId })
    const replenishedPlayer = afterReplenish.find(p => p.playerId === playerId)!
    expect(replenishedPlayer.glowRadius).toBeGreaterThan(initialGlow)
  })
})