#!/bin/bash
# setup-plan.sh
# Mocks setting up the planning phase

ROOT_DIR=$(pwd)
FEATURE_DIR="$ROOT_DIR"
IMPL_PLAN="$FEATURE_DIR/plan.md"
FEATURE_SPEC="$FEATURE_DIR/Requirement Specifications.md"

# Output JSON
cat <<EOF
{
  "FEATURE_SPEC": "$FEATURE_SPEC",
  "IMPL_PLAN": "$IMPL_PLAN",
  "SPECS_DIR": "$ROOT_DIR/specs",
  "BRANCH": "current-branch"
}
EOF