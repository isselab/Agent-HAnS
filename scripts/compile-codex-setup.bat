@echo off
REM &begin[CodexIntegration]
REM Creates a folder with Codex configuration for Agent HAnS.
REM Copy the contents of the output folder to your project root.
REM
REM Usage: compile-codex-setup.bat [--build]
REM   --build   Run "npm run build" before constructing the setup folder.

set "SCRIPT_DIR=%~dp0"
set "DEFINITIONS_DIR=%SCRIPT_DIR%..\definitions"
set "BUILD_DIR=%SCRIPT_DIR%..\build"
set "OUTPUT_DIR=%SCRIPT_DIR%..\codex-setup"

REM Parse options
if "%~1"=="--build" (
  echo Building Agent HAnS...
  call npm run build --prefix "%SCRIPT_DIR%.."
  if errorlevel 1 (
    echo Error: Build failed.
    exit /b 1
  )
  echo.
) else if not "%~1"=="" (
  echo Unknown option: %~1
  echo Usage: compile-codex-setup.bat [--build]
  exit /b 1
)

REM Pre-flight: ensure the project has been built
if not exist "%BUILD_DIR%\index.js" (
  echo Error: build\index.js not found. Run "npm run build" first, or use --build.
  exit /b 1
)
if not exist "%BUILD_DIR%\static\index.html" (
  echo Error: build\static\index.html not found. Run "npm run build" first, or use --build.
  exit /b 1
)

echo Creating Codex Agent HAnS setup...

REM Clean and create output directory structure
if exist "%OUTPUT_DIR%" rmdir /s /q "%OUTPUT_DIR%"
mkdir "%OUTPUT_DIR%\.codex\mcp"
mkdir "%OUTPUT_DIR%\.agents\skills\feature-model"
mkdir "%OUTPUT_DIR%\.agents\skills\embedded-feature-annotation"

REM Create project-scoped Codex MCP configuration
(
echo [mcp_servers.agent-hans]
echo command = "node"
echo args = [".codex/mcp/index.js"]
) > "%OUTPUT_DIR%\.codex\config.toml"

REM Copy MCP server files
copy "%BUILD_DIR%\index.js" "%OUTPUT_DIR%\.codex\mcp\index.js" > nul
xcopy /e /i /q "%BUILD_DIR%\static" "%OUTPUT_DIR%\.codex\mcp\static" > nul

REM Copy Codex project instructions and repository-scoped skills
copy "%DEFINITIONS_DIR%\AGENTS.md" "%OUTPUT_DIR%\AGENTS.md" > nul
copy "%DEFINITIONS_DIR%\fm-skill.md" "%OUTPUT_DIR%\.agents\skills\feature-model\SKILL.md" > nul
copy "%DEFINITIONS_DIR%\efa-skill.md" "%OUTPUT_DIR%\.agents\skills\embedded-feature-annotation\SKILL.md" > nul

echo.
echo Setup folder created at: %OUTPUT_DIR%
echo Copy the contents to your project root to enable Agent HAnS in Codex.
REM &end[CodexIntegration]
