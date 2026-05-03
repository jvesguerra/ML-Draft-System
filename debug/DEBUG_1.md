# Debug Report: Vercel 404 NOT FOUND

This document investigates the "404: NOT_FOUND" error encountered during Vercel deployment of the MLBB Draft System and provides refined solutions.

## Potential Root Causes

### 1. Missing Root Build Command
The root `package.json` lacks a `build` script. When Vercel deploys from the root, it doesn't know how to trigger the frontend build.
- **Issue:** `frontend/dist` is never created, and Vercel finds no entry point.

### 2. Rewrite Mismatch in `vercel.json`
The original `vercel.json` pointed to `/index.html` at the root, but in a monorepo, the built file is at `frontend/dist/index.html`.

### 3. The "Silent Killer": Backend Dependencies
Vercel builds serverless functions based on the root context. If `backend/index.js` depends on packages only listed in `backend/package.json`, they may not be installed in the function environment.

---

## Proposed Solutions

### 1. The "Cleanest" Fix: Configuration over Shell Scripts
Instead of hacky shell commands, treat the root as the workspace manager and use Vercel's native settings.

#### Update Root `package.json`
Add these scripts to handle cross-directory installation and building:
```json
"scripts": {
  "install-all": "npm install && npm install --prefix backend && npm install --prefix frontend",
  "build": "npm run build --prefix frontend",
  "dev": "concurrently \"npm run dev --prefix backend\" \"npm run dev --prefix frontend\""
}
```

#### Vercel Project Settings (Dashboard)
Set these explicitly in the Vercel Dashboard to align with the monorepo structure:
- **Build Command:** `npm run build`
- **Output Directory:** `frontend/dist`
- **Install Command:** `npm run install-all`

**Why this works:** By setting the Output Directory to `frontend/dist`, Vercel treats the contents of that folder as the site root (`/`). You no longer need to move files manually.

### 2. Refined `vercel.json`
Since the Output Directory is set to `frontend/dist`, the rewrites become simpler, and we can explicitly define the backend function.

```json
{
  "version": 2,
  "functions": {
    "backend/index.js": {
      "runtime": "vercel-node@latest"
    }
  },
  "rewrites": [
    { 
      "source": "/api/(.*)", 
      "destination": "/backend/index.js" 
    },
    { 
      "source": "/(.*)", 
      "destination": "/index.html" 
    }
  ]
}
```
- **Functions Block:** Ensures `backend/index.js` is treated as a Node.js Serverless Function.
- **Simplified Rewrite:** `/index.html` now correctly resolves because the "root" is mapped to `frontend/dist`.

---

## Recommended Action Plan

1. **Match the Output:** Verify that Vite outputs to `dist`. (Checked: `frontend/vite.config.js` uses defaults, so output is `frontend/dist`).
2. **Apply Code Changes:**
   - Update root `package.json` with `install-all` and `build` scripts.
   - Update `vercel.json` with the refined structure.
3. **Configure Vercel Dashboard:**
   - Set **Build Command** to `npm run build`.
   - Set **Output Directory** to `frontend/dist`.
   - Set **Install Command** to `npm run install-all`.
4. **Test the API:** Deploy and visit `/api/health`. If the frontend works but the API 404s, verify the path in `vercel.json` matches the file location.
