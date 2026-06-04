# Agent HAnS

Agent HAnS (Helping Annotate Software) is a Feature Model Workflow for Claude Code. It gives Claude a structured way to track which features of your codebase are touched during a session — using a lightweight feature model, embedded code annotations, and a visual summary GUI.

When enabled in a project, Claude will:
1. Read the project's feature model at the start of each session
2. Annotate all code changes with the relevant features
3. Open a browser-based summary showing exactly which features were affected and how

---

## Installation

**1. Install MCP server dependencies** (from the repo root):
```sh
npm install
```

**2. Install frontend dependencies:**
```sh
npm install --prefix frontend
```

---

## Build & Compile

The compile script generates a `claude-setup/` folder containing everything that needs to be copied into a target project.

**Option A — build and compile in one step (recommended):**
```sh
# Mac / Linux
./scripts/compile-claude-setup.sh --build

# Windows
scripts\compile-claude-setup.bat --build
```

**Option B — compile only (if you have already run `npm run build`):**
```sh
# Mac / Linux
./scripts/compile-claude-setup.sh

# Windows
scripts\compile-claude-setup.bat
```

---

## Enabling Agent HAnS in a Project

Copy the contents of the generated `claude-setup/` folder into the root of the target project:

```sh
cp -r claude-setup/. /path/to/your/project/
```

> **Note:** Copy the *contents* of `claude-setup/`, not the folder itself, so that `.mcp.json` and `.claude/` land directly at the project root.

This installs the following into the target project:

| Path | Purpose |
|---|---|
| `.mcp.json` | Registers the MCP server with Claude Code |
| `.claude/CLAUDE.md` | Workflow instructions loaded by Claude on every session |
| `.claude/mcp/index.js` | Bundled MCP server (runs locally on port 5252) |
| `.claude/mcp/static/` | Visual summary frontend (React SPA) |
| `.claude/skills/feature-model/SKILL.md` | Feature model syntax reference |
| `.claude/skills/embedded-feature-annotation/SKILL.md` | Annotation syntax reference |

