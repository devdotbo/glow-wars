# Glow Wars UI/UX Specifications

## Design Principles

1. **Clarity**: Information should be instantly readable during fast-paced gameplay
2. **Minimalism**: UI should not obstruct the game view
3. **Responsiveness**: Adapt seamlessly to different screen sizes
4. **Accessibility**: Support colorblind modes and customizable UI scale
5. **Feedback**: Every action should have immediate visual/audio feedback

## Layout System

### Screen Regions

```typescript
// app/game/ui/layout.ts
export const UI_LAYOUT = {
  // Safe areas for UI elements (avoiding device notches)
  safeArea: {
    top: 20,
    bottom: 20,
    left: 20,
    right: 20,
  },
  
  // HUD positions (percentage-based)
  hud: {
    topBar: { x: 0.5, y: 0.05, anchor: { x: 0.5, y: 0.5 } },
    scores: { x: 0.02, y: 0.05, anchor: { x: 0, y: 0.5 } },
    timer: { x: 0.5, y: 0.05, anchor: { x: 0.5, y: 0.5 } },
    minimap: { x: 0.98, y: 0.98, anchor: { x: 1, y: 1 } },
    powerUps: { x: 0.5, y: 0.95, anchor: { x: 0.5, y: 1 } },
  },
  
  // Responsive breakpoints
  breakpoints: {
    mobile: 768,
    tablet: 1024,
    desktop: 1440,
  },
}
```

## HUD Components

### 1. Score Display

```typescript
// app/game/ui/ScoreDisplay.tsx
interface ScoreDisplayProps {
  players: Array<{
    id: string
    name: string
    color: number
    score: number
    territoryPercent: number
    isAlive: boolean
  }>
  currentPlayerId: string
}

// Visual specs:
// - Max 8 players shown
// - Each entry: 200x30px
// - Font: Neon/Tech style, 14px
// - Glow effect matching player color
// - Dead players shown with 50% opacity
// - Current player highlighted with border
```

**Layout Example:**
```
┌─────────────────────────┐
│ 🟢 Player1    45%  1250 │ <- Current player (highlighted)
│ 🔴 Player2    30%   980 │
│ 🔵 Player3    15%   650 │
│ ⚫ Player4     0%   320 │ <- Dead (faded)
└─────────────────────────┘
```

### 2. Timer Display

```typescript
// app/game/ui/Timer.tsx
interface TimerProps {
  timeRemaining: number // seconds
  totalTime: number
  isWarning: boolean // Last 30 seconds
}

// Visual specs:
// - Size: 120x60px
// - Font: Bold, 32px
// - Format: "2:30"
// - Warning state: Red glow, pulsing
// - Victory conditions shown below if close
```

**States:**
- Normal: White text with subtle glow
- Warning (<30s): Red text, pulsing animation
- Overtime: "SUDDEN DEATH" text, rainbow effect

### 3. Minimap

```typescript
// app/game/ui/Minimap.tsx
interface MinimapProps {
  worldSize: { width: number; height: number }
  players: Position[]
  territory: TerritoryData
  viewportBounds: Rectangle
  size?: number // Default 200x200
}

// Features:
// - Real-time player positions
// - Territory ownership visualization
// - Current viewport indicator
// - Click to pan camera (desktop only)
// - Semi-transparent background
```

**Visual Design:**
```
┌─────────────┐
│░░░░█████░░░░│ <- Territory regions
│░░███████░░░░│
│░░░░░⚡░░░░░░░│ <- Power-ups
│░░●░░░░░○░░░░│ <- Players
│░░░┌───┐░░░░░│ <- Viewport
│░░░└───┘░░░░░│
└─────────────┘
```

### 4. Power-Up Indicators

```typescript
// app/game/ui/PowerUpIndicators.tsx
interface PowerUpIndicatorsProps {
  activePowerUps: Array<{
    type: PowerUpType
    remainingTime: number
    cooldown?: number
  }>
}

// Layout: Horizontal bar, centered bottom
// Each indicator: 48x48px with progress ring
// Active effects show remaining time
// Cooldowns show as grayed out with timer
```

## Game State Screens

### 1. Main Menu

```typescript
// app/routes/index.tsx
// Components:
// - Logo with glow animation
// - "Play" button (primary CTA)
// - "How to Play" button
// - Settings icon (top right)
// - User profile (top left)
```

**Layout:**
```
┌─────────────────────────────┐
│ [Profile]         [Settings]│
│                             │
│      GLOW WARS             │
│    ~~~~~~~~~~~~            │
│                             │
│    [ PLAY NOW ]            │
│                             │
│   [ How to Play ]          │
│                             │
└─────────────────────────────┘
```

### 2. Game Lobby

```typescript
// app/game/ui/GameLobby.tsx
interface GameLobbyProps {
  players: Player[]
  gameCode: string
  isHost: boolean
  countdown?: number
}

// Features:
// - Player list with ready states
// - Game code display with copy button
// - Start button (host only)
// - Leave button
// - Auto-start countdown when full
```

### 3. Victory Screen

```typescript
// app/game/ui/VictoryScreen.tsx
interface VictoryScreenProps {
  winner: Player
  finalScores: Score[]
  stats: GameStats
  nextGameCountdown: number
}

// Animations:
// - Confetti particle effect
// - Winner name with rainbow glow
// - Score bars animating to final values
// - "Play Again" button pulse
```

## Mobile Controls

### Touch Control Scheme

```typescript
// app/game/ui/TouchControls.tsx
export const TOUCH_CONTROLS = {
  // Virtual joystick
  joystick: {
    size: 120,
    position: { x: 150, y: -150 }, // From bottom-left
    deadZone: 0.15,
    opacity: 0.5,
  },
  
  // Action buttons (if needed)
  buttons: {
    boost: {
      size: 60,
      position: { x: -100, y: -100 }, // From bottom-right
      icon: 'lightning',
    },
  },
}

// Gesture support:
// - Swipe: Quick direction change
// - Pinch: Zoom minimap (tablet only)
// - Double tap: Use power-up
```

### Responsive Scaling

```typescript
// app/game/ui/ResponsiveUI.ts
export class ResponsiveUI {
  static getScale(screenWidth: number): number {
    if (screenWidth < 768) return 0.8      // Mobile
    if (screenWidth < 1024) return 0.9     // Tablet
    if (screenWidth < 1440) return 1.0     // Desktop
    return 1.2                              // Large screens
  }
  
  static getFontSize(base: number, screenWidth: number): number {
    const scale = this.getScale(screenWidth)
    return Math.round(base * scale)
  }
  
  static shouldShowMobileControls(): boolean {
    return 'ontouchstart' in window && window.innerWidth < 1024
  }
}
```

## Accessibility Features

### 1. Colorblind Modes

```typescript
// app/game/ui/accessibility.ts
export enum ColorblindMode {
  NONE = 'none',
  PROTANOPIA = 'protanopia',      // Red-blind
  DEUTERANOPIA = 'deuteranopia',  // Green-blind
  TRITANOPIA = 'tritanopia',      // Blue-blind
}

// Apply filters to entire game canvas
export function applyColorblindFilter(mode: ColorblindMode): Filter | null {
  switch (mode) {
    case ColorblindMode.PROTANOPIA:
      return new ColorMatrixFilter()
        .protanopia()
    case ColorblindMode.DEUTERANOPIA:
      return new ColorMatrixFilter()
        .deuteranopia()
    case ColorblindMode.TRITANOPIA:
      return new ColorMatrixFilter()
        .tritanopia()
    default:
      return null
  }
}
```

### 2. UI Scale Options

```typescript
// Settings: 75%, 100%, 125%, 150%
export const UI_SCALE_OPTIONS = [0.75, 1.0, 1.25, 1.5]

// Apply to all UI elements
export function applyUIScale(scale: number) {
  document.documentElement.style.setProperty('--ui-scale', scale.toString())
}
```

### 3. High Contrast Mode

```typescript
// Increase visibility for visual impairments
export const HIGH_CONTRAST_THEME = {
  background: 0x000000,
  foreground: 0xFFFFFF,
  player1: 0x00FF00,
  player2: 0xFF0000,
  player3: 0x0000FF,
  player4: 0xFFFF00,
  // More distinct colors
}
```

## Animation Specifications

### UI Animations

```typescript
// app/game/ui/animations.ts
export const UI_ANIMATIONS = {
  // Fade in/out
  fadeIn: {
    duration: 300,
    easing: 'easeOutQuad',
  },
  
  // Score changes
  scoreIncrement: {
    duration: 500,
    easing: 'easeOutElastic',
  },
  
  // Button hover
  buttonHover: {
    scale: 1.05,
    duration: 200,
    easing: 'easeOutQuad',
  },
  
  // Power-up pickup
  powerUpCollect: {
    scale: [1, 1.5, 0],
    duration: 400,
    easing: 'easeOutBack',
  },
  
  // Victory celebration
  victory: {
    duration: 2000,
    particleCount: 200,
    colors: [0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00],
  },
}
```

### Transition Effects

```typescript
// Screen transitions
export class ScreenTransition {
  static async fadeTransition(
    fromScreen: Container,
    toScreen: Container,
    duration = 500
  ) {
    // Fade out old screen
    await gsap.to(fromScreen, {
      alpha: 0,
      duration: duration / 1000,
      ease: 'power2.inOut',
    })
    
    fromScreen.visible = false
    toScreen.visible = true
    toScreen.alpha = 0
    
    // Fade in new screen
    await gsap.to(toScreen, {
      alpha: 1,
      duration: duration / 1000,
      ease: 'power2.inOut',
    })
  }
}
```

## Settings Menu

### Settings Categories

```typescript
// app/game/ui/SettingsMenu.tsx
interface GameSettings {
  // Graphics
  effectQuality: 'low' | 'medium' | 'high' | 'ultra'
  particleDensity: number // 0-100
  enableGlow: boolean
  enableScreenShake: boolean
  
  // Audio
  masterVolume: number // 0-100
  sfxVolume: number
  musicVolume: number
  
  // Controls
  sensitivity: number // 0.5-2.0
  invertY: boolean // Mobile only
  vibration: boolean // Mobile only
  
  // Accessibility
  colorblindMode: ColorblindMode
  uiScale: number
  highContrast: boolean
  reduceMotion: boolean
  
  // Game
  showFPS: boolean
  showPing: boolean
  spectatorMode: 'follow' | 'free' | 'overview'
}
```

### Settings UI Layout

```
┌─────────────────────────────┐
│ Settings              [ X ] │
├─────────────────────────────┤
│ Graphics      Audio         │
│ Controls      Accessibility │
├─────────────────────────────┤
│ Effect Quality              │
│ [Low] [Med] [High] [Ultra]  │
│                             │
│ Particle Density    [====]  │
│                             │
│ ☑ Enable Glow Effects       │
│ ☑ Screen Shake              │
│                             │
│ [ Reset to Default ]        │
└─────────────────────────────┘
```

## Performance Considerations

### UI Rendering Optimization

```typescript
// Batch UI updates
class UIBatcher {
  private updates: Map<string, () => void> = new Map()
  private rafId: number | null = null
  
  scheduleUpdate(id: string, update: () => void) {
    this.updates.set(id, update)
    
    if (!this.rafId) {
      this.rafId = requestAnimationFrame(() => {
        this.flush()
      })
    }
  }
  
  private flush() {
    this.updates.forEach(update => update())
    this.updates.clear()
    this.rafId = null
  }
}

// Use for frequent updates (scores, positions)
const uiBatcher = new UIBatcher()
```

### Mobile-Specific Optimizations

```typescript
// Reduce UI updates on mobile
if (isMobile()) {
  // Update scores every 500ms instead of every frame
  setInterval(() => updateScores(), 500)
  
  // Simplify minimap
  minimap.updateFrequency = 10 // Every 10 frames
  
  // Disable non-essential animations
  UI_ANIMATIONS.buttonHover.duration = 0
}
```

## Testing Requirements

### UI Testing Checklist

- [ ] All text readable at minimum resolution (375x667)
- [ ] Touch targets minimum 44x44px on mobile
- [ ] No UI elements overlap on any screen size
- [ ] Settings persist between sessions
- [ ] Animations respect "reduce motion" preference
- [ ] Colorblind modes work correctly
- [ ] Virtual controls responsive on mobile
- [ ] Score updates don't cause frame drops
- [ ] Victory screen displays correctly for 8 players
- [ ] All transitions smooth at 60 FPS