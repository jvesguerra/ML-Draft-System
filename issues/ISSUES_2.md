# ISSUE_2: Vercel 404 NOT_FOUND on Deployment

## Problem Description
Despite setting the Root Directory to `.` and fixing the `vercel.json` schema, the application still returns `404: NOT_FOUND` or fails during deployment with runtime errors.

## Update (April 19, 2026)
- **Root Directory:** Confirmed set to `.`
- **Schema Fix:** `handle` property removed.
- **Runtime Error:** "Function Runtimes must have a valid version, for example `now-php@1.0.0`."
  - This occurred because `@vercel/node` was used in the `functions` block without a specific version or using an older identifier.

## Potential Causes

### 1. Function Runtime Syntax
Vercel's modern `functions` config prefers specific version identifiers like `nodejs20.x` rather than the internal builder names like `@vercel/node`.

## Recommended Solutions

### Solution: Modern Node Runtime
Update `vercel.json` to use `nodejs20.x` (or your preferred version) as the runtime.

## Action Plan
Update `vercel.json` with the explicit `nodejs20.x` runtime and ensure rewrites are clean.
