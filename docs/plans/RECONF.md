# Project Reconfiguration Plan (RECONF.md)

This document outlines a complete redesign of the project structure to align with industry standards for monorepos, ensuring seamless local development and reliable Vercel deployments.

## 1. Goal
Transition from a manual "folder-based" structure to an official **NPM Workspaces** architecture. This eliminates "command not found" errors and simplifies dependency management.

## 2. Target Architecture
```text
/ (Root)
├── package.json         # Workspace definition & global scripts
├── vercel.json          # Deployment routing
├── api/                 # Vercel Serverless Functions (Backend Entry)
│   └── index.js         # Entry point (proxies to backend workspace)
├── packages/            # Shared logic (optional future use)
├── frontend/            # Vite + React (Workspace: @mlbb/frontend)
│   ├── package.json
│   └── ...
└── backend/             # Express Engine (Workspace: @mlbb/backend)
    ├── package.json
    └── ...
```

## 3. Implementation Steps

### Phase 1: NPM Workspaces Setup
1. **Modify Root `package.json`**:
   - Add `"workspaces": ["frontend", "backend"]`.
   - Update `name` to `mlbb-draft-system-root`.
   - Remove redundant `--prefix` scripts in favor of workspace commands.
2. **Rename Sub-packages**:
   - Update `frontend/package.json` name to `@mlbb/frontend`.
   - Update `backend/package.json` name to `@mlbb/backend`.

### Phase 2: Backend & API Alignment
1. **The `api/` Directory Strategy**:
   - Create a root-level `api/` directory.
   - Move or link the backend entry point here. Vercel automatically detects files in `api/` and treats them as serverless functions, reducing `vercel.json` complexity.
2. **Dependency Consolidation**:
   - Run `npm install` from the root. NPM will create a single `package-lock.json` at the root and hoist common dependencies, preventing version mismatches.

### Phase 3: Vercel Configuration Optimization
1. **Simplify `vercel.json`**:
   - Use the standard `api/` routing.
   - Configure the frontend build output explicitly.
2. **Vercel Dashboard Settings**:
   - Set **Build Command**: `npm run build` (which runs workspace builds).
   - Set **Output Directory**: `frontend/dist`.
   - Set **Root Directory**: `./` (Root).

## 4. Why This Avoids Future Errors

| Error Encountered | How Redesign Fixes It |
| :--- | :--- |
| `vite: command not found` | NPM Workspaces link binaries to the root `node_modules/.bin`. A single `npm install` at the root satisfies all sub-project requirements. |
| `Function Runtimes error` | Moving to the `api/` directory allows Vercel to apply default, up-to-date runtimes without manual `vercel.json` overrides. |
| `404: NOT_FOUND` | Standardizing the output directory to `frontend/dist` and using workspace-aware builds ensures the frontend is always where Vercel expects it. |

## 5. Execution Plan

1.  **[x] Update Root package.json**: Define workspaces and simplified scripts.
2.  **[x] Standardize Sub-packages**: Update internal names and dependencies.
3.  **[x] Clean Install**: Delete all `node_modules` and run `npm install` once from root.
4.  **[x] Create API Bridge**: Ensure the backend engine is accessible via `/api`.
5.  **[x] Update Vercel Config**: Clean up `vercel.json`.
