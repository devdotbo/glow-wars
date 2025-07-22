#!/bin/bash

# Development server with logging
# This script runs the development servers and logs all output

LOG_DIR=".workflow/logs"
mkdir -p $LOG_DIR

# Generate timestamp for log file
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="$LOG_DIR/dev-$TIMESTAMP.log"

echo "Starting development servers with logging..."
echo "Log file: $LOG_FILE"
echo "Press Ctrl+C to stop"
echo ""

# Run pnpm dev and log output
pnpm dev 2>&1 | tee "$LOG_FILE"