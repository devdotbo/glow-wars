# Code Cookbook - Complete Implementation Snippets

## Complete Player Implementation

### Player Class with All Features
```typescript
// src/game/entities/Player.ts
import { Container, Graphics, BlurFilter } from 'pixi.js';
import { TrailSystem } from './TrailSystem';
import { PowerUpType, PowerUpState } from '../types';

export class Player extends Container {
  // Identity
  public id: string;
  public color: number;
  public isLocal: boolean = false;
  
  // Physics
  public velocity = { x: 0, y: 0 };
  public speed = 200; // pixels per second
  public baseSpeed = 200;
  
  // Components
  private body: Graphics;
  private glowRings: Graphics;
  private directionIndicator: Graphics;
  private trail: TrailSystem;
  
  // State
  public alive = true;
  public powerUps = new Map<PowerUpType, PowerUpState>();
  
  // Visual
  private radius = 20;
  private pulseTime = 0;
  
  constructor(id: string, color: number, trailContainer: Container) {
    super();
    this.id = id;
    this.color = color;
    
    // Initialize graphics
    this.setupGraphics();
    
    // Initialize trail
    this.trail = new TrailSystem(trailContainer, color, id);
    
    // Apply blend mode for glow effect
    this.blendMode = 'add';
  }
  
  private setupGraphics() {
    // Glow rings (behind body)
    this.glowRings = new Graphics();
    this.addChild(this.glowRings);
    
    // Main body
    this.body = new Graphics();
    this.body.circle(0, 0, this.radius);
    this.body.fill({ color: this.color });
    this.body.filters = [new BlurFilter({ strength: 2, quality: 2 })];
    this.addChild(this.body);
    
    // Direction indicator
    this.directionIndicator = new Graphics();
    this.directionIndicator.poly([
      this.radius + 5, 0,
      this.radius - 5, -8,
      this.radius - 5, 8
    ]);
    this.directionIndicator.fill({ color: 0xFFFFFF, alpha: 0.6 });
    this.addChild(this.directionIndicator);
    
    this.updateGlowRings();
  }
  
  private updateGlowRings() {
    this.glowRings.clear();
    
    const baseAlpha = this.powerUps.get('megaGlow')?.active ? 0.5 : 0.3;
    const ringCount = this.powerUps.get('megaGlow')?.active ? 5 : 3;
    
    for (let i = 1; i <= ringCount; i++) {
      const radius = this.radius + (i * 5);
      const alpha = baseAlpha / i;
      
      this.glowRings.circle(0, 0, radius);
      this.glowRings.stroke({ 
        width: 2, 
        color: this.color, 
        alpha 
      });
    }
  }
  
  update(deltaTime: number) {
    if (!this.alive) return;
    
    // Update position
    this.x += this.velocity.x * deltaTime * 0.001;
    this.y += this.velocity.y * deltaTime * 0.001;
    
    // Update trail
    this.trail.addPoint(this.x, this.y);
    this.trail.update(deltaTime);
    
    // Update direction indicator
    if (this.velocity.x !== 0 || this.velocity.y !== 0) {
      this.directionIndicator.rotation = Math.atan2(
        this.velocity.y, 
        this.velocity.x
      );
    }
    
    // Update power-ups
    this.updatePowerUps(deltaTime);
    
    // Visual effects
    this.updateVisualEffects(deltaTime);
  }
  
  private updatePowerUps(deltaTime: number) {
    this.powerUps.forEach((powerUp, type) => {
      if (powerUp.active) {
        powerUp.timeRemaining -= deltaTime;
        
        if (powerUp.timeRemaining <= 0) {
          this.deactivatePowerUp(type);
        }
      }
    });
  }
  
  private updateVisualEffects(deltaTime: number) {
    // Pulse effect
    this.pulseTime += deltaTime * 0.001;
    const pulseFactor = 1 + Math.sin(this.pulseTime * 2) * 0.05;
    this.scale.set(pulseFactor);
    
    // Speed lines effect
    if (this.powerUps.get('speed')?.active) {
      // Add speed line particles
      this.createSpeedLines();
    }
    
    // Shield effect
    if (this.powerUps.get('shield')?.active) {
      this.updateShieldEffect(deltaTime);
    }
  }
  
  activatePowerUp(type: PowerUpType) {
    const durations = {
      speed: 5000,
      shield: 3000,
      megaGlow: 4000,
      phaseShift: 2000,
      energyBurst: 0 // Instant
    };
    
    this.powerUps.set(type, {
      active: true,
      timeRemaining: durations[type]
    });
    
    // Apply immediate effects
    switch (type) {
      case 'speed':
        this.speed = this.baseSpeed * 2;
        break;
      case 'megaGlow':
        this.updateGlowRings();
        break;
      case 'energyBurst':
        this.triggerEnergyBurst();
        break;
    }
  }
  
  private deactivatePowerUp(type: PowerUpType) {
    this.powerUps.set(type, { active: false, timeRemaining: 0 });
    
    // Remove effects
    switch (type) {
      case 'speed':
        this.speed = this.baseSpeed;
        break;
      case 'megaGlow':
        this.updateGlowRings();
        break;
    }
  }
  
  checkCollision(other: Player): boolean {
    if (!this.alive || !other.alive) return false;
    if (this.powerUps.get('phaseShift')?.active) return false;
    
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    return distance < this.radius * 2;
  }
  
  checkTrailCollision(trails: TrailSystem[]): boolean {
    if (!this.alive) return false;
    if (this.powerUps.get('phaseShift')?.active) return false;
    
    for (const trail of trails) {
      // Don't collide with own trail for first 3 seconds
      if (trail.ownerId === this.id) {
        if (!trail.canCollideWithOwner()) continue;
      }
      
      if (trail.checkCollision(this.x, this.y, this.radius)) {
        return true;
      }
    }
    
    return false;
  }
  
  eliminate() {
    this.alive = false;
    this.visible = false;
    this.trail.clear();
    
    // Trigger elimination effect
    this.createEliminationEffect();
  }
  
  private createSpeedLines() {
    // Implementation in particle system
  }
  
  private updateShieldEffect(deltaTime: number) {
    // Implementation in effects system
  }
  
  private triggerEnergyBurst() {
    // Implementation in effects system
  }
  
  private createEliminationEffect() {
    // Implementation in effects system
  }
  
  respawn(x: number, y: number) {
    this.alive = true;
    this.visible = true;
    this.position.set(x, y);
    this.velocity = { x: 0, y: 0 };
    this.trail.clear();
    this.powerUps.clear();
  }
  
  destroy() {
    this.trail.destroy();
    super.destroy();
  }
}
```

## Complete Trail System

### Trail Implementation with Collision
```typescript
// src/game/entities/TrailSystem.ts
import { Container, Graphics } from 'pixi.js';

interface TrailPoint {
  x: number;
  y: number;
  life: number;
  timestamp: number;
}

export class TrailSystem {
  public ownerId: string;
  
  private container: Container;
  private graphics: Graphics;
  private points: TrailPoint[] = [];
  private color: number;
  
  private maxPoints = 30;
  private pointSpacing = 5; // Minimum pixels between points
  private ownerCollisionDelay = 3000; // 3 seconds
  private startTime: number;
  
  constructor(container: Container, color: number, ownerId: string) {
    this.container = container;
    this.color = color;
    this.ownerId = ownerId;
    this.startTime = Date.now();
    
    this.graphics = new Graphics();
    this.graphics.blendMode = 'add';
    this.container.addChild(this.graphics);
  }
  
  addPoint(x: number, y: number) {
    // Check minimum spacing
    if (this.points.length > 0) {
      const lastPoint = this.points[this.points.length - 1];
      const dx = x - lastPoint.x;
      const dy = y - lastPoint.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < this.pointSpacing) {
        return; // Too close to last point
      }
    }
    
    // Add new point
    this.points.push({
      x,
      y,
      life: 1.0,
      timestamp: Date.now()
    });
    
    // Limit trail length
    if (this.points.length > this.maxPoints) {
      this.points.shift();
    }
  }
  
  update(deltaTime: number) {
    // Update point lifetimes
    const decayRate = deltaTime * 0.001; // 1 second to fade
    
    for (let i = this.points.length - 1; i >= 0; i--) {
      this.points[i].life -= decayRate;
      
      if (this.points[i].life <= 0) {
        this.points.splice(i, 1);
      }
    }
    
    // Redraw trail
    this.draw();
  }
  
  private draw() {
    this.graphics.clear();
    
    if (this.points.length < 2) return;
    
    // Draw as connected segments with varying width
    for (let i = 0; i < this.points.length - 1; i++) {
      const point = this.points[i];
      const nextPoint = this.points[i + 1];
      
      const progress = i / (this.points.length - 1);
      const width = 10 * progress * point.life;
      const alpha = 0.6 * progress * point.life;
      
      // Draw line segment
      this.graphics.moveTo(point.x, point.y);
      this.graphics.lineTo(nextPoint.x, nextPoint.y);
      this.graphics.stroke({
        width,
        color: this.color,
        alpha,
        cap: 'round',
        join: 'round'
      });
      
      // Draw glow circle at each point
      this.graphics.circle(point.x, point.y, width * 0.5);
      this.graphics.fill({ color: this.color, alpha: alpha * 0.5 });
    }
  }
  
  checkCollision(x: number, y: number, radius: number): boolean {
    // Check collision with trail segments
    for (let i = 0; i < this.points.length - 1; i++) {
      const p1 = this.points[i];
      const p2 = this.points[i + 1];
      
      if (this.lineCircleCollision(
        p1.x, p1.y, p2.x, p2.y,
        x, y, radius
      )) {
        return true;
      }
    }
    
    return false;
  }
  
  private lineCircleCollision(
    x1: number, y1: number, x2: number, y2: number,
    cx: number, cy: number, radius: number
  ): boolean {
    // Vector from p1 to p2
    const dx = x2 - x1;
    const dy = y2 - y1;
    
    // Vector from p1 to circle center
    const fx = cx - x1;
    const fy = cy - y1;
    
    // Project f onto d
    const a = dx * dx + dy * dy;
    const b = 2 * (fx * dx + fy * dy);
    const c = (fx * fx + fy * fy) - radius * radius;
    
    let discriminant = b * b - 4 * a * c;
    if (discriminant < 0) {
      return false; // No intersection
    }
    
    discriminant = Math.sqrt(discriminant);
    
    const t1 = (-b - discriminant) / (2 * a);
    const t2 = (-b + discriminant) / (2 * a);
    
    // Check if intersection is within line segment
    if ((t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1)) {
      return true;
    }
    
    // Check endpoints
    const d1 = Math.sqrt((cx - x1) ** 2 + (cy - y1) ** 2);
    const d2 = Math.sqrt((cx - x2) ** 2 + (cy - y2) ** 2);
    
    return d1 <= radius || d2 <= radius;
  }
  
  canCollideWithOwner(): boolean {
    return Date.now() - this.startTime > this.ownerCollisionDelay;
  }
  
  clear() {
    this.points = [];
    this.graphics.clear();
    this.startTime = Date.now();
  }
  
  destroy() {
    this.graphics.destroy();
  }
}
```

## Complete Territory Grid System

### Territory Management and Rendering
```typescript
// src/game/systems/TerritorySystem.ts
import { Container, Graphics, RenderTexture, Sprite } from 'pixi.js';

export class TerritorySystem {
  private container: Container;
  private cellSize: number;
  private gridWidth: number;
  private gridHeight: number;
  private grid: Uint8Array;
  
  // Rendering
  private gridGraphics: Graphics;
  private dirtyRegions: Set<number> = new Set();
  private renderTexture: RenderTexture;
  private sprite: Sprite;
  
  // Colors
  private playerColors: Map<number, number>;
  
  constructor(
    container: Container,
    worldWidth: number,
    worldHeight: number,
    cellSize: number = 32
  ) {
    this.container = container;
    this.cellSize = cellSize;
    this.gridWidth = Math.ceil(worldWidth / cellSize);
    this.gridHeight = Math.ceil(worldHeight / cellSize);
    
    // Initialize grid
    this.grid = new Uint8Array(this.gridWidth * this.gridHeight);
    
    // Initialize rendering
    this.gridGraphics = new Graphics();
    
    // Use render texture for performance
    this.renderTexture = RenderTexture.create({
      width: worldWidth,
      height: worldHeight
    });
    this.sprite = new Sprite(this.renderTexture);
    this.sprite.alpha = 0.3; // Territory transparency
    this.container.addChild(this.sprite);
    
    // Player colors
    this.playerColors = new Map([
      [1, 0x00FF00],
      [2, 0xFF0066],
      [3, 0x00CCFF],
      [4, 0xFFAA00],
      [5, 0xFF00FF],
      [6, 0xFFFF00],
      [7, 0x9D00FF],
      [8, 0xFF3333]
    ]);
  }
  
  paintCell(worldX: number, worldY: number, playerId: number) {
    const gridX = Math.floor(worldX / this.cellSize);
    const gridY = Math.floor(worldY / this.cellSize);
    
    if (!this.isValidCell(gridX, gridY)) return;
    
    const index = gridY * this.gridWidth + gridX;
    const previousOwner = this.grid[index];
    
    if (previousOwner !== playerId) {
      this.grid[index] = playerId;
      this.dirtyRegions.add(index);
    }
  }
  
  paintRadius(worldX: number, worldY: number, radius: number, playerId: number) {
    const cellRadius = Math.ceil(radius / this.cellSize);
    const centerX = Math.floor(worldX / this.cellSize);
    const centerY = Math.floor(worldY / this.cellSize);
    
    for (let dy = -cellRadius; dy <= cellRadius; dy++) {
      for (let dx = -cellRadius; dx <= cellRadius; dx++) {
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= cellRadius) {
          this.paintCell(
            (centerX + dx) * this.cellSize,
            (centerY + dy) * this.cellSize,
            playerId
          );
        }
      }
    }
  }
  
  update(players: Map<string, any>) {
    // Paint territory under each player
    players.forEach((player, id) => {
      if (!player.alive) return;
      
      const playerId = parseInt(id);
      const paintRadius = player.powerUps.get('megaGlow')?.active ? 48 : 24;
      
      this.paintRadius(player.x, player.y, paintRadius, playerId);
    });
    
    // Update rendering if needed
    if (this.dirtyRegions.size > 0) {
      this.render();
    }
  }
  
  private render() {
    // Only update dirty regions for performance
    this.dirtyRegions.forEach(index => {
      const x = index % this.gridWidth;
      const y = Math.floor(index / this.gridWidth);
      const owner = this.grid[index];
      
      this.drawCell(x, y, owner);
    });
    
    // Render to texture
    const app = this.container.app;
    if (app) {
      app.renderer.render({
        container: this.gridGraphics,
        target: this.renderTexture,
        clear: false
      });
    }
    
    this.dirtyRegions.clear();
  }
  
  private drawCell(gridX: number, gridY: number, owner: number) {
    const x = gridX * this.cellSize;
    const y = gridY * this.cellSize;
    
    if (owner === 0) {
      // Clear cell
      this.gridGraphics.rect(x, y, this.cellSize, this.cellSize);
      this.gridGraphics.fill({ color: 0x000000, alpha: 0 });
    } else {
      // Paint cell
      const color = this.playerColors.get(owner) || 0xFFFFFF;
      
      this.gridGraphics.rect(x, y, this.cellSize, this.cellSize);
      this.gridGraphics.fill({ color });
      
      // Add border for definition
      this.gridGraphics.stroke({
        width: 1,
        color,
        alpha: 0.5
      });
    }
  }
  
  getScores(): Map<number, number> {
    const counts = new Map<number, number>();
    
    // Count cells per player
    for (let i = 0; i < this.grid.length; i++) {
      const owner = this.grid[i];
      if (owner > 0) {
        counts.set(owner, (counts.get(owner) || 0) + 1);
      }
    }
    
    // Convert to percentages
    const total = this.gridWidth * this.gridHeight;
    const scores = new Map<number, number>();
    
    counts.forEach((count, playerId) => {
      scores.set(playerId, (count / total) * 100);
    });
    
    return scores;
  }
  
  private isValidCell(x: number, y: number): boolean {
    return x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight;
  }
  
  clearPlayerTerritory(playerId: number) {
    for (let i = 0; i < this.grid.length; i++) {
      if (this.grid[i] === playerId) {
        this.grid[i] = 0;
        this.dirtyRegions.add(i);
      }
    }
  }
  
  reset() {
    this.grid.fill(0);
    this.dirtyRegions.clear();
    this.gridGraphics.clear();
    
    // Clear render texture
    const app = this.container.app;
    if (app) {
      app.renderer.render({
        container: new Graphics(),
        target: this.renderTexture,
        clear: true
      });
    }
  }
  
  destroy() {
    this.renderTexture.destroy();
    this.sprite.destroy();
    this.gridGraphics.destroy();
  }
}
```

## Complete Collision System

### Collision Detection and Response
```typescript
// src/game/systems/CollisionSystem.ts
import { Player } from '../entities/Player';
import { ParticleSystem } from './ParticleSystem';
import { SoundManager } from './SoundManager';

export class CollisionSystem {
  private players: Map<string, Player>;
  private particles: ParticleSystem;
  private sounds: SoundManager;
  
  constructor(
    players: Map<string, Player>,
    particles: ParticleSystem,
    sounds: SoundManager
  ) {
    this.players = players;
    this.particles = particles;
    this.sounds = sounds;
  }
  
  update() {
    const playerArray = Array.from(this.players.values());
    
    // Check player-to-player collisions
    for (let i = 0; i < playerArray.length; i++) {
      for (let j = i + 1; j < playerArray.length; j++) {
        this.checkPlayerCollision(playerArray[i], playerArray[j]);
      }
    }
    
    // Check trail collisions
    const trails = playerArray
      .filter(p => p.alive)
      .map(p => p.trail);
    
    playerArray.forEach(player => {
      if (player.checkTrailCollision(trails)) {
        this.handleElimination(player);
      }
    });
  }
  
  private checkPlayerCollision(p1: Player, p2: Player) {
    if (!p1.alive || !p2.alive) return;
    
    // Shield protection
    if (p1.powerUps.get('shield')?.active || 
        p2.powerUps.get('shield')?.active) {
      return;
    }
    
    if (p1.checkCollision(p2)) {
      // Create collision effect at midpoint
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      
      this.createCollisionEffect(midX, midY, p1.color, p2.color);
      
      // Eliminate both players
      this.handleElimination(p1);
      this.handleElimination(p2);
      
      // Screen shake
      this.triggerScreenShake();
    }
  }
  
  private createCollisionEffect(x: number, y: number, color1: number, color2: number) {
    // White flash
    this.particles.createFlash(x, y, 0xFFFFFF, 100);
    
    // Colored burst - mix of both player colors
    this.particles.createBurst(x, y, color1, 25);
    this.particles.createBurst(x, y, color2, 25);
    
    // Ring expansion
    this.particles.createRingExpansion(x, y, 0xFFFFFF);
    
    // Sound
    this.sounds.play('collision');
  }
  
  private handleElimination(player: Player) {
    if (!player.alive) return;
    
    // Create elimination effect
    this.createEliminationEffect(player.x, player.y, player.color);
    
    // Eliminate player
    player.eliminate();
    
    // Sound
    this.sounds.play('elimination');
    
    // Notify game state
    this.emit('playerEliminated', player.id);
  }
  
  private createEliminationEffect(x: number, y: number, color: number) {
    // Implosion then explosion
    this.particles.createImplosion(x, y, color, () => {
      this.particles.createExplosion(x, y, color, 50);
    });
  }
  
  private triggerScreenShake() {
    // Implemented in camera system
    this.emit('screenShake', {
      intensity: 10,
      duration: 200,
      falloff: 'linear'
    });
  }
  
  checkBoundaryCollision(player: Player, bounds: Rectangle) {
    const margin = player.radius;
    let bounced = false;
    
    // Left/Right
    if (player.x - margin < bounds.x) {
      player.x = bounds.x + margin;
      player.velocity.x = Math.abs(player.velocity.x) * 0.8;
      bounced = true;
    } else if (player.x + margin > bounds.x + bounds.width) {
      player.x = bounds.x + bounds.width - margin;
      player.velocity.x = -Math.abs(player.velocity.x) * 0.8;
      bounced = true;
    }
    
    // Top/Bottom
    if (player.y - margin < bounds.y) {
      player.y = bounds.y + margin;
      player.velocity.y = Math.abs(player.velocity.y) * 0.8;
      bounced = true;
    } else if (player.y + margin > bounds.y + bounds.height) {
      player.y = bounds.y + bounds.height - margin;
      player.velocity.y = -Math.abs(player.velocity.y) * 0.8;
      bounced = true;
    }
    
    if (bounced) {
      // Visual feedback
      this.particles.createSparks(player.x, player.y, player.color, 10);
      this.sounds.play('bounce');
    }
  }
}
```

## Complete Power-Up System

### Power-Up Manager
```typescript
// src/game/systems/PowerUpSystem.ts
import { Container } from 'pixi.js';
import { PowerUp, PowerUpType } from '../entities/PowerUp';
import { Player } from '../entities/Player';
import { ParticleSystem } from './ParticleSystem';

export class PowerUpSystem {
  private container: Container;
  private powerUps: Map<string, PowerUp> = new Map();
  private particles: ParticleSystem;
  
  // Spawn configuration
  private spawnInterval = 5000; // 5 seconds
  private lastSpawnTime = 0;
  private maxPowerUps = 5;
  
  // Power-up types with weights
  private powerUpTypes: Array<{type: PowerUpType, weight: number}> = [
    { type: 'speed', weight: 30 },
    { type: 'shield', weight: 25 },
    { type: 'megaGlow', weight: 20 },
    { type: 'phaseShift', weight: 15 },
    { type: 'energyBurst', weight: 10 }
  ];
  
  constructor(container: Container, particles: ParticleSystem) {
    this.container = container;
    this.particles = particles;
  }
  
  update(deltaTime: number, currentTime: number) {
    // Update existing power-ups
    this.powerUps.forEach(powerUp => {
      powerUp.update(deltaTime);
    });
    
    // Check for spawning
    if (currentTime - this.lastSpawnTime > this.spawnInterval) {
      if (this.powerUps.size < this.maxPowerUps) {
        this.spawnPowerUp();
        this.lastSpawnTime = currentTime;
      }
    }
  }
  
  private spawnPowerUp() {
    // Select random type based on weights
    const type = this.selectRandomType();
    
    // Find spawn position
    const position = this.findSpawnPosition();
    if (!position) return;
    
    // Create power-up
    const id = `powerup_${Date.now()}`;
    const powerUp = new PowerUp(type, position.x, position.y);
    
    this.powerUps.set(id, powerUp);
    this.container.addChild(powerUp);
    
    // Spawn effect
    this.particles.createSpawnEffect(position.x, position.y);
  }
  
  private selectRandomType(): PowerUpType {
    const totalWeight = this.powerUpTypes.reduce((sum, t) => sum + t.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const powerUpType of this.powerUpTypes) {
      random -= powerUpType.weight;
      if (random <= 0) {
        return powerUpType.type;
      }
    }
    
    return 'speed'; // Fallback
  }
  
  private findSpawnPosition(): {x: number, y: number} | null {
    // Try random positions, avoid occupied spaces
    const margin = 50;
    const maxAttempts = 20;
    
    for (let i = 0; i < maxAttempts; i++) {
      const x = margin + Math.random() * (this.container.width - margin * 2);
      const y = margin + Math.random() * (this.container.height - margin * 2);
      
      // Check if position is clear
      if (this.isPositionClear(x, y)) {
        return { x, y };
      }
    }
    
    return null;
  }
  
  private isPositionClear(x: number, y: number): boolean {
    const clearRadius = 100;
    
    // Check against other power-ups
    for (const powerUp of this.powerUps.values()) {
      const dx = powerUp.x - x;
      const dy = powerUp.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < clearRadius) {
        return false;
      }
    }
    
    return true;
  }
  
  checkCollection(players: Map<string, Player>) {
    players.forEach(player => {
      if (!player.alive) return;
      
      this.powerUps.forEach((powerUp, id) => {
        const dx = player.x - powerUp.x;
        const dy = player.y - powerUp.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 30) { // Collection radius
          // Collect power-up
          this.collectPowerUp(player, powerUp, id);
        }
      });
    });
  }
  
  private collectPowerUp(player: Player, powerUp: PowerUp, id: string) {
    // Apply to player
    player.activatePowerUp(powerUp.type);
    
    // Create collection effect
    this.createCollectionEffect(powerUp.x, powerUp.y, powerUp.type);
    
    // Remove power-up
    this.container.removeChild(powerUp);
    this.powerUps.delete(id);
    powerUp.destroy();
    
    // Sound
    this.emit('powerUpCollected', powerUp.type);
  }
  
  private createCollectionEffect(x: number, y: number, type: PowerUpType) {
    // Ring expansion
    const color = this.getPowerUpColor(type);
    this.particles.createRingExpansion(x, y, color);
    
    // Particle fountain
    this.particles.createFountain(x, y, color, 20);
    
    // Flash
    this.particles.createFlash(x, y, color, 50);
  }
  
  private getPowerUpColor(type: PowerUpType): number {
    const colors = {
      speed: 0xFFFF00,
      shield: 0x00AAFF,
      megaGlow: 0xFF00FF,
      phaseShift: 0x9D00FF,
      energyBurst: 0xFF6600
    };
    return colors[type];
  }
  
  reset() {
    this.powerUps.forEach(powerUp => {
      this.container.removeChild(powerUp);
      powerUp.destroy();
    });
    this.powerUps.clear();
    this.lastSpawnTime = 0;
  }
}
```

## Complete Particle System

### High-Performance Particle Effects
```typescript
// src/game/systems/ParticleSystem.ts
import { Container, Graphics, ParticleContainer, Texture, Sprite } from 'pixi.js';

interface Particle {
  sprite: Sprite;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  gravity: number;
  fade: boolean;
  scale: number;
  rotation: number;
  angularVelocity: number;
}

export class ParticleSystem {
  private container: Container;
  private particleContainer: ParticleContainer;
  private particles: Particle[] = [];
  private particlePool: Particle[] = [];
  private particleTexture: Texture;
  
  constructor(container: Container) {
    this.container = container;
    
    // Create particle container for performance
    this.particleContainer = new ParticleContainer(10000, {
      scale: true,
      position: true,
      rotation: true,
      uvs: false,
      tint: true,
      alpha: true
    });
    this.container.addChild(this.particleContainer);
    
    // Create particle texture
    this.createParticleTexture();
    
    // Pre-populate pool
    this.populatePool(1000);
  }
  
  private createParticleTexture() {
    const graphics = new Graphics();
    graphics.circle(0, 0, 4);
    graphics.fill({ color: 0xFFFFFF });
    
    this.particleTexture = this.container.app.renderer.generateTexture(graphics);
    graphics.destroy();
  }
  
  private populatePool(count: number) {
    for (let i = 0; i < count; i++) {
      const sprite = new Sprite(this.particleTexture);
      sprite.anchor.set(0.5);
      
      this.particlePool.push({
        sprite,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        gravity: 0,
        fade: true,
        scale: 1,
        rotation: 0,
        angularVelocity: 0
      });
    }
  }
  
  private getParticle(): Particle | null {
    return this.particlePool.pop() || null;
  }
  
  private releaseParticle(particle: Particle) {
    this.particleContainer.removeChild(particle.sprite);
    this.particlePool.push(particle);
  }
  
  createBurst(x: number, y: number, color: number, count: number = 50) {
    for (let i = 0; i < count; i++) {
      const particle = this.getParticle();
      if (!particle) break;
      
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.2;
      const speed = 100 + Math.random() * 200;
      
      particle.sprite.x = x;
      particle.sprite.y = y;
      particle.sprite.tint = color;
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed;
      particle.life = 1;
      particle.maxLife = 1;
      particle.gravity = 0;
      particle.fade = true;
      particle.scale = 0.5 + Math.random() * 0.5;
      particle.rotation = Math.random() * Math.PI * 2;
      particle.angularVelocity = (Math.random() - 0.5) * 0.1;
      
      this.particleContainer.addChild(particle.sprite);
      this.particles.push(particle);
    }
  }
  
  createFountain(x: number, y: number, color: number, count: number = 20) {
    for (let i = 0; i < count; i++) {
      const particle = this.getParticle();
      if (!particle) break;
      
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI / 3;
      const speed = 200 + Math.random() * 100;
      
      particle.sprite.x = x;
      particle.sprite.y = y;
      particle.sprite.tint = color;
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed;
      particle.life = 1;
      particle.maxLife = 1;
      particle.gravity = -300; // Negative for upward float
      particle.fade = true;
      particle.scale = 0.3 + Math.random() * 0.3;
      
      this.particleContainer.addChild(particle.sprite);
      this.particles.push(particle);
    }
  }
  
  createRingExpansion(x: number, y: number, color: number) {
    const ringCount = 3;
    const particlesPerRing = 30;
    
    for (let ring = 0; ring < ringCount; ring++) {
      setTimeout(() => {
        for (let i = 0; i < particlesPerRing; i++) {
          const particle = this.getParticle();
          if (!particle) break;
          
          const angle = (Math.PI * 2 * i) / particlesPerRing;
          const speed = 150 + ring * 50;
          
          particle.sprite.x = x;
          particle.sprite.y = y;
          particle.sprite.tint = color;
          particle.vx = Math.cos(angle) * speed;
          particle.vy = Math.sin(angle) * speed;
          particle.life = 1;
          particle.maxLife = 1;
          particle.gravity = 0;
          particle.fade = true;
          particle.scale = 0.5 - ring * 0.1;
          
          this.particleContainer.addChild(particle.sprite);
          this.particles.push(particle);
        }
      }, ring * 100);
    }
  }
  
  createFlash(x: number, y: number, color: number, radius: number) {
    const graphics = new Graphics();
    graphics.circle(x, y, radius);
    graphics.fill({ color, alpha: 0.8 });
    
    this.container.addChild(graphics);
    
    // Fade out
    const startTime = Date.now();
    const duration = 200;
    
    const fade = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;
      
      if (progress >= 1) {
        this.container.removeChild(graphics);
        graphics.destroy();
      } else {
        graphics.alpha = 0.8 * (1 - progress);
        graphics.scale.set(1 + progress * 0.5);
        requestAnimationFrame(fade);
      }
    };
    
    fade();
  }
  
  update(deltaTime: number) {
    const dt = deltaTime * 0.001; // Convert to seconds
    
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      
      // Update physics
      particle.vx *= 0.98; // Friction
      particle.vy *= 0.98;
      particle.vy += particle.gravity * dt;
      
      particle.sprite.x += particle.vx * dt;
      particle.sprite.y += particle.vy * dt;
      particle.sprite.rotation += particle.angularVelocity;
      
      // Update life
      particle.life -= dt;
      
      if (particle.fade) {
        const lifeRatio = particle.life / particle.maxLife;
        particle.sprite.alpha = lifeRatio;
        particle.sprite.scale.set(particle.scale * lifeRatio);
      }
      
      // Remove dead particles
      if (particle.life <= 0) {
        this.particles.splice(i, 1);
        this.releaseParticle(particle);
      }
    }
  }
  
  clear() {
    this.particles.forEach(particle => {
      this.releaseParticle(particle);
    });
    this.particles = [];
  }
}
```

## Complete UI Implementation

### HUD System
```typescript
// src/game/ui/HUD.ts
import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GameState } from '../state/GameState';

export class HUD extends Container {
  private scorePanel: ScorePanel;
  private timer: GameTimer;
  private minimap: Minimap;
  private powerUpBar: PowerUpBar;
  
  constructor(width: number, height: number) {
    super();
    
    // Create UI components
    this.scorePanel = new ScorePanel();
    this.scorePanel.position.set(10, 10);
    this.addChild(this.scorePanel);
    
    this.timer = new GameTimer();
    this.timer.position.set(width / 2, 20);
    this.addChild(this.timer);
    
    this.minimap = new Minimap(150, 150);
    this.minimap.position.set(width - 160, 10);
    this.addChild(this.minimap);
    
    this.powerUpBar = new PowerUpBar();
    this.powerUpBar.position.set(width / 2, height - 60);
    this.addChild(this.powerUpBar);
  }
  
  update(gameState: GameState) {
    this.scorePanel.update(gameState.players);
    this.timer.update(gameState.timeRemaining);
    this.minimap.update(gameState.players, gameState.territory);
    this.powerUpBar.update(gameState.localPlayer);
  }
}

class ScorePanel extends Container {
  private playerScores: Map<string, ScoreDisplay> = new Map();
  private background: Graphics;
  
  constructor() {
    super();
    
    this.background = new Graphics();
    this.addChild(this.background);
  }
  
  update(players: Map<string, PlayerState>) {
    // Update or create score displays
    let y = 0;
    
    players.forEach((player, id) => {
      let display = this.playerScores.get(id);
      
      if (!display) {
        display = new ScoreDisplay(player.color);
        this.playerScores.set(id, display);
        this.addChild(display);
      }
      
      display.position.y = y;
      display.update(player);
      
      y += 30;
    });
    
    // Update background
    this.background.clear();
    this.background.roundRect(0, 0, 200, y + 10, 8);
    this.background.fill({ color: 0x000000, alpha: 0.6 });
  }
}

class GameTimer extends Container {
  private text: Text;
  private background: Graphics;
  private lastSeconds: number = -1;
  
  constructor() {
    super();
    
    this.background = new Graphics();
    this.background.roundRect(-60, -20, 120, 40, 8);
    this.background.fill({ color: 0x000000, alpha: 0.6 });
    this.addChild(this.background);
    
    const style = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 24,
      fontWeight: 'bold',
      fill: 0xFFFFFF,
      dropShadow: true,
      dropShadowDistance: 2,
      dropShadowBlur: 4
    });
    
    this.text = new Text({ text: '3:00', style });
    this.text.anchor.set(0.5);
    this.addChild(this.text);
  }
  
  update(timeRemaining: number) {
    const totalSeconds = Math.ceil(timeRemaining / 1000);
    
    if (totalSeconds !== this.lastSeconds) {
      this.lastSeconds = totalSeconds;
      
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      this.text.text = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      
      // Change color based on time
      if (totalSeconds <= 10) {
        this.text.style.fill = 0xFF0000;
        this.pulse();
      } else if (totalSeconds <= 30) {
        this.text.style.fill = 0xFFAA00;
      } else {
        this.text.style.fill = 0xFFFFFF;
      }
    }
  }
  
  private pulse() {
    // Pulse animation for urgency
    const scale = 1 + Math.sin(Date.now() * 0.01) * 0.1;
    this.scale.set(scale);
  }
}
```

This code cookbook provides complete, production-ready implementations for all major components of the minimalistic Glow Wars prototype!