import { Container, Graphics } from 'pixi.js'
import { Id } from '@glow-wars/convex/_generated/dataModel'

interface SparkOptions {
  id: Id<'aiEntities'>
  x: number
  y: number
}

export class Spark {
  public container: Container
  private graphics: Graphics
  private glowGraphics: Graphics
  
  public id: Id<'aiEntities'>
  private x: number
  private y: number
  private targetX: number
  private targetY: number
  private state: string = 'wander'
  private health: number = 10
  private pulseTime: number = 0
  private needsRedraw: boolean = true
  private lastState: string = 'wander'
  
  private static SPARK_RADIUS = 8
  private static SPARK_COLOR = 0xffff00 // Yellow

  constructor(options: SparkOptions) {
    this.id = options.id
    this.x = options.x
    this.y = options.y
    this.targetX = options.x
    this.targetY = options.y
    
    // Create container
    this.container = new Container()
    this.container.x = this.x
    this.container.y = this.y
    
    // Create glow effect
    this.glowGraphics = new Graphics()
    this.container.addChild(this.glowGraphics)
    
    // Create spark circle
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
    // Interpolate position
    const lerpFactor = Math.min(1, deltaTime * 8)
    this.x += (this.targetX - this.x) * lerpFactor
    this.y += (this.targetY - this.y) * lerpFactor
    
    this.container.x = this.x
    this.container.y = this.y
    
    // Update pulse animation
    this.pulseTime += deltaTime
    
    // Animate using scale instead of redrawing
    const pulse = Math.sin(this.pulseTime * 5) * 0.1 + 1
    this.graphics.scale.set(pulse)
    this.glowGraphics.scale.set(pulse)
    
    // Only redraw if needed
    if (this.needsRedraw) {
      this.render()
      this.needsRedraw = false
    }
  }

  private render() {
    const glowRadius = Spark.SPARK_RADIUS * 2
    
    // Clear and redraw glow
    this.glowGraphics.clear()
    
    // Draw glow layers
    for (let i = 3; i > 0; i--) {
      const alpha = this.state === 'flee' ? 0.15 * (4 - i) : 0.1 * (4 - i)
      const radius = glowRadius * (1 + i * 0.3)
      this.glowGraphics.fill({ color: Spark.SPARK_COLOR, alpha })
      this.glowGraphics.circle(0, 0, radius)
      this.glowGraphics.fill()
    }
    
    // Clear and redraw spark
    this.graphics.clear()
    
    // Outer glow ring
    this.graphics.fill({ color: Spark.SPARK_COLOR, alpha: 0.8 })
    this.graphics.circle(0, 0, Spark.SPARK_RADIUS)
    this.graphics.fill()
    
    // Inner bright core
    this.graphics.fill({ color: 0xffffff, alpha: 0.9 })
    this.graphics.circle(0, 0, Spark.SPARK_RADIUS * 0.5)
    this.graphics.fill()
    
    // Add particles effect when fleeing
    if (this.state === 'flee' && Math.random() < 0.3) {
      const particleRadius = 2
      const angle = Math.random() * Math.PI * 2
      const distance = Spark.SPARK_RADIUS + Math.random() * 10
      const px = Math.cos(angle) * distance
      const py = Math.sin(angle) * distance
      
      this.graphics.beginFill(Spark.SPARK_COLOR, 0.6)
      this.graphics.drawCircle(px, py, particleRadius)
      this.graphics.endFill()
    }
  }

  destroy() {
    this.container.destroy({ children: true })
  }
}