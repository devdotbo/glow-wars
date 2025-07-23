import { useEffect, useState, useRef } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '@glow-wars/convex/_generated/api'
import { Id } from '@glow-wars/convex/_generated/dataModel'
import { useConvex } from 'convex/react'

interface DemoGameState {
  gameId: Id<'games'> | null
  playerId: Id<'players'> | null
  playerName: string
  playerColor: string
  isHost: boolean
  isReady: boolean
  error: string | null
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
  const sat = 70 + Math.floor(Math.random() * 30)
  const light = 50 + Math.floor(Math.random() * 20)
  
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

export function useDemoGameState() {
  const convex = useConvex()
  const hasInitialized = useRef(false)
  const [state, setState] = useState<DemoGameState>({
    gameId: null,
    playerId: null,
    playerName: generateGuestName(),
    playerColor: generateRandomColor(),
    isHost: true,
    isReady: false,
    error: null,
  })
  
  // Create player and game on mount
  useEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true
    
    const initDemo = async () => {
      try {
        console.log('Demo: Creating player:', state.playerName)
        
        // Create player
        const playerId = await convex.mutation(api.players.createPlayer, {
          name: state.playerName,
          color: state.playerColor,
        })
        
        console.log('Demo: Player created:', playerId)
        
        // Create game
        const gameId = await convex.mutation(api.games.createGame, {
          name: `${state.playerName}'s Demo`,
          maxPlayers: 2,
          mapType: 'standard',
          createdBy: playerId,
        })
        
        console.log('Demo: Game created:', gameId)
        
        // Update state
        setState(prev => ({
          ...prev,
          playerId,
          gameId,
        }))
        
        // Start game immediately
        setTimeout(async () => {
          try {
            console.log('Demo: Starting game:', gameId)
            await convex.mutation(api.games.startGame, { gameId })
            setState(prev => ({ ...prev, isReady: true }))
          } catch (error) {
            console.error('Demo: Failed to start game:', error)
            setState(prev => ({ ...prev, error: 'Failed to start game' }))
          }
        }, 1000)
        
      } catch (error) {
        console.error('Demo: Initialization failed:', error)
        setState(prev => ({ ...prev, error: String(error) }))
      }
    }
    
    initDemo()
  }, [convex, state.playerName, state.playerColor])
  
  // Query current game
  const { data: currentGame } = useQuery({
    ...convexQuery(api.games.getGame, { gameId: state.gameId || '' }),
    enabled: !!state.gameId,
  })
  
  // Query game players
  const { data: gamePlayers = [] } = useQuery({
    ...convexQuery(api.games.getGamePlayersWithInfo, { gameId: state.gameId || '' }),
    enabled: !!state.gameId,
  })
  
  // Query player positions
  const { data: playerPositions = [] } = useQuery({
    ...convexQuery(api.positions.streamPositions, { gameId: state.gameId || '' }),
    enabled: !!state.gameId && state.isReady,
    refetchInterval: 250, // Reduced from 100ms
  })
  
  // Query AI entities
  const { data: aiEntities = [] } = useQuery({
    ...convexQuery(api.ai.entities.getEntities, { gameId: state.gameId || '' }),
    enabled: !!state.gameId && state.isReady,
    refetchInterval: 500, // Reduced from 200ms
  })
  
  // Query territory map
  const { data: territoryMap = [] } = useQuery({
    ...convexQuery(api.territory.getTerritoryMap, { gameId: state.gameId || '' }),
    enabled: !!state.gameId && state.isReady,
    refetchInterval: 1000, // Reduced from 500ms
  })
  
  // Position update mutation
  const updatePositionMutation = useMutation({
    mutationFn: async ({ x, y }: { x: number; y: number }) => {
      if (!state.gameId || !state.playerId) {
        throw new Error('Not in game')
      }
      
      await convex.mutation(api.positions.updatePosition, {
        gameId: state.gameId,
        playerId: state.playerId,
        x,
        y,
      })
    },
  })
  
  return {
    // State
    gameId: state.gameId,
    playerId: state.playerId,
    playerName: state.playerName,
    playerColor: state.playerColor,
    isReady: state.isReady,
    error: state.error,
    
    // Game data
    currentGame,
    gamePlayers,
    playerPositions,
    aiEntities,
    territoryMap,
    
    // Actions
    updatePosition: updatePositionMutation.mutate,
  }
}