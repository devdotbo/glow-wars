import { useEffect, useRef } from 'react'
import { GlowWarsGame } from './game/GlowWarsGame'
import { createConvexClients } from '@glow-wars/shared/convex-api'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConvexProvider } from 'convex/react'
import { useGameState } from './hooks/useGameState'
import { MenuUI } from './ui/MenuUI'

// Initialize Convex clients
const convexUrl = import.meta.env.VITE_CONVEX_URL
if (!convexUrl) {
  throw new Error('VITE_CONVEX_URL is not defined')
}

const { convexClient, queryClient, convexQueryClient } = createConvexClients(convexUrl)

export function App() {
  return (
    <ConvexProvider client={convexClient}>
      <QueryClientProvider client={queryClient}>
        <GameContainer />
      </QueryClientProvider>
    </ConvexProvider>
  )
}

function GameContainer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<GlowWarsGame | null>(null)
  const { currentGame, gameSession } = useGameState()

  // Check if we should show the game or menu
  const isInActiveGame = currentGame && currentGame.status === 'active' && gameSession.gameId

  useEffect(() => {
    if (!canvasRef.current || !isInActiveGame) {
      // Cleanup game if we're not in active game
      if (gameRef.current) {
        gameRef.current.destroy()
        gameRef.current = null
      }
      return
    }

    // Initialize the game when entering active game
    const game = new GlowWarsGame()
    gameRef.current = game

    game.init(canvasRef.current).catch(console.error)

    // Cleanup on unmount or when leaving game
    return () => {
      game.destroy()
      gameRef.current = null
    }
  }, [isInActiveGame])

  // Show menu if not in active game
  if (!isInActiveGame) {
    return <MenuUI />
  }

  // Show game canvas
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0a0a0a' }}>
      <canvas ref={canvasRef} />
      <div style={{ 
        position: 'absolute', 
        top: 10, 
        left: 10, 
        color: 'white',
        fontFamily: 'monospace',
        fontSize: '14px',
        background: 'rgba(0,0,0,0.5)',
        padding: '5px',
        borderRadius: '4px'
      }}>
        Game ID: {gameSession.gameId?.slice(-8)}
      </div>
    </div>
  )
}