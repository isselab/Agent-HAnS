#!/bin/bash
# &begin[CodexIntegration]
# Creates a folder with Codex configuration for Agent HAnS.
# Copy the contents of the output folder to your project root.
#
# Usage: compile-codex-setup.sh [--build]
#   --build   Run 'npm run build' before constructing the setup folder.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEFINITIONS_DIR="$SCRIPT_DIR/../definitions"
BUILD_DIR="$SCRIPT_DIR/../build"
OUTPUT_DIR="$SCRIPT_DIR/../codex-setup"

for arg in "$@"; do
  case "$arg" in
    --build)
      echo "Building Agent HAnS..."
      npm run build --prefix "$SCRIPT_DIR/.."
      echo ""
      ;;
    *)
      echo "Unknown option: $arg"
      echo "Usage: compile-codex-setup.sh [--build]"
      exit 1
      ;;
  esac
done

if [ ! -f "$BUILD_DIR/index.js" ]; then
  echo "Error: build/index.js not found. Run 'npm run build' first, or use --build."
  exit 1
fi
if [ ! -f "$BUILD_DIR/static/index.html" ]; then
  echo "Error: build/static/index.html not found. Run 'npm run build' first, or use --build."
  exit 1
fi

echo "Creating Codex Agent HAnS setup..."

rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR/.codex/mcp"
mkdir -p "$OUTPUT_DIR/.agents/skills/feature-model"
mkdir -p "$OUTPUT_DIR/.agents/skills/embedded-feature-annotation"

cat > "$OUTPUT_DIR/.codex/config.toml" << 'EOF'
[mcp_servers.agent-hans]
command = "node"
args = [".codex/mcp/index.js"]
EOF

cp "$BUILD_DIR/index.js" "$OUTPUT_DIR/.codex/mcp/index.js"
cp -r "$BUILD_DIR/static" "$OUTPUT_DIR/.codex/mcp/static"

cp "$DEFINITIONS_DIR/AGENTS.md" "$OUTPUT_DIR/AGENTS.md"
cp "$DEFINITIONS_DIR/fm-skill.md" "$OUTPUT_DIR/.agents/skills/feature-model/SKILL.md"
cp "$DEFINITIONS_DIR/efa-skill.md" "$OUTPUT_DIR/.agents/skills/embedded-feature-annotation/SKILL.md"

echo ""
echo "Setup folder created at: $OUTPUT_DIR"
echo "Copy the contents to your project root to enable Agent HAnS in Codex."
# &end[CodexIntegration]
