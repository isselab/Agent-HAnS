#!/bin/bash
# Creates a folder with Claude Code configuration for Agent HAnS.
# Copy the contents of the output folder to your project root.
#
# Usage: claude.sh [--build]
#   --build   Run 'npm run build' before constructing the setup folder.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEFINITIONS_DIR="$SCRIPT_DIR/../definitions"
BUILD_DIR="$SCRIPT_DIR/../build"
OUTPUT_DIR="$SCRIPT_DIR/../claude-setup"

# Parse options
for arg in "$@"; do
  case $arg in
    --build)
      echo "Building Agent HAnS..."
      npm run build --prefix "$SCRIPT_DIR/.."
      if [ $? -ne 0 ]; then
        echo "Error: Build failed."
        exit 1
      fi
      echo ""
      ;;
    *)
      echo "Unknown option: $arg"
      echo "Usage: claude.sh [--build]"
      exit 1
      ;;
  esac
done

# Pre-flight: ensure the project has been built
if [ ! -f "$BUILD_DIR/index.js" ]; then
  echo "Error: build/index.js not found. Run 'npm run build' first, or use --build."
  exit 1
fi

echo "Creating Claude Code Agent HAnS setup..."

# Clean and create output directory structure
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR/.claude/mcp"
mkdir -p "$OUTPUT_DIR/.claude/skills/feature-model"
mkdir -p "$OUTPUT_DIR/.claude/skills/embedded-feature-annotation"

# Create .mcp.json
cat > "$OUTPUT_DIR/.mcp.json" << 'EOF'
{
  "mcpServers": {
    "agent-hans": {
      "command": "node",
      "args": [".claude/mcp/index.js"]
    }
  }
}
EOF

# Copy MCP server files
cp "$BUILD_DIR/index.js" "$OUTPUT_DIR/.claude/mcp/index.js"
cp -r "$BUILD_DIR/static" "$OUTPUT_DIR/.claude/mcp/static"

# Copy AGENTS.md as CLAUDE.md
cp "$DEFINITIONS_DIR/AGENTS.md" "$OUTPUT_DIR/.claude/CLAUDE.md"

# Copy skill definitions
cp "$DEFINITIONS_DIR/fm-skill.md" "$OUTPUT_DIR/.claude/skills/feature-model/SKILL.md"
cp "$DEFINITIONS_DIR/efa-skill.md" "$OUTPUT_DIR/.claude/skills/embedded-feature-annotation/SKILL.md"

echo ""
echo "Setup folder created at: $OUTPUT_DIR"
echo "Copy the contents to your project root to enable Agent HAnS."
