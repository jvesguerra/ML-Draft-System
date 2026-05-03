# Vercel Deployment Fix Plan

This plan addresses the "No entrypoint found" error on Vercel by properly configuring the monorepo structure and adapting the architecture to be compatible with Vercel's Serverless environment.

## User Review Required

> [!IMPORTANT]
> **Architectural Change**: On Vercel, we will bypass the separate `mcp-server` process and have the `backend` call the `heroStore` logic directly. This is because Vercel Serverless Functions cannot persistently spawn and talk to background processes via STDIO.
>
> **Environment Variables**: You will need to add your `.env` variables (like `SUPABASE_DB_URL`, `USE_API_DATA`, etc.) to the Vercel Project Settings after these changes are applied.

## Proposed Changes

### Root Configuration

#### [NEW] [vercel.json](file:///d:/PROJECTS/2026/Mobile%20Legends%20Draft%20System/vercel.json)
Create a configuration file to handle monorepo routing. This will route `/api/*` to the backend and all other requests to the frontend.

---

### Backend Components

#### [MODIFY] [mcp/client.js](file:///d:/PROJECTS/2026/Mobile%20Legends%20Draft%20System/backend/mcp/client.js)
Update the `McpBridge` to support modularized execution.
- If `process.env.VERCEL` is detected, it will import the internal logic from `mcp-server/heroStore.js` and wrap it in a mock MCP interface instead of using `StdioClientTransport`.

#### [MODIFY] [index.js](file:///d:/PROJECTS/2026/Mobile%20Legends%20Draft%20System/backend/index.js)
Adjust the entry point for serverless compatibility.
- Export the `app` for Vercel.
- Conditionally call `app.listen()` only if not in a serverless environment (to avoid "Address already in use" errors or hanging).

---

### Frontend Components

#### [MODIFY] [src/App.jsx](file:///d:/PROJECTS/2026/Mobile%20Legends%20Draft%20System/frontend/src/App.jsx)
Update the `API_BASE` to be dynamic.
- Use `import.meta.env.VITE_API_BASE || "/api/draft"` to ensure it works in both local development and production.

---

## Open Questions

- Is there any specific reason to maintain the separate `mcp-server` process in production? (I propose merging logic for Vercel to ensure reliability).

## Verification Plan

### Automated Tests
- Run `npm run build --prefix frontend` locally to verify the build process.
- Mock the `VERCEL` env variable locally to test the serverless-ready code path.

### Manual Verification
- Deploy to Vercel and check if the dashboard shows a successful build.
- Verify that the URL loads the frontend and accurately fetches hero data from the backend.
