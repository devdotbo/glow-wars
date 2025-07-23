import { Container } from 'pixi.js'
import { Id } from '@glow-wars/convex/_generated/dataModel'
import { Player } from './entities/Player'
import { Spark } from './entities/Spark'
import { ShadowCreeper } from './entities/ShadowCreeper'

interface PlayerData {
  playerId: Id<'players'>
  x: number
  y: number
  glowRadius: number
  isAlive: boolean
}

interface AIEntityData {
  _id: Id<'aiEntities'>
  type: string
  position: { x: number; y: number }
  state: string
  targetId?: Id<'players'>
  health: number
}

interface PlayerInfo {
  id: Id<'players'>
  name: string
  color: string
}

export class EntityManager {
  private players = new Map<string, Player>()
  private aiEntities = new Map<string, Spark | ShadowCreeper>()
  private entitiesLayer: Container
  private playersInfo = new Map<string, PlayerInfo>()

  constructor(entitiesLayer: Container) {
    this.entitiesLayer = entitiesLayer
  }

  setPlayersInfo(players: Array<{ playerId: Id<'players'>; name: string; color: string }>) {
    this.playersInfo.clear()
    players.forEach(p => {
      this.playersInfo.set(p.playerId, {
        id: p.playerId,
        name: p.name,
        color: p.color,
      })
    })
  }

  updatePlayers(playerData: PlayerData[]) {
    // Create a set of current player IDs
    const currentIds = new Set(playerData.map(p => p.playerId))
    
    // Remove players that no longer exist
    for (const [id, player] of this.players) {
      if (!currentIds.has(id as Id<'players'>)) {
        player.destroy()
        this.players.delete(id)
      }
    }
    
    // Update or create players
    for (const data of playerData) {
      let player = this.players.get(data.playerId)
      
      if (!player) {
        // Create new player
        const playerInfo = this.playersInfo.get(data.playerId)
        if (!playerInfo) continue // Skip if we don't have player info yet
        
        player = new Player({
          id: data.playerId,
          name: playerInfo.name,
          color: playerInfo.color,
          x: data.x,
          y: data.y,
          glowRadius: data.glowRadius,
        })
        
        this.entitiesLayer.addChild(player.container)
        this.players.set(data.playerId, player)
      }
      
      // Update player state
      player.updatePosition(data.x, data.y)
      player.setGlowRadius(data.glowRadius)
      player.setAlive(data.isAlive)
    }
  }

  updateAIEntities(entityData: AIEntityData[]) {
    // Create a set of current entity IDs
    const currentIds = new Set(entityData.map(e => e._id))
    
    // Log entity count to debug
    if (entityData.length > 10) {
      console.warn('EntityManager: Large number of AI entities:', entityData.length)
    }
    
    // Remove entities that no longer exist
    for (const [id, entity] of this.aiEntities) {
      if (!currentIds.has(id as Id<'aiEntities'>)) {
        entity.destroy()
        this.aiEntities.delete(id)
      }
    }
    
    // Update or create entities
    for (const data of entityData) {
      let entity = this.aiEntities.get(data._id)
      
      if (!entity) {
        // Create new entity based on type
        console.log(`EntityManager: Creating ${data.type} entity ${data._id}`)
        
        if (data.type === 'spark') {
          entity = new Spark({
            id: data._id,
            x: data.position.x,
            y: data.position.y,
          })
        } else if (data.type === 'shadow_creeper' || data.type === 'creeper') {
          entity = new ShadowCreeper({
            id: data._id,
            x: data.position.x,
            y: data.position.y,
          })
        } else {
          console.warn(`EntityManager: Unknown entity type: ${data.type}`)
          continue // Unknown entity type
        }
        
        this.entitiesLayer.addChild(entity.container)
        this.aiEntities.set(data._id, entity)
      }
      
      // Update entity state
      entity.updatePosition(data.position.x, data.position.y)
      entity.setState(data.state)
      entity.setHealth(data.health)
    }
  }

  getLocalPlayer(playerId: Id<'players'>): Player | undefined {
    return this.players.get(playerId)
  }

  update(deltaTime: number) {
    // Update all players
    for (const player of this.players.values()) {
      player.update(deltaTime)
    }
    
    // Update all AI entities
    for (const entity of this.aiEntities.values()) {
      entity.update(deltaTime)
    }
  }

  destroy() {
    // Destroy all players
    for (const player of this.players.values()) {
      player.destroy()
    }
    this.players.clear()
    
    // Destroy all AI entities
    for (const entity of this.aiEntities.values()) {
      entity.destroy()
    }
    this.aiEntities.clear()
    
    this.playersInfo.clear()
  }
}