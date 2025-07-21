# Glow Wars - UI Visual Guide

## Design Philosophy

The UI in Glow Wars follows the principle of "Invisible Until Needed" - it should enhance, not distract from the neon light show. Every interface element uses transparency, glow effects, and minimal design to maintain immersion.

## Typography

### Font Selection

```css
/* Primary Font Stack */
font-family: 'Orbitron', 'Exo 2', 'Rajdhani', monospace;

/* Characteristics needed:
   - Futuristic/tech aesthetic
   - Excellent readability at small sizes
   - Supports tabular numbers for scores
   - Clean geometric design
*/
```

### Type Scale

```
EXTRA LARGE (Victory):  48px / 3rem     - Winner announcement
LARGE (Headers):        32px / 2rem     - Menu titles
MEDIUM (Timer):         24px / 1.5rem   - Game timer
REGULAR (Body):         16px / 1rem     - General text
SMALL (Stats):          14px / 0.875rem - Score displays
TINY (Details):         12px / 0.75rem  - Power-up timers
```

### Text Effects

```typescript
interface TextGlow {
  default: {
    textShadow: '0 0 10px currentColor',
    opacity: 0.9
  },
  emphasis: {
    textShadow: '0 0 20px currentColor, 0 0 40px currentColor',
    opacity: 1.0
  },
  pulse: {
    animation: 'pulse 2s ease-in-out infinite',
    range: [0.8, 1.0]  // Opacity range
  }
}
```

## HUD Components

### Score Display Panel

```
Design Structure:
┌─────────────────────────┐
│ ░░░░░░░░░░░░░░░░░░░░░░ │ <- Glass morphism background
│ ┌───┐ ┌───────────────┐│
│ │ ¤ │ │ Player 1      ││ <- Player icon + name
│ └───┘ │ ████████ 45%  ││ <- Territory bar + percentage
│       │ Score: 1,250  ││ <- Points (tabular nums)
│       └───────────────┘│
└─────────────────────────┘

Visual Properties:
- Background: rgba(0, 0, 0, 0.6) with blur(8px)
- Border: 1px solid rgba(255, 255, 255, 0.1)
- Corner radius: 8px
- Inner padding: 12px
- Player color used for icon glow and bar fill
```

### Timer Display

```
States:
                Normal              Warning            Critical
              ┌─────────┐        ┌─────────┐        ┌─────────┐
              │  2:30   │        │  0:30   │        │  0:10   │
              └─────────┘        └─────────┘        └─────────┘
                White              Orange             Red+Pulse

Transitions:
- >30s: Standard white glow
- 30s: Smooth color transition to orange
- 10s: Red with increasing pulse frequency
- 0s: Final flash effect
```

### Minimap

```
Visual Design:
┌─────────────────┐
│ ░░░░░░░░░░░░░░ │ <- Dark overlay (90% opacity)
│ ░┌───────────┐░ │
│ ░│ · · · · · │░ │ <- Player dots with glow
│ ░│ ·████·██· │░ │ <- Territory regions
│ ░│ ·███████· │░ │ <- Colored by owner
│ ░│ ·██·█·██· │░ │
│ ░│ [═══════] │░ │ <- Viewport indicator
│ ░└───────────┘░ │
└─────────────────┘

Properties:
- Size: 200x200px (desktop), 120x120px (mobile)
- Player dots: 4px with 8px glow
- Territory: 20% opacity fills
- Viewport: White outline, 1px
- Update rate: 10 FPS (performance)
```

### Power-Up Indicators

```
Layout:
┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐
│ ⚡ │ │ ⬡  │ │ ★  │ │ ◈  │ │ ✦  │
│3.2s│ │RDY │ │12s │ │RDY │ │5.1s│
└────┘ └────┘ └────┘ └────┘ └────┘

States:
- Ready: Full color, subtle pulse glow
- Active: Bright glow, countdown timer
- Cooldown: 40% opacity, recharge animation
- Locked: 20% opacity, no interaction

Recharge Animation:
[▒▒▒▒▒▒▒▒] 0%
[████▒▒▒▒] 50%
[████████] 100% READY!
```

## Menu Interfaces

### Main Menu

```
Layout Concept:

         GLOW WARS
    ╔═══════════════════╗
    ║  Neon light wars  ║
    ╚═══════════════════╝

    ┌─────────────────┐
    │   PLAY NOW      │ <- Primary CTA
    └─────────────────┘
    
    ┌─────────────────┐
    │   HOW TO PLAY   │
    └─────────────────┘
    
    ┌─────────────────┐
    │   SETTINGS      │
    └─────────────────┘

Visual Effects:
- Title: Animated glow cycling through player colors
- Buttons: Glass morphism with hover glow
- Background: Subtle particle system
- Transitions: Fade and scale on hover
```

### Game Lobby

```
Player Card Design:
┌─────────────────────────────┐
│ ¤ Player Name               │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ Status: ✓ READY             │
└─────────────────────────────┘

Visual States:
- Joining: Fade in with glow burst
- Ready: Green checkmark, stable glow
- Waiting: Pulsing yellow indicator
- Leaving: Fade out with particle dissolve

Game Code Display:
╔════════════════╗
║  CODE: XKCD    ║ <- Large, monospace
║ [Copy to Clip]  ║ <- Icon button
╚════════════════╝
```

### Settings Panel

```
Control Types:

Toggle Switch:
[●───] ON    [───●] OFF
Glow follows state

Slider:
[──●──────] 30%
Handle glows with player color

Dropdown:
┌─────────────▼─┐
│ Option Name   │
└───────────────┘
Subtle border glow

Color Picker:
[¤][○][×][△][□][◇][⬟][▽]
Each with appropriate glow
```

## Animations & Transitions

### UI Animation Principles

```typescript
const animationConfig = {
  // Micro-interactions
  hover: {
    duration: 200,
    easing: 'ease-out',
    scale: 1.05,
    glowIntensity: 1.5
  },
  
  // State changes
  transition: {
    duration: 300,
    easing: 'ease-in-out',
    fadeOverlap: 100  // ms
  },
  
  // Emphasis
  pulse: {
    duration: 2000,
    easing: 'ease-in-out',
    minOpacity: 0.7,
    maxOpacity: 1.0
  }
}
```

### Screen Transitions

```
Menu → Game:
1. Menu fades to black (300ms)
2. Loading spinner appears (variable)
3. Game fades in from black (300ms)
4. HUD elements slide in (200ms each, staggered)

Game → Victory:
1. Gameplay freezes
2. Vignette effect darkens edges (500ms)
3. Victory panel scales up from center (400ms)
4. Confetti and effects begin
5. Stats slide in from sides (300ms, staggered)
```

## Interactive States

### Button States

```
Default:
┌─────────────┐
│   BUTTON    │ - Subtle border glow
└─────────────┘

Hover:
┌═════════════┐
║   BUTTON    ║ - Bright border, scale 105%
╚═════════════╝

Active:
┌─────────────┐
│   BUTTON    │ - Scale 95%, bright flash
└─────────────┘

Disabled:
┌ ─ ─ ─ ─ ─ ─┐
    BUTTON     - 40% opacity, no glow
└ ─ ─ ─ ─ ─ ─┘
```

### Input Fields

```
Unfocused:
┌─────────────────┐
│ Placeholder...  │ - 50% opacity text
└─────────────────┘

Focused:
╔═════════════════╗
║ User input|     ║ - Bright border, cursor blink
╚═════════════════╝

Error:
┌─────────────────┐
│ Invalid input   │ - Red glow, shake animation
└─────────────────┘
```

## Notification System

### Toast Messages

```
Success:        Warning:         Error:
┌──────────┐   ┌──────────┐    ┌──────────┐
│ ✓ Done!  │   │ ⚠ Alert  │    │ ✗ Error  │
└──────────┘   └──────────┘    └──────────┘
Green glow     Orange glow      Red glow

Animation:
1. Slide in from top (200ms)
2. Hold (3000ms)
3. Fade out (200ms)
```

## Loading States

### Spinner Design

```
     ·
   ·   ·     <- Orbiting particles
 ·   ¤   ·   <- Center glows
   ·   ·     <- Trails follow
     ·

Properties:
- 8 particles in circular orbit
- Center icon matches context
- Particle trails create motion
- Speed: 60 RPM
```

### Progress Bars

```
Determinate:
[████████▒▒▒▒▒▒▒▒] 50%
Leading edge has bright glow

Indeterminate:
[  ████  ████  ████  ]
Glowing segments slide across
```

## Responsive Scaling

### Breakpoint Behaviors

```typescript
const uiScaling = {
  mobile: {
    baseFontSize: 14,
    hudScale: 0.8,
    buttonMinHeight: 44,  // Touch target
    glowRadius: 0.7       // Performance
  },
  tablet: {
    baseFontSize: 15,
    hudScale: 0.9,
    buttonMinHeight: 40,
    glowRadius: 0.85
  },
  desktop: {
    baseFontSize: 16,
    hudScale: 1.0,
    buttonMinHeight: 36,
    glowRadius: 1.0
  }
}
```

## Glass Morphism Implementation

```css
.ui-panel {
  /* Dark glass effect */
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  
  /* Subtle border */
  border: 1px solid rgba(255, 255, 255, 0.1);
  
  /* Soft shadows */
  box-shadow: 
    0 8px 32px 0 rgba(0, 0, 0, 0.37),
    inset 0 0 0 1px rgba(255, 255, 255, 0.05);
  
  /* Smooth corners */
  border-radius: 8px;
}
```

## Performance Considerations

### UI Optimization

1. **Blur Effects**: Use sparingly, cache when possible
2. **Glow Shaders**: Batch similar glows together
3. **Animations**: Use CSS transforms over position
4. **Updates**: Throttle rapid UI updates to 30 FPS
5. **Transparency**: Minimize overlapping transparent elements

### Mobile UI Adjustments

- Reduce blur radius: 8px → 4px
- Simplify glows: Multi-pass → single pass
- Larger touch targets: 44px minimum
- Fewer animation frames: 60fps → 30fps
- Cached UI elements where possible

## Future UI Concepts

1. **Holographic Menus**: 3D perspective transforms
2. **Reactive UI**: Responds to game events
3. **Customizable HUD**: Player arrangement options
4. **Spectator Interface**: Enhanced viewing tools
5. **AR Mode UI**: Minimal, world-space interface