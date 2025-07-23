import { Application, Container, Graphics } from 'pixi.js'
import { GAME_CONFIG } from '@glow-wars/shared/constants'
import { Id } from '@glow-wars/convex/_generated/dataModel'
import { EntityManager } from './EntityManager'
import { TerritoryRenderer } from './systems/TerritoryRenderer'
import { InputManager } from './InputManager'

interface GameData {
  playerPositions: Array<{
    playerId: Id<'players'>
    x: number
    y: number
    glowRadius: number
    isAlive: boolean
  }>
  aiEntities: Array<{
    _id: Id<'aiEntities'>
    type: string
    position: { x: number; y: number }
    state: string
    targetId?: Id<'players'>
    health: number
  }>
  territoryMap: Array<{
    gridX: number
    gridY: number
    ownerId?: Id<'players'>
    paintedAt: number
  }>
  gamePlayers: Array<{
    playerId: Id<'players'>
    name: string
    color: string
  }>
  localPlayerId?: Id<'players'>
  onPositionUpdate: (x: number, y: number) => void
}

export class GlowWarsGame {
  private app: Application | null = null
  private layers: {
    background: Container
    territory: Container
    entities: Container
    effects: Container
    ui: Container
  } | null = null
  
  private entityManager: EntityManager | null = null
  private territoryRenderer: TerritoryRenderer | null = null
  private inputManager: InputManager | null = null
  
  private gameData: GameData | null = null
  private lastTime: number = 0
  private isDestroyed: boolean = false

  async init(canvas: HTMLCanvasElement) {
    console.log('GlowWarsGame: Starting initialization')
    
    // Prevent initialization if already destroyed
    if (this.isDestroyed) {
      console.warn('GlowWarsGame: Cannot initialize a destroyed game instance')
      return
    }
    
    try {
      // Create PixiJS application
      this.app = new Application()

      await this.app.init({
        canvas,
        width: GAME_CONFIG.MAP_WIDTH,
        height: GAME_CONFIG.MAP_HEIGHT,
        backgroundColor: 0x0a0a0a,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        powerPreference: 'high-performance',
      })

      console.log('GlowWarsGame: PixiJS app initialized')

      // Initialize layers
      this.initializeLayers()

      // Draw background grid
      this.drawBackgroundGrid()
      
      // Create managers
      if (this.layers) {
        this.entityManager = new EntityManager(this.layers.entities)
        this.territoryRenderer = new TerritoryRenderer(this.layers.territory)
      }

      // Start the game loop
      this.lastTime = performance.now()
      this.app.ticker.add(() => this.update())
      
      console.log('GlowWarsGame: Initialization complete')
    } catch (error) {
      console.error('GlowWarsGame: Initialization failed', error)
      throw error
    }
  }
  
  setGameData(data: GameData) {
    this.gameData = data
    
    // Set up player info for entity manager
    if (this.entityManager && data.gamePlayers) {
      this.entityManager.setPlayersInfo(data.gamePlayers)
      
      // Update player colors for territory
      if (this.territoryRenderer) {
        this.territoryRenderer.setPlayerColors(data.gamePlayers)
      }
    }
    
    // Set up input manager if we have a local player
    if (data.localPlayerId && !this.inputManager) {
      this.inputManager = new InputManager(
        (x, y) => {
          // Send position update to backend
          data.onPositionUpdate(x, y)
        },
        (active) => {
          // Handle boost (TODO: implement boost mutation)
          console.log('Boost:', active)
        }
      )
      
      // Set initial position
      const localPlayer = data.playerPositions.find(p => p.playerId === data.localPlayerId)
      if (localPlayer) {
        this.inputManager.setPlayerPosition(localPlayer.x, localPlayer.y)
      }
    }
    
    // Update all entities
    this.updateEntities()
  }
  
  private updateEntities() {
    if (!this.gameData || !this.entityManager || !this.territoryRenderer) return
    
    // Update players
    this.entityManager.updatePlayers(this.gameData.playerPositions)
    
    // Update AI entities
    this.entityManager.updateAIEntities(this.gameData.aiEntities)
    
    // Update territory
    this.territoryRenderer.updateTerritory(this.gameData.territoryMap)
    
    // Update input manager position
    if (this.inputManager && this.gameData.localPlayerId) {
      const localPlayer = this.gameData.playerPositions.find(
        p => p.playerId === this.gameData!.localPlayerId
      )
      if (localPlayer) {
        this.inputManager.setPlayerPosition(localPlayer.x, localPlayer.y)
      }
    }
  }

  private initializeLayers() {
    if (!this.app) return

    this.layers = {
      background: new Container(),
      territory: new Container(),
      entities: new Container(),
      effects: new Container(),
      ui: new Container(),
    }

    // Add layers to stage in correct order
    this.app.stage.addChild(this.layers.background)
    this.app.stage.addChild(this.layers.territory)
    this.app.stage.addChild(this.layers.entities)
    this.app.stage.addChild(this.layers.effects)
    this.app.stage.addChild(this.layers.ui)
  }

  private drawBackgroundGrid() {
    if (!this.layers) return

    const graphics = new Graphics()
    
    // Draw grid lines
    graphics.strokeStyle = {
      width: 1,
      color: 0x1a1a1a,
      alpha: 0.5,
    }

    // Vertical lines
    for (let x = 0; x <= GAME_CONFIG.MAP_WIDTH; x += GAME_CONFIG.GRID_SIZE) {
      graphics.moveTo(x, 0)
      graphics.lineTo(x, GAME_CONFIG.MAP_HEIGHT)
    }

    // Horizontal lines
    for (let y = 0; y <= GAME_CONFIG.MAP_HEIGHT; y += GAME_CONFIG.GRID_SIZE) {
      graphics.moveTo(0, y)
      graphics.lineTo(GAME_CONFIG.MAP_WIDTH, y)
    }

    graphics.stroke()
    this.layers.background.addChild(graphics)
  }

  private update() {
    const now = performance.now()
    const deltaTime = (now - this.lastTime) / 1000 // Convert to seconds
    this.lastTime = now
    
    // Update input
    if (this.inputManager) {
      this.inputManager.update(deltaTime)
    }
    
    // Update entities
    if (this.entityManager) {
      this.entityManager.update(deltaTime)
    }
    
    // Update game data from subscriptions
    this.updateEntities()
  }

  destroy() {
    console.log('GlowWarsGame: Destroying game instance')
    
    if (this.isDestroyed) {
      console.warn('GlowWarsGame: Already destroyed')
      return
    }
    
    this.isDestroyed = true
    
    if (this.entityManager) {
      this.entityManager.destroy()
      this.entityManager = null
    }
    
    if (this.territoryRenderer) {
      this.territoryRenderer.destroy()
      this.territoryRenderer = null
    }
    
    if (this.inputManager) {
      this.inputManager.destroy()
      this.inputManager = null
    }
    
    if (this.app) {
      this.app.destroy(true, { children: true, texture: true, baseTexture: true })
      this.app = null
    }
    
    this.gameData = null
    this.layers = null
  }
}