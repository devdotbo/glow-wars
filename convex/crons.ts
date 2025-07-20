import { cronJobs } from 'convex/server'
import { api } from './_generated/api'

const crons = cronJobs()

crons.interval(
  'decay glow for active games',
  { seconds: 30 },
  api.glow.decayAllActiveGames
)

crons.interval(
  'update AI spark behavior',
  { seconds: 1 },
  api.ai.sparks.updateAllSparks
)

crons.interval(
  'check player collisions',
  { milliseconds: 500 },
  api.collision.checkAllActiveGames
)

crons.interval(
  'update AI creeper behavior',
  { seconds: 1 },
  api.ai.creepers.updateAllCreepers
)

crons.interval(
  'expire player effects',
  { seconds: 1 },
  api.powerups.expireEffects
)

crons.interval(
  'cleanup old powerups',
  { seconds: 5 },
  api.powerups.cleanupOldPowerups
)

export default crons