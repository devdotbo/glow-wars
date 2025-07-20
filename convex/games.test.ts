import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'
import { api } from './_generated/api'
import schema from './schema'

// Import modules explicitly for convex-test in edge-runtime
const modules = import.meta.glob('./**/*.{js,ts}', {
  eager: false,
})

describe('Game Session Management', () => {
  test('should create a game with valid configuration', async () => {
    const t = convexTest(schema, modules)
    // Create a player first
    const playerId = await t.mutation(api.players.createPlayer, {
      name: 'GameCreator',
      color: '#FF0000',
    })

    // Create a game
    const gameId = await t.mutation(api.games.createGame, {
      name: 'Test Game',
      maxPlayers: 4,
      mapType: 'standard',
      createdBy: playerId,
    })

    expect(gameId).toBeDefined()

    // Verify game was created correctly
    const game = await t.query(api.games.getGame, { gameId })
    expect(game).not.toBeNull()
    expect(game).toMatchObject({
      name: 'Test Game',
      status: 'waiting',
      maxPlayers: 4,
      mapType: 'standard',
      createdBy: playerId,
    })
    expect(game?.startedAt).toBeUndefined()
    expect(game?.finishedAt).toBeUndefined()
  })

  test('should join game as player', async () => {
    const t = convexTest(schema, modules)
    // Create players
    const player1Id = await t.mutation(api.players.createPlayer, {
      name: 'Player1',
      color: '#00FF00',
    })
    const player2Id = await t.mutation(api.players.createPlayer, {
      name: 'Player2',
      color: '#0000FF',
    })

    // Create game
    const gameId = await t.mutation(api.games.createGame, {
      name: 'Join Test Game',
      maxPlayers: 4,
      mapType: 'standard',
      createdBy: player1Id,
    })

    // Player 1 should be automatically joined as creator
    const initialPlayers = await t.query(api.games.getGamePlayers, { gameId })
    expect(initialPlayers).toHaveLength(1)
    expect(initialPlayers[0].playerId).toBe(player1Id)

    // Player 2 joins
    await t.mutation(api.games.joinGame, {
      gameId,
      playerId: player2Id,
    })

    // Verify both players are in the game
    const players = await t.query(api.games.getGamePlayers, { gameId })
    expect(players).toHaveLength(2)
    expect(players.map(p => p.playerId)).toContain(player1Id)
    expect(players.map(p => p.playerId)).toContain(player2Id)

    // Verify player 2 has initial position and stats
    const player2InGame = players.find(p => p.playerId === player2Id)
    expect(player2InGame).toBeDefined()
    expect(player2InGame).toMatchObject({
      gameId,
      playerId: player2Id,
      glowRadius: 50, // Initial glow radius
      isAlive: true,
      score: 0,
    })
    expect(player2InGame?.position).toHaveProperty('x')
    expect(player2InGame?.position).toHaveProperty('y')
  })

  test('should prevent joining full games', async () => {
    const t = convexTest(schema, modules)
    // Create players
    const players = await Promise.all(
      Array.from({ length: 3 }, (_, i) =>
        t.mutation(api.players.createPlayer, {
          name: `FullGamePlayer${i}`,
          color: `#${i}${i}${i}${i}${i}${i}`,
        })
      )
    )

    // Create game with max 2 players
    const gameId = await t.mutation(api.games.createGame, {
      name: 'Full Game',
      maxPlayers: 2,
      mapType: 'small',
      createdBy: players[0],
    })

    // Second player joins successfully
    await t.mutation(api.games.joinGame, {
      gameId,
      playerId: players[1],
    })

    // Third player should fail to join
    await expect(
      t.mutation(api.games.joinGame, {
        gameId,
        playerId: players[2],
      })
    ).rejects.toThrow('Game is full')
  })

  test('should start game with minimum players', async () => {
    const t = convexTest(schema, modules)
    // Create players
    const player1Id = await t.mutation(api.players.createPlayer, {
      name: 'StartPlayer1',
      color: '#FF00FF',
    })
    const player2Id = await t.mutation(api.players.createPlayer, {
      name: 'StartPlayer2',
      color: '#00FFFF',
    })

    // Create game
    const gameId = await t.mutation(api.games.createGame, {
      name: 'Start Test Game',
      maxPlayers: 4,
      mapType: 'standard',
      createdBy: player1Id,
    })

    // Try to start with only one player (should fail)
    await expect(
      t.mutation(api.games.startGame, { gameId })
    ).rejects.toThrow('Minimum 2 players required')

    // Second player joins
    await t.mutation(api.games.joinGame, {
      gameId,
      playerId: player2Id,
    })

    // Now start should succeed
    await t.mutation(api.games.startGame, { gameId })

    // Verify game status changed
    const game = await t.query(api.games.getGame, { gameId })
    expect(game).not.toBeNull()
    expect(game?.status).toBe('active')
    expect(game?.startedAt).toBeDefined()
  })

  test('should handle player leaving game', async () => {
    const t = convexTest(schema, modules)
    // Create players
    const player1Id = await t.mutation(api.players.createPlayer, {
      name: 'LeavePlayer1',
      color: '#FFFF00',
    })
    const player2Id = await t.mutation(api.players.createPlayer, {
      name: 'LeavePlayer2',
      color: '#FF00FF',
    })

    // Create game
    const gameId = await t.mutation(api.games.createGame, {
      name: 'Leave Test Game',
      maxPlayers: 4,
      mapType: 'standard',
      createdBy: player1Id,
    })

    // Second player joins
    await t.mutation(api.games.joinGame, {
      gameId,
      playerId: player2Id,
    })

    // Player 2 leaves
    await t.mutation(api.games.leaveGame, {
      gameId,
      playerId: player2Id,
    })

    // Verify player 2 is no longer in game
    const players = await t.query(api.games.getGamePlayers, { gameId })
    expect(players).toHaveLength(1)
    expect(players[0].playerId).toBe(player1Id)

    // If creator leaves a waiting game, it should be deleted
    await t.mutation(api.games.leaveGame, {
      gameId,
      playerId: player1Id,
    })

    // Game should no longer exist
    const game = await t.query(api.games.getGame, { gameId })
    expect(game).toBeNull()
  })
})

describe('Game Queries', () => {
  test('should list available games', async () => {
    const t = convexTest(schema, modules)

    // Create players
    const player1Id = await t.mutation(api.players.createPlayer, {
      name: 'ListPlayer1',
      color: '#111111',
    })
    const player2Id = await t.mutation(api.players.createPlayer, {
      name: 'ListPlayer2',
      color: '#222222',
    })

    // Create waiting game
    const waitingGameId = await t.mutation(api.games.createGame, {
      name: 'Waiting Game',
      maxPlayers: 4,
      mapType: 'standard',
      createdBy: player1Id,
    })

    // Create active game
    const activeGameId = await t.mutation(api.games.createGame, {
      name: 'Active Game',
      maxPlayers: 2,
      mapType: 'small',
      createdBy: player1Id,
    })
    await t.mutation(api.games.joinGame, {
      gameId: activeGameId,
      playerId: player2Id,
    })
    await t.mutation(api.games.startGame, { gameId: activeGameId })

    // List available games (should only show waiting games)
    const availableGames = await t.query(api.games.listAvailableGames)
    expect(availableGames).toHaveLength(1)
    expect(availableGames[0]).toMatchObject({
      _id: waitingGameId,
      name: 'Waiting Game',
      status: 'waiting',
      playerCount: 1,
      maxPlayers: 4,
    })
  })
})