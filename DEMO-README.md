# Glow Wars - Minimal Graphics Demo

## What is this?

This is an ultra-minimal graphics demo that showcases the visual style of Glow Wars without any game logic, networking, or complex state management.

## Features Demonstrated

- **Glowing Orbs**: 5 colorful orbs with proper glow effects
- **Smooth Animation**: Sine wave movement patterns
- **Particle Effects**: Trailing particles that spawn and fade
- **Territory Trails**: Visual trails showing where orbs have been
- **Dark Arena**: Grid-based background matching the game aesthetic
- **Neon Colors**: Using the official color palette from the design

## How to Run

Simply open `glow-wars-demo.html` in any modern web browser. No server required!

```bash
# On macOS
open glow-wars-demo.html

# On Linux
xdg-open glow-wars-demo.html

# On Windows
start glow-wars-demo.html
```

## Technical Details

- **Single File**: Everything in one HTML file
- **No Dependencies**: PixiJS loaded from CDN
- **No Build Process**: Just open and run
- **Pure Visuals**: No game logic or user interaction
- **Performance**: Optimized with proper cleanup and blend modes

## Visual Effects

1. **Glow Effect**: Multiple layered circles with blur filters
2. **Additive Blending**: Creates proper neon glow appearance
3. **Particle System**: Dynamic spawning with physics
4. **Trail System**: Fading trails to show movement history
5. **Pulse Animation**: Orbs scale slightly for liveliness

## Next Steps

This demo proves the visual concept works. To build the full game:

1. Add user input for controlling one orb
2. Implement collision detection
3. Add territory painting mechanics
4. Connect to backend for multiplayer
5. Add UI elements (scores, timers, etc.)

## Why This Approach?

After struggling with complex React + PixiJS integration issues, this minimal demo:
- Proves the visuals work
- Shows good performance is achievable
- Provides a clean foundation to build on
- Eliminates all the complex state management issues
- Can be incrementally enhanced

The key insight: Start with working graphics, then add complexity gradually.