#!/usr/bin/env bash
# Tears down the GoodMem e2e test environment.
# Removes the server, profile, and .env.test file.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
E2E_DIR="$(dirname "$SCRIPT_DIR")"
PROFILE_NAME="e2e-test"

echo "Tearing down GoodMem e2e environment (profile: $PROFILE_NAME)..."

# Uninstall the server + profile in one shot
goodmem system uninstall \
  --profile-name "$PROFILE_NAME" \
  --yes-delete-data 2>/dev/null || true

# Clean up test env file
rm -f "$E2E_DIR/.env.test"

echo "Teardown complete."
