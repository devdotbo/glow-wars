# Glow Wars

A real-time multiplayer territory control game where players paint the darkness with their neon glow while battling for dominance.

> **Quick Links:** [Minimalistic Prototype](docs-front/minimalistic-prototype/) | [Game Design](docs/glow-wars-gdd.md) | [Frontend Docs](docs-front/) | [Contributing](#contributing)

## 🎮 Game Overview

Glow Wars is a fast-paced multiplayer game where players control glowing orbs in a dark arena, painting territory with their unique neon colors. Your glow radius constantly shrinks, forcing strategic movement and resource management.

**Core Concept:** Paint. Survive. Dominate.

For detailed game mechanics, victory conditions, and design philosophy, see the [Game Design Document](docs/glow-wars-gdd.md).

## 🛠️ Tech Stack

- **Frontend**: React + TanStack Start + PixiJS
- **Backend**: Convex (real-time sync)
- **Authentication**: Clerk
- **Language**: TypeScript (full-stack)
- **Package Manager**: pnpm (required)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- pnpm (required)
- Convex account
- Clerk account

### Setup

```bash
# Clone and install
git clone https://github.com/yourusername/glow-wars.git
cd glow-wars
pnpm install

# Configure environment
cp .env.example .env
# Edit .env with your keys

# Start development
pnpm dev
```

For detailed setup instructions, see [Development Workflow](docs/glow-wars-workflow-system.md).

## 📚 Documentation

### Game Design & Implementation
- [**Game Design Document**](docs/glow-wars-gdd.md) - Complete game mechanics, features, and vision
- [**Technical Implementation**](docs/glow-wars-technical-implementation.md) - Development roadmap and architecture
- [**Workflow System**](docs/glow-wars-workflow-system.md) - Development process and task tracking

### Frontend Development
- [**Minimalistic Prototype Guide**](docs-front/minimalistic-prototype/) - Build with PixiJS primitives (no sprites!)
  - [Overview](docs-front/minimalistic-prototype/overview.md) - Why minimalistic approach
  - [Implementation Roadmap](docs-front/minimalistic-prototype/implementation-roadmap.md) - Step-by-step guide
  - [Code Cookbook](docs-front/minimalistic-prototype/code-cookbook.md) - Ready-to-use implementations
  - [Visual Effects Reference](docs-front/minimalistic-prototype/visual-effects-reference.md) - All effects with primitives
- [**Visual Design System**](docs-front/visual-design/) - Art direction and aesthetics
- [**Frontend Implementation Plan**](docs-front/frontend-implementation-plan.md) - Architecture overview
- [**Performance Optimization**](docs-front/performance-optimization.md) - Frontend performance guide

### Backend Development
- [**Convex Guidelines**](docs/convex.md) - Backend best practices, patterns, and examples
- [**Testing Strategy**](docs-front/testing-strategy.md) - Comprehensive testing approach

## 💻 Development

### Essential Commands

```bash
pnpm dev          # Start development (frontend + backend)
pnpm build        # Production build
pnpm test         # Run tests
pnpm format       # Format code
```

### Project Structure

```
glow-wars/
├── convex/              # Backend (Convex functions)
├── src/                 # Frontend (React + PixiJS)
├── docs/                # Game design docs
├── docs-front/          # Frontend technical docs
└── .workflow/           # Development state tracking
```

For detailed architecture, see [Technical Implementation](docs/glow-wars-technical-implementation.md).

## 🤝 Contributing

### Quick Guidelines

1. **Use pnpm** - Required package manager
2. **Follow TDD** - Tests first, implementation second
3. **Check workflow** - See `.workflow/state.json` for current tasks
4. **Atomic commits** - Follow format: `feat: description (Task N)`

For detailed guidelines, see [Workflow System](docs/glow-wars-workflow-system.md).

## 🎯 Current Status

**Development Phase:** Core Gameplay Implementation

- ✅ Real-time multiplayer foundation
- ✅ Territory painting system
- ✅ AI entities (Sparks & Shadow Creepers)
- 🚧 Power-up system
- 🚧 Victory conditions
- 📋 Performance optimizations

Track detailed progress in [Technical Implementation](docs/glow-wars-technical-implementation.md) and `.workflow/state.json`.

## 🏗️ Building the Minimalistic Prototype

Want to start coding immediately? Check out the [**Minimalistic Prototype Guide**](docs-front/minimalistic-prototype/) to build Glow Wars using only PixiJS primitives - no sprites or assets needed!

```bash
# Quick prototype start
pnpm dev
# Open browser and start building with geometric shapes!
```

## 📖 License

This project is currently under development. License to be determined.

---

Built with [Convex](https://convex.dev), [TanStack Start](https://tanstack.com/start), [PixiJS](https://pixijs.com), and [Clerk](https://clerk.dev)