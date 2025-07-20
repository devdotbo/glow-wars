# Glow Wars

A real-time multiplayer territory control game where players paint the darkness with their neon glow while battling for dominance.

## Game Overview

Glow Wars is a fast-paced multiplayer game where players control glowing orbs in a dark arena, painting territory with their unique neon colors. Your glow radius constantly shrinks, forcing strategic movement and resource management. Consume AI-controlled sparks to grow, avoid shadow creepers lurking in the darkness, and outmaneuver opponents to claim victory.

### Core Mechanics

- **Territory Painting**: Automatically paint the ground beneath you with your color
- **Glow System**: Your light radius decreases over time, but consuming sparks replenishes it
- **Collision Combat**: Larger players eliminate smaller ones on contact; equal sizes bounce
- **AI Entities**: Neutral sparks to consume, hostile shadow creepers in dark areas
- **Strategic Depth**: Balance between territorial expansion and resource collection

### Victory Conditions

- Control 60% of the map territory
- Be the last player standing
- Have the most territory when time expires

## Tech Stack

- **Frontend**: React + TanStack Start (file-based routing)
- **Backend**: Convex (real-time database and sync engine)
- **Authentication**: Clerk
- **State Management**: TanStack Query + Convex React Query
- **Language**: TypeScript (full-stack)
- **Testing**: Vitest + convex-test
- **Styling**: Tailwind CSS
- **Package Manager**: pnpm

## Current Development Status

**Progress: 7/10 Core Tasks Complete**

### Implemented Features

1. **Core Database Schema & Player Management** - Player profiles with customizable colors
2. **Game Session Management** - Create, join, and manage multiplayer game rooms
3. **Real-time Position Updates** - Smooth player movement with automatic territory painting
4. **Glow System & Resource Management** - Dynamic glow radius with decay and replenishment
5. **Basic AI Entity System (Sparks)** - Wandering AI entities that flee from players
6. **Collision Detection & Player Elimination** - Size-based combat with elimination mechanics
7. **Advanced AI (Shadow Creepers)** - Territory-aware hostile AI that hunts in darkness

### Upcoming Features

8. **Power-up System** - Special abilities and temporary boosts
9. **Victory Conditions & Game End** - Win detection and game completion flow
10. **Performance Optimizations** - Batching and query optimization for smooth gameplay

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (required package manager)
- Convex account (free tier available)
- Clerk account for authentication

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/glow-wars.git
cd glow-wars

# Install dependencies (must use pnpm)
pnpm install
```

### Environment Setup

1. Create a `.env` file in the project root:

```env
CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_JWT_ISSUER_DOMAIN=your_clerk_jwt_issuer_domain
VITE_CONVEX_URL=your_convex_deployment_url
VITE_CLERK_FRONTEND_API_URL=your_clerk_frontend_api_url
```

2. Configure Clerk domain in `convex/auth.config.ts` to match your JWT template

3. Initialize Convex:

```bash
npx convex dev --once
```

### Running the Game

```bash
# Start development servers (Convex + Vite)
pnpm dev

# Or run servers separately
pnpm dev:convex  # Convex backend
pnpm dev:web     # Vite frontend
```

## Development

### Available Scripts

- `pnpm dev` - Start both Convex and Vite development servers
- `pnpm build` - Build for production
- `pnpm test` - Run test suite
- `pnpm format` - Format code with Prettier
- `pnpm seed` - Import sample data (if applicable)

### Project Structure

```
glow-wars/
├── convex/              # Backend functions and schema
│   ├── ai/              # AI entity logic (sparks, creepers)
│   ├── *.ts             # Convex functions (players, games, etc.)
│   └── schema.ts        # Database schema definition
├── src/
│   ├── routes/          # TanStack Start file-based routes
│   ├── styles/          # Global styles and Tailwind CSS
│   └── utils/           # Shared utilities
├── docs/                # Design and technical documentation
├── public/              # Static assets
└── .workflow/           # Development workflow state tracking
```

### Testing

The project uses a comprehensive testing approach with convex-test for backend testing:

```bash
# Run all tests
pnpm test

# Run tests with UI
pnpm test --ui

# Run specific test file
pnpm test convex/collision.test.ts
```

Tests follow TDD principles and cover:
- Database operations
- Game logic
- AI behavior
- Real-time synchronization

### Development Workflow

1. Check `.workflow/state.json` for current task status
2. Write tests first (TDD approach)
3. Implement features to pass tests
4. Run linting/formatting
5. Commit with descriptive messages
6. Update workflow documentation

## Documentation

- [Game Design Document](docs/glow-wars-gdd.md) - Complete game design and mechanics
- [Technical Implementation](docs/glow-wars-technical-implementation.md) - Development roadmap and architecture
- [Convex Guidelines](docs/convex.md) - Backend development best practices
- [Workflow System](docs/glow-wars-workflow-system.md) - Development process documentation

## Contributing

### Development Guidelines

1. **Always use pnpm** for package management
2. **Follow TDD** - Write tests before implementation
3. **Use the workflow system** - Update `.workflow/state.json` for task tracking
4. **Atomic commits** - One feature/fix per commit
5. **Type safety** - Maintain strict TypeScript types

### Commit Message Format

```
feat: implement shadow creeper AI behavior (Task 7)
fix: collision detection boundary check
docs: update README with setup instructions
test: add coverage for territory painting
```

### Code Style

- No semicolons (Prettier configured)
- Single quotes for strings
- Functional components with TypeScript
- Convex function patterns as documented

## Roadmap

### Phase 1: Core Gameplay (Current)
- [x] Player and game management
- [x] Real-time multiplayer mechanics
- [x] Territory system
- [x] Basic and advanced AI
- [ ] Power-ups and abilities
- [ ] Victory conditions

### Phase 2: Enhanced Features (Planned)
- [ ] Multiple map types
- [ ] Glow Moths (beneficial AI)
- [ ] Visual effects and animations
- [ ] Sound system
- [ ] Leaderboards

### Phase 3: Polish & Launch
- [ ] Performance optimizations
- [ ] Mobile responsive design
- [ ] Tutorial system
- [ ] Matchmaking
- [ ] Analytics

## License

This project is currently under development. License to be determined.

## Acknowledgments

Built with:
- [Convex](https://convex.dev) - The reactive backend-as-a-service
- [TanStack Start](https://tanstack.com/start) - Full-stack React framework
- [Clerk](https://clerk.dev) - Authentication and user management