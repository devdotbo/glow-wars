import { GAME_CONFIG } from '@glow-wars/shared/constants'

export class InputManager {
  private keys: Set<string> = new Set()
  private onPositionUpdate: (x: number, y: number) => void
  private onBoost: (active: boolean) => void
  
  private playerX: number = GAME_CONFIG.MAP_WIDTH / 2
  private playerY: number = GAME_CONFIG.MAP_HEIGHT / 2
  private lastUpdateTime: number = Date.now()
  private updateInterval: number = 50 // Send updates every 50ms
  private lastSentX: number = this.playerX
  private lastSentY: number = this.playerY
  
  constructor(
    onPositionUpdate: (x: number, y: number) => void,
    onBoost: (active: boolean) => void
  ) {
    this.onPositionUpdate = onPositionUpdate
    this.onBoost = onBoost
    
    this.setupEventListeners()
  }

  private setupEventListeners() {
    // Keyboard events
    window.addEventListener('keydown', this.handleKeyDown)
    window.addEventListener('keyup', this.handleKeyUp)
    
    // Prevent space bar from scrolling page
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault()
      }
    })
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    this.keys.add(e.code)
    
    // Handle boost
    if (e.code === 'Space') {
      this.onBoost(true)
    }
  }

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code)
    
    // Handle boost release
    if (e.code === 'Space') {
      this.onBoost(false)
    }
  }

  setPlayerPosition(x: number, y: number) {
    this.playerX = x
    this.playerY = y
    this.lastSentX = x
    this.lastSentY = y
  }

  update(deltaTime: number) {
    const now = Date.now()
    
    // Calculate movement
    let dx = 0
    let dy = 0
    
    // WASD or Arrow keys
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) dy -= 1
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) dy += 1
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) dx -= 1
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) dx += 1
    
    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
      const length = Math.sqrt(dx * dx + dy * dy)
      dx /= length
      dy /= length
    }
    
    // Apply movement
    if (dx !== 0 || dy !== 0) {
      const speed = GAME_CONFIG.PLAYER_BASE_SPEED
      const boost = this.keys.has('Space') ? GAME_CONFIG.BOOST_MULTIPLIER : 1
      
      this.playerX += dx * speed * boost * deltaTime
      this.playerY += dy * speed * boost * deltaTime
      
      // Clamp to map bounds
      this.playerX = Math.max(0, Math.min(GAME_CONFIG.MAP_WIDTH, this.playerX))
      this.playerY = Math.max(0, Math.min(GAME_CONFIG.MAP_HEIGHT, this.playerY))
    }
    
    // Send position update if changed and enough time has passed
    if (now - this.lastUpdateTime >= this.updateInterval) {
      const threshold = 1 // Only send if moved more than 1 pixel
      const distance = Math.sqrt(
        Math.pow(this.playerX - this.lastSentX, 2) + 
        Math.pow(this.playerY - this.lastSentY, 2)
      )
      
      if (distance > threshold) {
        this.onPositionUpdate(this.playerX, this.playerY)
        this.lastSentX = this.playerX
        this.lastSentY = this.playerY
        this.lastUpdateTime = now
      }
    }
  }

  destroy() {
    window.removeEventListener('keydown', this.handleKeyDown)
    window.removeEventListener('keyup', this.handleKeyUp)
    this.keys.clear()
  }
}