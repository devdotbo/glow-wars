# 🎮 Glow Wars Frontend Documentation

> **Quick Navigation:** [Setup](#-quick-start) | [Visual Design](visual-design/) | [Minimalistic Prototype](minimalistic-prototype/) | [Performance](#-performance--optimization) | [Testing](#-testing)

Welcome to the Glow Wars frontend documentation hub. This directory contains comprehensive guides, specifications, and implementation details for building the game's React + PixiJS frontend.

## 📚 Overview

Glow Wars is built with a modern frontend stack optimized for real-time multiplayer gameplay:

- **Framework**: React with TanStack Start (file-based routing)
- **Game Engine**: PixiJS v8 (WebGL rendering)
- **Real-time Sync**: Convex with React Query integration
- **Authentication**: Clerk
- **Language**: TypeScript (strict mode)
- **Styling**: CSS-in-JS with glass morphism effects

## 🚀 Quick Start

New to the project? Start here:

1. **[Frontend Implementation Plan](frontend-implementation-plan.md)** - Architecture overview and development roadmap
2. **[PixiJS Setup Guide](pixijs-setup-guide.md)** - Initial setup and configuration
3. **[UI/UX Specifications](ui-ux-specifications.md)** - Interface requirements and flows

### Alternative Approach

Building a rapid prototype? Check out the **[Minimalistic Prototype Guide](minimalistic-prototype/)** - build with primitives only, no sprites needed!

## 📖 Documentation Map

### Core Implementation

| Document | Description | For Who |
|----------|-------------|---------|
| [Frontend Implementation Plan](frontend-implementation-plan.md) | Complete architecture, tech stack, and phase-by-phase implementation guide | Architects, Lead Devs |
| [PixiJS Setup Guide](pixijs-setup-guide.md) | Detailed PixiJS v8 configuration, project structure, and integration patterns | All Developers |

### Visual & Effects

| Document | Description | For Who |
|----------|-------------|---------|
| [Visual Effects Guide](visual-effects-guide.md) | Comprehensive guide to implementing all game effects with code examples | Graphics Developers |
| [Visual Design System](visual-design/) | Complete design specifications, color systems, and mockups | Designers, UI Devs |
| [Asset Specifications](asset-specifications.md) | Sprite requirements, formats, and production guidelines | Artists, Asset Pipeline |
| [AI Sprite Generation](ai-sprite-generation-guide.md) | Using AI tools to generate game assets | Artists, Rapid Prototyping |

### UI/UX

| Document | Description | For Who |
|----------|-------------|---------|
| [UI/UX Specifications](ui-ux-specifications.md) | Complete interface design, user flows, and interaction patterns | UI/UX Developers |

### Performance & Optimization

| Document | Description | For Who |
|----------|-------------|---------|
| [Performance Optimization](performance-optimization.md) | WebGL optimization, draw call reduction, and performance profiling | Performance Engineers |

### Testing

| Document | Description | For Who |
|----------|-------------|---------|
| [Testing Strategy](testing-strategy.md) | Comprehensive testing approach including unit, integration, and visual tests | QA, Test Engineers |

### Alternative Approaches

| Document | Description | For Who |
|----------|-------------|---------|
| [Minimalistic Prototype](minimalistic-prototype/) | Build Glow Wars using only PixiJS primitives - no assets required! | Rapid Prototypers |

## 🔄 Developer Workflows

### "I need to..."

<details>
<summary>Build the game with full visual fidelity</summary>

1. Start with [Frontend Implementation Plan](frontend-implementation-plan.md)
2. Set up PixiJS using [PixiJS Setup Guide](pixijs-setup-guide.md)
3. Implement visuals following [Visual Design System](visual-design/)
4. Add effects from [Visual Effects Guide](visual-effects-guide.md)
5. Optimize using [Performance Optimization](performance-optimization.md)

</details>

<details>
<summary>Create a quick prototype without assets</summary>

1. Go directly to [Minimalistic Prototype](minimalistic-prototype/)
2. Follow the implementation roadmap
3. Use the code cookbook for quick implementations
4. Reference visual effects for primitive-based effects

</details>

<details>
<summary>Implement a specific visual effect</summary>

1. Check [Visual Effects Guide](visual-effects-guide.md) for implementation
2. Reference [Visual Design System](visual-design/effects-catalog.md) for specifications
3. Use performance tips from [Performance Optimization](performance-optimization.md)

</details>

<details>
<summary>Design or modify UI components</summary>

1. Review [UI/UX Specifications](ui-ux-specifications.md) for patterns
2. Check [Visual Design System](visual-design/ui-visual-guide.md) for styling
3. Follow responsive guidelines for mobile adaptations

</details>

## 📁 Subdirectory Guides

### 🎨 [Visual Design System](visual-design/)
Complete visual design documentation including:
- Color systems and palettes
- Effects catalog with parameters
- UI component specifications
- Mobile adaptations
- Visual mockups and references

### ⚡ [Minimalistic Prototype](minimalistic-prototype/)
Alternative implementation using only primitives:
- No sprite/asset dependencies
- Rapid development approach
- Full game features with geometric shapes
- Performance-optimized techniques

## 🔧 Key Technologies

### PixiJS v8
- WebGL 2.0 renderer
- Advanced particle systems
- Shader support
- Batch rendering

### React + TanStack
- File-based routing
- Server-side rendering ready
- Type-safe routing

### Convex Integration
- Real-time synchronization
- Optimistic updates
- Offline support

## 📊 Development Standards

- **TypeScript**: Strict mode enabled
- **Code Style**: Prettier configured (no semicolons, single quotes)
- **Performance**: 60 FPS target on mid-range devices
- **Accessibility**: WCAG 2.1 AA compliance
- **Testing**: Minimum 80% coverage

## 🌐 External Resources

- [PixiJS Documentation](https://pixijs.com)
- [TanStack Start Guide](https://tanstack.com/start)
- [Convex React Integration](https://docs.convex.dev/client/react)
- [Clerk Authentication](https://clerk.dev/docs)

## 🤝 Contributing to Docs

When adding new documentation:
1. Place in appropriate category
2. Update this README's document map
3. Follow existing formatting patterns
4. Include code examples where applicable
5. Add to relevant workflow sections

---

📍 **Current Focus**: Core gameplay implementation with minimalistic prototype approach

🎯 **Next Up**: Performance optimization and mobile adaptations