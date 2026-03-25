# Guide: Building Full-Stack Apps with Anti-Gravity

This guide outlines the step-by-step framework for moving from an idea to a deployed, production-ready full-stack application using Anti-Gravity and the Model Context Protocol (MCP).

## 1. Environment Setup

- **Directory Management**: Always build inside a dedicated project folder. In Anti-Gravity, a Project = Folder.
- **Pathing**: Store projects in a consistent local directory (e.g., `~/cloud-code/`).
- **Model Selection**:
    - **Gemini 3 Pro**: Best for UI/UX, CSS, and "look and feel."
    - **Claude Opus 4.5**: Best for complex reasoning, logic, and tool integration (MCP).

## 2. Step 1: The Framework (Initialization)

To ensure consistency, provide Anti-Gravity with a structural "Three-Layer Architecture" prompt before writing any app code.

- **Action**: Create a `claude.md` file in your root directory and define:
    - **Layer 1 (Directives)**: Defines where files are stored (folders for Backend, Frontend, etc.).
    - **Layer 2 (Orchestration)**: Instructions on how the AI should think and sequence tasks.
    - **Layer 3 (Execution)**: Specific rules for writing and validating code.
- **Command**: 
  ```text
  Initialize this project based on the claude.md file. Use Planning Mode and Claude Opus 4.5.
  ```

## 3. Step 2: Planning & Visual Reference

Don't let the AI guess the UI. Combine functional requirements with visual references.

- **Requirement Prompt**: Define the core logic (e.g., "Build a habit tracker with streak logic and data persistence").
- **UI Reference**: Find a design on a site like Dribbble, copy the image, and paste it directly into the chat.
- **Command**:
  ```text
  Build the app based on these requirements. Ensure the design matches the attached reference image. Use Gemini 3 Pro High for the build.
  ```

### Example Prompt
> "Build a simple habit tracker app where users can create daily or weekly habits and mark them as completed. The app should track streaks, show the current and longest streak and clearly indicate when a streak is broken. Data must persist so habits and progress are saved between sessions. The UI should be minimal and focused on making it obvious what needs to be done today."

### Recommended Visual Sources
- [Dribbble](https://dribbble.com/)
- [Mobbin](https://mobbin.com/)
- [Screenlane](https://screenlane.com/)
- [Behance](https://www.behance.net/)

## 4. Step 3: Feature Integration (MCP)

To add complex features like Authentication or Databases, use Model Context Protocol (MCP) to connect Anti-Gravity to external services (like Firebase).

### Connecting Firebase via MCP
1. **Open MCP Servers**: In Anti-Gravity settings.
2. **Install/Enable**: The Firebase MCP.
3. **Authenticate**: Run the login command, follow the OAuth link, and paste the session ID back into the chat.
4. **Project Setup**: Create a project in the Firebase Console, enable "Email/Password" and "Google" in the Authentication tab, and provide the Project ID to Anti-Gravity.

### Other Recommended MCP Databases
- Supabase
- AppWrite

## 5. Step 4: Testing & Iteration

Anti-Gravity includes an automated testing agent. It will attempt to run the app, catch errors (e.g., "Failed to load habits"), and self-correct.

- **Manual Review**: Open the provided localhost link.
- **Refinement**: If the UI is off (e.g., white text on white background), give specific feedback.
- **Command**:
  ```text
  The text is unreadable; change it to black. Now, implement the Firebase Auth layer using the MCP tool.
  ```

### Useful Tools
- PR Agent
- Code Rabbit

## 6. Step 5: Deployment

Once the local version is stable, move to production.

- **Action**: Use the Firebase MCP to handle hosting.
- **Command**:
  ```text
  Deploy the app to Firebase Hosting using the MCP. Provide the live production URL once finished.
  ```

## Summary Table: Workflow Roles

| Phase | Recommended Model | Primary Tool |
| :--- | :--- | :--- |
| **Architecting** | Claude Opus 4.5 | `claude.md` Framework |
| **UI/Frontend** | Gemini 3 Pro | Visual References (Images) |
| **Logic/Auth** | Claude Opus 4.5 | Firebase MCP |
| **Deployment** | Claude Opus 4.5 | Firebase Hosting |

---

# Appendix: System Architecture

## #Agent Instructions

### Summary
You operate within a 3-Layer Architecture that separates responsibilities to maximize reliability. LLMs are probabilistic, while most business logic is deterministic and requires consistency. This system solves that problem.

### 3-Layer Architecture
- **Layer 1: Directive (What to do)**
  - Essentially SOPs (Standard Operating Procedures) written in Markdown, living in `directives/`.
  - They define objectives, inputs, tools/scripts to use, outputs, and edge cases.
  - Natural-language instructions, like you'd give to a mid-level employee.
- **Layer 2: Orchestration (Decisions)**
  - Your job: Intelligent routing.
  - Read the directives, call execution tools in the right order, handle errors, ask clarifying questions, and update directives with what you learn.
  - You are the glue between intent and execution.
  - *Example*: You don't try to scrape websites yourself—you read `directives/scrape_website.md`, define inputs/outputs, then run `execution/scrape_single_site.py`.
- **Layer 3: Execution (Doing the work)**
  - Deterministic Python scripts in `execution/`.
  - Environment variables, API tokens, etc., are stored in `.env`.
  - Handle API calls, data processing, file operations, and database interactions.
  - Reliable, testable, fast.
  - Use scripts instead of manual work; ensure code is well-commented.

**Why it works**: If you do everything yourself, errors compound. 90% accuracy per step = ~59% success over 5 steps. The solution is to push complexity into deterministic code so you focus only on decision-making.

## Operating Principles

1. **Check existing tools first**
    - Before writing a script, check `execution/` according to your directive.
    - Create new scripts only if none exist.
2. **Self-correct when something breaks**
    - Read the error message and stack trace.
    - Fix the script and test again.
    - *Note*: If it uses paid tokens/credits, ask the user first.
3. **Update the directive with what you learned**
    - API limits.
    - Timing constraints.

## How to use this guide

- **Initialize**: Start your session by telling the AI: "Read `claude.md` and follow the 3-Layer Architecture."
- **Directive First**: If you have a new task, ask it to create a new `.md` file in the `directives/` folder first.
- **Execute**: Let it write the Python script in `execution/` to handle the heavy lifting.
