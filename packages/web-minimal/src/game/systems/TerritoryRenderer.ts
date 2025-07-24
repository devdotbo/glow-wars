import { Container, Graphics } from 'pixi.js'
import { Id } from '@glow-wars/convex/_generated/dataModel'
import { GAME_CONFIG } from '@glow-wars/shared/constants'

interface TerritoryCell {
  gridX: number
  gridY: number
  ownerId?: Id<'players'>
  paintedAt: number
}

interface PlayerColors {
  [playerId: string]: number
}

export class TerritoryRenderer {
  private container: Container
  private graphics: Graphics
  private territoryMap: Map<string, TerritoryCell> = new Map()
  private playerColors: PlayerColors = {}
  private lastUpdateTime: number = 0
  
  constructor(territoryLayer: Container) {
    this.container = territoryLayer
    this.graphics = new Graphics()
    this.container.addChild(this.graphics)
  }

  setPlayerColors(players: Array<{ playerId: Id<'players'>; color: string }>) {
    this.playerColors = {}
    players.forEach(p => {
      this.playerColors[p.playerId] = parseInt(p.color.replace('#', '0x'))
    })
  }

  updateTerritory(territoryData: TerritoryCell[]) {
    // Update territory map
    this.territoryMap.clear()
    territoryData.forEach(cell => {
      const key = `${cell.gridX},${cell.gridY}`
      this.territoryMap.set(key, cell)
    })
    
    this.lastUpdateTime = Date.now()
    this.render()
  }

  private render() {
    this.graphics.clear()
    
    const now = Date.now()
    const cellSize = GAME_CONFIG.GRID_SIZE
    
    // Draw all territory cells
    for (const cell of this.territoryMap.values()) {
      if (!cell.ownerId) continue
      
      const color = this.playerColors[cell.ownerId] || 0xffffff
      const x = cell.gridX * cellSize
      const y = cell.gridY * cellSize
      
      // Calculate fade based on paint time (newer = brighter)
      const age = now - cell.paintedAt
      const maxAge = 30000 // 30 seconds
      const brightness = Math.max(0.3, 1 - (age / maxAge))
      
      // Draw cell with gradient effect
      this.graphics.beginFill(color, 0.4 * brightness)
      this.graphics.drawRect(x, y, cellSize, cellSize)
      this.graphics.endFill()
      
      // Add inner glow for recently painted cells
      if (age < 1000) {
        const glowAlpha = (1 - age / 1000) * 0.3
        this.graphics.beginFill(color, glowAlpha)
        this.graphics.drawRect(x + 1, y + 1, cellSize - 2, cellSize - 2)
        this.graphics.endFill()
      }
    }
    
    // Draw territory borders
    this.drawBorders()
  }

  private drawBorders() {
    const cellSize = GAME_CONFIG.GRID_SIZE
    
    // Check each cell for borders
    for (const [key, cell] of this.territoryMap) {
      if (!cell.ownerId) continue
      
      const color = this.playerColors[cell.ownerId] || 0xffffff
      const x = cell.gridX * cellSize
      const y = cell.gridY * cellSize
      
      // Check all four directions for borders
      const neighbors = [
        { dx: 0, dy: -1 }, // top
        { dx: 1, dy: 0 },  // right
        { dx: 0, dy: 1 },  // bottom
        { dx: -1, dy: 0 }, // left
      ]
      
      this.graphics.lineStyle(1, color, 0.8)
      
      for (const { dx, dy } of neighbors) {
        const neighborKey = `${cell.gridX + dx},${cell.gridY + dy}`
        const neighbor = this.territoryMap.get(neighborKey)
        
        // Draw border if neighbor is empty or owned by different player
        if (!neighbor || neighbor.ownerId !== cell.ownerId) {
          if (dx === 0 && dy === -1) {
            // Top border
            this.graphics.moveTo(x, y)
            this.graphics.lineTo(x + cellSize, y)
          } else if (dx === 1 && dy === 0) {
            // Right border
            this.graphics.moveTo(x + cellSize, y)
            this.graphics.lineTo(x + cellSize, y + cellSize)
          } else if (dx === 0 && dy === 1) {
            // Bottom border
            this.graphics.moveTo(x, y + cellSize)
            this.graphics.lineTo(x + cellSize, y + cellSize)
          } else if (dx === -1 && dy === 0) {
            // Left border
            this.graphics.moveTo(x, y)
            this.graphics.lineTo(x, y + cellSize)
          }
        }
      }
    }
  }

  destroy() {
    this.graphics.destroy()
    this.territoryMap.clear()
  }
}