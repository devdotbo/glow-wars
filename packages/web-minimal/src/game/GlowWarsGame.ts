import { Application, Container, Graphics } from 'pixi.js'
import { GAME_CONFIG } from '@glow-wars/shared/constants'

export class GlowWarsGame {
  private app: Application | null = null
  private layers: {
    background: Container
    territory: Container
    entities: Container
    effects: Container
    ui: Container
  } | null = null

  async init(canvas: HTMLCanvasElement) {
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

    // Initialize layers
    this.initializeLayers()

    // Draw background grid
    this.drawBackgroundGrid()

    // Start the game loop
    this.app.ticker.add(() => this.update())
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
    // Game update logic will go here
  }

  destroy() {
    if (this.app) {
      this.app.destroy(true, { children: true, texture: true, baseTexture: true })
      this.app = null
    }
  }
}