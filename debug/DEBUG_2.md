# Debug Report: Vercel Function Runtime Error

This document investigates the build error "Error: Function Runtimes must have a valid version, for example `now-php@1.0.0`" encountered during Vercel deployment.

## Problem Description

The Vercel build fails with the following error:
```
Error: Function Runtimes must have a valid version, for example `now-php@1.0.0`.
```

This error occurs during the "vercel build" phase when Vercel attempts to parse the `functions` configuration in `vercel.json`.

## Root Cause Analysis

### 1. Invalid Runtime Identifier
In `vercel.json`, the backend function is configured as:
```json
"functions": {
  "backend/index.js": {
    "runtime": "vercel-node@latest"
  }
}
```
The identifier `vercel-node@latest` is incorrect. 
- **Modern Vercel:** The correct package name for the Node.js runtime is `@vercel/node`.
- **Legacy Syntax:** The error message mentions `now-php@1.0.0`, which is a legacy format from the "Now" era (pre-Vercel). Using `vercel-node` without the `@vercel` scope or with `@latest` triggers this legacy validation check which fails because `vercel-node` doesn't follow the expected pattern for modern or legacy runtimes.

## Proposed Solutions

### Solution 1: Use the Correct Node.js Runtime (Recommended)
Update `vercel.json` to use the official `@vercel/node` runtime. You usually do not need to specify a version like `@latest` because Vercel uses the Node.js version specified in your `package.json` engines or the project settings.

**Correct `vercel.json` segment:**
```json
"functions": {
  "backend/index.js": {
    "runtime": "@vercel/node"
  }
}
```

### Solution 2: Standard "api" Directory (Alternative)
Vercel automatically treats files in an `api/` directory as serverless functions with the correct default runtime.
- **Action:** Move `backend/index.js` to `api/index.js` (and update references).
- **Benefit:** Reduces configuration overhead in `vercel.json`.

---

## Recommended Action Plan

1. **Update `vercel.json`:**
   Modify the `functions` block to use `@vercel/node`.

   ```json
   {
     "version": 2,
     "functions": {
       "backend/index.js": {
         "runtime": "@vercel/node"
       }
     },
     "rewrites": [
       { "source": "/api/(.*)", "destination": "/backend/index.js" },
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```

2. **Verify Node.js Version:**
   Ensure `package.json` (root or backend) has an `engines` field if you want to lock in a specific version (e.g., Node 18 or 20).

   ```json
   "engines": {
     "node": "20.x"
   }
   ```

3. **Retry Build:**
   Run `vercel build` or push to trigger a new deployment.
