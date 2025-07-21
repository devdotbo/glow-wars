// Core game logic shared across all frontends

import { Position, Player, AIEntity } from '../types/index.js'
import { GAME_CONFIG } from '../constants/index.js'

// Collision detection
export function calculateDistance(pos1: Position, pos2: Position): number {
  const dx = pos1.x - pos2.x
  const dy = pos1.y - pos2.y
  return Math.sqrt(dx * dx + dy * dy)
}

export function checkCollision(
  entity1: { position: Position; radius: number },
  entity2: { position: Position; radius: number }
): boolean {
  const distance = calculateDistance(entity1.position, entity2.position)
  return distance < entity1.radius + entity2.radius
}

// Territory calculations
export function positionToGridCoords(position: Position): { x: number; y: number } {
  return {
    x: Math.floor(position.x / GAME_CONFIG.GRID_SIZE),
    y: Math.floor(position.y / GAME_CONFIG.GRID_SIZE),
  }
}

export function calculateTerritoryPercentage(
  territory: (string | undefined)[][],
  playerId: string
): number {
  let playerCells = 0
  let totalCells = 0

  for (const row of territory) {
    for (const cell of row) {
      totalCells++
      if (cell === playerId) {
        playerCells++
      }
    }
  }

  return totalCells > 0 ? (playerCells / totalCells) * 100 : 0
}

// Movement calculations
export function calculateMovementVector(
  from: Position,
  to: Position,
  speed: number,
  deltaTime: number
): Position {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const distance = Math.sqrt(dx * dx + dy * dy)

  if (distance < 0.01) {
    return { x: 0, y: 0 }
  }

  const normalizedDx = dx / distance
  const normalizedDy = dy / distance
  const moveDistance = speed * (deltaTime / 1000)

  return {
    x: normalizedDx * moveDistance,
    y: normalizedDy * moveDistance,
  }
}

// Glow calculations
export function calculateGlowDecay(currentGlow: number, deltaTime: number): number {
  const decayAmount = currentGlow * GAME_CONFIG.GLOW_DECAY_RATE * (deltaTime / 1000)
  return Math.max(GAME_CONFIG.MIN_GLOW_RADIUS, currentGlow - decayAmount)
}

export function calculatePaintingRadius(glowRadius: number): number {
  return glowRadius * GAME_CONFIG.PAINTING_SPEED_MULTIPLIER
}

// Score calculations
export function calculatePlayerScore(
  territoryPercentage: number,
  eliminations: number,
  powerUpsCollected: number
): number {
  return Math.floor(
    territoryPercentage * 100 + eliminations * 500 + powerUpsCollected * 100
  )
}

// Boundary checks
export function clampPosition(position: Position): Position {
  return {
    x: Math.max(0, Math.min(GAME_CONFIG.MAP_WIDTH, position.x)),
    y: Math.max(0, Math.min(GAME_CONFIG.MAP_HEIGHT, position.y)),
  }
}

export function isInBounds(position: Position): boolean {
  return (
    position.x >= 0 &&
    position.x <= GAME_CONFIG.MAP_WIDTH &&
    position.y >= 0 &&
    position.y <= GAME_CONFIG.MAP_HEIGHT
  )
}