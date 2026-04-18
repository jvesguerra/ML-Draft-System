# ISSUE_2: Vercel 404 NOT_FOUND on Deployment

## Problem Description
Despite setting the Root Directory to `.` and fixing the `vercel.json` schema (removing `handle`), the application still returns `404: NOT_FOUND` on the root URL and API endpoints.

## Update (April 19, 2026)
- **Root Directory:** Confirmed set to `.`
- **Schema Fix:** `handle` property removed.
- **Result:** Still 404.

## Potential Causes

### 1. Legacy "builds" Property Conflict
Vercel now prefers "Zero Config". The `builds` field in `vercel.json` is considered legacy and often conflicts with the modern detection engine, especially in monorepos. When `builds` is used, Vercel disables many of its automatic features, which can lead to misrouted static files.

### 2. Output Directory Mismatch
In the Vercel Dashboard, if the **Output Directory** is not explicitly set to `frontend/dist`, Vercel might be looking for files in a default `./public` or `./dist` folder at the root, which doesn't exist.

### 3. Missing Root index.html
Vercel's routing expects `index.html` to be at the root of the **Deployment Output**. Because our build happens in `frontend/dist`, we need to tell Vercel that this specific folder is the source of our static site.

## Recommended Solutions

### Solution A: The "Zero Config" Approach (Preferred)
Remove the `builds` section from `vercel.json` and let the Vercel Dashboard handle the build logic.

1.  **Update `vercel.json`** to only contain `functions` and `rewrites`.
2.  **Vercel Dashboard Settings:**
    - **Build Command:** `npm run build --prefix frontend`
    - **Output Directory:** `frontend/dist`
    - **Install Command:** `npm install` (at root)

### Solution B: Clean API Mapping
Ensure the API destination points to the relative path of the function without the leading slash if Vercel is behaving strictly, though `/backend/index.js` is usually correct.

## Action Plan
I will now simplify `vercel.json` to use the modern `functions` and `rewrites` syntax, bypassing the legacy build engine.
