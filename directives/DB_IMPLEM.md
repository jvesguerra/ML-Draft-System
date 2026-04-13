# Directive: Database Implementation & Daily Seeding

## Goal
Implement a persistent PostgreSQL database (Supabase) to store hero data, rankings, and relations, ensuring that the data is only seeded/updated once per day, even if the application restarts.

## 1. Context
- **Database URL**: `postgresql://postgres:MBkHVnj5bG52i3gI@db.kwoukaobtrmblacyizeq.supabase.co:5432/postgres`
- **Data Source**: MLBB Public API (mirrored by the MCP server).
- **Seeding Frequency**: Once daily.

## 2. Database Schema

### Table: `seeding_log`
Used to track when the last seeding operation occurred.
- `seed_date`: `DATE` (PRIMARY KEY) - The date when seeding was completed.
- `created_at`: `TIMESTAMP` (DEFAULT NOW())

### Table: `heroes`
Core hero information.
- `hero_id`: `TEXT` (PRIMARY KEY) - Slug-based ID (e.g., `kagura`).
- `numeric_id`: `INTEGER` - Official MLBB numeric ID.
- `name`: `TEXT` - Display name.
- `role`: `TEXT[]` - Array of roles (Tank, Mage, etc.).
- `lane`: `TEXT[]` - Array of lanes (Mid, Roam, etc.).
- `damage_type`: `TEXT` - Physical or Magic.
- `win_rate`: `DECIMAL`
- `ban_rate`: `DECIMAL`
- `updated_at`: `TIMESTAMP` (DEFAULT NOW())

### Table: `hero_relations`
Counters and synergies.
- `id`: `SERIAL` (PRIMARY KEY)
- `hero_id`: `TEXT` (FOREIGN KEY to `heroes.hero_id`)
- `related_hero_id`: `TEXT` (FOREIGN KEY to `heroes.hero_id`)
- `relation_type`: `TEXT` ('counter', 'synergy')
- `weight`: `DECIMAL` (e.g., win rate increase)
- `reason`: `TEXT`

## 3. Execution Script: `execution/seed_db.py`
This script is the deterministic tool that handles the DB seeding.

### Logic Flow:
1.  **Init Schema**: Create tables if they do not exist.
2.  **Check Daily Status**: Query `seeding_log` for the current date (`CURRENT_DATE`).
3.  **Bail if Seeded**: If a row exists for today, exit immediately (No-Op).
4.  **Fetch Data**: Call the MLBB Public API for positions, rankings, and relations.
5.  **Upsert Heroes**: Insert or update hero data in the `heroes` table.
6.  **Update Relations**: Refresh counters and synergies in `hero_relations`.
7.  **Finalize**: Insert the current date into `seeding_log` to mark completion.

## 4. Operational Instructions
- Run `python execution/seed_db.py` as part of the backend initialization or as a daily cron/startup task.
- Ensure `psycopg2-binary` and `requests` are installed.
- Handle API failures gracefully by NOT marking the day as seeded if the data fetch fails.

## 5. Summary
This system pushes the deterministic data management into a Python script and uses the database itself as the source of truth for "daily seeding" status, ensuring consistency across backend restarts.
