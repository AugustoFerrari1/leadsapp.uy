try:
    import asyncpg
except ModuleNotFoundError:  # pragma: no cover - allows local tests without deps
    asyncpg = None
import os
from typing import Optional, List, Dict, Any
try:
    from dotenv import load_dotenv
except ModuleNotFoundError:  # pragma: no cover - allows local tests without deps
    def load_dotenv():
        return None

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
_pool = None


async def get_pool():
    global _pool
    if _pool is None:
        if asyncpg is None:
            raise RuntimeError("asyncpg is required to connect to the database")
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
                score INTEGER DEFAULT 0,
                source TEXT DEFAULT 'Google Maps',
                status TEXT DEFAULT 'nuevo',
                contacted_at TIMESTAMPTZ,
                notes TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(name, address)
            )
        """)

        # Migración no destructiva: agregar columnas si aún no existen
        # (para bases de datos creadas antes de esta versión)
        await conn.execute("""
            ALTER TABLE leads ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0
        """)
        await conn.execute("""
            ALTER TABLE leads ADD COLUMN IF NOT EXISTS contacted_at TIMESTAMPTZ
        """)
        await conn.execute("""
            ALTER TABLE leads ADD COLUMN IF NOT EXISTS notes TEXT
        """)

    print("Base de datos inicializada")


async def save_lead(lead: Dict[str, Any]) -> bool:
    """Save a lead, ignore duplicates. Returns True if new."""
    pool = await get_pool()
    try:
        async with pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO leads (name, address, phone, website, has_website, rating, score, source)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (name, address) DO UPDATE
                    SET score = GREATEST(leads.score, EXCLUDED.score),
                        phone = COALESCE(EXCLUDED.phone, leads.phone),
                        website = COALESCE(EXCLUDED.website, leads.website),
                        has_website = EXCLUDED.has_website,
                        rating = COALESCE(EXCLUDED.rating, leads.rating),
                        updated_at = NOW()
            """,
                lead.get("name", ""),
                lead.get("address"),
                lead.get("phone"),
                lead.get("website"),
                lead.get("has_website", False),
                lead.get("rating"),
                lead.get("score", 0),
                lead.get("source", "Google Maps"),
            )
            return True
    except Exception as e:
        print(f"Error saving lead: {e}")
        return False


async def get_leads(
    has_web: Optional[bool] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = "score",
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

        # Ordenamiento
        allowed_sorts = {
            "score": "score DESC, created_at DESC",
            "date": "created_at DESC",
            "rating": "rating DESC NULLS LAST, score DESC",
        }
        order_clause = allowed_sorts.get(sort_by, "score DESC, created_at DESC")
        query += f" ORDER BY {order_clause}"

        rows = await conn.fetch(query, *params)
        return [dict(row) for row in rows]


async def update_lead_status(lead_id: int, status: str):
    pool = await get_pool()
    async with pool.acquire() as conn:
        if status == "contactado":
            await conn.execute(
                "UPDATE leads SET status = $1, contacted_at = NOW(), updated_at = NOW() WHERE id = $2",
                status, lead_id
            )
        else:
            await conn.execute(
                "UPDATE leads SET status = $1, updated_at = NOW() WHERE id = $2",
                status, lead_id
            )


async def update_lead_notes(lead_id: int, notes: str):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE leads SET notes = $1, updated_at = NOW() WHERE id = $2",
            notes, lead_id
        )


async def reset_leads():
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("TRUNCATE TABLE leads RESTART IDENTITY")


async def get_stats() -> Dict:
    pool = await get_pool()
    async with pool.acquire() as conn:
        total = await conn.fetchval("SELECT COUNT(*) FROM leads")
        with_web = await conn.fetchval("SELECT COUNT(*) FROM leads WHERE has_website = TRUE")
        without_web = await conn.fetchval("SELECT COUNT(*) FROM leads WHERE has_website = FALSE")
        contactados = await conn.fetchval("SELECT COUNT(*) FROM leads WHERE status = 'contactado'")
        nuevos = await conn.fetchval("SELECT COUNT(*) FROM leads WHERE status = 'nuevo'")
        avg_score = await conn.fetchval("SELECT ROUND(AVG(score)) FROM leads WHERE score > 0")
        hot_leads = await conn.fetchval("SELECT COUNT(*) FROM leads WHERE score >= 70 AND status = 'nuevo'")
        followup_pending = await conn.fetchval("""
            SELECT COUNT(*)
            FROM leads
            WHERE status = 'contactado'
              AND contacted_at IS NOT NULL
              AND contacted_at <= NOW() - INTERVAL '72 hours'
        """)
        return {
            "total": total,
            "with_website": with_web,
            "without_website": without_web,
            "contacted": contactados,
            "new": nuevos,
            "avg_score": avg_score or 0,
            "hot_leads": hot_leads,
            "followup_pending": followup_pending or 0,
        }
