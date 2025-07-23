# Demo Mode for Glow Wars

## Quick Start

1. Start your local Convex dev server:
   ```bash
   npx convex dev
   ```

2. Start the web development server:
   ```bash
   pnpm dev:web
   ```

3. Access demo mode:
   - Basic demo: http://localhost:3001/?demo=true
   - With debug info: http://localhost:3001/?demo=true&debug=true

## Features

- **Automatic Setup**: Creates a player and game automatically
- **Single Player Mode**: Plays against AI entities (sparks and creepers)
- **Debug Mode**: Shows game state information for troubleshooting
- **Simplified State**: Uses a dedicated state management system for reliability

## Troubleshooting

If the demo gets stuck at "Setting up game...":

1. Check that Convex is running (`npx convex dev`)
2. Check the browser console for errors
3. Try the debug mode URL to see detailed state
4. Ensure your `.env` file has the correct `VITE_CONVEX_URL`

## How It Works

1. The `useDemoMode` hook detects the `?demo=true` parameter
2. `DemoGame` component uses `useDemoGameState` for simplified state
3. Automatically creates a player and game
4. Starts the game after a short delay
5. Bypasses the complex menu/lobby system

## Debug Information

When using `?demo=true&debug=true`, you'll see:
- Game ID and player ID
- Number of players, AI entities, and territory cells
- Real-time position updates
- Any errors that occur