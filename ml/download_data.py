"""Download only the model and database fields from Analyze Boston's CKAN API."""

import csv
import json
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen

RESOURCE_ID = "6ddcd912-32a0-43df-9908-63574f8c7e77"
API_URL = "https://data.boston.gov/api/3/action/datastore_search_sql"
FIELDS = [
    "permitnumber",
    "worktype",
    "permittypedescr",
    "description",
    "applicant",
    "declared_valuation",
    "total_fees",
    "issued_date",
    "expiration_date",
    "status",
    "occupancytype",
    "sq_feet",
    "zip",
]
PAGE_SIZE = 10_000
OUTPUT = Path(__file__).parent / "data" / "boston_permits_2015.csv"


def fetch(sql: str) -> dict:
    url = f"{API_URL}?{urlencode({'sql': sql})}"
    with urlopen(url, timeout=90) as response:
        payload = json.load(response)
    if not payload.get("success"):
        raise RuntimeError(f"Analyze Boston CKAN query failed: {payload.get('error')}")
    return payload["result"]


def download() -> int:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    quoted_fields = ", ".join(FIELDS)
    count_sql = (
        f'SELECT COUNT(*) AS count FROM "{RESOURCE_ID}" '
        "WHERE issued_date >= '2015-01-01'"
    )
    expected = int(fetch(count_sql)["records"][0]["count"])
    print(f"CKAN reports {expected:,} permits issued in 2015 or later.")

    written = 0
    with OUTPUT.open("w", newline="", encoding="utf-8") as output:
        writer = csv.DictWriter(output, fieldnames=FIELDS, extrasaction="ignore")
        writer.writeheader()
        while written < expected:
            sql = (
                f'SELECT {quoted_fields} FROM "{RESOURCE_ID}" '
                "WHERE issued_date >= '2015-01-01' "
                f"ORDER BY issued_date, permitnumber LIMIT {PAGE_SIZE} OFFSET {written}"
            )
            records = fetch(sql)["records"]
            if not records:
                break
            writer.writerows(records)
            written += len(records)
            print(f"Downloaded {written:,}/{expected:,} rows.")
    if written != expected:
        raise RuntimeError(f"CKAN returned {written:,} rows; expected {expected:,}.")
    print(f"Saved filtered data to {OUTPUT} ({OUTPUT.stat().st_size:,} bytes).")
    return written


if __name__ == "__main__":
    download()
