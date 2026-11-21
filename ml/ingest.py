"""Load the filtered permit rows into the existing boston_permits schema."""

import csv
import os
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path

import psycopg
from psycopg import sql
from dotenv import load_dotenv

from ml.pipeline import DATA_PATH

ROOT = Path(__file__).resolve().parents[1]
SOURCE_TO_DB_COLUMNS = (
    ("permitnumber", ("permit_number", "permitnumber")),
    ("issued_date", ("issued_date",)),
    ("expiration_date", ("expiration_date",)),
    ("worktype", ("work_type", "worktype")),
    ("permittypedescr", ("permit_type_descr", "permittypedescr")),
    ("description", ("description",)),
    ("applicant", ("applicant",)),
    ("declared_valuation", ("declared_valuation",)),
    ("total_fees", ("total_fees",)),
    ("occupancytype", ("occupancy_type", "occupancytype")),
    ("sq_feet", ("sq_feet",)),
    ("status", ("status",)),
    ("zip", ("zip",)),
)
REQUIRED_FIELDS = {"permitnumber", "issued_date"}
DATE_FIELDS = {"issued_date", "expiration_date"}
NUMERIC_FIELDS = {"declared_valuation", "total_fees", "sq_feet"}


def parse_date(value: str | None) -> datetime | None:
    if not value:
        return None
    result = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return result.replace(tzinfo=timezone.utc) if result.tzinfo is None else result


def parse_decimal(value: str | None) -> Decimal | None:
    if not value:
        return None
    try:
        return Decimal(value.replace("$", "").replace(",", "").strip())
    except InvalidOperation as error:
        raise ValueError(f"Invalid numeric amount in permit data: {value!r}") from error


def select_columns(existing_columns: set[str]) -> list[tuple[str, str]]:
    selected = [
        (source, next((name for name in candidates if name in existing_columns), ""))
        for source, candidates in SOURCE_TO_DB_COLUMNS
    ]
    selected = [(source, target) for source, target in selected if target]
    missing = REQUIRED_FIELDS.difference(source for source, _ in selected)
    if missing:
        raise RuntimeError(
            "boston_permits is missing required columns for: "
            + ", ".join(sorted(missing))
        )
    return selected


def db_row(row: dict[str, str], selected: list[tuple[str, str]]) -> dict[str, object]:
    cleaned: dict[str, object] = {}
    for source, target in selected:
        value = row[source]
        if source in DATE_FIELDS:
            cleaned[target] = parse_date(value)
        elif source in NUMERIC_FIELDS:
            cleaned[target] = parse_decimal(value)
        elif source == "permitnumber":
            cleaned[target] = value.strip() or None
        else:
            cleaned[target] = value or None
    return cleaned


def load() -> None:
    load_dotenv(ROOT / ".env", override=False)
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is unset; configure it in the repository .env.")
    if not DATA_PATH.is_file():
        raise FileNotFoundError(f"Filtered permit data is missing: {DATA_PATH}")

    stage_sql = (
        f"CREATE TEMP TABLE permit_load (LIKE public.boston_permits) "
        "ON COMMIT DROP"
    )

    with psycopg.connect(database_url) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_schema = 'public' AND table_name = 'boston_permits'"
            )
            existing_columns = {row[0] for row in cursor.fetchall()}
            selected = select_columns(existing_columns)
            target_columns = [target for _, target in selected]
            permit_column = next(
                target for source, target in selected if source == "permitnumber"
            )
            column_list = sql.SQL(", ").join(
                sql.Identifier(column) for column in target_columns
            )
            conflict_columns = sql.SQL(", ").join(
                (sql.Identifier(permit_column), sql.Identifier("issued_date"))
            )
            cursor.execute(stage_sql)
            valid_rows = 0
            skipped_rows = 0
            copy_sql = sql.SQL("COPY permit_load ({}) FROM STDIN").format(column_list)
            with cursor.copy(copy_sql) as copy:
                with DATA_PATH.open(newline="", encoding="utf-8") as source:
                    for row in csv.DictReader(source):
                        cleaned = db_row(row, selected)
                        if cleaned[permit_column] is None or cleaned["issued_date"] is None:
                            skipped_rows += 1
                            continue
                        copy.write_row(tuple(cleaned[column] for column in target_columns))
                        valid_rows += 1
            insert_sql = sql.SQL(
                "INSERT INTO public.boston_permits ({columns}) "
                "SELECT {columns} FROM permit_load "
                "ON CONFLICT ({conflict_columns}) DO NOTHING"
            ).format(columns=column_list, conflict_columns=conflict_columns)
            cursor.execute(insert_sql)
            inserted = cursor.rowcount
            cursor.execute("SELECT COUNT(*) FROM public.boston_permits")
            total = cursor.fetchone()[0]
    print(
        f"Staged {valid_rows:,} cleaned rows; inserted {inserted:,} new rows; "
        f"skipped {skipped_rows:,} invalid rows. boston_permits now has {total:,} rows."
    )


if __name__ == "__main__":
    load()
