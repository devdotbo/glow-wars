// Shared type definitions for Glow Wars

export interface Position {
  x: number
  y: number
}

export interface Player {
  id: string
  name: string
  color: number
  position: Position
  glowRadius: number
  isAlive: boolean
  score: number
  powerUps: ActivePowerUp[]
}

export interface ActivePowerUp {
  type: PowerUpType
  expiresAt: number
}

export type PowerUpType = 'shield' | 'speed' | 'mega_glow' | 'phase' | 'burst'

export interface AIEntity {
  id: string
  type: AIEntityType
  position: Position
  state: string
  targetId?: string
  health: number
}

export type AIEntityType = 'spark' | 'shadow_creeper' | 'glow_moth'

export interface Territory {
  x: number
  y: number
  ownerId?: string
  paintedAt: number
}

export interface GameState {
  id: string
  status: GameStatus
  players: Map<string, Player>
  aiEntities: Map<string, AIEntity>
  territory: Territory[][]
  startedAt?: number
  finishedAt?: number
}

export type GameStatus = 'waiting' | 'active' | 'finished'

export interface GameConfig {
  maxPlayers: number
  mapWidth: number
  mapHeight: number
  gameDuration: number
}

export interface InputState {
  mouseX: number
  mouseY: number
  isBoosting: boolean
  isUsingAbility: boolean
}