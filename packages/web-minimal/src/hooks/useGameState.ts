import { useEffect, useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '@glow-wars/convex/_generated/api'
import { Id } from '@glow-wars/convex/_generated/dataModel'
import { useConvex } from 'convex/react'

interface GuestPlayer {
  id: Id<'players'>
  name: string
  color: string
}

interface GameSession {
  gameId: Id<'games'> | null
  playerId: Id<'players'> | null
  isHost: boolean
}

// Generate random guest name
function generateGuestName(): string {
  const adjectives = ['Swift', 'Bright', 'Shadow', 'Neon', 'Cosmic', 'Quantum', 'Plasma', 'Void']
  const nouns = ['Player', 'Glow', 'Hunter', 'Seeker', 'Runner', 'Striker', 'Ghost', 'Spark']
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  const num = Math.floor(Math.random() * 999)
  return `${adj}${noun}${num}`
}

// Generate random hex color
function generateRandomColor(): string {
  const hue = Math.floor(Math.random() * 360)
  const sat = 70 + Math.floor(Math.random() * 30) // 70-100% saturation
  const light = 50 + Math.floor(Math.random() * 20) // 50-70% lightness
  
  // Convert HSL to hex
  const h = hue / 60
  const c = (1 - Math.abs(2 * light / 100 - 1)) * sat / 100
  const x = c * (1 - Math.abs(h % 2 - 1))
  const m = light / 100 - c / 2
  
  let r, g, b
  if (h < 1) { r = c; g = x; b = 0 }
  else if (h < 2) { r = x; g = c; b = 0 }
  else if (h < 3) { r = 0; g = c; b = x }
  else if (h < 4) { r = 0; g = x; b = c }
  else if (h < 5) { r = x; g = 0; b = c }
  else { r = c; g = 0; b = x }
  
  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function useGameState() {
  const convex = useConvex()
  const [guestPlayer, setGuestPlayer] = useState<GuestPlayer | null>(null)
  const [gameSession, setGameSession] = useState<GameSession>({
    gameId: null,
    playerId: null,
    isHost: false,
  })

  // Create guest player on mount
  useEffect(() => {
    const createGuest = async () => {
      if (!guestPlayer) {
        const name = generateGuestName()
        const color = generateRandomColor()
        
        try {
          const playerId = await convex.mutation(api.players.createPlayer, {
            name,
            color,
          })
          
          setGuestPlayer({
            id: playerId,
            name,
            color,
          })
          
          setGameSession(prev => ({ ...prev, playerId }))
        } catch (error) {
          // If name collision, try again with different name
          console.error('Failed to create guest player:', error)
          setTimeout(createGuest, 100)
        }
      }
    }
    
    createGuest()
  }, [convex, guestPlayer])

  // Query available games
  const { data: availableGames = [] } = useQuery(
    convexQuery(api.games.listAvailableGames, {})
  )

  // Query current game if in one
  const { data: currentGame } = useQuery(
    convexQuery(api.games.getGame, 
      gameSession.gameId ? { gameId: gameSession.gameId } : 'skip'
    )
  )

  // Query game players if in game
  const { data: gamePlayers = [] } = useQuery(
    convexQuery(api.games.getGamePlayers,
      gameSession.gameId ? { gameId: gameSession.gameId } : 'skip'
    )
  )

  // Create game mutation
  const createGameMutation = useMutation({
    mutationFn: async (maxPlayers: number) => {
      if (!guestPlayer) throw new Error('No guest player')
      
      const gameId = await convex.mutation(api.games.createGame, {
        name: `${guestPlayer.name}'s Game`,
        maxPlayers,
        mapType: 'standard',
        createdBy: guestPlayer.id,
      })
      
      setGameSession({
        gameId,
        playerId: guestPlayer.id,
        isHost: true,
      })
      
      return gameId
    },
  })

  // Join game mutation
  const joinGameMutation = useMutation({
    mutationFn: async (gameId: Id<'games'>) => {
      if (!guestPlayer) throw new Error('No guest player')
      
      await convex.mutation(api.games.joinGame, {
        gameId,
        playerId: guestPlayer.id,
      })
      
      setGameSession({
        gameId,
        playerId: guestPlayer.id,
        isHost: false,
      })
    },
  })

  // Leave game mutation
  const leaveGameMutation = useMutation({
    mutationFn: async () => {
      if (!gameSession.gameId || !gameSession.playerId) return
      
      await convex.mutation(api.games.leaveGame, {
        gameId: gameSession.gameId,
        playerId: gameSession.playerId,
      })
      
      setGameSession({
        gameId: null,
        playerId: gameSession.playerId,
        isHost: false,
      })
    },
  })

  // Start game mutation (host only)
  const startGameMutation = useMutation({
    mutationFn: async () => {
      if (!gameSession.gameId || !gameSession.isHost) {
        throw new Error('Only host can start game')
      }
      
      await convex.mutation(api.games.startGame, {
        gameId: gameSession.gameId,
      })
    },
  })

  return {
    // Player info
    guestPlayer,
    
    // Game session
    gameSession,
    currentGame,
    gamePlayers,
    
    // Available games
    availableGames,
    
    // Actions
    createGame: createGameMutation.mutate,
    joinGame: joinGameMutation.mutate,
    leaveGame: leaveGameMutation.mutate,
    startGame: startGameMutation.mutate,
    
    // Loading states
    isCreatingGame: createGameMutation.isPending,
    isJoiningGame: joinGameMutation.isPending,
    isStartingGame: startGameMutation.isPending,
  }
}