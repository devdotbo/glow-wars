import { Id } from './_generated/dataModel'
import { MutationCtx, QueryCtx } from './_generated/server'

// Type aliases for better clarity
export type GameId = Id<'games'>
export type PlayerId = Id<'players'>
export type GameMutationCtx = MutationCtx
export type GameQueryCtx = QueryCtx

// Position type
export interface Position {
  x: number
  y: number
}

// Territory Cell type
export interface TerritoryCell {
  gridX: number
  gridY: number
  ownerId?: Id<'players'>
  paintedAt: number
}

// Game Player with all fields
export interface GamePlayerData {
  gamePlayerId: Id<'gamePlayers'>  // Added this field
  _id: Id<'gamePlayers'>
  gameId: Id<'games'>
  playerId: Id<'players'>
  position: { x: number; y: number }
  glowRadius: number
  isAlive: boolean
  score: number
  joinedAt?: number
  eliminatedAt?: number
  hasShadowCloak?: boolean  // For powerup effects
}

// Simplified cached player data (from cache.ts)
export interface CachedPlayerData {
  playerId: Id<'players'>
  gamePlayerId: Id<'gamePlayers'>
  position: { x: number; y: number }
  glowRadius: number
  hasShadowCloak: boolean
}

// Territory data
export interface TerritoryData {
  _id: Id<'territory'>
  gameId: Id<'games'>
  gridX: number
  gridY: number
  ownerId?: Id<'players'>
  paintedAt: number
}

// AI Entity data
export interface AIEntityData {
  _id: Id<'aiEntities'>
  gameId: Id<'games'>
  type: 'spark' | 'shadow_creeper' | 'glow_moth'
  position: { x: number; y: number }
  velocity: { x: number; y: number }
  health?: number
  targetPlayerId?: Id<'players'>
  lastActionTime?: number
  state?: any
}

// Player Effect data
export interface PlayerEffectData {
  _id: Id<'playerEffects'>
  gameId: Id<'games'>
  playerId: Id<'players'>
  effect: 'prism_shield' | 'nova_burst' | 'shadow_cloak' | 'hyper_glow' | 'speed_surge'
  appliedAt: number
  expiresAt: number
  metadata?: {
    speedMultiplier?: number
    glowMultiplier?: number
  }
}

// Powerup data
export interface PowerupData {
  _id: Id<'powerups'>
  gameId: Id<'games'>
  type: 'prism_shield' | 'nova_burst' | 'shadow_cloak' | 'hyper_glow' | 'speed_surge'
  position: { x: number; y: number }
  spawnedAt: number
  collected?: boolean
  collectedBy?: Id<'players'>
  collectedAt?: number
}

// Player data
export interface PlayerData {
  _id: Id<'players'>
  name: string
  color: string
  createdAt: number
}

// Game data
export interface GameData {
  _id: Id<'games'>
  name: string
  status: 'waiting' | 'active' | 'finished'
  maxPlayers: number
  mapType: string
  createdBy?: Id<'players'>
  timeLimit?: number
  startedAt?: number
  finishedAt?: number
  winnerId?: Id<'players'>
  winCondition?: 'territory' | 'elimination' | 'time_limit'
}