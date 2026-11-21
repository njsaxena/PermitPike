"""Rebuild private contractor closure-rate lookup rows from boston_permits."""

from __future__ import annotations

import os
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import psycopg
from dotenv import load_dotenv

from ml.normalization import normalize_applicant_name

ROOT = Path(__file__).resolve().parents[1]
CITYWIDE_KEY = ""
BATCH_SIZE = 10_000


def rebuild() -> int:
    load_dotenv(ROOT / ".env", override=False)
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is unset; configure it in the repository .env.")

    as_of = datetime.now(timezone.utc)
    aggregates: dict[str, list[int]] = defaultdict(lambda: [0, 0])
    citywide = [0, 0]

    with psycopg.connect(database_url) as connection:
        with connection.cursor(name="contractor_history_source") as source:
            source.execute(
                "SELECT applicant, status FROM public.boston_permits "
                "WHERE issued_date < %s",
                (as_of,),
            )
            while rows := source.fetchmany(BATCH_SIZE):
                for applicant, status in rows:
                    closed = int(status == "Closed")
                    citywide[0] += 1
                    citywide[1] += closed
                    applicant_key = normalize_applicant_name(applicant)
                    if applicant_key:
                        aggregates[applicant_key][0] += 1
                        aggregates[applicant_key][1] += closed

        if not citywide[0]:
            raise RuntimeError("boston_permits has no permits issued before the as-of date.")

        aggregates[CITYWIDE_KEY] = citywide
        rows_to_write = [
            (
                applicant_key,
                permit_count,
                closed_count / permit_count,
                as_of,
            )
            for applicant_key, (permit_count, closed_count) in aggregates.items()
            if permit_count
        ]
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM public.contractor_stats")
            cursor.executemany(
                "INSERT INTO public.contractor_stats "
                "(normalized_applicant, permit_count, prior_closure_rate, as_of_date) "
                "VALUES (%s, %s, %s, %s)",
                rows_to_write,
            )

    print(
        f"Rebuilt {len(rows_to_write) - 1:,} contractor rows and one citywide "
        f"fallback at {as_of.isoformat()}."
    )
    return len(rows_to_write) - 1


if __name__ == "__main__":
    rebuild()
