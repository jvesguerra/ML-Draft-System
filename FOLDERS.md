# Project Folder Structure

This document provides a quick reference for the purpose of each directory in the "Budgie - BrokeNo More" project.

## 📁 `directives/` (Layer 1: Directive)
- **Purpose**: Contains Standard Operating Procedures (SOPs) and high-level requirements.
- **Content**: Markdown files defining goals, project structure, and task-specific instructions for AI agents.

## 📁 `execution/` (Layer 3: Execution)
- **Purpose**: Deterministic logic that handles the "heavy lifting."
- **Content**: Python scripts for data processing, database migrations, API integrations, and other automated tasks.

## 📁 `frontend/` (Source Code)
- **Purpose**: The user interface of the application.
- **Content**: React, Vite, or Next.js code, styles, and client-side logic.

## 📁 `backend/` (Source Code)
- **Purpose**: The application's server-side logic and database bridge.
- **Content**: Node.js/Express API, database models, and secure middleware.

## 📁 `.tmp/` (Intermediates)
- **Purpose**: Storage for temporary files generated during processing.
- **Content**: Scraped data, temporary exports, and dossiers. *Note: Files here are never committed.*
