import { cronJobs } from 'convex/server'
import { api, internal } from './_generated/api'

const crons = cronJobs()

// Use smart scheduling for performance-critical operations
crons.interval(
  'smart collision detection',
  { seconds: 1 }, // Reduced frequency, smart scheduler will skip idle games
  internal.optimizations.scheduler.smartCheckCollisions
)

crons.interval(
  'smart AI spark updates',
  { seconds: 2 }, // Reduced frequency
  internal.optimizations.scheduler.smartUpdateAI,
  { entityType: 'spark' }
)

crons.interval(
  'smart AI creeper updates',
  { seconds: 2 }, // Reduced frequency
  internal.optimizations.scheduler.smartUpdateAI,
  { entityType: 'creeper' }
)

crons.interval(
  'smart glow decay',
  { seconds: 30 },
  internal.optimizations.scheduler.smartDecayGlow
)

// Keep regular scheduling for less performance-critical operations
crons.interval(
  'expire player effects',
  { seconds: 2 }, // Slightly reduced frequency
  api.powerups.expireEffects
)

crons.interval(
  'cleanup old powerups',
  { seconds: 10 }, // Reduced frequency
  api.powerups.cleanupOldPowerups
)

crons.interval(
  'check victory conditions',
  { seconds: 5 },
  internal.victory.checkAllActiveGames
)

// Add data cleanup job
crons.interval(
  'cleanup old data',
  { hours: 1 }, // Run hourly
  internal.optimizations.cleanup.runCleanup,
  { cleanupTypes: ['positions', 'finishedGames'] }
)

export default crons