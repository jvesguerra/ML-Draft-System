# Mobile Legends: Bang Bang Draft Assistant

A real-time drafting intelligence system for Mobile Legends. This application provides tactical counter-pick suggestions and team composition analysis using live data from the MLBB Public Data API.

## 🚀 Quick Start

run gemini: npx @google/gemini-cli


The easiest way to launch the entire system (Backend, Frontend, and MCP Proxy) is using the provided Python orchestrator.

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **Python**: v3.8 or higher
- **npm**: v9.0.0 or higher

### 2. Installation
Ensure you have the prerequisites installed, then run:

```powershell
# 1. Install Node.js dependencies for each tier
cd mcp-server; npm install; cd ..
cd backend; npm install; cd ..
cd frontend; npm install; cd ..

# 2. Install Python orchestration dependencies
pip install requests
```

### 3. Environment Setup
The backend requires a `.env` file for configuration.
```powershell
# Copy the example environment file to the backend directory
cp .env.example backend/.env
```

### 4. Run the Application
The `run_app.py` script manages the lifecycle of all services.
```powershell
python execution/run_app.py
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
