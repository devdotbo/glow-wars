import { Container, Graphics, Text } from 'pixi.js'
import { Id } from '@glow-wars/convex/_generated/dataModel'
import { GAME_CONFIG } from '@glow-wars/shared/constants'

interface PlayerOptions {
  id: Id<'players'>
  name: string
  color: string
  x: number
  y: number
  glowRadius: number
}

export class Player {
  public container: Container
  private graphics: Graphics
  private nameText: Text
  private glowGraphics: Graphics
  private trail: Graphics[]
  private trailPositions: Array<{ x: number; y: number; time: number }> = []
  
  public id: Id<'players'>
  public name: string
  public color: number
  
  private x: number
  private y: number
  private targetX: number
  private targetY: number
  private glowRadius: number
  private isAlive: boolean = true
  private lastX: number = 0
  private lastY: number = 0
  private lastRenderTime: number = 0
  
  private static TRAIL_LENGTH = 10
  private static TRAIL_FADE_TIME = 500 // milliseconds
  private static TRAIL_UPDATE_INTERVAL = 50 // milliseconds

  constructor(options: PlayerOptions) {
    this.id = options.id
    this.name = options.name
    this.color = parseInt(options.color.replace('#', '0x'))
    this.x = options.x
    this.y = options.y
    this.targetX = options.x
    this.targetY = options.y
    this.glowRadius = options.glowRadius
    
    // Create container
    this.container = new Container()
    this.container.x = this.x
    this.container.y = this.y
    
    // Create glow effect background
    this.glowGraphics = new Graphics()
    this.container.addChild(this.glowGraphics)
    
    // Create player circle
    this.graphics = new Graphics()
    this.container.addChild(this.graphics)
    
    // Create name text
    this.nameText = new Text(this.name, {
      fontFamily: 'Arial',
      fontSize: 12,
      fill: 0xffffff,
      align: 'center',
    })
    this.nameText.anchor.set(0.5)
    this.nameText.y = -30
    this.container.addChild(this.nameText)
    
    // Initialize trail
    this.trail = []
    for (let i = 0; i < Player.TRAIL_LENGTH; i++) {
      const trailPart = new Graphics()
      this.container.addChild(trailPart)
      this.trail.push(trailPart)
    }
    
    this.render()
  }

  updatePosition(x: number, y: number) {
    this.targetX = x
    this.targetY = y
    
    // Add to trail history
    const now = Date.now()
    this.trailPositions.push({ x: this.x, y: this.y, time: now })
    
    // Remove old trail positions
    const cutoffTime = now - Player.TRAIL_FADE_TIME
    this.trailPositions = this.trailPositions.filter(pos => pos.time > cutoffTime)
  }

  setGlowRadius(radius: number) {
    this.glowRadius = radius
    this.render()
  }

  setAlive(alive: boolean) {
    this.isAlive = alive
    this.container.alpha = alive ? 1 : 0.3
  }

  update(deltaTime: number) {
    // Interpolate position for smooth movement
    const lerpFactor = Math.min(1, deltaTime * 10) // Adjust speed as needed
    this.x += (this.targetX - this.x) * lerpFactor
    this.y += (this.targetY - this.y) * lerpFactor
    
    this.container.x = this.x
    this.container.y = this.y
    
    // Only update trail if we've moved significantly or enough time has passed
    const now = Date.now()
    const distanceMoved = Math.sqrt(
      Math.pow(this.x - this.lastX, 2) + Math.pow(this.y - this.lastY, 2)
    )
    
    if (distanceMoved > 2 || now - this.lastRenderTime > Player.TRAIL_UPDATE_INTERVAL) {
      this.renderTrail()
      this.lastX = this.x
      this.lastY = this.y
      this.lastRenderTime = now
    }
  }

  private render() {
    // Clear and redraw glow
    this.glowGraphics.clear()
    if (this.isAlive) {
      // Draw multiple circles for glow effect
      for (let i = 3; i > 0; i--) {
        const alpha = 0.1 * (4 - i)
        const radius = GAME_CONFIG.DEFAULT_PLAYER_RADIUS + (this.glowRadius * 0.3 * i)
        this.glowGraphics.fill({ color: this.color, alpha })
        this.glowGraphics.circle(0, 0, radius)
        this.glowGraphics.fill()
      }
    }
    
    // Clear and redraw player
    this.graphics.clear()
    this.graphics.fill({ color: this.color })
    this.graphics.circle(0, 0, GAME_CONFIG.DEFAULT_PLAYER_RADIUS)
    this.graphics.fill()
    
    // Add white center for contrast
    this.graphics.beginFill(0xffffff, 0.8)
    this.graphics.drawCircle(0, 0, GAME_CONFIG.DEFAULT_PLAYER_RADIUS * 0.3)
    this.graphics.endFill()
  }

  private renderTrail() {
    const now = Date.now()
    
    // Update each trail segment
    for (let i = 0; i < this.trail.length; i++) {
      const trailGraphics = this.trail[i]
      trailGraphics.clear()
      
      if (i < this.trailPositions.length) {
        const pos = this.trailPositions[this.trailPositions.length - 1 - i]
        const age = now - pos.time
        const alpha = Math.max(0, 1 - (age / Player.TRAIL_FADE_TIME)) * 0.5
        const radius = GAME_CONFIG.DEFAULT_PLAYER_RADIUS * (1 - i * 0.08)
        
        if (alpha > 0) {
          // Convert to local coordinates
          const localX = pos.x - this.x
          const localY = pos.y - this.y
          
          trailGraphics.fill({ color: this.color, alpha })
          trailGraphics.circle(localX, localY, radius)
          trailGraphics.fill()
        }
      }
    }
  }

  destroy() {
    this.container.destroy({ children: true })
  }
}