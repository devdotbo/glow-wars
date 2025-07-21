// Game constants shared across all frontends

export const GAME_CONFIG = {
  // Map dimensions
  MAP_WIDTH: 1280,
  MAP_HEIGHT: 720,
  GRID_SIZE: 10, // Size of each territory cell

  // Player settings
  DEFAULT_PLAYER_RADIUS: 20,
  MIN_PLAYER_RADIUS: 10,
  MAX_PLAYER_RADIUS: 100,
  PLAYER_BASE_SPEED: 100, // pixels per second
  BOOST_MULTIPLIER: 1.5,
  BOOST_COST_PER_SECOND: 5, // glow units

  // Glow system
  GLOW_DECAY_RATE: 0.01, // 1% per second
  MIN_GLOW_RADIUS: 30,
  MAX_GLOW_RADIUS: 200,
  PAINTING_SPEED_MULTIPLIER: 0.5, // based on glow radius

  // AI settings
  SPARK_SPEED: 80,
  SPARK_FLEE_SPEED: 120,
  SPARK_DETECTION_RADIUS: 100,
  SPARK_VALUE: 5, // glow units when consumed

  SHADOW_CREEPER_SPEED: 120,
  SHADOW_CREEPER_DAMAGE: 10,
  SHADOW_CREEPER_PATROL_RADIUS: 150,

  // Power-up settings
  POWERUP_DURATION: {
    SHIELD: 5000, // milliseconds
    SPEED: 10000,
    MEGA_GLOW: 10000,
    PHASE: 5000,
    BURST: 0, // instant
  },

  // Game rules
  TERRITORY_WIN_PERCENTAGE: 60,
  MAX_GAME_DURATION: 600000, // 10 minutes
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 8,
} as const

export const PLAYER_COLORS = [
  0x00ff00, // Neon Green
  0xff0066, // Hot Pink
  0x00ccff, // Cyan
  0xffaa00, // Orange
  0xaa00ff, // Purple
  0xffff00, // Yellow
  0xff00ff, // Magenta
  0x00ffaa, // Teal
] as const

export const POWERUP_TYPES = {
  SHIELD: 'shield',
  SPEED: 'speed',
  MEGA_GLOW: 'mega_glow',
  PHASE: 'phase',
  BURST: 'burst',
} as const

export const GAME_STATES = {
  WAITING: 'waiting',
  ACTIVE: 'active',
  FINISHED: 'finished',
} as const

export const AI_ENTITY_TYPES = {
  SPARK: 'spark',
  SHADOW_CREEPER: 'shadow_creeper',
  GLOW_MOTH: 'glow_moth',
} as const