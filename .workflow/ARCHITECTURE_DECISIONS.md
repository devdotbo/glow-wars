# Architecture Decisions

This document captures key architectural decisions made during the Glow Wars project development.

## Decision: Single Frontend (web-minimal)

**Date**: January 22, 2025

**Status**: Implemented

**Context**: 
- Project had two frontends: web-minimal and web-tanstack
- Both needed to be maintained and tested
- E2E tests had to support both variants
- Feature parity was required

**Decision**: Remove web-tanstack, keep only web-minimal

**Rationale**:
1. **Reduced Complexity**: One codebase to maintain
2. **Faster Development**: No need to implement features twice
3. **Simpler Testing**: Single set of E2E tests
4. **Clear Focus**: Can optimize for one approach
5. **Resource Efficiency**: ~6,000 lines of duplicate code removed

**Consequences**:
- ✅ Simpler architecture
- ✅ Faster development cycles
- ✅ Easier debugging
- ❌ Lost TanStack Start routing features (not needed for game)

---

## Decision: Single Convex Source

**Date**: January 22, 2025

**Status**: Implemented

**Context**:
- Convex functions existed in two places:
  - `/convex/` (deployment directory)
  - `/packages/convex/convex/` (package directory)
- Led to confusion about which was authoritative
- Deployment issues when changes weren't synced

**Decision**: Keep only root `/convex/`, package re-exports

**Rationale**:
1. **Single Source of Truth**: No sync issues
2. **Deployment Clarity**: Convex expects root directory
3. **Package Compatibility**: Re-export via package.json works fine
4. **Reduced Errors**: No accidental edits to wrong copy

**Implementation**:
```json
// packages/convex/package.json
"exports": {
  "./_generated/api": "../../convex/_generated/api.js",
  "./_generated/dataModel": "../../convex/_generated/dataModel.d.ts"
}
```

**Consequences**:
- ✅ Clear deployment path
- ✅ No duplicate code (~800 lines removed)
- ✅ Easier to understand structure

---

## Decision: TypeScript Checks Always Enabled

**Date**: January 22, 2025

**Status**: Implemented

**Context**:
- Convex dev was running with `--typecheck=disable`
- TypeScript errors could slip through
- False confidence in code correctness

**Decision**: Remove all typecheck disabling

**Rationale**:
1. **Early Error Detection**: Catch issues before runtime
2. **Better DX**: IDE and CLI agree on errors
3. **Type Safety**: Full benefits of TypeScript
4. **CI/CD Alignment**: Dev matches production checks

**Consequences**:
- ✅ More reliable code
- ✅ Fewer runtime surprises
- ❌ Slightly slower dev server startup (worth it)

---

## Decision: Logging Infrastructure

**Date**: January 22, 2025

**Status**: Implemented

**Context**:
- Dev server output was ephemeral
- Hard to debug issues after they occurred
- No record of what happened when

**Decision**: Create logging wrapper scripts

**Implementation**:
```bash
# .workflow/dev-with-logs.sh
pnpm dev 2>&1 | tee "$LOG_DIR/dev-$TIMESTAMP.log"
```

**Rationale**:
1. **Debugging**: Can review logs after issues
2. **History**: Track when problems started
3. **Sharing**: Can share logs for help
4. **Analysis**: Find patterns in errors

**Consequences**:
- ✅ Better debugging capability
- ✅ Historical record
- ✅ Easy to implement
- ❌ More disk usage (manageable)

---

## Decision: State Management Approach (Pending)

**Date**: TBD

**Status**: Under Consideration

**Context**:
- Current `useGameState` hook is complex
- Multiple separate queries
- Complex mutation callbacks
- Missing error handling

**Options**:
1. **Keep Current**: Familiar but complex
2. **Combine Queries**: Single game state object
3. **Zustand/Valtio**: External state management
4. **Custom Hook v2**: Simplified version

**Recommendation**: Option 4 - Custom Hook v2
- Combine related queries
- Add error boundaries
- Simplify mutation patterns
- Keep React Query benefits

---

## Decision: Game ID Display Format

**Date**: January 22, 2025

**Status**: Implemented

**Context**:
- Convex IDs are 32 characters (e.g., `jd78afkwrnf9ykjvabca98pcx17m6gfy`)
- Too long for user display
- Need consistent format across UI and tests

**Decision**: Display last 8 characters

**Rationale**:
1. **User Friendly**: 8 chars is memorable
2. **Unique Enough**: Very low collision chance
3. **Consistent**: Same everywhere
4. **Test Compatible**: E2E tests can match

**Implementation**:
```typescript
// Display
gameId.slice(-8)  // "x17m6gfy"

// Test selector
data-game-id={game._id.slice(-8)}
```

**Consequences**:
- ✅ Better UX
- ✅ Consistent testing
- ✅ Clean display

---

## Design Principles

Based on these decisions, our architecture follows these principles:

1. **Simplicity First**: Choose simple over clever
2. **Single Source of Truth**: No duplicates
3. **Type Safety**: TypeScript everywhere
4. **Developer Experience**: Good logging, clear errors
5. **Test Reliability**: Match production behavior
6. **Incremental Improvement**: Refactor as needed

These principles guide future architectural decisions.