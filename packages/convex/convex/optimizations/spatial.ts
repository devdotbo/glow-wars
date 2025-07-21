import { Id } from '../_generated/dataModel'

// Constants for spatial partitioning
const MAP_SIZE = 1000
const SECTOR_SIZE = 100 // 10x10 grid of sectors
const SECTORS_PER_DIMENSION = MAP_SIZE / SECTOR_SIZE

interface Entity {
  id: Id<'gamePlayers'> | Id<'aiEntities'>
  position: { x: number; y: number }
  radius?: number
}

interface Sector {
  x: number
  y: number
  entities: Entity[]
}

// Convert world position to sector coordinates
export function positionToSector(x: number, y: number): { sectorX: number; sectorY: number } {
  const sectorX = Math.floor(x / SECTOR_SIZE)
  const sectorY = Math.floor(y / SECTOR_SIZE)
  
  return {
    sectorX: Math.max(0, Math.min(SECTORS_PER_DIMENSION - 1, sectorX)),
    sectorY: Math.max(0, Math.min(SECTORS_PER_DIMENSION - 1, sectorY)),
  }
}

// Get all sectors that an entity with given radius might overlap
export function getOverlappingSectors(
  position: { x: number; y: number },
  radius: number = 0
): { sectorX: number; sectorY: number }[] {
  const minX = position.x - radius
  const maxX = position.x + radius
  const minY = position.y - radius
  const maxY = position.y + radius
  
  const minSector = positionToSector(minX, minY)
  const maxSector = positionToSector(maxX, maxY)
  
  const sectors = []
  for (let x = minSector.sectorX; x <= maxSector.sectorX; x++) {
    for (let y = minSector.sectorY; y <= maxSector.sectorY; y++) {
      sectors.push({ sectorX: x, sectorY: y })
    }
  }
  
  return sectors
}

// Build spatial index from entities
export function buildSpatialIndex<T extends Entity>(entities: T[]): Map<string, T[]> {
  const sectorMap = new Map<string, T[]>()
  
  for (const entity of entities) {
    // Use the radius if provided, otherwise default to 0 for collision radius calculation
    const radius = entity.radius !== undefined ? entity.radius : 0
    const sectors = getOverlappingSectors(entity.position, radius)
    
    for (const sector of sectors) {
      const key = `${sector.sectorX},${sector.sectorY}`
      const sectorEntities = sectorMap.get(key) || []
      sectorEntities.push(entity)
      sectorMap.set(key, sectorEntities)
    }
  }
  
  return sectorMap
}

// Get potential collision candidates for an entity
export function getPotentialCollisions<T extends Entity>(
  entity: Entity,
  spatialIndex: Map<string, T[]>,
  maxDistance: number
): T[] {
  const sectors = getOverlappingSectors(entity.position, maxDistance)
  const candidates = new Set<T>()
  
  for (const sector of sectors) {
    const key = `${sector.sectorX},${sector.sectorY}`
    const sectorEntities = spatialIndex.get(key) || []
    
    for (const candidate of sectorEntities) {
      // Don't check entity against itself
      if (candidate.id !== entity.id) {
        candidates.add(candidate)
      }
    }
  }
  
  return Array.from(candidates)
}

// Get entities within range of a position
export function getEntitiesInRange<T extends Entity>(
  position: { x: number; y: number },
  range: number,
  spatialIndex: Map<string, T[]>
): T[] {
  const sectors = getOverlappingSectors(position, range)
  const candidates = new Set<T>()
  
  for (const sector of sectors) {
    const key = `${sector.sectorX},${sector.sectorY}`
    const sectorEntities = spatialIndex.get(key) || []
    
    for (const entity of sectorEntities) {
      const dx = entity.position.x - position.x
      const dy = entity.position.y - position.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance <= range) {
        candidates.add(entity)
      }
    }
  }
  
  return Array.from(candidates)
}

// Optimized collision pair detection
export interface CollisionPair<T extends Entity> {
  entity1: T
  entity2: T
  distance: number
}

export function detectCollisionPairs<T extends Entity>(
  entities: T[],
  collisionDistance: number
): CollisionPair<T>[] {
  const spatialIndex = buildSpatialIndex(entities)
  const collisions: CollisionPair<T>[] = []
  const checkedPairs = new Set<string>()
  
  for (const entity of entities) {
    const candidates = getPotentialCollisions(entity, spatialIndex, collisionDistance)
    
    for (const candidate of candidates) {
      // Create a unique key for this pair (order-independent)
      const pairKey = entity.id < candidate.id 
        ? `${entity.id}-${candidate.id}`
        : `${candidate.id}-${entity.id}`
      
      // Skip if we've already checked this pair
      if (checkedPairs.has(pairKey)) {
        continue
      }
      checkedPairs.add(pairKey)
      
      // Calculate actual distance
      const dx = entity.position.x - candidate.position.x
      const dy = entity.position.y - candidate.position.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance <= collisionDistance) {
        collisions.push({
          entity1: entity,
          entity2: candidate,
          distance,
        })
      }
    }
  }
  
  return collisions
}

// Helper to find entities in unpainted areas (for creeper spawning)
export function findUnpaintedSectors(
  paintedPositions: { gridX: number; gridY: number }[]
): { sectorX: number; sectorY: number }[] {
  const paintedSectors = new Set<string>()
  
  // Mark all sectors that contain painted cells
  for (const pos of paintedPositions) {
    // Convert grid coordinates to world position then to sector
    const worldX = pos.gridX * 10 + 5 // Center of grid cell
    const worldY = pos.gridY * 10 + 5
    const sector = positionToSector(worldX, worldY)
    paintedSectors.add(`${sector.sectorX},${sector.sectorY}`)
  }
  
  // Find all unpainted sectors
  const unpaintedSectors = []
  for (let x = 0; x < SECTORS_PER_DIMENSION; x++) {
    for (let y = 0; y < SECTORS_PER_DIMENSION; y++) {
      const key = `${x},${y}`
      if (!paintedSectors.has(key)) {
        unpaintedSectors.push({ sectorX: x, sectorY: y })
      }
    }
  }
  
  return unpaintedSectors
}