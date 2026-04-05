import asyncpg
import os
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
_pool = None


async def get_pool():
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=5)
    return _pool


async def init_db():
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS leads (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                address TEXT,
                phone TEXT,
                website TEXT,
                has_website BOOLEAN DEFAULT FALSE,
                rating REAL,
                source TEXT DEFAULT 'Google Maps',
                status TEXT DEFAULT 'nuevo',
                notes TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(name, address)
            )
        """)
    print("✅ Base de datos inicializada")


async def save_lead(lead: Dict[str, Any]) -> bool:
    """Save a lead, ignore duplicates. Returns True if new."""
    pool = await get_pool()
    try:
        async with pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO leads (name, address, phone, website, has_website, rating, source)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (name, address) DO NOTHING
            """,
                lead.get("name", ""),
                lead.get("address"),
                lead.get("phone"),
                lead.get("website"),
                lead.get("has_website", False),
                lead.get("rating"),
                lead.get("source", "Google Maps"),
            )
            return True
    except Exception as e:
        print(f"Error saving lead: {e}")
        return False


async def get_leads(
    has_web: Optional[bool] = None,
    status: Optional[str] = None,
    search: Optional[str] = None
) -> List[Dict]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        query = "SELECT * FROM leads WHERE 1=1"
        params = []
        idx = 1

        if has_web is not None:
            query += f" AND has_website = ${idx}"
            params.append(has_web)
            idx += 1

        if status:
            query += f" AND status = ${idx}"
            params.append(status)
            idx += 1

        if search:
            query += f" AND (name ILIKE ${idx} OR address ILIKE ${idx})"
            params.append(f"%{search}%")
            idx += 1

        query += " ORDER BY created_at DESC"

        rows = await conn.fetch(query, *params)
        return [dict(row) for row in rows]


async def update_lead_status(lead_id: int, status: str):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE leads SET status = $1, updated_at = NOW() WHERE id = $2",
            status, lead_id
        )


async def get_stats() -> Dict:
    pool = await get_pool()
    async with pool.acquire() as conn:
        total = await conn.fetchval("SELECT COUNT(*) FROM leads")
        with_web = await conn.fetchval("SELECT COUNT(*) FROM leads WHERE has_website = TRUE")
        without_web = await conn.fetchval("SELECT COUNT(*) FROM leads WHERE has_website = FALSE")
        contactados = await conn.fetchval("SELECT COUNT(*) FROM leads WHERE status = 'contactado'")
        nuevos = await conn.fetchval("SELECT COUNT(*) FROM leads WHERE status = 'nuevo'")
        return {
            "total": total,
            "with_website": with_web,
            "without_website": without_web,
            "contacted": contactados,
            "new": nuevos,
        }
