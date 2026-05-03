# Debug Report: Vite Command Not Found on Vercel

This document investigates the build error `sh: line 1: vite: command not found` encountered during Vercel deployment.

## Problem Description

The Vercel build fails during the execution of the build script:
```
> frontend@0.0.0 build
> vite build
sh: line 1: vite: command not found
Error: Command "npm run build --prefix frontend" exited with 127
```

This indicates that while `npm` attempted to run the `build` script defined in `frontend/package.json`, the `vite` executable was not found in the environment's PATH or the local `node_modules`.

## Possible Problems

### 1. Dependencies Not Installed for Sub-projects
Vercel's default behavior is to run `npm install` only in the root directory. Since this project is a monorepo-style structure without using official `npm workspaces`, the dependencies for `frontend/` and `backend/` are not installed automatically by Vercel.

**Evidence:** The logs show "added 29 packages". This is too few for the entire project (which includes React, Vite, Express, etc.) and matches the expected count for just the root dependencies (like `concurrently`).

### 2. Missing or Incorrect "Install Command" in Vercel
If the "Install Command" in Vercel's Project Settings is not explicitly set to `npm run install-all`, Vercel will ignore the custom installation logic required to reach the sub-directories.

### 3. Execution Context Mismatch
Using `--prefix` in a build command can sometimes lead to issues if the preceding installation didn't correctly place the binaries in a way the shell expects when running the prefixed command.

## Possible Solutions

### Solution 1: Explicitly Set the Install Command (Recommended)
You must ensure Vercel runs the custom installation script that targets all directories.

**Action:** In the Vercel Dashboard, go to **Settings > General > Build & Development Settings** and set:
- **Install Command:** `npm run install-all`
- **Build Command:** `npm run build`
- **Output Directory:** `frontend/dist`

### Solution 2: Convert to NPM Workspaces (Robust)
Converting the project to use NPM workspaces allows a single `npm install` at the root to handle all dependencies across all folders correctly and efficiently.

**Action:** Update root `package.json`:
```json
{
  "workspaces": [
    "frontend",
    "backend"
  ]
}
```
Then, Vercel's default `npm install` will work for everything.

### Solution 3: Check Build Script Paths
Ensure that the root build script correctly navigates to the frontend.

**Current root `package.json`:**
```json
"build": "npm run build --prefix frontend"
```
This is technically correct, but it relies on `frontend/node_modules` existing.

---

## Recommended Action Plan

1.  **Immediate Fix:** Verify Vercel Project Settings. Ensure the **Install Command** is set to `npm run install-all`. This matches the logic already defined in your root `package.json`.
2.  **Verify local build:** Run `npm run install-all` followed by `npm run build` locally to ensure the flow works outside of Vercel.
3.  **Future-proofing:** Consider adding `"workspaces": ["frontend", "backend"]` to the root `package.json` to simplify dependency management and allow Vercel to use its optimized default installation flow.
