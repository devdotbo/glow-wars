import { useEffect, useRef } from 'react'
import { GlowWarsGame } from './game/GlowWarsGame'
import { createConvexClients } from '@glow-wars/shared/convex-api'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConvexProvider } from 'convex/react'

// Initialize Convex clients
const convexUrl = import.meta.env.VITE_CONVEX_URL
if (!convexUrl) {
  throw new Error('VITE_CONVEX_URL is not defined')
}

const { convexClient, queryClient } = createConvexClients(convexUrl)

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

  useEffect(() => {
    if (!canvasRef.current) return

    // Initialize the game
    const game = new GlowWarsGame()
    gameRef.current = game

    game.init(canvasRef.current).catch(console.error)

    // Cleanup on unmount
    return () => {
      game.destroy()
    }
  }, [])

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0a0a0a' }}>
      <canvas ref={canvasRef} />
    </div>
  )
}