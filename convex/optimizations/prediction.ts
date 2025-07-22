// Client-side prediction helpers for smooth gameplay
// These functions help predict game state on the client before server confirmation

import { Id } from '../_generated/dataModel'

// Constants matching server-side values
const MAP_SIZE = 1000
const COLLISION_DISTANCE = 15
const SIZE_DIFFERENCE_THRESHOLD = 5
const BOUNCE_FORCE = 20
const GRID_SIZE = 10
const MIN_GLOW_RADIUS = 10
const MAX_GLOW_RADIUS = 100

// Player state for prediction
export interface PredictedPlayer {
  playerId: Id<'players'>
  position: { x: number; y: number }
  velocity: { x: number; y: number }
  glowRadius: number
  lastServerUpdate: number
  serverPosition: { x: number; y: number }
}

// Interpolate position between server updates
export function interpolatePosition(
  player: PredictedPlayer,
  currentTime: number,
  speedMultiplier: number = 1
): { x: number; y: number } {
  const deltaTime = (currentTime - player.lastServerUpdate) / 1000 // Convert to seconds
  
  // Apply velocity-based prediction
  const predictedX = player.serverPosition.x + player.velocity.x * deltaTime * speedMultiplier
  const predictedY = player.serverPosition.y + player.velocity.y * deltaTime * speedMultiplier
  
  // Clamp to map bounds
  return {
    x: Math.max(0, Math.min(MAP_SIZE, predictedX)),
    y: Math.max(0, Math.min(MAP_SIZE, predictedY)),
  }
}

// Predict collision between two players
export function predictCollision(
  player1: PredictedPlayer,
  player2: PredictedPlayer,
  currentTime: number
): {
  willCollide: boolean
  timeToCollision?: number
  collisionPoint?: { x: number; y: number }
} {
  // Get current positions
  const pos1 = interpolatePosition(player1, currentTime)
  const pos2 = interpolatePosition(player2, currentTime)
  
  // Calculate distance
  const dx = pos2.x - pos1.x
  const dy = pos2.y - pos1.y
  const distance = Math.sqrt(dx * dx + dy * dy)
  
  // Already colliding?
  if (distance <= COLLISION_DISTANCE) {
    return {
      willCollide: true,
      timeToCollision: 0,
      collisionPoint: {
        x: (pos1.x + pos2.x) / 2,
        y: (pos1.y + pos2.y) / 2,
      },
    }
  }
  
  // Calculate relative velocity
  const dvx = player2.velocity.x - player1.velocity.x
  const dvy = player2.velocity.y - player1.velocity.y
  
  // If moving away from each other, no collision
  const dotProduct = dx * dvx + dy * dvy
  if (dotProduct >= 0) {
    return { willCollide: false }
  }
  
  // Calculate time to collision
  const a = dvx * dvx + dvy * dvy
  if (a === 0) {
    return { willCollide: false } // No relative movement
  }
  
  const b = 2 * (dx * dvx + dy * dvy)
  const c = dx * dx + dy * dy - COLLISION_DISTANCE * COLLISION_DISTANCE
  
  const discriminant = b * b - 4 * a * c
  if (discriminant < 0) {
    return { willCollide: false } // No collision path
  }
  
  const t = (-b - Math.sqrt(discriminant)) / (2 * a)
  if (t < 0 || t > 5) {
    return { willCollide: false } // Collision too far in future
  }
  
  // Calculate collision point
  const collisionPoint = {
    x: pos1.x + player1.velocity.x * t,
    y: pos1.y + player1.velocity.y * t,
  }
  
  return {
    willCollide: true,
    timeToCollision: t,
    collisionPoint,
  }
}

// Predict collision outcome
export function predictCollisionOutcome(
  player1: PredictedPlayer,
  player2: PredictedPlayer
): {
  type: 'elimination' | 'bounce'
  winner?: Id<'players'>
  loser?: Id<'players'>
} {
  const sizeDiff = Math.abs(player1.glowRadius - player2.glowRadius)
  
  if (sizeDiff > SIZE_DIFFERENCE_THRESHOLD) {
    // Elimination
    if (player1.glowRadius > player2.glowRadius) {
      return {
        type: 'elimination',
        winner: player1.playerId,
        loser: player2.playerId,
      }
    } else {
      return {
        type: 'elimination',
        winner: player2.playerId,
        loser: player1.playerId,
      }
    }
  } else {
    // Bounce
    return { type: 'bounce' }
  }
}

// Predict bounce velocities after collision
export function predictBounceVelocities(
  player1: PredictedPlayer,
  player2: PredictedPlayer
): {
  velocity1: { x: number; y: number }
  velocity2: { x: number; y: number }
} {
  const dx = player2.position.x - player1.position.x
  const dy = player2.position.y - player1.position.y
  const distance = Math.sqrt(dx * dx + dy * dy) || 1
  
  const normalX = dx / distance
  const normalY = dy / distance
  
  // Simple bounce: reverse velocities along collision normal
  return {
    velocity1: {
      x: player1.velocity.x - normalX * BOUNCE_FORCE,
      y: player1.velocity.y - normalY * BOUNCE_FORCE,
    },
    velocity2: {
      x: player2.velocity.x + normalX * BOUNCE_FORCE,
      y: player2.velocity.y + normalY * BOUNCE_FORCE,
    },
  }
}

// Predict territory painting
export function predictTerritoryPaint(
  position: { x: number; y: number },
  glowRadius: number
): { gridX: number; gridY: number }[] {
  // Calculate paint radius based on glow
  let paintRadius = 0
  if (glowRadius >= 50) {
    paintRadius = 2
  } else if (glowRadius >= 30) {
    paintRadius = 1
  }
  
  // Convert position to grid coordinates
  const gridX = Math.floor(position.x / GRID_SIZE)
  const gridY = Math.floor(position.y / GRID_SIZE)
  
  const cells = []
  
  // Calculate cells that would be painted
  for (let dx = -paintRadius; dx <= paintRadius; dx++) {
    for (let dy = -paintRadius; dy <= paintRadius; dy++) {
      const cellX = gridX + dx
      const cellY = gridY + dy
      
      // Skip out of bounds
      if (cellX < 0 || cellX >= 100 || cellY < 0 || cellY >= 100) {
        continue
      }
      
      // Skip if outside circular radius
      if (dx * dx + dy * dy > paintRadius * paintRadius) {
        continue
      }
      
      cells.push({ gridX: cellX, gridY: cellY })
    }
  }
  
  return cells
}

// Predict glow decay
export function predictGlowDecay(
  currentGlow: number,
  lastUpdateTime: number,
  currentTime: number,
  decayRate: number = 0.5
): number {
  const timeSinceUpdate = (currentTime - lastUpdateTime) / 1000 // seconds
  const decayIntervals = Math.floor(timeSinceUpdate / 30) // Decay every 30 seconds
  
  let predictedGlow = currentGlow - decayIntervals * decayRate
  return Math.max(MIN_GLOW_RADIUS, Math.min(MAX_GLOW_RADIUS, predictedGlow))
}

// Smooth movement with client reconciliation
export function reconcilePosition(
  clientPosition: { x: number; y: number },
  serverPosition: { x: number; y: number },
  reconciliationRate: number = 0.1
): { x: number; y: number } {
  // Gradually move client position toward server position
  return {
    x: clientPosition.x + (serverPosition.x - clientPosition.x) * reconciliationRate,
    y: clientPosition.y + (serverPosition.y - clientPosition.y) * reconciliationRate,
  }
}

// Predict AI entity movement
export function predictAIMovement(
  entity: {
    position: { x: number; y: number }
    state: string
    targetPosition?: { x: number; y: number }
  },
  deltaTime: number,
  speed: number
): { x: number; y: number } {
  if (!entity.targetPosition || entity.state === 'idle') {
    return entity.position
  }
  
  const dx = entity.targetPosition.x - entity.position.x
  const dy = entity.targetPosition.y - entity.position.y
  const distance = Math.sqrt(dx * dx + dy * dy)
  
  if (distance < 1) {
    return entity.targetPosition
  }
  
  const moveDistance = speed * deltaTime
  const t = Math.min(1, moveDistance / distance)
  
  return {
    x: entity.position.x + dx * t,
    y: entity.position.y + dy * t,
  }
}

// Visibility culling helper
export function isInViewport(
  position: { x: number; y: number },
  viewportCenter: { x: number; y: number },
  viewportSize: { width: number; height: number },
  padding: number = 50
): boolean {
  const halfWidth = viewportSize.width / 2 + padding
  const halfHeight = viewportSize.height / 2 + padding
  
  return (
    position.x >= viewportCenter.x - halfWidth &&
    position.x <= viewportCenter.x + halfWidth &&
    position.y >= viewportCenter.y - halfHeight &&
    position.y <= viewportCenter.y + halfHeight
  )
}

// Batch position updates for network efficiency
export function createPositionBatch(
  updates: Array<{
    playerId: Id<'players'>
    position: { x: number; y: number }
    timestamp: number
  }>,
  maxBatchSize: number = 10,
  maxBatchAge: number = 100 // ms
): Array<Array<typeof updates[0]>> {
  const batches: Array<Array<typeof updates[0]>> = []
  let currentBatch: Array<typeof updates[0]> = []
  let batchStartTime = 0
  
  for (const update of updates) {
    if (currentBatch.length === 0) {
      batchStartTime = update.timestamp
    }
    
    const batchAge = update.timestamp - batchStartTime
    
    if (currentBatch.length >= maxBatchSize || batchAge > maxBatchAge) {
      if (currentBatch.length > 0) {
        batches.push(currentBatch)
        currentBatch = []
      }
    }
    
    currentBatch.push(update)
  }
  
  if (currentBatch.length > 0) {
    batches.push(currentBatch)
  }
  
  return batches
}