#!/bin/bash
# check-prerequisites.sh
# Mocks the json output expected by speckit agents

ROOT_DIR=$(pwd)
FEATURE_DIR="$ROOT_DIR"  # Default to root for this simple setup
SPECS_DIR="$ROOT_DIR/specs"

# Ensure specs dir exists
mkdir -p "$SPECS_DIR"

# Output JSON
cat <<EOF
{
  "ROOT_DIR": "$ROOT_DIR",
  "FEATURE_DIR": "$FEATURE_DIR",
  "SPECS_DIR": "$SPECS_DIR",
  "AVAILABLE_DOCS": ["spec.md", "plan.md", "tasks.md"]
}
EOF