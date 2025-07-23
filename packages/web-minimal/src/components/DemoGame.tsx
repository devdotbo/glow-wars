import { useEffect, useRef } from 'react'
import { GlowWarsGame } from '../game/GlowWarsGame'
import { useDemoGameState } from '../hooks/useDemoGameState'

export function DemoGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<GlowWarsGame | null>(null)
  
  // Check for debug mode
  const isDebugMode = new URLSearchParams(window.location.search).get('debug') === 'true'
  
  const {
    gameId,
    playerId,
    playerName,
    playerColor,
    isReady,
    error,
    currentGame,
    gamePlayers,
    playerPositions,
    aiEntities,
    territoryMap,
    updatePosition,
  } = useDemoGameState()
  
  // Initialize PixiJS game when ready
  useEffect(() => {
    if (!canvasRef.current || !isReady || error) return
    if (!currentGame || currentGame.status !== 'active') return
    
    // Prevent double initialization
    if (gameRef.current) {
      console.log('Demo: Game already initialized, skipping...')
      return
    }
    
    console.log('Demo: Initializing PixiJS game...')
    const game = new GlowWarsGame()
    gameRef.current = game
    
    game.init(canvasRef.current).catch((error) => {
      console.error('Demo: Game initialization failed:', error)
    })
    
    return () => {
      console.log('Demo: Cleaning up game instance...')
      if (gameRef.current) {
        gameRef.current.destroy()
        gameRef.current = null
      }
    }
  }, [isReady, error, currentGame])
  
  // Update game data
  useEffect(() => {
    if (!gameRef.current || !isReady || !playerId) return
    
    const gamePlayersWithInfo = gamePlayers.map(gp => ({
      playerId: gp.playerId,
      name: gp.player.name,
      color: gp.player.color,
    }))
    
    gameRef.current.setGameData({
      playerPositions,
      aiEntities,
      territoryMap,
      gamePlayers: gamePlayersWithInfo,
      localPlayerId: playerId,
      onPositionUpdate: updatePosition,
    })
  }, [playerPositions, aiEntities, territoryMap, gamePlayers, playerId, isReady, updatePosition])
  
  // Show error state
  if (error) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0a',
        color: 'white',
        fontFamily: 'monospace',
      }}>
        <h1>Demo Mode Error</h1>
        <p style={{ color: '#ff4444' }}>{error}</p>
        <button 
          onClick={() => window.location.href = '/'}
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            background: '#333',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Back to Menu
        </button>
      </div>
    )
  }
  
  // Show loading state
  if (!isReady || !currentGame || currentGame.status !== 'active') {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0a',
        color: 'white',
        fontFamily: 'monospace',
      }}>
        <h1>Demo Mode</h1>
        <p>Setting up game...</p>
        <p style={{ color: playerColor }}>
          Playing as: {playerName}
        </p>
        {isDebugMode && (
          <div style={{
            marginTop: '20px',
            padding: '10px',
            background: '#1a1a1a',
            borderRadius: '4px',
            fontSize: '12px',
            textAlign: 'left',
          }}>
            <h3>Debug Info:</h3>
            <pre>{JSON.stringify({
              gameId,
              playerId,
              isReady,
              gameStatus: currentGame?.status,
              playerCount: gamePlayers.length,
            }, null, 2)}</pre>
          </div>
        )}
      </div>
    )
  }
  
  // Render game
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
        background: 'rgba(0,0,0,0.7)',
        padding: '10px',
        borderRadius: '4px',
      }}>
        <div>Demo Mode - Single Player</div>
        <div>Playing as: <span style={{ color: playerColor }}>{playerName}</span></div>
        <div>Game ID: {gameId?.slice(-8)}</div>
        <div style={{ marginTop: '5px' }}>
          <a 
            href="/"
            style={{ color: '#4CAF50', textDecoration: 'none' }}
          >
            ← Exit Demo
          </a>
        </div>
      </div>
      
      {isDebugMode && (
        <div style={{
          position: 'absolute',
          bottom: 10,
          left: 10,
          color: 'white',
          fontFamily: 'monospace',
          fontSize: '12px',
          background: 'rgba(0,0,0,0.8)',
          padding: '10px',
          borderRadius: '4px',
          maxWidth: '300px',
        }}>
          <h4 style={{ margin: '0 0 5px 0' }}>Debug Info:</h4>
          <div>Players: {gamePlayers.length}</div>
          <div>AI Entities: {aiEntities.length}</div>
          <div>Territory Cells: {territoryMap.length}</div>
          <div>Position Updates: {playerPositions.length}</div>
        </div>
      )}
    </div>
  )
}