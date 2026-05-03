# File Reorganization Plan (FILES.md)

This document outlines the strategy for separating source code from AI-related documentation and project management files to ensure a clean and professional root directory.

## 1. Goal
Move all non-source code markdown files and instruction sets into a dedicated `docs/` hierarchy, keeping the root directory focused strictly on the application's source code, configuration, and build artifacts.

## 2. Target Directory Structure

```text
/ (Root)
├── backend/             # Node.js Backend Workspace
├── frontend/            # Vite/React Frontend Workspace
├── api/                 # Vercel Serverless Functions
├── docs/                # Project Documentation & AI Instructions
│   ├── ai/              # AI Instructions & Directives
│   │   ├── directives/  # SOPs (moved from root/directives)
│   │   ├── agents/      # Agent-specific instructions (GEMINI.md, etc.)
│   │   └── memory/      # Project-specific memory files
│   ├── debug/           # Debug Reports (moved from root/debug)
│   ├── improvements/    # Version History (moved from root/improvements)
│   ├── plans/           # Implementation Plans (moved from root/plans)
│   └── issues/          # Issue Tracking (moved from root/issues)
├── package.json         # Root Config
├── vercel.json          # Deployment Config
└── README.md            # Project Overview (Entry Point)
```

## 3. Migration Map

| Original Path | New Path |
| :--- | :--- |
| `directives/` | `docs/ai/directives/` |
| `debug/` | `docs/debug/` |
| `improvements/` | `docs/improvements/` |
| `plans/` | `docs/plans/` |
| `issues/` | `docs/issues/` |
| `GEMINI.md` | `docs/ai/agents/GEMINI.md` |
| `CLAUDE.md` | `docs/ai/agents/CLAUDE.md` |
| `AGENTS.md` | `docs/ai/agents/AGENTS.md` |
| `DEV_GUIDE.md` | `docs/DEV_GUIDE.md` |
| `FLOW.md` | `docs/FLOW.md` |
| `FOLDERS.md` | `docs/FOLDERS.md` |
| `RECONF.md` | `docs/plans/RECONF.md` |

## 4. Execution Plan

1. **[x] Create Directory Tree**: Build the new `docs/` hierarchy.
2. **[x] Relocate Files**: Move markdown files to their respective new homes.
3. **[x] Update Internal Links**: Fix any cross-references between the moved markdown files.
4. **[x] Update Root Readme**: Update `README.md` to point to the new documentation paths.
5. **[x] Update Gemini/Agent Instructions**: Ensure the AI knows its instruction set has moved.
