import React, { useState } from 'react'
import { useGameState } from '../hooks/useGameState'
import './MenuUI.css'

export function MenuUI() {
  const {
    guestPlayer,
    gameSession,
    currentGame,
    gamePlayers,
    availableGames,
    createGame,
    joinGame,
    leaveGame,
    startGame,
    isCreatingGame,
    isJoiningGame,
    isStartingGame,
  } = useGameState()

  const [maxPlayers, setMaxPlayers] = useState(4)
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null)

  // Loading state while guest player is created
  if (!guestPlayer) {
    return (
      <div className="menu-overlay">
        <div className="menu-container">
          <h1>Glow Wars</h1>
          <div className="loading">Creating guest player...</div>
        </div>
      </div>
    )
  }

  // Show loading if we have a gameId but game data hasn't loaded yet
  if (gameSession.gameId && !currentGame) {
    return (
      <div className="menu-overlay">
        <div className="menu-container">
          <h1>Glow Wars</h1>
          <div className="loading">Loading game...</div>
        </div>
      </div>
    )
  }
  
  // In lobby waiting for game to start
  if (gameSession.gameId && currentGame && currentGame.status === 'waiting') {
    const playerCount = gamePlayers.length
    const canStart = gameSession.isHost && playerCount >= 1
    const isSinglePlayer = playerCount === 1

    return (
      <div className="menu-overlay">
        <div className="menu-container">
          <h1>Game Lobby</h1>
          
          <div className="game-info">
            <h2>{currentGame.name}</h2>
            <p className="game-code" data-testid="game-id">Game ID: {gameSession.gameId.slice(-8)}</p>
            <p data-testid="player-count">Players: {playerCount} / {currentGame.maxPlayers}</p>
            {isSinglePlayer && (
              <p className="game-mode">Single Player Mode - Battle against AI!</p>
            )}
            {!isSinglePlayer && playerCount > 1 && (
              <p className="game-mode">Multiplayer Mode - {playerCount} players</p>
            )}
          </div>

          <div className="player-list" data-testid="players-list">
            <h3>Players in Lobby:</h3>
            {gamePlayers.map((player) => (
              <div key={player.playerId} className="player-item">
                <span className="player-name">
                  {player.playerId === guestPlayer.id ? `${guestPlayer.name} (You)` : 'Player'}
                </span>
                {player.playerId === currentGame.createdBy && (
                  <span className="host-badge">Host</span>
                )}
              </div>
            ))}
          </div>

          <div className="lobby-actions">
            {gameSession.isHost ? (
              <button
                data-testid="start-game-button"
                onClick={() => startGame()}
                disabled={!canStart || isStartingGame}
                className="primary-button"
              >
                {isStartingGame ? 'Starting...' : 
                 isSinglePlayer ? 'Start Solo Game' : 
                 'Start Game'}
              </button>
            ) : (
              <p className="waiting-message">Waiting for host to start...</p>
            )}
            
            <button
              onClick={() => leaveGame()}
              className="secondary-button"
            >
              Leave Game
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Main menu - create or join game
  return (
    <div className="menu-overlay" data-testid="main-menu">
      <div className="menu-container">
        <h1>Glow Wars</h1>
        
        <div className="player-info">
          <div className="player-preview" data-testid="player-preview">
            <div 
              className="player-color-dot" 
              style={{ backgroundColor: guestPlayer.color }}
            />
            <span>{guestPlayer.name}</span>
          </div>
        </div>

        <div className="menu-section">
          <h2>Create New Game</h2>
          <div className="create-game-form">
            <label>
              Max Players:
              <select 
                name="maxPlayers"
                value={maxPlayers} 
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
                className="select-input"
              >
                {[2, 3, 4, 5, 6, 7, 8].map(n => (
                  <option key={n} value={n}>{n} Players</option>
                ))}
              </select>
            </label>
            <button
              data-testid="create-game-button"
              onClick={() => {
                console.log('Create game button clicked, maxPlayers:', maxPlayers)
                createGame(maxPlayers)
              }}
              disabled={isCreatingGame}
              className="primary-button"
            >
              {isCreatingGame ? 'Creating...' : 'Create Game'}
            </button>
          </div>
        </div>

        <div className="menu-divider">OR</div>

        <div className="menu-section">
          <h2>Join Existing Game</h2>
          {availableGames.length === 0 ? (
            <p className="no-games">No games available</p>
          ) : (
            <div className="game-list" data-testid="available-games">
              {availableGames.map((game) => (
                <div
                  key={game._id}
                  className={`game-item ${selectedGameId === game._id ? 'selected' : ''}`}
                  onClick={() => setSelectedGameId(game._id)}
                  data-game-id={game._id.slice(-8)}
                >
                  <div className="game-item-info">
                    <h3>{game.name}</h3>
                    <p>{game.playerCount} / {game.maxPlayers} players</p>
                  </div>
                  <div className="game-item-id">
                    ID: {game._id.slice(-8)}
                  </div>
                </div>
              ))}
              {selectedGameId && (
                <button
                  data-testid="join-game-button"
                  onClick={() => joinGame(selectedGameId as any)}
                  disabled={isJoiningGame}
                  className="primary-button"
                >
                  {isJoiningGame ? 'Joining...' : 'Join Game'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}