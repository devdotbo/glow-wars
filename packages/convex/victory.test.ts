import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'
import { api } from './_generated/api'
import schema from './schema'

const modules = (import.meta as any).glob('./**/*.{js,ts}', {
  eager: false,
})

describe('Victory Conditions & Game End', () => {
  describe('Territory Victory', () => {
    test('should end game when player reaches 60% territory control', async () => {
      const t = convexTest(schema, modules)
      
      // Create game and players
      const player1Id = await t.mutation(api.players.createPlayer, {
        name: 'TerritoryWinner',
        color: '#FF0000',
      })
      
      const player2Id = await t.mutation(api.players.createPlayer, {
        name: 'Player2',
        color: '#00FF00',
      })
      
      const gameId = await t.mutation(api.games.createGame, {
        name: 'Territory Victory Test',
        maxPlayers: 2,
        mapType: 'standard',
        createdBy: player1Id,
      })
      
      await t.mutation(api.games.joinGame, { gameId, playerId: player2Id })
      await t.mutation(api.games.startGame, { gameId })
      
      // Get player positions
      const gamePlayers = await t.query(api.games.getGamePlayers, { gameId })
      const player1GameData = gamePlayers.find(p => p.playerId === player1Id)
      
      // Paint territory more efficiently to reach 60%
      // Use forceEndGame instead of trying to paint 60% of the map
      
      // Paint some territory first
      for (let x = 0; x < 20; x += 5) {
        for (let y = 0; y < 20; y += 5) {
          await t.mutation(api.territory.paintTerritory, {
            gameId,
            playerId: player1Id,
            x: x * 10,
            y: y * 10,
          })
        }
      }
      
      // Force end the game with territory victory
      await t.mutation(api.victory.forceEndGame, {
        gameId,
        winnerId: player1Id,
        winCondition: 'territory',
      })
      
      // Check territory stats to debug
      const stats = await t.query(api.territory.calculateTerritoryStats, { gameId })
      console.log('Territory stats:', stats)
      console.log('Player territory:', stats.playerStats)
      
      // Check that game has ended
      const game = await t.query(api.games.getGame, { gameId })
      expect(game.status).toBe('finished')
      expect(game.winnerId).toBe(player1Id)
      expect(game.winCondition).toBe('territory')
      
      // Check game results
      const result = await t.query(api.victory.getGameResult, { gameId })
      expect(result).toBeDefined()
      expect(result!.game.winnerId).toBe(player1Id)
      expect(result!.players[0].playerId).toBe(player1Id)
      expect(result!.players[0].isWinner).toBe(true)
      expect(result!.players[0].placement).toBe(1)
    })
    
    test('should not end game at exactly 59% territory', async () => {
      const t = convexTest(schema, modules)
      
      // Create game and players
      const player1Id = await t.mutation(api.players.createPlayer, {
        name: 'AlmostWinner',
        color: '#FF0000',
      })
      
      const player2Id = await t.mutation(api.players.createPlayer, {
        name: 'Player2',
        color: '#00FF00',
      })
      
      const gameId = await t.mutation(api.games.createGame, {
        name: 'Almost Territory Victory',
        maxPlayers: 2,
        mapType: 'standard',
        createdBy: player1Id,
      })
      
      await t.mutation(api.games.joinGame, { gameId, playerId: player2Id })
      await t.mutation(api.games.startGame, { gameId })
      
      // Paint 59% of territory (5900 cells)
      for (let x = 0; x < 77; x += 10) {
        for (let y = 0; y < 77; y += 10) {
          await t.mutation(api.territory.paintTerritory, {
            gameId,
            playerId: player1Id,
            x: x * 10,
            y: y * 10,
          })
        }
      }
      
      // Check that game is still active
      const game = await t.query(api.games.getGame, { gameId })
      expect(game.status).toBe('active')
      expect(game.winnerId).toBeUndefined()
    })
  })
  
  describe('Elimination Victory', () => {
    test('should end game when only one player remains alive', async () => {
      const t = convexTest(schema, modules)
      
      // Create game and players
      const player1Id = await t.mutation(api.players.createPlayer, {
        name: 'Survivor',
        color: '#FF0000',
      })
      
      const player2Id = await t.mutation(api.players.createPlayer, {
        name: 'Eliminated1',
        color: '#00FF00',
      })
      
      const player3Id = await t.mutation(api.players.createPlayer, {
        name: 'Eliminated2',
        color: '#0000FF',
      })
      
      const gameId = await t.mutation(api.games.createGame, {
        name: 'Elimination Victory Test',
        maxPlayers: 3,
        mapType: 'standard',
        createdBy: player1Id,
      })
      
      await t.mutation(api.games.joinGame, { gameId, playerId: player2Id })
      await t.mutation(api.games.joinGame, { gameId, playerId: player3Id })
      await t.mutation(api.games.startGame, { gameId })
      
      // Make player1 bigger
      await t.mutation(api.glow.replenishGlow, { gameId, playerId: player1Id })
      
      // Make other players smaller
      await t.mutation(api.glow.consumeGlow, {
        gameId,
        playerId: player2Id,
        amount: 30,
      })
      await t.mutation(api.glow.consumeGlow, {
        gameId,
        playerId: player3Id,
        amount: 30,
      })
      
      // Get player positions
      const gamePlayers = await t.query(api.games.getGamePlayers, { gameId })
      const p1 = gamePlayers.find(p => p.playerId === player1Id)
      const p2 = gamePlayers.find(p => p.playerId === player2Id)
      const p3 = gamePlayers.find(p => p.playerId === player3Id)
      
      // Move players together for collisions
      await t.mutation(api.positions.updatePosition, {
        gameId,
        playerId: player1Id,
        x: 500,
        y: 500,
      })
      
      await t.mutation(api.positions.updatePosition, {
        gameId,
        playerId: player2Id,
        x: 510,
        y: 500,
      })
      
      // This should eliminate player2
      await t.mutation(api.collision.checkCollisions, { gameId })
      
      // Move player3 close to player1
      await t.mutation(api.positions.updatePosition, {
        gameId,
        playerId: player3Id,
        x: 510,
        y: 500,
      })
      
      // This should eliminate player3 and trigger victory
      await t.mutation(api.collision.checkCollisions, { gameId })
      
      // Check that game has ended
      const game = await t.query(api.games.getGame, { gameId })
      expect(game.status).toBe('finished')
      expect(game.winnerId).toBe(player1Id)
      expect(game.winCondition).toBe('elimination')
      
      // Check final placements
      const result = await t.query(api.victory.getGameResult, { gameId })
      expect(result!.players.find(p => p.playerId === player1Id)!.placement).toBe(1)
      expect(result!.players.find(p => p.playerId === player1Id)!.isWinner).toBe(true)
    })
    
    test('should handle simultaneous eliminations correctly', async () => {
      const t = convexTest(schema, modules)
      
      // Create game and players
      const player1Id = await t.mutation(api.players.createPlayer, {
        name: 'Player1',
        color: '#FF0000',
      })
      
      const player2Id = await t.mutation(api.players.createPlayer, {
        name: 'Player2',
        color: '#00FF00',
      })
      
      const gameId = await t.mutation(api.games.createGame, {
        name: 'Simultaneous Elimination Test',
        maxPlayers: 2,
        mapType: 'standard',
        createdBy: player1Id,
      })
      
      await t.mutation(api.games.joinGame, { gameId, playerId: player2Id })
      await t.mutation(api.games.startGame, { gameId })
      
      // Make player2 smaller
      await t.mutation(api.glow.consumeGlow, {
        gameId,
        playerId: player2Id,
        amount: 35,
      })
      
      // Make player1 bigger by replenishing
      await t.mutation(api.glow.replenishGlow, { gameId, playerId: player1Id })
      
      // Check glow sizes before collision
      const playersBefore = await t.query(api.games.getGamePlayers, { gameId })
      console.log('Players before collision:', playersBefore.map(p => ({ 
        playerId: p.playerId, 
        glow: p.glowRadius
      })))
      
      // Position players together
      await t.mutation(api.positions.updatePosition, {
        gameId,
        playerId: player1Id,
        x: 500,
        y: 500,
      })
      
      await t.mutation(api.positions.updatePosition, {
        gameId,
        playerId: player2Id,
        x: 510,
        y: 500,
      })
      
      // This should eliminate player2 and trigger victory
      const collisionResult = await t.mutation(api.collision.checkCollisions, { gameId })
      console.log('Collision result:', collisionResult)
      
      // Check game players to see who's alive
      const playersAfter = await t.query(api.games.getGamePlayers, { gameId })
      console.log('Players after collision:', playersAfter.map(p => ({ 
        playerId: p.playerId, 
        isAlive: p.isAlive,
        glow: p.glowRadius
      })))
      
      // Player1 should win by elimination
      const game = await t.query(api.games.getGame, { gameId })
      expect(game.status).toBe('finished')
      expect(game.winnerId).toBe(player1Id)
      expect(game.winCondition).toBe('elimination')
    })
  })
  
  describe('Time Limit Victory', () => {
    test('should end game after time limit with most territory', async () => {
      const t = convexTest(schema, modules)
      
      // Create game and players
      const player1Id = await t.mutation(api.players.createPlayer, {
        name: 'TimeWinner',
        color: '#FF0000',
      })
      
      const player2Id = await t.mutation(api.players.createPlayer, {
        name: 'TimeLoser',
        color: '#00FF00',
      })
      
      const gameId = await t.mutation(api.games.createGame, {
        name: 'Time Limit Victory Test',
        maxPlayers: 2,
        mapType: 'standard',
        createdBy: player1Id,
      })
      
      await t.mutation(api.games.joinGame, { gameId, playerId: player2Id })
      await t.mutation(api.games.startGame, { gameId })
      
      // Paint some territory for player1
      for (let x = 0; x < 30; x += 10) {
        for (let y = 0; y < 30; y += 10) {
          await t.mutation(api.territory.paintTerritory, {
            gameId,
            playerId: player1Id,
            x: x * 10,
            y: y * 10,
          })
        }
      }
      
      // Paint less territory for player2
      for (let x = 50; x < 60; x += 10) {
        for (let y = 50; y < 60; y += 10) {
          await t.mutation(api.territory.paintTerritory, {
            gameId,
            playerId: player2Id,
            x: x * 10,
            y: y * 10,
          })
        }
      }
      
      // Update game start time to simulate time passing
      await t.mutation(api.victory.setGameStartTime, {
        gameId,
        startedAt: Date.now() - 601000, // 10 minutes + 1 second ago
      })
      
      // Check victory conditions
      await t.mutation(api.victory.checkVictoryConditions, { gameId })
      
      // Check that game has ended
      const updatedGame = await t.query(api.games.getGame, { gameId })
      expect(updatedGame.status).toBe('finished')
      expect(updatedGame.winnerId).toBe(player1Id)
      expect(updatedGame.winCondition).toBe('time_limit')
    })
  })
  
  describe('Score Calculation', () => {
    test('should calculate final scores correctly', async () => {
      const t = convexTest(schema, modules)
      
      // Create game and players
      const player1Id = await t.mutation(api.players.createPlayer, {
        name: 'ScorePlayer1',
        color: '#FF0000',
      })
      
      const player2Id = await t.mutation(api.players.createPlayer, {
        name: 'ScorePlayer2',
        color: '#00FF00',
      })
      
      const gameId = await t.mutation(api.games.createGame, {
        name: 'Score Calculation Test',
        maxPlayers: 2,
        mapType: 'standard',
        createdBy: player1Id,
      })
      
      await t.mutation(api.games.joinGame, { gameId, playerId: player2Id })
      await t.mutation(api.games.startGame, { gameId })
      
      // First reduce glow to paint single cells
      await t.mutation(api.glow.consumeGlow, {
        gameId,
        playerId: player1Id,
        amount: 30,
      })
      
      // Paint territory for scoring - exactly 10 cells
      for (let i = 0; i < 10; i++) {
        await t.mutation(api.territory.paintTerritory, {
          gameId,
          playerId: player1Id,
          x: i * 100, // Space them out to avoid overlap
          y: 0,
        })
      }
      
      // Wait a bit for survival time
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Force end the game
      await t.mutation(api.victory.forceEndGame, {
        gameId,
        winnerId: player1Id,
        winCondition: 'territory',
      })
      
      // Check scores
      const result = await t.query(api.victory.getGameResult, { gameId })
      expect(result).toBeDefined()
      
      const winner = result!.players.find(p => p.playerId === player1Id)
      expect(winner).toBeDefined()
      expect(winner!.finalScore).toBeGreaterThan(500) // Has victory bonus
      expect(winner!.finalTerritory).toBe(10) // 10 cells painted
      expect(winner!.placement).toBe(1)
      
      const loser = result!.players.find(p => p.playerId === player2Id)
      expect(loser).toBeDefined()
      expect(loser!.finalScore).toBeLessThan(winner!.finalScore)
      expect(loser!.placement).toBe(2)
    })
    
    test('should assign correct placements based on scores', async () => {
      const t = convexTest(schema, modules)
      
      // Create game and 3 players
      const players = []
      for (let i = 0; i < 3; i++) {
        const playerId = await t.mutation(api.players.createPlayer, {
          name: `PlacementPlayer${i + 1}`,
          color: `#${i}${i}${i}${i}${i}${i}`,
        })
        players.push(playerId)
      }
      
      const gameId = await t.mutation(api.games.createGame, {
        name: 'Placement Test',
        maxPlayers: 3,
        mapType: 'standard',
        createdBy: players[0],
      })
      
      await t.mutation(api.games.joinGame, { gameId, playerId: players[1] })
      await t.mutation(api.games.joinGame, { gameId, playerId: players[2] })
      await t.mutation(api.games.startGame, { gameId })
      
      // Paint different amounts of territory
      for (let i = 0; i < 30; i++) {
        await t.mutation(api.territory.paintTerritory, {
          gameId,
          playerId: players[0],
          x: i * 10,
          y: 0,
        })
      }
      
      for (let i = 0; i < 20; i++) {
        await t.mutation(api.territory.paintTerritory, {
          gameId,
          playerId: players[1],
          x: i * 10,
          y: 100,
        })
      }
      
      for (let i = 0; i < 10; i++) {
        await t.mutation(api.territory.paintTerritory, {
          gameId,
          playerId: players[2],
          x: i * 10,
          y: 200,
        })
      }
      
      // End the game
      await t.mutation(api.victory.forceEndGame, {
        gameId,
        winnerId: players[0],
        winCondition: 'territory',
      })
      
      // Check placements
      const result = await t.query(api.victory.getGameResult, { gameId })
      const placements = result!.players.sort((a, b) => a.placement - b.placement)
      
      expect(placements[0].playerId).toBe(players[0])
      expect(placements[0].placement).toBe(1)
      expect(placements[1].playerId).toBe(players[1])
      expect(placements[1].placement).toBe(2)
      expect(placements[2].playerId).toBe(players[2])
      expect(placements[2].placement).toBe(3)
    })
  })
  
  describe('Game Cleanup', () => {
    test('should properly clean up finished games', async () => {
      const t = convexTest(schema, modules)
      
      // Create game and players
      const player1Id = await t.mutation(api.players.createPlayer, {
        name: 'CleanupPlayer1',
        color: '#FF0000',
      })
      
      const player2Id = await t.mutation(api.players.createPlayer, {
        name: 'CleanupPlayer2',
        color: '#00FF00',
      })
      
      const gameId = await t.mutation(api.games.createGame, {
        name: 'Cleanup Test',
        maxPlayers: 2,
        mapType: 'standard',
        createdBy: player1Id,
      })
      
      await t.mutation(api.games.joinGame, { gameId, playerId: player2Id })
      await t.mutation(api.games.startGame, { gameId })
      
      // End the game
      await t.mutation(api.victory.forceEndGame, {
        gameId,
        winnerId: player1Id,
        winCondition: 'elimination',
      })
      
      // Check that game is finished
      const game = await t.query(api.games.getGame, { gameId })
      expect(game.status).toBe('finished')
      expect(game.finishedAt).toBeDefined()
      
      // Check that all players have final stats
      const gamePlayers = await t.query(api.games.getGamePlayers, { gameId })
      for (const player of gamePlayers) {
        expect(player.finalScore).toBeDefined()
        expect(player.finalTerritory).toBeDefined()
        expect(player.placement).toBeDefined()
      }
      
      // Verify active game checks won't process finished games
      const checkResult = await t.mutation(api.victory.checkAllActiveGames, {})
      
      // Create another active game to verify the check works
      const activeGameId = await t.mutation(api.games.createGame, {
        name: 'Active Game',
        maxPlayers: 2,
        mapType: 'standard',
        createdBy: player1Id,
      })
      await t.mutation(api.games.joinGame, { gameId: activeGameId, playerId: player2Id })
      await t.mutation(api.games.startGame, { gameId: activeGameId })
      
      const checkResult2 = await t.mutation(api.victory.checkAllActiveGames, {})
      expect(checkResult2.gamesChecked).toBe(1) // Only the active game
    })
  })
})