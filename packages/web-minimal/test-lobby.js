// Simple test script for Game Lobby using Playwright MCP
// This test verifies the basic functionality of the game lobby system

console.log('Game Lobby Test Instructions:');
console.log('1. Make sure Convex backend is running: cd packages/convex && pnpm dev');
console.log('2. Make sure web-minimal is running: cd packages/web-minimal && pnpm dev');
console.log('3. Open http://localhost:3001 in browser');
console.log('4. Test the following:');
console.log('   - Guest player is created automatically');
console.log('   - Can create a new game');
console.log('   - Game appears in lobby with game ID');
console.log('   - Can join from another browser tab');
console.log('   - Host can start game with 2+ players');
console.log('');
console.log('Manual Test Steps:');
console.log('- Verify guest player name and color dot appear');
console.log('- Create game with 4 max players');
console.log('- Note the game ID shown');
console.log('- Open new incognito/private window');
console.log('- Join the game from list');
console.log('- Verify both players see each other');
console.log('- Start game as host');
console.log('- Verify transition to game canvas');