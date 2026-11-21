"""Applicant normalization shared by training and contractor-history rebuilds."""


def normalize_applicant_name(value: str | None) -> str:
    return value.strip().casefold() if isinstance(value, str) else ""
