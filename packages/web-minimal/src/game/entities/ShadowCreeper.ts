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
  private needsRedraw: boolean = true
  private lastState: string = 'patrol'
  
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
    if (this.state !== state) {
      this.state = state
      this.needsRedraw = true
    }
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
    
    // Use scale for animation instead of redrawing
    const basePulse = Math.sin(this.animTime * 3) * 0.05 + 1
    const statePulse = this.state === 'hunt' ? 
      Math.sin(this.animTime * 8) * 0.1 + 1.1 : basePulse
    
    this.graphics.scale.set(statePulse)
    this.shadowGraphics.scale.set(statePulse * 1.2)
    
    // Only redraw if needed
    if (this.needsRedraw) {
      this.render()
      this.needsRedraw = false
    }
  }

  private render() {
    
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
      const radius = ShadowCreeper.CREEPER_RADIUS * (1.5 + i * 0.4)
      this.shadowGraphics.fill({ color: ShadowCreeper.SHADOW_COLOR, alpha })
      this.shadowGraphics.circle(0, 0, radius)
      this.shadowGraphics.fill()
    }
    
    // Draw creeper body (diamond shape)
    this.graphics.fill({ color: ShadowCreeper.CREEPER_COLOR })
    const size = ShadowCreeper.CREEPER_RADIUS
    this.graphics.moveTo(0, -size)
    this.graphics.lineTo(size, 0)
    this.graphics.lineTo(0, size)
    this.graphics.lineTo(-size, 0)
    this.graphics.closePath()
    this.graphics.fill()
    
    // Draw inner core
    this.graphics.fill({ color: 0x000000, alpha: 0.8 })
    const coreSize = size * 0.5
    this.graphics.moveTo(0, -coreSize)
    this.graphics.lineTo(coreSize, 0)
    this.graphics.lineTo(0, coreSize)
    this.graphics.lineTo(-coreSize, 0)
    this.graphics.closePath()
    this.graphics.fill()
    
    // Add glowing eyes when hunting
    if (this.state === 'hunt') {
      this.graphics.fill({ color: 0xff0000, alpha: 0.9 })
      this.graphics.circle(-4, -2, 2)
      this.graphics.circle(4, -2, 2)
      this.graphics.fill()
    }
  }

  destroy() {
    this.container.destroy({ children: true })
  }
}