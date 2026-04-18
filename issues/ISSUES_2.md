# ISSUE_2: Vercel 404 NOT_FOUND on Deployment

## Problem Description
Despite updating `vercel.json`, the application returns a `404: NOT_FOUND` error when accessing the root URL or API endpoints on Vercel.

## Potential Causes

### 1. Vercel Dashboard "Root Directory" Setting
If the "Root Directory" in Vercel Project Settings was set to `frontend` during the initial import, Vercel will ignore the `vercel.json` located at the actual workspace root. It will only look for configuration inside the `frontend/` folder.

**Solution:** 
- Go to Vercel **Settings > General**.
- Ensure **Root Directory** is empty or set to `.` (the repository root).

### 2. Output Directory Override
The Vercel UI has an "Output Directory" setting. If this is set to `dist`, Vercel looks for a folder named `dist` at the root. However, our build command `npm run build --prefix frontend` creates the output at `frontend/dist`.

**Solution:**
- In Vercel **Settings > General**, set **Output Directory** to `frontend/dist`.
- Alternatively, ensure "Framework Preset" is set to **Other** so Vercel relies entirely on `vercel.json`.

### 3. Build Step Execution Order
In some cases, the `@vercel/static-build` runtime might not correctly trigger the `npm install` for the root or sub-directories if the dependency tree is complex.

**Solution:**
- Change the Build Command in Vercel to: `npm install && npm run build --prefix frontend`.

### 4. Incorrect Rewrite Destination
Vercel's legacy `builds` behavior (which we are using to support the monorepo) sometimes requires the destination to be explicitly mapped to the generated serverless function path.

**Solution:**
Update the API rewrite to:
```json
{ "source": "/api/(.*)", "destination": "/backend/index.js" }
```

## Recommended Fix Strategy

1. **Verify Root Directory:** Confirm the Vercel project is looking at the top-level folder of your repo.
2. **Framework Preset:** Ensure it is "Other".
3. **Clean Re-deploy:** After updating `vercel.json` in Git, go to the Vercel "Deployments" tab and trigger a "Redeploy" with "Build Cache" disabled.
4. **Logs:** Check the **Functions** tab in Vercel. If `backend/index.js` is not listed there, Vercel failed to recognize the backend as a serverless function.
