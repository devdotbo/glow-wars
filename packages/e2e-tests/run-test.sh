#!/bin/bash
cd "$(dirname "$0")"
FRONTEND=minimal ./node_modules/.bin/playwright test --config=playwright.config.local.ts tests/game-lobby.spec.ts -g "should create guest player"