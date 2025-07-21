# Visual Elements Guide - Creating Game Elements with Primitives

## Player Representation

### Basic Glowing Circle Player
```typescript
import { Graphics, Container, BlurFilter } from 'pixi.js';

export class MinimalPlayer extends Container {
  private body: Graphics;
  private glowRings: Graphics;
  private color: number;
  private radius: number = 20;
  
  constructor(color: number = 0x00FF00) {
    super();
    this.color = color;
    
    // Create glow rings (rendered first, behind body)
    this.glowRings = new Graphics();
    this.drawGlowRings();
    this.addChild(this.glowRings);
    
    // Create main body
    this.body = new Graphics();
    this.drawBody();
    this.addChild(this.body);
    
    // Apply effects
    this.body.filters = [new BlurFilter({ strength: 2 })];
    this.blendMode = 'add'; // Additive blending for glow
  }
  
  private drawBody() {
    this.body.clear();
    this.body.circle(0, 0, this.radius);
    this.body.fill({ color: this.color, alpha: 1 });
  }
  
  private drawGlowRings() {
    this.glowRings.clear();
    
    // Draw 3 concentric rings with decreasing opacity
    for (let i = 1; i <= 3; i++) {
      const ringRadius = this.radius + (i * 5);
      const alpha = 0.3 / i; // 0.3, 0.15, 0.1
      
      this.glowRings.circle(0, 0, ringRadius);
      this.glowRings.stroke({ 
        width: 2, 
        color: this.color, 
        alpha: alpha 
      });
    }
  }
  
  // Pulse effect for emphasis
  pulse(intensity: number = 1.2) {
    const originalScale = this.scale.x;
    
    // Simple pulse animation
    const duration = 200; // ms
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const scale = originalScale + (intensity - originalScale) * (1 - eased);
      
      this.scale.set(scale);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }
}
```

### Player with Direction Indicator
```typescript
export class DirectionalPlayer extends MinimalPlayer {
  private directionIndicator: Graphics;
  
  constructor(color: number = 0x00FF00) {
    super(color);
    
    // Add direction indicator (triangle)
    this.directionIndicator = new Graphics();
    this.drawDirectionIndicator();
    this.addChild(this.directionIndicator);
  }
  
  private drawDirectionIndicator() {
    this.directionIndicator.clear();
    
    // Draw triangle pointing right (0 degrees)
    const size = 8;
    this.directionIndicator.poly([
      this.radius + 5, 0,        // Tip
      this.radius - 5, -size,    // Top back
      this.radius - 5, size      // Bottom back
    ]);
    this.directionIndicator.fill({ color: 0xFFFFFF, alpha: 0.8 });
  }
  
  setDirection(angle: number) {
    this.directionIndicator.rotation = angle;
  }
}
```

## Trail System

### Fading Circle Trail
```typescript
export class TrailSystem {
  private container: Container;
  private graphics: Graphics;
  private points: TrailPoint[] = [];
  private maxPoints: number = 20;
  private color: number;
  
  interface TrailPoint {
    x: number;
    y: number;
    life: number;
    size: number;
  }
  
  constructor(container: Container, color: number) {
    this.container = container;
    this.color = color;
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
  }
  
  addPoint(x: number, y: number) {
    this.points.push({
      x,
      y,
      life: 1.0,
      size: 8
    });
    
    // Remove oldest points
    if (this.points.length > this.maxPoints) {
      this.points.shift();
    }
  }
  
  update(deltaTime: number) {
    // Update point lifetimes
    this.points.forEach(point => {
      point.life -= deltaTime * 0.02; // Fade over ~1 second
      point.size *= 0.98; // Shrink slightly
    });
    
    // Remove dead points
    this.points = this.points.filter(p => p.life > 0);
    
    // Redraw trail
    this.draw();
  }
  
  private draw() {
    this.graphics.clear();
    
    // Draw from oldest to newest for proper layering
    this.points.forEach((point, index) => {
      const alpha = point.life * 0.5; // Max 50% opacity
      const size = point.size * (index / this.points.length);
      
      this.graphics.circle(point.x, point.y, size);
      this.graphics.fill({ color: this.color, alpha });
    });
  }
}
```

### Smooth Line Trail
```typescript
export class SmoothTrail {
  private graphics: Graphics;
  private points: Array<{x: number, y: number}> = [];
  private maxPoints: number = 30;
  
  constructor(container: Container, color: number) {
    this.graphics = new Graphics();
    this.graphics.blendMode = 'add';
    container.addChild(this.graphics);
  }
  
  addPoint(x: number, y: number) {
    this.points.push({ x, y });
    if (this.points.length > this.maxPoints) {
      this.points.shift();
    }
    this.draw();
  }
  
  private draw() {
    this.graphics.clear();
    
    if (this.points.length < 2) return;
    
    // Draw smooth curve through points
    this.graphics.moveTo(this.points[0].x, this.points[0].y);
    
    for (let i = 1; i < this.points.length; i++) {
      const alpha = i / this.points.length;
      const width = 10 * alpha;
      
      // Use quadratic curve for smoothness
      if (i < this.points.length - 1) {
        const xc = (this.points[i].x + this.points[i + 1].x) / 2;
        const yc = (this.points[i].y + this.points[i + 1].y) / 2;
        
        this.graphics.quadraticCurveTo(
          this.points[i].x, this.points[i].y,
          xc, yc
        );
      } else {
        this.graphics.lineTo(this.points[i].x, this.points[i].y);
      }
      
      this.graphics.stroke({ 
        width, 
        color: this.color, 
        alpha: alpha * 0.6 
      });
    }
  }
}
```

## Territory Painting

### Grid-Based Territory System
```typescript
export class TerritoryRenderer {
  private container: Container;
  private graphics: Graphics;
  private cellSize: number = 32;
  private grid: TerritoryGrid;
  private colors: Map<number, number>;
  
  constructor(container: Container, grid: TerritoryGrid) {
    this.container = container;
    this.grid = grid;
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
    
    // Player ID to color mapping
    this.colors = new Map([
      [1, 0x00FF00], // Player 1: Green
      [2, 0xFF0066], // Player 2: Pink
      [3, 0x00CCFF], // Player 3: Cyan
      [4, 0xFFAA00], // Player 4: Orange
      [5, 0xFF00FF], // Player 5: Magenta
      [6, 0xFFFF00], // Player 6: Yellow
      [7, 0x9D00FF], // Player 7: Purple
      [8, 0xFF3333], // Player 8: Red
    ]);
  }
  
  render() {
    this.graphics.clear();
    
    const width = this.grid.width;
    const height = this.grid.height;
    
    // Draw filled cells
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const owner = this.grid.getCellOwner(x, y);
        if (owner > 0) {
          const color = this.colors.get(owner) || 0xFFFFFF;
          this.drawCell(x, y, color);
        }
      }
    }
    
    // Draw grid lines (optional, for debugging)
    if (DEBUG_MODE) {
      this.drawGridLines(width, height);
    }
  }
  
  private drawCell(gridX: number, gridY: number, color: number) {
    const x = gridX * this.cellSize;
    const y = gridY * this.cellSize;
    
    this.graphics.rect(x, y, this.cellSize, this.cellSize);
    this.graphics.fill({ color, alpha: 0.3 });
    
    // Add subtle border for better visibility
    this.graphics.stroke({ 
      width: 1, 
      color, 
      alpha: 0.5 
    });
  }
  
  private drawGridLines(width: number, height: number) {
    this.graphics.stroke({ 
      width: 1, 
      color: 0x333333, 
      alpha: 0.3 
    });
    
    // Vertical lines
    for (let x = 0; x <= width; x++) {
      this.graphics.moveTo(x * this.cellSize, 0);
      this.graphics.lineTo(x * this.cellSize, height * this.cellSize);
    }
    
    // Horizontal lines
    for (let y = 0; y <= height; y++) {
      this.graphics.moveTo(0, y * this.cellSize);
      this.graphics.lineTo(width * this.cellSize, y * this.cellSize);
    }
  }
}
```

### Smooth Territory Painting
```typescript
export class SmoothTerritoryPainter {
  private renderTexture: RenderTexture;
  private sprite: Sprite;
  private brush: Graphics;
  
  constructor(app: Application, width: number, height: number) {
    // Create render texture for territory
    this.renderTexture = RenderTexture.create({ 
      width, 
      height,
      resolution: 1
    });
    
    // Create sprite to display territory
    this.sprite = new Sprite(this.renderTexture);
    this.sprite.alpha = 0.3; // Territory transparency
    
    // Create brush for painting
    this.brush = new Graphics();
  }
  
  paint(x: number, y: number, color: number, size: number = 32) {
    this.brush.clear();
    
    // Draw soft brush with gradient
    const gradient = {
      type: 'radial' as const,
      x0: 0, y0: 0, r0: 0,
      x1: 0, y1: 0, r1: size,
      colorStops: [
        { offset: 0, color },
        { offset: 0.5, color },
        { offset: 1, color: color, alpha: 0 }
      ]
    };
    
    this.brush.circle(0, 0, size);
    this.brush.fill({ gradient });
    
    // Render brush to texture at position
    this.brush.position.set(x, y);
    app.renderer.render({
      container: this.brush,
      target: this.renderTexture,
      clear: false // Don't clear, accumulate paint
    });
  }
}
```

## Power-Up Shapes

### Geometric Power-Up Factory
```typescript
export class PowerUpFactory {
  static createSpeedBoost(): Graphics {
    const graphics = new Graphics();
    const size = 15;
    
    // Yellow triangle pointing up
    graphics.poly([
      0, -size,        // Top
      -size, size,     // Bottom left
      size, size       // Bottom right
    ]);
    graphics.fill({ color: 0xFFFF00 });
    graphics.stroke({ width: 2, color: 0xFFFFFF });
    
    return graphics;
  }
  
  static createShield(): Graphics {
    const graphics = new Graphics();
    const size = 15;
    
    // Blue hexagon
    const points: number[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI * 2) / 6 - Math.PI / 2;
      points.push(
        Math.cos(angle) * size,
        Math.sin(angle) * size
      );
    }
    
    graphics.poly(points);
    graphics.fill({ color: 0x00AAFF });
    graphics.stroke({ width: 2, color: 0xFFFFFF });
    
    return graphics;
  }
  
  static createMegaGlow(): Graphics {
    const graphics = new Graphics();
    
    // Rainbow star with multiple colors
    const outerRadius = 20;
    const innerRadius = 10;
    const points = 5;
    
    // Create star path
    const starPoints: number[] = [];
    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      starPoints.push(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius
      );
    }
    
    // Draw with gradient (simulated rainbow)
    graphics.poly(starPoints);
    graphics.fill({ color: 0xFF00FF }); // Base color
    graphics.stroke({ width: 3, color: 0xFFFFFF });
    
    return graphics;
  }
  
  static createPhaseShift(): Graphics {
    const graphics = new Graphics();
    const size = 15;
    
    // Purple diamond
    graphics.poly([
      0, -size,      // Top
      size, 0,       // Right
      0, size,       // Bottom
      -size, 0       // Left
    ]);
    graphics.fill({ color: 0x9D00FF });
    graphics.stroke({ width: 2, color: 0xFFFFFF });
    
    return graphics;
  }
  
  static createEnergyBurst(): Graphics {
    const graphics = new Graphics();
    const size = 15;
    
    // Orange octagon
    const points: number[] = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI * 2) / 8 - Math.PI / 8;
      points.push(
        Math.cos(angle) * size,
        Math.sin(angle) * size
      );
    }
    
    graphics.poly(points);
    graphics.fill({ color: 0xFF6600 });
    graphics.stroke({ width: 2, color: 0xFFFFFF });
    
    return graphics;
  }
}
```

### Animated Power-Up
```typescript
export class AnimatedPowerUp extends Container {
  private shape: Graphics;
  private glowRing: Graphics;
  private floatOffset: number = 0;
  private rotationSpeed: number = 0.01;
  
  constructor(type: PowerUpType) {
    super();
    
    // Create base shape
    this.shape = PowerUpFactory[`create${type}`]();
    this.addChild(this.shape);
    
    // Add glow ring
    this.glowRing = new Graphics();
    this.drawGlowRing();
    this.addChildAt(this.glowRing, 0); // Behind shape
    
    // Set blend mode for glow effect
    this.blendMode = 'add';
  }
  
  private drawGlowRing() {
    this.glowRing.clear();
    this.glowRing.circle(0, 0, 25);
    this.glowRing.stroke({ 
      width: 3, 
      color: 0xFFFFFF, 
      alpha: 0.3 
    });
  }
  
  update(deltaTime: number) {
    // Floating animation
    this.floatOffset += deltaTime * 0.002;
    this.y = Math.sin(this.floatOffset) * 5;
    
    // Rotation
    this.shape.rotation += this.rotationSpeed * deltaTime;
    
    // Pulsing glow
    const glowScale = 1 + Math.sin(this.floatOffset * 2) * 0.1;
    this.glowRing.scale.set(glowScale);
  }
}
```

## Particle Effects

### Simple Particle System
```typescript
export class SimpleParticle extends Graphics {
  vx: number = 0;
  vy: number = 0;
  life: number = 1;
  maxLife: number = 1;
  size: number = 2;
  color: number = 0xFFFFFF;
  
  update(deltaTime: number) {
    // Physics
    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;
    
    // Gravity (optional)
    this.vy += 100 * deltaTime * 0.001;
    
    // Life
    this.life -= deltaTime * 0.001;
    
    // Update visual
    const lifeRatio = this.life / this.maxLife;
    this.alpha = lifeRatio;
    this.scale.set(lifeRatio);
  }
  
  reset(x: number, y: number, vx: number, vy: number) {
    this.position.set(x, y);
    this.vx = vx;
    this.vy = vy;
    this.life = this.maxLife;
    this.alpha = 1;
    this.scale.set(1);
  }
  
  draw() {
    this.clear();
    this.circle(0, 0, this.size);
    this.fill({ color: this.color });
  }
}

export class ParticleEmitter {
  private particles: SimpleParticle[] = [];
  private pool: SimpleParticle[] = [];
  private container: Container;
  
  constructor(container: Container, poolSize: number = 100) {
    this.container = container;
    
    // Pre-create particles
    for (let i = 0; i < poolSize; i++) {
      const particle = new SimpleParticle();
      particle.draw();
      this.pool.push(particle);
    }
  }
  
  emit(x: number, y: number, count: number, color: number) {
    for (let i = 0; i < count; i++) {
      const particle = this.getParticle();
      
      // Random velocity in circle
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 150;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      
      particle.color = color;
      particle.reset(x, y, vx, vy);
      particle.draw();
      
      this.container.addChild(particle);
      this.particles.push(particle);
    }
  }
  
  update(deltaTime: number) {
    // Update all active particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.update(deltaTime);
      
      // Remove dead particles
      if (particle.life <= 0) {
        this.container.removeChild(particle);
        this.particles.splice(i, 1);
        this.releaseParticle(particle);
      }
    }
  }
  
  private getParticle(): SimpleParticle {
    return this.pool.pop() || new SimpleParticle();
  }
  
  private releaseParticle(particle: SimpleParticle) {
    this.pool.push(particle);
  }
}
```

## UI Elements

### Score Display
```typescript
export class ScoreDisplay extends Container {
  private background: Graphics;
  private playerName: Text;
  private scoreText: Text;
  private territoryBar: Graphics;
  private playerColor: number;
  
  constructor(playerId: number, playerColor: number) {
    super();
    this.playerColor = playerColor;
    
    // Semi-transparent background
    this.background = new Graphics();
    this.background.roundRect(0, 0, 200, 60, 8);
    this.background.fill({ color: 0x000000, alpha: 0.6 });
    this.background.stroke({ 
      width: 1, 
      color: 0xFFFFFF, 
      alpha: 0.1 
    });
    this.addChild(this.background);
    
    // Player indicator
    const indicator = new Graphics();
    indicator.circle(20, 30, 8);
    indicator.fill({ color: playerColor });
    this.addChild(indicator);
    
    // Player name
    this.playerName = new Text({
      text: `Player ${playerId}`,
      style: {
        fontFamily: 'Arial',
        fontSize: 14,
        fill: 0xFFFFFF
      }
    });
    this.playerName.x = 40;
    this.playerName.y = 10;
    this.addChild(this.playerName);
    
    // Territory bar
    this.territoryBar = new Graphics();
    this.addChild(this.territoryBar);
    
    // Score text
    this.scoreText = new Text({
      text: 'Score: 0',
      style: {
        fontFamily: 'Arial',
        fontSize: 12,
        fill: 0xCCCCCC
      }
    });
    this.scoreText.x = 40;
    this.scoreText.y = 35;
    this.addChild(this.scoreText);
  }
  
  updateScore(score: number, territoryPercent: number) {
    this.scoreText.text = `Score: ${score}`;
    
    // Update territory bar
    this.territoryBar.clear();
    this.territoryBar.rect(40, 28, 150, 4);
    this.territoryBar.fill({ color: 0x333333 });
    
    const fillWidth = 150 * (territoryPercent / 100);
    this.territoryBar.rect(40, 28, fillWidth, 4);
    this.territoryBar.fill({ color: this.playerColor });
  }
}
```

### Minimap
```typescript
export class Minimap extends Container {
  private background: Graphics;
  private mapGraphics: Graphics;
  private playerDots: Map<string, Graphics>;
  private scale: number;
  
  constructor(worldWidth: number, worldHeight: number, size: number = 150) {
    super();
    
    this.scale = size / Math.max(worldWidth, worldHeight);
    this.playerDots = new Map();
    
    // Background
    this.background = new Graphics();
    this.background.rect(0, 0, size, size);
    this.background.fill({ color: 0x000000, alpha: 0.8 });
    this.background.stroke({ 
      width: 2, 
      color: 0xFFFFFF, 
      alpha: 0.3 
    });
    this.addChild(this.background);
    
    // Map graphics for territory
    this.mapGraphics = new Graphics();
    this.addChild(this.mapGraphics);
  }
  
  updatePlayers(players: Map<string, PlayerState>) {
    // Clear existing dots
    this.playerDots.forEach(dot => this.removeChild(dot));
    this.playerDots.clear();
    
    // Add player dots
    players.forEach((player, id) => {
      const dot = new Graphics();
      dot.circle(0, 0, 2);
      dot.fill({ color: player.color });
      dot.stroke({ 
        width: 1, 
        color: player.color, 
        alpha: 0.5 
      });
      
      dot.x = player.position.x * this.scale;
      dot.y = player.position.y * this.scale;
      
      this.addChild(dot);
      this.playerDots.set(id, dot);
    });
  }
  
  updateTerritory(grid: TerritoryGrid) {
    this.mapGraphics.clear();
    
    // Simplified territory rendering for minimap
    const cellSize = 4; // Pixels per cell on minimap
    
    for (let y = 0; y < grid.height; y += 2) { // Skip every other for performance
      for (let x = 0; x < grid.width; x += 2) {
        const owner = grid.getCellOwner(x, y);
        if (owner > 0) {
          const color = getPlayerColor(owner);
          this.mapGraphics.rect(
            x * cellSize * this.scale,
            y * cellSize * this.scale,
            cellSize * 2,
            cellSize * 2
          );
          this.mapGraphics.fill({ color, alpha: 0.5 });
        }
      }
    }
  }
}
```

This visual elements guide provides all the building blocks needed to create the complete game using only PixiJS primitives!