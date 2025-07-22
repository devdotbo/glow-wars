#!/bin/bash

# Generic command runner with logging
# Usage: ./run-with-logs.sh <command>

if [ $# -eq 0 ]; then
    echo "Usage: $0 <command>"
    echo "Example: $0 'pnpm test:e2e:minimal'"
    exit 1
fi

LOG_DIR=".workflow/logs"
mkdir -p $LOG_DIR

# Get command name for log file
COMMAND_NAME=$(echo "$1" | sed 's/[^a-zA-Z0-9]/-/g' | sed 's/--*/-/g')
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="$LOG_DIR/${COMMAND_NAME}-$TIMESTAMP.log"

echo "Running: $1"
echo "Log file: $LOG_FILE"
echo ""

# Run command and log output
eval "$1" 2>&1 | tee "$LOG_FILE"