import unittest
from unittest.mock import AsyncMock, patch

import database


class FakeConn:
    def __init__(self, fetchval_values=None):
        self.fetchval_values = list(fetchval_values or [])
        self.execute_calls = []
        self.fetchval_calls = []

    async def execute(self, query, *args):
        self.execute_calls.append((query, args))
        return "OK"

    async def fetchval(self, query, *args):
        self.fetchval_calls.append((query, args))
        if self.fetchval_values:
            return self.fetchval_values.pop(0)
        return None


class FakeAcquire:
    def __init__(self, conn):
        self.conn = conn

    async def __aenter__(self):
        return self.conn

    async def __aexit__(self, exc_type, exc, tb):
        return False


class FakePool:
    def __init__(self, conn):
        self.conn = conn

    def acquire(self):
        return FakeAcquire(self.conn)


class DatabaseTests(unittest.IsolatedAsyncioTestCase):
    async def test_init_db_adds_contacted_at_column(self):
        conn = FakeConn()
        pool = FakePool(conn)

        with patch.object(database, "get_pool", AsyncMock(return_value=pool)):
            await database.init_db()

        executed = "\n".join(query for query, _ in conn.execute_calls)
        self.assertIn("contacted_at TIMESTAMPTZ", executed)

    async def test_update_lead_status_marks_contacted_at_when_contactado(self):
        conn = FakeConn()
        pool = FakePool(conn)

        with patch.object(database, "get_pool", AsyncMock(return_value=pool)):
            await database.update_lead_status(12, "contactado")

        self.assertTrue(conn.execute_calls, "expected an update query to run")
        query, args = conn.execute_calls[0]
        self.assertIn("contacted_at = NOW()", query)
        self.assertEqual(args, ("contactado", 12))

    async def test_get_stats_includes_followup_pending_count(self):
        conn = FakeConn(fetchval_values=[10, 7, 3, 2, 5, 52, 4, 1])
        pool = FakePool(conn)

        with patch.object(database, "get_pool", AsyncMock(return_value=pool)):
            stats = await database.get_stats()

        self.assertIn("followup_pending", stats)
        self.assertEqual(stats["followup_pending"], 1)

    async def test_reset_leads_truncates_all_rows(self):
        conn = FakeConn()
        pool = FakePool(conn)

        with patch.object(database, "get_pool", AsyncMock(return_value=pool)):
            await database.reset_leads()

        self.assertTrue(conn.execute_calls, "expected a reset query to run")
        query, _ = conn.execute_calls[0]
        self.assertIn("TRUNCATE TABLE leads RESTART IDENTITY", query)


if __name__ == "__main__":
    unittest.main()
