import { Doc, Id } from './_generated/dataModel'
import { QueryCtx, MutationCtx } from './_generated/server'

// Re-export common types for convenience
export type GameId = Id<'games'>
export type PlayerId = Id<'players'>
export type GamePlayerId = Id<'gamePlayers'>
export type AIEntityId = Id<'aiEntities'>
export type PowerupId = Id<'powerups'>

// Game entity types
export interface Position {
  x: number
  y: number
}

export interface GamePlayerData {
  playerId: PlayerId
  gamePlayerId: GamePlayerId
  position: Position
  glowRadius: number
  hasShadowCloak: boolean
  isAlive?: boolean
}

export interface AIEntityData {
  id: AIEntityId
  type: 'creeper' | 'spark'
  position: Position
  state: string
  targetId?: PlayerId
  health: number
}

export interface TerritoryCell {
  gridX: number
  gridY: number
  ownerId?: PlayerId
  paintedAt: number
}

// Helper type for game data cache
export interface CachedGameData {
  game: Doc<'games'>
  alivePlayers: GamePlayerData[]
  aiEntities: {
    creepers: AIEntityData[]
    sparks: AIEntityData[]
  }
}

// Context types
export type GameQueryCtx = QueryCtx
export type GameMutationCtx = MutationCtx