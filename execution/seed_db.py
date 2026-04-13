import os
import sys
import json
import datetime
import requests
import psycopg2
from psycopg2.extras import execute_values

# Configuration
# Using the Supabase pooler host and the specialized project-prefixed user.
DB_URL = "postgresql://postgres.kwoukaobtrmblacyizeq:MBkHVnj5bG52i3gI@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"
API_BASE = "https://mlbb.rone.dev/api"

def get_db_connection():
    try:
        # Connect using the DSN string, but we can also use discrete params
        conn = psycopg2.connect(DB_URL, connect_timeout=10)
        return conn
    except psycopg2.OperationalError as e:
        print(f"❌ Database connection error (Operational): {e}")
        print("💡 Tip: Ensure your internet connection is stable and that the Supabase DB is active.")
        return None
    except Exception as e:
        print(f"❌ Database connection error (Unexpected): {e}")
        return None

def init_schema(cur):
    print("🛠️ Initializing database schema...")
    
    # Seeding Log: Tracks daily updates
    cur.execute("""
        CREATE TABLE IF NOT EXISTS seeding_log (
            seed_date DATE PRIMARY KEY,
            created_at TIMESTAMP DEFAULT NOW()
        );
    """)

    # Heroes Table: Core hero metadata
    cur.execute("""
        CREATE TABLE IF NOT EXISTS heroes (
            hero_id TEXT PRIMARY KEY,
            numeric_id INTEGER,
            name TEXT,
            role TEXT[],
            lane TEXT[],
            damage_type TEXT,
            win_rate DECIMAL,
            ban_rate DECIMAL,
            updated_at TIMESTAMP DEFAULT NOW()
        );
    """)

    # Relations Table: Counters and Synergies
    cur.execute("""
        CREATE TABLE IF NOT EXISTS hero_relations (
            id SERIAL PRIMARY KEY,
            hero_id TEXT REFERENCES heroes(hero_id) ON DELETE CASCADE,
            related_hero_id TEXT REFERENCES heroes(hero_id) ON DELETE CASCADE,
            relation_type TEXT, -- 'counter', 'countered_by', 'synergy'
            weight DECIMAL,
            reason TEXT,
            UNIQUE(hero_id, related_hero_id, relation_type)
        );
    """)

def check_if_seeded_today(cur):
    today = datetime.date.today()
    cur.execute("SELECT 1 FROM seeding_log WHERE seed_date = %s", (today,))
    return cur.fetchone() is not None

def slugify(name):
    return name.lower().replace(' ', '_').replace('-', '_').replace("'", '').replace('.', '')

def fetch_with_fallback(endpoint):
    """Utility to fetch from primary with automated fallback to backup."""
    # Try Primary
    try:
        url = f"{API_PRIMARY}{endpoint}"
        res = requests.get(url, timeout=15)
        if res.ok:
            return res
        print(f"⚠️ Primary API returned {res.status_code} for {endpoint}")
    except Exception as e:
        print(f"⚠️ Primary API fetch failed: {e}")

    # Try Backup
    try:
        print(f"🔄 Attempting backup API for {endpoint}...")
        url = f"{API_BACKUP}{endpoint}"
        res = requests.get(url, timeout=15)
        if res.ok:
            return res
        print(f"❌ Backup API returned {res.status_code} for {endpoint}")
    except Exception as e:
        print(f"❌ Backup API fetch failed: {e}")
    
    return None

def fetch_mlbb_data():
    print("🌐 Fetching hero data from MLBB API...")
    
    pos_res = fetch_with_fallback("/heroes/positions?size=200&lang=en")
    rank_res = fetch_with_fallback("/heroes/rank?size=200&lang=en")

    if not pos_res or not rank_res:
        return None, None
    
    try:
        pos_data = pos_res.json().get('data', {}).get('records', [])
        rank_data = rank_res.json().get('data', {}).get('records', [])
        return pos_data, rank_data
    except Exception as e:
        print(f"❌ JSON parsing error: {e}")
        return None, None

def seed_data(conn):
    cur = conn.cursor()
    init_schema(cur)
    
    if check_if_seeded_today(cur):
        print("✅ Data already seeded today. Skipping update.")
        cur.close()
        return True

    pos_records, rank_records = fetch_mlbb_data()
    if not pos_records or not rank_records:
        print("❌ Could not fetch data. Aborting seed.")
        cur.close()
        return False

    # Map Rankings for quick lookup by slug
    rank_map = {}
    for r in rank_records:
        h_data = r.get('data', {})
        name = h_data.get('main_hero', {}).get('data', {}).get('name')
        if name:
            rank_map[slugify(name)] = h_data

    # Prepare Hero Data for batch insertion
    hero_values = []
    numeric_to_slug = {}
    
    for rec in pos_records:
        h = rec.get('data', {})
        hero_info = h.get('hero', {}).get('data', {})
        name = hero_info.get('name', 'Unknown')
        slug = slugify(name)
        numeric_id = h.get('hero_id')
        numeric_to_slug[numeric_id] = slug
        
        meta = rank_map.get(slug, {})

        hero_values.append((
            slug,
            numeric_id,
            name,
            [],          # roles — not available in new API
            [],          # lanes — not available in new API
            'Unknown',   # damage_type — not available in new API
            meta.get('hero_win_rate', 0.5),
            meta.get('hero_ban_rate', 0.01)
        ))

    # Upsert Heroes
    print(f"📥 Upserting {len(hero_values)} heroes...")
    upsert_hero_query = """
        INSERT INTO heroes (hero_id, numeric_id, name, role, lane, damage_type, win_rate, ban_rate)
        VALUES %s
        ON CONFLICT (hero_id) DO UPDATE SET
            numeric_id = EXCLUDED.numeric_id,
            name = EXCLUDED.name,
            role = EXCLUDED.role,
            lane = EXCLUDED.lane,
            damage_type = EXCLUDED.damage_type,
            win_rate = EXCLUDED.win_rate,
            ban_rate = EXCLUDED.ban_rate,
            updated_at = NOW();
    """
    execute_values(cur, upsert_hero_query, hero_values)

    # Process Relations
    relation_values = []
    for rec in pos_records:
        h = rec.get('data', {})
        slug = slugify(h.get('hero', {}).get('data', {}).get('name', ''))
        relations = h.get('relation', {})
        
        # 'weak' = countered by these heroes
        weak_ids = relations.get('weak', {}).get('target_hero_id', [])
        for w_id in weak_ids:
            rel_slug = numeric_to_slug.get(w_id)
            if rel_slug and w_id != 0:
                relation_values.append((slug, rel_slug, 'countered_by', 0.02, 'Statistical Counter (API)'))
                relation_values.append((rel_slug, slug, 'counter', 0.02, 'Statistical Counter (API)'))

        # 'assist' = synergy
        assist_ids = relations.get('assist', {}).get('target_hero_id', [])
        for a_id in assist_ids:
            rel_slug = numeric_to_slug.get(a_id)
            if rel_slug and a_id != 0:
                relation_values.append((slug, rel_slug, 'synergy', 0.05, 'Statistical Synergy (API)'))

    if relation_values:
        print(f"📥 Updating {len(relation_values)} relations...")
        upsert_rel_query = """
            INSERT INTO hero_relations (hero_id, related_hero_id, relation_type, weight, reason)
            VALUES %s
            ON CONFLICT (hero_id, related_hero_id, relation_type) DO UPDATE SET
                weight = EXCLUDED.weight,
                reason = EXCLUDED.reason;
        """
        execute_values(cur, upsert_rel_query, relation_values)

    cur.execute("INSERT INTO seeding_log (seed_date) VALUES (%s) ON CONFLICT (seed_date) DO NOTHING", (datetime.date.today(),))
    conn.commit()
    cur.close()
    print(f"✨ Seeding completed successfully for {datetime.date.today()}.")
    return True

if __name__ == "__main__":
    connection = get_db_connection()
    if connection:
        try:
            success = seed_data(connection)
            sys.exit(0 if success else 1)
        finally:
            connection.close()
    else:
        sys.exit(1)
