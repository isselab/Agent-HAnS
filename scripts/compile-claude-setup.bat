@echo off
REM Creates a folder with Claude Code configuration for Agent HAnS.
REM Copy the contents of the output folder to your project root.
REM
REM Usage: claude.bat [--build]
REM   --build   Run "npm run build" before constructing the setup folder.

set "SCRIPT_DIR=%~dp0"
set "DEFINITIONS_DIR=%SCRIPT_DIR%..\definitions"
set "BUILD_DIR=%SCRIPT_DIR%..\build"
set "OUTPUT_DIR=%SCRIPT_DIR%..\claude-setup"

REM Parse options
if "%~1"=="--build" (
  echo Building Agent HAnS...
  npm run build --prefix "%SCRIPT_DIR%.."
  if errorlevel 1 (
    echo Error: Build failed.
    exit /b 1
  )
  echo.
) else if not "%~1"=="" (
  echo Unknown option: %~1
  echo Usage: claude.bat [--build]
  exit /b 1
)

REM Pre-flight: ensure the project has been built
if not exist "%BUILD_DIR%\index.js" (
  echo Error: build\index.js not found. Run "npm run build" first, or use --build.
  exit /b 1
)

echo Creating Claude Code Agent HAnS setup...

REM Clean and create output directory structure
if exist "%OUTPUT_DIR%" rmdir /s /q "%OUTPUT_DIR%"
mkdir "%OUTPUT_DIR%\.claude\mcp"
mkdir "%OUTPUT_DIR%\.claude\skills\feature-model"
mkdir "%OUTPUT_DIR%\.claude\skills\embedded-feature-annotation"

REM Create .mcp.json
(
echo {
echo   "mcpServers": {
echo     "agent-hans": {
echo       "command": "node",
echo       "args": [".claude/mcp/index.js"]
echo     }
echo   }
echo }
) > "%OUTPUT_DIR%\.mcp.json"

REM Copy MCP server files
copy "%BUILD_DIR%\index.js" "%OUTPUT_DIR%\.claude\mcp\index.js" > nul
xcopy /e /i /q "%BUILD_DIR%\static" "%OUTPUT_DIR%\.claude\mcp\static" > nul

REM Copy AGENTS.md as CLAUDE.md
copy "%DEFINITIONS_DIR%\AGENTS.md" "%OUTPUT_DIR%\.claude\CLAUDE.md" > nul

REM Copy skill definitions
copy "%DEFINITIONS_DIR%\fm-skill.md" "%OUTPUT_DIR%\.claude\skills\feature-model\SKILL.md" > nul
copy "%DEFINITIONS_DIR%\efa-skill.md" "%OUTPUT_DIR%\.claude\skills\embedded-feature-annotation\SKILL.md" > nul

echo.
echo Setup folder created at: %OUTPUT_DIR%
echo Copy the contents to your project root to enable Agent HAnS.
