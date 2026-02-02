#!/bin/bash
# create-new-feature.sh
# Mocks creating a new feature branch and spec file

ROOT_DIR=$(pwd)
FEATURE_NUMBER="1"
SHORT_NAME="feature"

# Parse args (very basic)
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --number) FEATURE_NUMBER="$2"; shift ;;
        --short-name) SHORT_NAME="$2"; shift ;;
        *) ;;
    esac
    shift
done

BRANCH_NAME="${FEATURE_NUMBER}-${SHORT_NAME}"
FEATURE_DIR="$ROOT_DIR" # In a real scenario this might be a subdir
SPEC_FILE="$FEATURE_DIR/Requirement Specifications.md" # Using the existing file name convention if possible, or spec.md

# Output JSON
cat <<EOF
{
  "BRANCH_NAME": "$BRANCH_NAME",
  "FEATURE_DIR": "$FEATURE_DIR",
  "SPEC_FILE": "$SPEC_FILE"
}
EOF