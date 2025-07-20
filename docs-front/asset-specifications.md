# Glow Wars Asset Specifications

## Visual Style Guide

### Art Direction
- **Theme**: Futuristic neon cyber-space
- **Style**: Minimalist geometric shapes with glowing effects
- **Mood**: High-energy, competitive, vibrant
- **Inspiration**: Tron, Geometry Wars, neon arcade games

### Color Palette

#### Player Colors (8 variants)
```typescript
export const PLAYER_COLORS = {
  player1: { primary: 0x00ff00, glow: 0x00ff00, trail: 0x00cc00 }, // Neon Green
  player2: { primary: 0xff0066, glow: 0xff0066, trail: 0xcc0052 }, // Hot Pink
  player3: { primary: 0x00ccff, glow: 0x00ccff, trail: 0x00a3cc }, // Cyan
  player4: { primary: 0xffaa00, glow: 0xffaa00, trail: 0xcc8800 }, // Orange
  player5: { primary: 0xff00ff, glow: 0xff00ff, trail: 0xcc00cc }, // Magenta
  player6: { primary: 0xffff00, glow: 0xffff00, trail: 0xcccc00 }, // Yellow
  player7: { primary: 0x9d00ff, glow: 0x9d00ff, trail: 0x7a00cc }, // Purple
  player8: { primary: 0xff3333, glow: 0xff3333, trail: 0xcc2929 }, // Red
}
```

#### Environment Colors
```typescript
export const ENVIRONMENT_COLORS = {
  background: 0x0a0a0a,      // Near black
  grid: 0x1a1a1a,           // Dark gray
  walls: 0x2a2a2a,          // Medium gray
  neutral: 0x333333,        // Light gray
  uiBackground: 0x000000aa, // Black with transparency
  uiText: 0xffffff,         // White
  uiAccent: 0x00ffcc,       // Teal
}
```

## Sprite Specifications

### Player Sprites

#### Base Player (32x32 pixels)
- **Format**: PNG with transparency
- **Variants**: 8 (one per player color)
- **Components**:
  - Core shape: Circle or triangle (16px diameter)
  - Outer glow: Soft gradient (32px total)
  - Direction indicator: Small arrow or notch

#### Shadow Creeper (32x32 pixels)
- **Format**: PNG with transparency
- **Design**: Dark silhouette with purple glow
- **Animation**: 4 frames pulsing effect

### Power-Up Icons (24x24 pixels)

1. **Speed Boost**
   - Icon: Lightning bolt
   - Colors: Yellow core, white glow
   - Animation: Sparking effect

2. **Shield**
   - Icon: Hexagonal shield
   - Colors: Blue core, cyan glow
   - Animation: Rotating shimmer

3. **Mega Glow**
   - Icon: Radiating star
   - Colors: Rainbow gradient
   - Animation: Pulsing rays

4. **Phase Shift**
   - Icon: Overlapping circles
   - Colors: Purple with distortion
   - Animation: Phase in/out

5. **Energy Burst**
   - Icon: Explosion symbol
   - Colors: Orange to yellow gradient
   - Animation: Expanding rings

### Effect Sprites

#### Trail Particles (8x8 pixels)
- **Format**: PNG with additive blending
- **Variants**: Soft circle, star, diamond
- **Usage**: 100-200 particles per player

#### Collision Burst (64x64 pixels)
- **Format**: PNG sprite sheet
- **Frames**: 8 frames
- **Duration**: 0.5 seconds

#### Territory Paint Brush (16x16 pixels)
- **Format**: Soft circular gradient
- **Usage**: Stamped along movement path

### UI Elements

#### HUD Components
```
Score Bar: 200x40 pixels
Timer Display: 120x60 pixels
Power-up Slot: 48x48 pixels
Minimap: 200x200 pixels
Territory Bar: 300x20 pixels
```

#### Button Sprites
```
Standard Button: 200x50 pixels (9-slice)
Icon Button: 48x48 pixels
Toggle Switch: 60x30 pixels
```

## Asset Sources

### Free Asset Packs

1. **Kenney.nl - Space Shooter Redux**
   - URL: https://kenney.nl/assets/space-shooter-redux
   - License: CC0
   - Contents: 295 sprites including ships, effects, UI
   - Usage: Base for player shapes, projectiles

2. **Kenney.nl - UI Pack**
   - URL: https://kenney.nl/assets/ui-pack
   - License: CC0
   - Contents: 145 UI elements
   - Usage: Buttons, panels, icons

3. **OpenGameArt - Pixel Effects**
   - URL: https://opengameart.org/content/pixel-effects-pack
   - License: CC0
   - Contents: Particle effects, explosions
   - Usage: Power-up effects, collisions

4. **itch.io - Neon UI Pack**
   - Search: "neon ui free"
   - License: Check individual packs
   - Usage: Cyberpunk UI elements

### Custom Assets Needed

1. **Glow Shaders** (Created in-engine)
   - Not sprite-based, use PixiJS filters
   
2. **Territory Textures** (Procedural)
   - Generated at runtime using Graphics API

3. **Trail Effects** (Particle system)
   - Use base particles with color tinting

## Asset Pipeline

### Directory Structure
```
public/
└── assets/
    ├── sprites/
    │   ├── players/
    │   │   ├── player_base.png
    │   │   └── shadow_creeper.png
    │   ├── powerups/
    │   │   ├── speed_boost.png
    │   │   ├── shield.png
    │   │   ├── mega_glow.png
    │   │   ├── phase_shift.png
    │   │   └── energy_burst.png
    │   ├── effects/
    │   │   ├── particles.png
    │   │   ├── collision_burst.png
    │   │   └── trail_particle.png
    │   └── ui/
    │       ├── hud_elements.png
    │       ├── buttons.png
    │       └── icons.png
    ├── atlases/
    │   ├── game_sprites.json
    │   └── game_sprites.png
    └── fonts/
        └── neon_font.woff2
```

### Texture Atlas Configuration

```json
{
  "texturePacker": {
    "trimMode": "trim",
    "algorithm": "maxRects",
    "maxWidth": 2048,
    "maxHeight": 2048,
    "padding": 2,
    "extrude": 1,
    "format": "pixijs",
    "scale": 1,
    "premultiplyAlpha": false
  }
}
```

### Asset Manifest

```typescript
// app/game/assets/manifest.ts
export const ASSET_MANIFEST = {
  bundles: [
    {
      name: 'game-sprites',
      assets: [
        { alias: 'player-base', src: 'sprites/players/player_base.png' },
        { alias: 'shadow-creeper', src: 'sprites/players/shadow_creeper.png' },
        { alias: 'speed-boost', src: 'sprites/powerups/speed_boost.png' },
        { alias: 'shield', src: 'sprites/powerups/shield.png' },
        { alias: 'mega-glow', src: 'sprites/powerups/mega_glow.png' },
        { alias: 'phase-shift', src: 'sprites/powerups/phase_shift.png' },
        { alias: 'energy-burst', src: 'sprites/powerups/energy_burst.png' },
        { alias: 'particle', src: 'sprites/effects/trail_particle.png' },
        { alias: 'collision', src: 'sprites/effects/collision_burst.png' },
      ],
    },
    {
      name: 'ui',
      assets: [
        { alias: 'hud-atlas', src: 'atlases/ui_sprites.json' },
        { alias: 'neon-font', src: 'fonts/neon_font.woff2' },
      ],
    },
  ],
}
```

## Sprite Generation Guidelines

### If Using AI Tools

1. **PixelLab.ai Prompts**:
   ```
   "32x32 pixel art glowing neon [green/pink/cyan] spaceship top-down view black background"
   "24x24 pixel art lightning bolt power-up icon yellow glow effect"
   "8x8 soft glowing particle white center transparent background"
   ```

2. **Stable Diffusion Settings**:
   - Model: Use pixel art LoRA
   - Size: Generate at 512x512, downscale
   - Prompt: Include "pixel art", "game asset", "transparent background"

3. **Post-Processing**:
   - Remove backgrounds
   - Adjust brightness/contrast for glow
   - Export with transparency
   - Optimize file size

### Manual Creation Tools

1. **Aseprite** (Recommended)
   - Pixel-perfect editing
   - Animation support
   - Batch export

2. **GraphicsGale** (Free)
   - Good for simple sprites
   - Animation frames

3. **Photoshop/GIMP**
   - For effects and post-processing
   - Glow effects with Gaussian blur

## Performance Guidelines

### Sprite Optimization

1. **File Formats**:
   - Use PNG for sprites with transparency
   - Use WebP where supported (30% smaller)
   - Keep individual sprites under 50KB

2. **Texture Atlases**:
   - Maximum 2048x2048 pixels
   - Power-of-two dimensions
   - Group by usage frequency

3. **Compression**:
   - Use PNGQuant for 70% size reduction
   - Maintain visual quality
   - Test on target devices

### Loading Strategy

1. **Progressive Loading**:
   - Load essential sprites first
   - Background load effects
   - Lazy load rare power-ups

2. **Caching**:
   - Cache processed textures
   - Reuse tinted sprites
   - Pool particle textures

## Asset Testing Checklist

- [ ] All sprites load correctly
- [ ] Transparency works on all backgrounds
- [ ] Glow effects visible in game
- [ ] Performance acceptable on mobile
- [ ] File sizes optimized
- [ ] Atlas packing efficient
- [ ] No visual artifacts
- [ ] Colors match design spec
- [ ] Animations smooth
- [ ] UI elements responsive