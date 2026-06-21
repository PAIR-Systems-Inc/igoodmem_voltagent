#!/usr/bin/env bash
# Sets up a dedicated GoodMem server for e2e testing.
#
# Prerequisites:
#   - Docker 24+
#   - e2e/.env file with OPENAI_API_KEY=sk-...
#
# Creates:
#   - A GoodMem install with profile "e2e-test"
#   - An OpenAI embedder (text-embedding-3-small)
#   - e2e/.env.test with connection details
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
E2E_DIR="$(dirname "$SCRIPT_DIR")"
PROFILE_NAME="e2e-test"
export GOODMEM_PROFILE="$PROFILE_NAME"

# ── Load .env for OPENAI_API_KEY ──────────────────────────────────────────────
if [ -f "$E2E_DIR/.env" ]; then
  set -a; source "$E2E_DIR/.env"; set +a
fi

if [ -z "${OPENAI_API_KEY:-}" ]; then
  echo "ERROR: OPENAI_API_KEY not set. Create e2e/.env with OPENAI_API_KEY=sk-..." >&2
  exit 1
fi

# ── Install GoodMem CLI if not present ────────────────────────────────────────
if ! command -v goodmem &>/dev/null; then
  echo "Installing GoodMem CLI..."
  curl -s https://get.goodmem.ai | bash -s -- --cli-only
fi

# ── Clean up any previous e2e-test profile ────────────────────────────────────
if goodmem profile list 2>/dev/null | grep -q "$PROFILE_NAME"; then
  echo "Cleaning up previous $PROFILE_NAME profile..."
  goodmem system uninstall --profile-name "$PROFILE_NAME" --yes-delete-data 2>/dev/null || true
fi

# ── Install GoodMem server with dedicated profile ─────────────────────────────
echo "Installing GoodMem server (profile: $PROFILE_NAME)..."
goodmem system install --handsfree \
  --profile-name "$PROFILE_NAME" \
  --db-password "e2e-test-password-14ch" \
  --tls-disabled \
  --skip-verify \
  --skip-docker-install

# The installer runs `goodmem init` automatically, which saves the API key
# into the profile.

# ── Extract connection info from profile ──────────────────────────────────────
PROFILE_JSON=$(goodmem profile current --output json --show-api-key)
API_KEY=$(echo "$PROFILE_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['api_key'])")
SERVER_URL=$(echo "$PROFILE_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['server_url'])")

# Derive REST base URL from gRPC server URL (gRPC port → REST port = gRPC - 1010)
GRPC_PORT=$(echo "$SERVER_URL" | grep -oP ':\K[0-9]+' | head -1)
REST_PORT=$((GRPC_PORT - 1010))
BASE_HOST=$(echo "$SERVER_URL" | sed 's|.*://||; s|:.*||')
BASE_URL="http://${BASE_HOST}:${REST_PORT}"

# ── Wait for server readiness ─────────────────────────────────────────────────
echo "Waiting for GoodMem server at ${BASE_URL}..."
for i in $(seq 1 30); do
  if curl -sf "${BASE_URL}/livez" >/dev/null 2>&1; then
    echo "Server is live."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "ERROR: GoodMem server did not become ready within 60 seconds" >&2
    exit 1
  fi
  sleep 2
done

# ── Create OpenAI embedder ────────────────────────────────────────────────────
echo "Creating OpenAI embedder..."
EMBEDDER_OUTPUT=$(goodmem embedder create \
  --display-name "E2E OpenAI Ada" \
  --provider-type OPENAI \
  --endpoint-url "https://api.openai.com/v1" \
  --model-identifier "text-embedding-3-small" \
  --dimensionality 1536 \
  --cred-api-key "$OPENAI_API_KEY" \
  --label env=e2e 2>&1)

EMBEDDER_ID=$(echo "$EMBEDDER_OUTPUT" | grep -oP '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1 || echo "")

if [ -z "$EMBEDDER_ID" ]; then
  echo "ERROR: Failed to create embedder. Output:" >&2
  echo "$EMBEDDER_OUTPUT" >&2
  exit 1
fi

# ── Write .env.test for vitest ────────────────────────────────────────────────
cat > "$E2E_DIR/.env.test" <<EOF
GOODMEM_PROFILE=$PROFILE_NAME
GOODMEM_BASE_URL=$BASE_URL
GOODMEM_API_KEY=$API_KEY
GOODMEM_EMBEDDER_ID=$EMBEDDER_ID
EOF

echo ""
echo "GoodMem e2e environment ready:"
echo "  Profile:     $PROFILE_NAME"
echo "  Base URL:    $BASE_URL"
echo "  Embedder ID: $EMBEDDER_ID"
echo "  Config:      $E2E_DIR/.env.test"
