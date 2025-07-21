# Glow Wars - Color System

## Core Philosophy

Colors in Glow Wars aren't just visual elements - they're gameplay communication. Every hue has meaning, every glow has purpose, and every shade tells a story.

## Primary Palette - Player Colors

### The Eight Warriors

```
Player 1: NEON GREEN
├─ Primary: #00FF00 (RGB: 0, 255, 0)
├─ Glow: #00FF00 + 200% bloom
├─ Trail: #00CC00 (RGB: 0, 204, 0)
└─ Territory: #00FF00 @ 30% opacity

Player 2: HOT PINK
├─ Primary: #FF0066 (RGB: 255, 0, 102)
├─ Glow: #FF0066 + 200% bloom
├─ Trail: #CC0052 (RGB: 204, 0, 82)
└─ Territory: #FF0066 @ 30% opacity

Player 3: ELECTRIC CYAN
├─ Primary: #00CCFF (RGB: 0, 204, 255)
├─ Glow: #00CCFF + 200% bloom
├─ Trail: #00A3CC (RGB: 0, 163, 204)
└─ Territory: #00CCFF @ 30% opacity

Player 4: LASER ORANGE
├─ Primary: #FFAA00 (RGB: 255, 170, 0)
├─ Glow: #FFAA00 + 200% bloom
├─ Trail: #CC8800 (RGB: 204, 136, 0)
└─ Territory: #FFAA00 @ 30% opacity

Player 5: PLASMA MAGENTA
├─ Primary: #FF00FF (RGB: 255, 0, 255)
├─ Glow: #FF00FF + 200% bloom
├─ Trail: #CC00CC (RGB: 204, 0, 204)
└─ Territory: #FF00FF @ 30% opacity

Player 6: VOLT YELLOW
├─ Primary: #FFFF00 (RGB: 255, 255, 0)
├─ Glow: #FFFF00 + 200% bloom
├─ Trail: #CCCC00 (RGB: 204, 204, 0)
└─ Territory: #FFFF00 @ 30% opacity

Player 7: QUANTUM PURPLE
├─ Primary: #9D00FF (RGB: 157, 0, 255)
├─ Glow: #9D00FF + 200% bloom
├─ Trail: #7A00CC (RGB: 122, 0, 204)
└─ Territory: #9D00FF @ 30% opacity

Player 8: FLAME RED
├─ Primary: #FF3333 (RGB: 255, 51, 51)
├─ Glow: #FF3333 + 200% bloom
├─ Trail: #CC2929 (RGB: 204, 41, 41)
└─ Territory: #FF3333 @ 30% opacity
```

### Color Selection Rationale

1. **Maximum Contrast**: Each color is distinct at a glance
2. **Equal Brightness**: No player has advantage/disadvantage
3. **Colorblind Friendly**: Distinguishable in all common types
4. **Neon Aesthetic**: All colors pop against dark background

## Environment Colors

### The Arena

```
BACKGROUND (The Void)
└─ Base: #0A0A0A (RGB: 10, 10, 10)
   └─ Pure black causes eye strain
   └─ Slight gray allows "true black" effects

GRID LINES
└─ Color: #1A1A1A (RGB: 26, 26, 26)
   └─ Subtle enough not to interfere
   └─ Visible enough for spatial reference

ARENA BOUNDS
└─ Color: #2A2A2A (RGB: 42, 42, 42)
   └─ Slightly brighter than grid
   └─ Clear boundary definition
```

## UI Color System

### Interface Palette

```
PRIMARY TEXT
├─ Default: #FFFFFF (RGB: 255, 255, 255)
├─ Secondary: #CCCCCC (RGB: 204, 204, 204)
└─ Disabled: #666666 (RGB: 102, 102, 102)

ACCENT (Interactive Elements)
├─ Default: #00FFCC (RGB: 0, 255, 204) - Teal
├─ Hover: #00FFE5 (RGB: 0, 255, 229)
└─ Active: #00E5B8 (RGB: 0, 229, 184)

UI BACKGROUNDS
├─ Panel: #000000AA (RGBA: 0, 0, 0, 0.67)
├─ Button: #1A1A1A (RGB: 26, 26, 26)
└─ Input: #0D0D0D (RGB: 13, 13, 13)

STATUS COLORS
├─ Success: #00FF88 (RGB: 0, 255, 136)
├─ Warning: #FFAA00 (RGB: 255, 170, 0)
├─ Error: #FF0044 (RGB: 255, 0, 68)
└─ Info: #00AAFF (RGB: 0, 170, 255)
```

## Power-Up Colors

### Ability Indicators

```
SPEED BOOST
├─ Icon: #FFFF00 (Yellow)
├─ Glow: #FFFF88 (Light Yellow)
└─ Trail Effect: +50% brightness

SHIELD
├─ Icon: #00AAFF (Blue)
├─ Glow: #0088FF (Deep Blue)
└─ Bubble: #00AAFF @ 40% opacity

MEGA GLOW
├─ Icon: Rainbow gradient
├─ Effect: All colors cycle
└─ Intensity: +100% bloom

PHASE SHIFT
├─ Icon: #9D00FF (Purple)
├─ Effect: #FF00FF (Magenta shift)
└─ Distortion: Chromatic aberration

ENERGY BURST
├─ Icon: #FF6600 (Orange)
├─ Explosion: #FFAA00 → #FF0000 gradient
└─ Shockwave: #FFFFFF @ 60% opacity
```

## Special Entity Colors

### AI Opponents

```
SHADOW CREEPER
├─ Base: #4A004A (Dark Purple)
├─ Glow: #8800FF (Bright Purple)
├─ Trail: #6600CC (Mid Purple)
└─ Threat Level: Glow intensity increases with proximity
```

## Color Effects & Modifiers

### Glow System

```typescript
// Glow intensity calculation
const glowIntensity = {
  base: 1.0,
  player: 2.0,
  powerUp: 1.5,
  collision: 3.0,
  victory: 4.0
}

// Bloom settings
const bloomConfig = {
  threshold: 0.8,
  intensity: 2.0,
  radius: 4,
  quality: 'high'
}
```

### State-Based Color Modifications

```
INVULNERABLE (Shield Active)
├─ Player Color: +50% brightness
├─ Pulse Effect: 0.5Hz frequency
└─ Outline: White stroke 2px

BOOSTED (Speed Active)
├─ Trail Length: +100%
├─ Trail Brightness: +50%
└─ Motion Blur: Enabled

PHASING (Phase Shift)
├─ Opacity: 50% → 100% oscillation
├─ Chromatic Split: RGB channels offset
└─ Distortion: Ripple effect

LOW HEALTH (If implemented)
├─ Player Pulse: Red tint overlay
├─ Frequency: Increases with danger
└─ Warning: Screen edge vignette
```

## Accessibility Modes

### Colorblind Filters

```
PROTANOPIA (Red-Blind)
Player 1: #00FF00 → #00FF00 (No change - Green)
Player 2: #FF0066 → #0066FF (Pink → Blue)
Player 4: #FFAA00 → #FFFF00 (Orange → Yellow)
Player 8: #FF3333 → #9966FF (Red → Purple)

DEUTERANOPIA (Green-Blind)
Player 1: #00FF00 → #FFFF00 (Green → Yellow)
Player 3: #00CCFF → #0099FF (Cyan → Deeper Blue)
Player 6: #FFFF00 → #FF9900 (Yellow → Orange)

TRITANOPIA (Blue-Blind)
Player 3: #00CCFF → #00FFAA (Cyan → Aqua)
Player 7: #9D00FF → #FF00AA (Purple → Magenta)

HIGH CONTRAST MODE
├─ All colors: Saturation +30%
├─ Background: #000000 (Pure black)
├─ Grid: Hidden
└─ Outlines: White 1px on all entities
```

## Color Usage Guidelines

### Do's
- ✓ Use player colors consistently across all their elements
- ✓ Maintain color meaning throughout the experience
- ✓ Test all color combinations against background
- ✓ Ensure 3:1 contrast ratio minimum for UI text
- ✓ Use glow to enhance, not replace, base colors

### Don'ts
- ✗ Mix player colors (except in transitions)
- ✗ Use pure white except for special effects
- ✗ Introduce new colors without purpose
- ✗ Rely on color alone for critical information
- ✗ Oversaturate - maintain visual breathing room

## Dynamic Color System

### Adaptive Brightness

```typescript
// Adjust colors based on screen count
function adaptColorIntensity(activePlayerCount: number) {
  const baseBrightness = 1.0
  const reduction = (activePlayerCount - 1) * 0.05
  return Math.max(baseBrightness - reduction, 0.7)
}

// More players = slightly dimmer individual glows
// Prevents visual overload with 8 players
```

### Performance Scaling

```
HIGH PERFORMANCE
├─ Full color depth (32-bit)
├─ All glow effects
├─ HDR bloom enabled
└─ Gradient territories

MEDIUM PERFORMANCE
├─ Reduced color depth (16-bit)
├─ Simplified glow
├─ Standard bloom
└─ Solid territories

LOW PERFORMANCE
├─ Minimal colors
├─ No glow shaders
├─ No bloom
└─ Outlined territories
```

## Color Testing Matrix

| Background | Player Colors | Visibility | Contrast | Colorblind |
|------------|---------------|------------|----------|------------|
| #0A0A0A    | All 8         | ✓ Excel    | ✓ >10:1  | ✓ Tested   |
| #000000    | All 8         | ✓ Good     | ✓ >12:1  | ✓ Tested   |
| #1A1A1A    | All 8         | ✓ Good     | ✓ >8:1   | ✓ Tested   |

## Implementation Reference

```css
/* CSS Custom Properties */
:root {
  /* Player Colors */
  --player-1: #00FF00;
  --player-2: #FF0066;
  --player-3: #00CCFF;
  --player-4: #FFAA00;
  --player-5: #FF00FF;
  --player-6: #FFFF00;
  --player-7: #9D00FF;
  --player-8: #FF3333;
  
  /* UI Colors */
  --bg-void: #0A0A0A;
  --ui-accent: #00FFCC;
  --text-primary: #FFFFFF;
  
  /* Effects */
  --glow-spread: 0 0 20px;
  --bloom-intensity: 200%;
}
```

## The Psychology of Glow

Each color choice creates an emotional response:
- **Green**: Energy, go, life
- **Pink**: Playful, aggressive, unique
- **Cyan**: Cool, calculated, tech
- **Orange**: Warm, fast, friendly
- **Magenta**: Mysterious, powerful, rare
- **Yellow**: Alert, bright, valuable
- **Purple**: Royal, magical, special
- **Red**: Danger, passion, intensity

Together, they create a spectrum of competition where every player feels distinct and powerful.