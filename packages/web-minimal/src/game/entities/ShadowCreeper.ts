import { Container, Graphics } from 'pixi.js'
import { Id } from '@glow-wars/convex/_generated/dataModel'

interface ShadowCreeperOptions {
  id: Id<'aiEntities'>
  x: number
  y: number
}

export class ShadowCreeper {
  public container: Container
  private graphics: Graphics
  private shadowGraphics: Graphics
  
  public id: Id<'aiEntities'>
  private x: number
  private y: number
  private targetX: number
  private targetY: number
  private state: string = 'patrol'
  private health: number = 20
  private animTime: number = 0
  
  private static CREEPER_RADIUS = 12
  private static CREEPER_COLOR = 0x8b00ff // Purple
  private static SHADOW_COLOR = 0x4b0082 // Dark purple

  constructor(options: ShadowCreeperOptions) {
    this.id = options.id
    this.x = options.x
    this.y = options.y
    this.targetX = options.x
    this.targetY = options.y
    
    // Create container
    this.container = new Container()
    this.container.x = this.x
    this.container.y = this.y
    
    // Create shadow effect
    this.shadowGraphics = new Graphics()
    this.container.addChild(this.shadowGraphics)
    
    // Create creeper body
    this.graphics = new Graphics()
    this.container.addChild(this.graphics)
    
    this.render()
  }

  updatePosition(x: number, y: number) {
    this.targetX = x
    this.targetY = y
  }

  setState(state: string) {
    this.state = state
  }

  setHealth(health: number) {
    this.health = health
    if (health <= 0) {
      this.container.alpha = 0
    }
  }

  update(deltaTime: number) {
    // Interpolate position (faster than sparks)
    const lerpFactor = Math.min(1, deltaTime * 10)
    this.x += (this.targetX - this.x) * lerpFactor
    this.y += (this.targetY - this.y) * lerpFactor
    
    this.container.x = this.x
    this.container.y = this.y
    
    // Update animation
    this.animTime += deltaTime
    this.render()
  }

  private render() {
    // Calculate pulsing effect based on state
    const basePulse = Math.sin(this.animTime * 3) * 0.1 + 1
    const statePulse = this.state === 'hunt' ? 
      Math.sin(this.animTime * 8) * 0.2 + 1.2 : basePulse
    
    // Clear graphics
    this.shadowGraphics.clear()
    this.graphics.clear()
    
    // Draw shadow tendrils
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + this.animTime
      const tendrilLength = ShadowCreeper.CREEPER_RADIUS * 2 * statePulse
      const wobble = Math.sin(this.animTime * 4 + i) * 0.2
      
      this.shadowGraphics.lineStyle(3, ShadowCreeper.SHADOW_COLOR, 0.6)
      this.shadowGraphics.moveTo(0, 0)
      this.shadowGraphics.lineTo(
        Math.cos(angle + wobble) * tendrilLength,
        Math.sin(angle + wobble) * tendrilLength
      )
    }
    
    // Draw shadow aura
    for (let i = 3; i > 0; i--) {
      const alpha = this.state === 'hunt' ? 0.2 * (4 - i) : 0.15 * (4 - i)
      const radius = ShadowCreeper.CREEPER_RADIUS * (1.5 + i * 0.4) * statePulse
      this.shadowGraphics.beginFill(ShadowCreeper.SHADOW_COLOR, alpha)
      this.shadowGraphics.drawCircle(0, 0, radius)
      this.shadowGraphics.endFill()
    }
    
    // Draw creeper body (diamond shape)
    this.graphics.beginFill(ShadowCreeper.CREEPER_COLOR)
    const size = ShadowCreeper.CREEPER_RADIUS * statePulse
    this.graphics.moveTo(0, -size)
    this.graphics.lineTo(size, 0)
    this.graphics.lineTo(0, size)
    this.graphics.lineTo(-size, 0)
    this.graphics.closePath()
    this.graphics.endFill()
    
    // Draw inner core
    this.graphics.beginFill(0x000000, 0.8)
    const coreSize = size * 0.5
    this.graphics.moveTo(0, -coreSize)
    this.graphics.lineTo(coreSize, 0)
    this.graphics.lineTo(0, coreSize)
    this.graphics.lineTo(-coreSize, 0)
    this.graphics.closePath()
    this.graphics.endFill()
    
    // Add glowing eyes when hunting
    if (this.state === 'hunt') {
      this.graphics.beginFill(0xff0000, 0.9)
      this.graphics.drawCircle(-4, -2, 2)
      this.graphics.drawCircle(4, -2, 2)
      this.graphics.endFill()
    }
  }

  destroy() {
    this.container.destroy({ children: true })
  }
}