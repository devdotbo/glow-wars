# Convex Integration Guide

## Overview

This guide covers integrating the PixiJS minimalistic prototype with the existing Convex backend. Convex provides real-time synchronization, making it perfect for multiplayer games.

## Architecture Overview

```
┌─────────────────┐     WebSocket      ┌─────────────────┐
│  PixiJS Client  │◄──────────────────►│  Convex Backend │
│                 │                     │                 │
│ - Game Loop     │     Real-time      │ - Game State    │
│ - Rendering     │◄──────────────────►│ - Validation    │
│ - Input         │                     │ - Broadcasting  │
└─────────────────┘                     └─────────────────┘
```

## Setting Up Convex Client

### Installation
```bash
pnpm add convex @tanstack/react-query
```

### Client Configuration
```typescript
// src/convex/client.ts
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { ConvexQueryClient } from '@convex-dev/react-query';
import { QueryClient } from '@tanstack/react-query';
import { api } from '../../convex/_generated/api';

// Create Convex client
const convexClient = new ConvexReactClient(
  import.meta.env.VITE_CONVEX_URL as string
);

// Create query client for caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      refetchInterval: false,
    },
  },
});

// Bridge Convex with React Query
const convexQueryClient = new ConvexQueryClient(convexClient);
convexQueryClient.connect(queryClient);

export { convexClient, queryClient, convexQueryClient };
```

## Game Session Management

### Creating/Joining Games
```typescript
// src/game/network/GameSession.ts
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

export class GameSessionManager {
  private gameId: string | null = null;
  private playerId: string | null = null;
  
  async createGame(playerName: string): Promise<string> {
    const response = await convexClient.mutation(api.game.createGame, {
      hostName: playerName,
      maxPlayers: 8,
      gameDuration: 180000, // 3 minutes
    });
    
    this.gameId = response.gameId;
    this.playerId = response.playerId;
    
    return this.gameId;
  }
  
  async joinGame(gameCode: string, playerName: string): Promise<void> {
    const response = await convexClient.mutation(api.game.joinGame, {
      gameCode,
      playerName,
    });
    
    this.gameId = response.gameId;
    this.playerId = response.playerId;
  }
  
  subscribeToGame(callback: (state: GameState) => void) {
    if (!this.gameId) throw new Error('Not in a game');
    
    // Subscribe to real-time updates
    return convexClient.onUpdate(
      api.game.watchGame,
      { gameId: this.gameId },
      callback
    );
  }
}
```

### Convex Functions Needed
```typescript
// convex/game.ts
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const createGame = mutation({
  args: {
    hostName: v.string(),
    maxPlayers: v.number(),
    gameDuration: v.number(),
  },
  returns: v.object({
    gameId: v.string(),
    playerId: v.string(),
    gameCode: v.string(),
  }),
  handler: async (ctx, args) => {
    // Generate unique game code
    const gameCode = generateGameCode();
    
    // Create game
    const gameId = await ctx.db.insert('games', {
      code: gameCode,
      hostId: null, // Will be set to first player
      maxPlayers: args.maxPlayers,
      duration: args.gameDuration,
      state: 'waiting',
      startTime: null,
      players: [],
      territory: new Array(50 * 50).fill(0), // 50x50 grid
      powerUps: [],
    });
    
    // Create player
    const playerId = await ctx.db.insert('players', {
      gameId,
      name: args.hostName,
      position: { x: 400, y: 300 },
      velocity: { x: 0, y: 0 },
      color: 0x00FF00, // Assign color
      trail: [],
      alive: true,
      score: 0,
      powerUps: {},
    });
    
    // Update game with host
    await ctx.db.patch(gameId, {
      hostId: playerId,
      players: [playerId],
    });
    
    return { gameId, playerId, gameCode };
  },
});

export const watchGame = query({
  args: { gameId: v.string() },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) return null;
    
    // Get all players
    const players = await Promise.all(
      game.players.map(id => ctx.db.get(id))
    );
    
    return {
      ...game,
      players: players.filter(Boolean),
    };
  },
});
```

## Real-Time State Synchronization

### Player Movement
```typescript
// src/game/network/NetworkSync.ts
export class NetworkSync {
  private localPlayerId: string;
  private updateQueue: PlayerUpdate[] = [];
  private updateInterval: number = 50; // 20 Hz
  private lastUpdateTime: number = 0;
  
  constructor(localPlayerId: string) {
    this.localPlayerId = localPlayerId;
  }
  
  queueMovement(x: number, y: number, vx: number, vy: number) {
    this.updateQueue.push({
      type: 'position',
      data: { x, y, vx, vy },
      timestamp: Date.now(),
    });
  }
  
  async sendUpdates(currentTime: number) {
    if (currentTime - this.lastUpdateTime < this.updateInterval) return;
    if (this.updateQueue.length === 0) return;
    
    // Batch updates
    const updates = this.updateQueue.splice(0, 10);
    
    try {
      await convexClient.mutation(api.game.updatePlayer, {
        playerId: this.localPlayerId,
        updates,
      });
      
      this.lastUpdateTime = currentTime;
    } catch (error) {
      // Re-queue on failure
      this.updateQueue.unshift(...updates);
    }
  }
}

// Convex mutation for player updates
export const updatePlayer = mutation({
  args: {
    playerId: v.string(),
    updates: v.array(v.object({
      type: v.string(),
      data: v.any(),
      timestamp: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId);
    if (!player) return;
    
    // Process updates
    for (const update of args.updates) {
      switch (update.type) {
        case 'position':
          await ctx.db.patch(args.playerId, {
            position: { x: update.data.x, y: update.data.y },
            velocity: { x: update.data.vx, y: update.data.vy },
          });
          
          // Update trail
          const trail = [...player.trail, { 
            x: update.data.x, 
            y: update.data.y,
            timestamp: update.timestamp,
          }];
          
          // Keep last 50 points
          if (trail.length > 50) trail.shift();
          
          await ctx.db.patch(args.playerId, { trail });
          break;
      }
    }
  },
});
```

### Client Prediction & Reconciliation
```typescript
// src/game/network/ClientPrediction.ts
export class ClientPrediction {
  private serverState: PlayerState | null = null;
  private predictedState: PlayerState;
  private inputBuffer: Input[] = [];
  private lastProcessedInput: number = 0;
  
  constructor(initialState: PlayerState) {
    this.predictedState = { ...initialState };
  }
  
  // Apply input locally immediately
  applyInput(input: Input) {
    // Store input for reconciliation
    input.sequence = ++this.lastProcessedInput;
    this.inputBuffer.push(input);
    
    // Apply to predicted state
    this.applyInputToState(this.predictedState, input);
  }
  
  // Receive authoritative state from server
  receiveServerState(serverState: PlayerState) {
    this.serverState = serverState;
    
    // Start from server state
    this.predictedState = { ...serverState };
    
    // Re-apply unacknowledged inputs
    const acknowledgedInput = serverState.lastProcessedInput || 0;
    
    this.inputBuffer = this.inputBuffer.filter(input => {
      if (input.sequence <= acknowledgedInput) {
        return false; // Remove acknowledged
      }
      
      // Re-apply unacknowledged
      this.applyInputToState(this.predictedState, input);
      return true;
    });
  }
  
  private applyInputToState(state: PlayerState, input: Input) {
    // Simple movement prediction
    const speed = 200 * input.deltaTime * 0.001;
    
    state.position.x += input.direction.x * speed;
    state.position.y += input.direction.y * speed;
    state.velocity = {
      x: input.direction.x * 200,
      y: input.direction.y * 200,
    };
  }
  
  getInterpolatedState(alpha: number): PlayerState {
    // Interpolate between server and predicted for smoothness
    if (!this.serverState) return this.predictedState;
    
    return {
      position: {
        x: lerp(this.serverState.position.x, this.predictedState.position.x, alpha),
        y: lerp(this.serverState.position.y, this.predictedState.position.y, alpha),
      },
      velocity: this.predictedState.velocity,
      // ... other fields
    };
  }
}
```

## Territory Synchronization

### Efficient Territory Updates
```typescript
// src/game/network/TerritorySync.ts
export class TerritorySync {
  private pendingCells: Map<string, number> = new Map();
  private syncInterval: number = 100; // 10 Hz
  private lastSync: number = 0;
  
  paintCell(x: number, y: number, playerId: number) {
    const key = `${x},${y}`;
    this.pendingCells.set(key, playerId);
  }
  
  async syncToServer(currentTime: number) {
    if (currentTime - this.lastSync < this.syncInterval) return;
    if (this.pendingCells.size === 0) return;
    
    // Convert to array format
    const cells = Array.from(this.pendingCells.entries()).map(([key, playerId]) => {
      const [x, y] = key.split(',').map(Number);
      return { x, y, playerId };
    });
    
    try {
      await convexClient.mutation(api.game.updateTerritory, {
        gameId: this.gameId,
        cells,
      });
      
      this.pendingCells.clear();
      this.lastSync = currentTime;
    } catch (error) {
      console.error('Territory sync failed:', error);
    }
  }
}

// Convex mutation for territory
export const updateTerritory = mutation({
  args: {
    gameId: v.string(),
    cells: v.array(v.object({
      x: v.number(),
      y: v.number(),
      playerId: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) return;
    
    const territory = [...game.territory];
    const gridWidth = 50;
    
    // Update cells
    for (const cell of args.cells) {
      if (cell.x >= 0 && cell.x < gridWidth && 
          cell.y >= 0 && cell.y < gridWidth) {
        const index = cell.y * gridWidth + cell.x;
        territory[index] = cell.playerId;
      }
    }
    
    await ctx.db.patch(args.gameId, { territory });
  },
});
```

## Power-Up Synchronization

### Server-Authoritative Power-Ups
```typescript
// convex/powerUps.ts
export const spawnPowerUp = mutation({
  args: {
    gameId: v.string(),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game || game.state !== 'playing') return;
    
    // Random type and position
    const types = ['speed', 'shield', 'megaGlow', 'phaseShift', 'energyBurst'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    const powerUp = {
      id: generateId(),
      type,
      position: {
        x: 100 + Math.random() * 1080,
        y: 100 + Math.random() * 520,
      },
      spawnTime: Date.now(),
    };
    
    await ctx.db.patch(args.gameId, {
      powerUps: [...game.powerUps, powerUp],
    });
  },
});

export const collectPowerUp = mutation({
  args: {
    gameId: v.string(),
    playerId: v.string(),
    powerUpId: v.string(),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    const player = await ctx.db.get(args.playerId);
    
    if (!game || !player) return;
    
    // Find power-up
    const powerUpIndex = game.powerUps.findIndex(p => p.id === args.powerUpId);
    if (powerUpIndex === -1) return;
    
    const powerUp = game.powerUps[powerUpIndex];
    
    // Check collection distance (server validates)
    const dx = player.position.x - powerUp.position.x;
    const dy = player.position.y - powerUp.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 30) return; // Too far
    
    // Remove power-up
    const newPowerUps = [...game.powerUps];
    newPowerUps.splice(powerUpIndex, 1);
    await ctx.db.patch(args.gameId, { powerUps: newPowerUps });
    
    // Apply to player
    const playerPowerUps = { ...player.powerUps };
    playerPowerUps[powerUp.type] = {
      active: true,
      startTime: Date.now(),
      duration: getPowerUpDuration(powerUp.type),
    };
    
    await ctx.db.patch(args.playerId, { powerUps: playerPowerUps });
  },
});
```

## Lag Compensation

### Interpolation for Remote Players
```typescript
// src/game/network/Interpolation.ts
export class RemotePlayerInterpolator {
  private stateBuffer: Array<{state: PlayerState, timestamp: number}> = [];
  private maxBufferSize: number = 10;
  private interpolationDelay: number = 100; // 100ms in the past
  
  addState(state: PlayerState, timestamp: number) {
    this.stateBuffer.push({ state, timestamp });
    
    // Keep buffer size limited
    if (this.stateBuffer.length > this.maxBufferSize) {
      this.stateBuffer.shift();
    }
  }
  
  getInterpolatedState(currentTime: number): PlayerState | null {
    // Render 100ms in the past for smoothness
    const renderTime = currentTime - this.interpolationDelay;
    
    // Find states to interpolate between
    let before: typeof this.stateBuffer[0] | null = null;
    let after: typeof this.stateBuffer[0] | null = null;
    
    for (let i = 0; i < this.stateBuffer.length - 1; i++) {
      if (this.stateBuffer[i].timestamp <= renderTime &&
          this.stateBuffer[i + 1].timestamp >= renderTime) {
        before = this.stateBuffer[i];
        after = this.stateBuffer[i + 1];
        break;
      }
    }
    
    if (!before || !after) {
      // Use latest state if no interpolation possible
      return this.stateBuffer[this.stateBuffer.length - 1]?.state || null;
    }
    
    // Interpolate between states
    const timeDiff = after.timestamp - before.timestamp;
    const alpha = (renderTime - before.timestamp) / timeDiff;
    
    return {
      position: {
        x: lerp(before.state.position.x, after.state.position.x, alpha),
        y: lerp(before.state.position.y, after.state.position.y, alpha),
      },
      // ... interpolate other fields
    };
  }
}
```

### Network Quality Indicators
```typescript
// src/game/ui/NetworkIndicator.ts
export class NetworkIndicator extends Container {
  private pingText: Text;
  private indicator: Graphics;
  private latencyHistory: number[] = [];
  
  update(latency: number) {
    this.latencyHistory.push(latency);
    if (this.latencyHistory.length > 30) {
      this.latencyHistory.shift();
    }
    
    const avgLatency = this.latencyHistory.reduce((a, b) => a + b) / this.latencyHistory.length;
    
    // Update display
    this.pingText.text = `${Math.round(avgLatency)}ms`;
    
    // Update color indicator
    let color: number;
    let bars: number;
    
    if (avgLatency < 50) {
      color = 0x00FF00; // Green
      bars = 3;
    } else if (avgLatency < 150) {
      color = 0xFFAA00; // Orange
      bars = 2;
    } else {
      color = 0xFF0000; // Red
      bars = 1;
    }
    
    this.drawIndicator(color, bars);
  }
  
  private drawIndicator(color: number, bars: number) {
    this.indicator.clear();
    
    for (let i = 0; i < 3; i++) {
      const height = 4 + i * 2;
      const alpha = i < bars ? 1 : 0.2;
      
      this.indicator.rect(i * 6, 10 - height, 4, height);
      this.indicator.fill({ color, alpha });
    }
  }
}
```

## Error Handling & Reconnection

### Connection Manager
```typescript
// src/game/network/ConnectionManager.ts
export class ConnectionManager {
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  
  constructor() {
    // Monitor connection state
    convexClient.onConnectionStateChange((state) => {
      this.handleConnectionChange(state);
    });
  }
  
  private handleConnectionChange(state: ConnectionState) {
    switch (state) {
      case 'connected':
        this.reconnectAttempts = 0;
        this.emit('connected');
        break;
        
      case 'disconnected':
        this.emit('disconnected');
        this.attemptReconnect();
        break;
        
      case 'reconnecting':
        this.emit('reconnecting', this.reconnectAttempts);
        break;
    }
  }
  
  private async attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('reconnectFailed');
      return;
    }
    
    this.reconnectAttempts++;
    
    // Exponential backoff
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    setTimeout(() => {
      convexClient.reconnect();
    }, delay);
  }
  
  async resyncGameState() {
    // Re-fetch full game state after reconnection
    const gameState = await convexClient.query(api.game.getFullState, {
      gameId: this.gameId,
    });
    
    // Reset local state to match server
    this.emit('stateReset', gameState);
  }
}
```

## Performance Considerations

### Batching Updates
```typescript
// Batch multiple operations into single mutation
export const batchUpdate = mutation({
  args: {
    gameId: v.string(),
    playerId: v.string(),
    updates: v.object({
      position: v.optional(v.object({ x: v.number(), y: v.number() })),
      territory: v.optional(v.array(v.object({ 
        x: v.number(), 
        y: v.number() 
      }))),
      collision: v.optional(v.string()), // Other player ID
    }),
  },
  handler: async (ctx, args) => {
    // Process all updates in single transaction
    const tasks = [];
    
    if (args.updates.position) {
      tasks.push(updatePosition(ctx, args.playerId, args.updates.position));
    }
    
    if (args.updates.territory) {
      tasks.push(updateTerritory(ctx, args.gameId, args.updates.territory));
    }
    
    if (args.updates.collision) {
      tasks.push(handleCollision(ctx, args.playerId, args.updates.collision));
    }
    
    await Promise.all(tasks);
  },
});
```

### Subscription Optimization
```typescript
// Only subscribe to relevant data
export const watchPlayerView = query({
  args: { 
    gameId: v.string(),
    viewBounds: v.object({
      x: v.number(),
      y: v.number(),
      width: v.number(),
      height: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) return null;
    
    // Only return players within view bounds
    const visiblePlayers = game.players.filter(playerId => {
      const player = await ctx.db.get(playerId);
      return player && isInBounds(player.position, args.viewBounds);
    });
    
    // Only return visible territory cells
    const visibleTerritory = getVisibleCells(game.territory, args.viewBounds);
    
    return {
      players: visiblePlayers,
      territory: visibleTerritory,
      powerUps: game.powerUps.filter(p => isInBounds(p.position, args.viewBounds)),
    };
  },
});
```

## Testing Multiplayer

### Local Testing Setup
```typescript
// src/test/multiplayerTest.ts
export async function runMultiplayerTest() {
  // Create multiple game instances
  const instances = [];
  
  for (let i = 0; i < 4; i++) {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    document.body.appendChild(canvas);
    
    const game = new GlowWarsGame(canvas);
    await game.init();
    
    // Join same game
    if (i === 0) {
      await game.createGame(`Player ${i + 1}`);
    } else {
      await game.joinGame(gameCode, `Player ${i + 1}`);
    }
    
    instances.push(game);
  }
  
  // Simulate different latencies
  instances.forEach((game, i) => {
    game.setSimulatedLatency(50 + i * 50);
  });
}
```

This integration provides a solid foundation for real-time multiplayer gameplay with Convex!