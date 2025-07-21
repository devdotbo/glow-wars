# 🎯 Glow Wars Backend & Game Design Documentation

> **Quick Jump:** [Game Design](#-game-design) | [Backend Development](#-backend-development) | [AI Workflow](#-development-process) | [Task Progress](#-current-progress) | [Frontend Docs](../docs-front/)

Welcome to the Glow Wars backend and game design documentation hub. This directory contains the core game vision, backend implementation guides, and development workflow documentation.

## 📚 Overview

The `/docs/` directory focuses on:
- **Game Design**: Complete game mechanics, AI behaviors, and feature specifications
- **Backend Development**: Convex-based real-time backend implementation
- **Development Process**: AI-assisted development workflow for efficient coding

For frontend documentation, see [/docs-front/](../docs-front/).

## 🏗️ Documentation Architecture

```
Game Vision & Design
        ↓
┌─────────────────┐
│  Game Design    │ ←── What we're building
│  Document (GDD) │
└────────┬────────┘
         ↓
┌─────────────────┐     ┌─────────────────┐
│   Technical     │ ←───│    Convex       │
│ Implementation  │     │   Reference     │
└────────┬────────┘     └─────────────────┘
         ↓                      ↑
┌─────────────────┐            │
│    Workflow     │ ←── How we build it
│     System      │
└─────────────────┘
```

## 🚀 Quick Start Paths

### For Game Designers
Start here to understand the game vision:
1. **[Game Design Document](glow-wars-gdd.md)** - Core mechanics and features
2. Review visual design in [/docs-front/visual-design/](../docs-front/visual-design/)

### For Backend Developers
Build the game backend:
1. **[Technical Implementation](glow-wars-technical-implementation.md)** - 10-task roadmap
2. **[Convex Reference](convex.md)** - Patterns and best practices
3. Check [.workflow/state.json](../.workflow/state.json) for current progress

### For AI-Assisted Development
Using Claude or other AI assistants:
1. **[Workflow System](glow-wars-workflow-system.md)** - State management rules
2. Review [CLAUDE.md](../CLAUDE.md) for context
3. Check [.workflow/](../.workflow/) for current state

### For Frontend Developers
Building the UI:
1. See **[Frontend Documentation](../docs-front/)** - Complete frontend guide
2. Reference backend APIs in [Technical Implementation](glow-wars-technical-implementation.md)

## 📖 Document Directory

### 🎮 Game Design

| Document | Description | Pages | Last Updated |
|----------|-------------|-------|--------------|
| [Game Design Document](glow-wars-gdd.md) | Complete game vision including mechanics, AI behaviors, power-ups, maps, and monetization | 179 lines | Core design complete |

**Key Topics**:
- Core gameplay loop and mechanics
- AI entities (Sparks & Shadow Creepers)
- 5 power-up types with unique abilities
- Victory conditions and scoring
- Future expansion plans

### 💻 Backend Development

| Document | Description | Pages | For Who |
|----------|-------------|-------|---------|
| [Technical Implementation](glow-wars-technical-implementation.md) | Detailed 10-task implementation roadmap with TDD approach | 395 lines | Backend Developers |
| [Convex Reference](convex.md) | Comprehensive Convex patterns, validators, and best practices | 742 lines | All Developers |

**Implementation Tasks**:
1. ✅ Core Database Schema & Player Management
2. ✅ Game Sessions & Lobby System
3. ✅ Real-time Game State & Position Sync
4. ✅ Territory System Implementation
5. ✅ Collision Detection & Player Elimination
6. ✅ Spark AI System
7. ✅ Shadow Creeper AI System
8. ✅ Power-up System
9. ✅ Victory Conditions & Game End
10. ✅ Performance Optimizations

### 🤖 Development Process

| Document | Description | Pages | Purpose |
|----------|-------------|-------|---------|
| [Workflow System](glow-wars-workflow-system.md) | AI-assisted development workflow with state management | 253 lines | Efficient AI collaboration |

**Workflow Components**:
- `.workflow/state.json` - Current task state
- `.workflow/progress.md` - Human-readable log
- `CLAUDE.md` - AI context and rules

## 🔄 Development Workflows

<details>
<summary>I want to understand what we're building</summary>

1. Start with [Game Design Document](glow-wars-gdd.md)
2. Review [Visual Design](../docs-front/visual-design/) for aesthetics
3. Check [Frontend Docs](../docs-front/) for UI/UX

</details>

<details>
<summary>I need to implement a backend feature</summary>

1. Find your task in [Technical Implementation](glow-wars-technical-implementation.md)
2. Reference [Convex patterns](convex.md) for implementation
3. Follow TDD approach with tests first
4. Update workflow state when complete

</details>

<details>
<summary>I'm working with AI assistance</summary>

1. Read [Workflow System](glow-wars-workflow-system.md) first
2. Check `.workflow/state.json` for current state
3. Follow the three-file system rules
4. Update state after each action

</details>

<details>
<summary>I need to understand the API surface</summary>

1. Review Convex functions in [Technical Implementation](glow-wars-technical-implementation.md)
2. Check schema definitions in Task 1
3. See real-time sync patterns in Task 3

</details>

## 📊 Current Progress

### Backend Implementation Status
- **Completed**: All 10 core tasks ✅
- **Current Focus**: Frontend implementation
- **Next Phase**: Performance optimization and polish

### Task Completion
```
[████████████████████] 10/10 Tasks Complete
```

For detailed progress, see:
- [.workflow/state.json](../.workflow/state.json) - Current state
- [.workflow/progress.md](../.workflow/progress.md) - Development log

## 🔌 Integration Points

### Backend ↔ Frontend
- **Real-time Sync**: Convex WebSocket subscriptions
- **State Management**: Convex + React Query
- **Authentication**: Clerk integration
- **Type Safety**: Shared TypeScript types

### Key APIs
```typescript
// Game Management
createGame(hostName, maxPlayers, duration)
joinGame(gameCode, playerName)
leaveGame(gameId, playerId)

// Real-time Updates
updatePlayerPosition(gameId, playerId, position)
updateTerritory(gameId, cells)
collectPowerUp(gameId, playerId, powerUpId)

// Game State
watchGame(gameId) // Real-time subscription
getGameState(gameId)
```

## 🛠️ Technology Stack

### Backend Technologies
- **Database**: Convex (real-time, reactive)
- **Language**: TypeScript
- **Testing**: convex-test with mock backend
- **Architecture**: Event-sourced game state

### Development Tools
- **State Management**: Workflow system
- **AI Assistance**: Claude with context engineering
- **Version Control**: Git with atomic commits

## 🤝 Contributing

### Development Process
1. **Pick a Task**: Check [Technical Implementation](glow-wars-technical-implementation.md)
2. **Update State**: Modify `.workflow/state.json`
3. **Write Tests First**: TDD approach required
4. **Implement Feature**: Follow Convex patterns
5. **Update Progress**: Document in `.workflow/progress.md`
6. **Atomic Commit**: One feature per commit

### Code Standards
- TypeScript strict mode
- Comprehensive error handling
- Real-time optimizations
- Test coverage required

### Documentation Updates
- Keep task progress current
- Update this README for new sections
- Document API changes
- Maintain workflow state

## 🔗 Related Resources

### Project Documentation
- [Main README](../README.md) - Project overview
- [Frontend Docs](../docs-front/) - UI implementation
- [CLAUDE.md](../CLAUDE.md) - AI context

### External Resources
- [Convex Documentation](https://docs.convex.dev)
- [TanStack Start](https://tanstack.com/start)
- [Clerk Authentication](https://clerk.dev)

---

🚧 **Status**: Backend implementation complete, frontend development active

📍 **Current Focus**: Minimalistic prototype with PixiJS primitives