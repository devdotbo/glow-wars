# Glow Wars - Agentic Workflow Management System

## Core Principle: Single Source of Truth
All state, progress, and context lives in files, not in conversation history. Claude reads state at the start of each session and updates it continuously.

## Workflow Rules for Claude

### The Three-File System

1. **`.workflow/state.json`** - Current state snapshot
2. **`.workflow/progress.md`** - Human-readable progress log
3. **`CLAUDE.md`** - Context and rules (updated with workflow rules)

### Claude's Operating Rules

1. **START OF SESSION**
   - ALWAYS read `.workflow/state.json` first
   - Read the current task's spec from technical doc
   - Check for any blockers or incomplete work
   - Never assume previous conversation context

2. **DURING WORK**
   - Update state.json after EVERY meaningful action
   - Test continuously, never leave broken code
   - Commit after each atomic task completion
   - Update progress.md with results

3. **END OF TASK**
   - Run all tests for current task
   - Update state.json with completion
   - Write summary in progress.md
   - Commit with descriptive message
   - Prepare state for next session

4. **CONTEXT MANAGEMENT**
   - Only load files needed for current task
   - Use focused grep/search instead of reading entire files
   - Summarize findings instead of quoting large blocks
   - Reference file:line for future navigation

## State Management Structure

### `.workflow/state.json`
```json
{
  "currentTask": {
    "id": 1,
    "name": "Core Database Schema & Player Management",
    "status": "in_progress|completed|blocked",
    "startedAt": "2024-01-20T10:00:00Z",
    "completedAt": null,
    "filesCreated": ["convex/schema.ts", "convex/players.ts"],
    "filesModified": [],
    "testsWritten": 3,
    "testsPassing": 2,
    "lastAction": "Created player validation function",
    "nextAction": "Write test for duplicate name handling",
    "blockers": []
  },
  "completedTasks": [
    // Array of completed task objects
  ],
  "projectHealth": {
    "canRun": true,
    "lastTestRun": "2024-01-20T10:30:00Z",
    "allTestsPassing": false,
    "buildStatus": "success"
  },
  "contextHints": {
    "importantFiles": ["convex/schema.ts", "convex/_generated/api.d.ts"],
    "recentErrors": [],
    "dependencies": ["convex", "@tanstack/react-query"]
  }
}
```

### `.workflow/progress.md`
```markdown
# Glow Wars Development Progress

## Task 1: Core Database Schema & Player Management
**Status**: In Progress  
**Started**: 2024-01-20 10:00 AM  

### Completed:
- ✅ Created database schema with players, games, gamePlayers tables
- ✅ Implemented createPlayer function with validation
- ✅ Added getPlayer query function

### In Progress:
- 🔄 Writing test for duplicate name handling

### Test Results:
- ✅ Create player with valid data - PASS
- ✅ Retrieve player by ID - PASS  
- ❌ Validate color format - FAIL (not implemented)
- ⏸️ Handle duplicate names - Not started

### Notes:
- Color validation needs regex for hex format
- Consider adding player stats table for future
```

## Task Execution Protocol

### 1. Task Initialization
```bash
# Claude's first actions for any task:
1. Read .workflow/state.json
2. Read task spec from technical doc
3. Create/update test file first (TDD)
4. Update state.json with "in_progress"
```

### 2. Implementation Cycle
```bash
while task_not_complete:
    1. Write/update one test
    2. Run test (expect failure)
    3. Implement minimal code to pass
    4. Run test again
    5. Update state.json
    6. If all tests pass: mark complete
```

### 3. Commit Protocol
```bash
# After each atomic piece:
1. Run: npm run format
2. Run: npx convex deploy
3. Run task-specific tests
4. Git add and commit with pattern:
   "Task N: [component] Description
   
   - What was added/changed
   - Test results: X/Y passing"
```

## Context Engineering Rules

### 1. Minimal Context Loading
- Load ONLY files needed for current task
- Use grep/search for specific patterns
- Summarize large sections instead of reading fully

### 2. Reference Tracking
- Always note file:line for important code
- Keep a "working set" of 3-5 files max
- Use the state.json contextHints for quick access

### 3. Progress Preservation
- Update state.json every 10 minutes
- Write detailed commit messages
- Leave TODO comments for next session

### 4. Error Recovery
```typescript
// If Claude encounters an error:
1. Document error in state.json
2. Add to progress.md with diagnosis
3. Create minimal reproduction
4. Fix or mark as blocker
5. Update nextAction in state
```

## Documentation Standards

### Code Comments
```typescript
// Only document:
// 1. Non-obvious algorithms
// 2. Integration points
// 3. TODOs for next session
// 4. Known limitations
```

### Test Documentation
```typescript
describe('Feature: Player Management', () => {
  // Context: What this test suite covers
  // Dependencies: What needs to exist
  // State: What gets modified
});
```

### Progress Updates
- One-line summary per completed action
- Test results with numbers (3/5 passing)
- Blockers with proposed solutions
- Time estimates for remaining work

## Session Handoff Protocol

### Before Ending Session:
1. **Update state.json** with exact current state
2. **Run all tests** and document results
3. **Commit any WIP** with clear message
4. **Update progress.md** with session summary
5. **Set nextAction** very specifically

### Starting New Session:
1. **Read state.json** completely
2. **Check projectHealth** for issues
3. **Resume from nextAction**
4. **Verify nothing broke** since last session

## Anti-Patterns to Avoid

1. ❌ **Context Assumptions**: Never assume Claude remembers previous conversations
2. ❌ **Big Bangs**: Never implement multiple features at once
3. ❌ **Mock Testing**: Always test with real Convex functions
4. ❌ **Skipping State Updates**: Always update state.json
5. ❌ **Vague TODOs**: Always be specific about next actions

## Metrics for Success

Each task is complete when:
```json
{
  "allTestsPassing": true,
  "noTypeScriptErrors": true,
  "codeFormatted": true,
  "committed": true,
  "stateUpdated": true,
  "documentationComplete": true
}
```

---

This workflow system ensures continuity, minimizes context usage, and enables any Claude instance to pick up exactly where the last one left off.