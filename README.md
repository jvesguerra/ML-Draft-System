# Mobile Legends: Bang Bang Draft Assistant

A real-time drafting intelligence system for Mobile Legends. This application provides tactical counter-pick suggestions and team composition analysis using live data from the MLBB Public Data API.

## 🚀 Quick Start

The easiest way to launch the entire system (Backend, Frontend, and MCP Proxy) is using the provided Python orchestrator.

### 1. Installation
Ensure you have Node.js and Python installed, then run:
```powershell
# Install dependencies for all tiers
cd mcp-server; npm install
cd ../backend; npm install
cd ../frontend; npm install
```

### 2. Run the Application
```powershell
python execution/run_app.pyww
```
*   **Frontend**: [http://localhost:5173](http://localhost:5173)
*   **Backend API**: [http://localhost:3001](http://localhost:3001)

---

## 🔍 Testing & Verification

We provide specialized scripts to verify each layer of the architecture:

| Script | Purpose |
|---|---|
| `python execution/test_full_stack.py` | **E2E Check**: Verifies UI, API, and live Data Flow from remote source. |
| `python execution/test_recommendation_engine.py` | **Logic Check**: Validates the Node.js recommendation heuristics. |
| `python execution/test_backend_api.py` | **API Check**: Specifically tests REST endpoints and MCP connectivity. |

---

## 🏗️ Architecture Overview

The system follows a **3-Layer Deterministic Architecture**:

1.  **MCP Proxy (`mcp-server/`)**: 
    - Proxies requests to [ridwaanhall/api-mobilelegends](https://github.com/ridwaanhall/api-mobilelegends).
    - Fetches and caches the global roster on startup.
    - Exposes structured tools for counters, synergies, and composition scoring.
2.  **Recommendation Engine (`backend/`)**:
    - An Express.js server that consumes MCP tools.
    - Implements overlap-scoring for counter-picks.
    - Maps hero roles to lane coverage requirements.
3.  **Frontend Dashboard (`frontend/`)**:
    - A modern, premium React UI built with Vite.
    - Features real-time "Draft Strength" scoring and tactical warnings.
    - Glassmorphism design inspired by the MLBB aesthetic.

## 🛠️ Data Source
This project uses **Zero Local Data**. All hero metadata, statistics, and counter relationships are pulled dynamically from the `rone.dev` public API cluster. Every time you restart the app, you are synced with the latest global patch data.
