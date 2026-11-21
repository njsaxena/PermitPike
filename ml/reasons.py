"""Convert the top SHAP contributors into safe, generic plain-English reasons."""

from __future__ import annotations

from collections.abc import Sequence

import numpy as np

KEYWORD_LABELS = {
    "keyword_heat_pump": "heat pump",
    "keyword_mini_split": "mini-split",
    "keyword_ev": "EV",
    "keyword_charger": "charger",
    "keyword_panel": "panel",
    "keyword_service_upgrade": "service upgrade",
    "keyword_200_amp": "200-amp service",
    "keyword_battery": "battery",
    "keyword_solar": "solar",
}


def _reason(feature: str, impact: float, request: dict) -> tuple[str, str]:
    direction = "increases" if impact > 0 else "reduces"
    if feature.startswith("description__"):
        return (
            "description",
            f"Description wording {direction} the model-estimated closure risk.",
        )
    for key, label in KEYWORD_LABELS.items():
        if feature == f"numeric__{key}":
            return (
                key,
                f"The description mentions {label}; this {direction} the model-estimated closure risk.",
            )
    category_reasons = {
        "worktype": "The work type",
        "permittypedescr": "The permit category",
        "occupancytype": "The occupancy type",
        "zip": "The permit's ZIP area",
    }
    if feature.startswith("categories__"):
        for column, label in category_reasons.items():
            if feature.startswith(f"categories__{column}_"):
                return column, f"{label} {direction} the model-estimated closure risk."

    numeric_reasons = {
        "numeric__log_declared_valuation": "The declared project valuation",
        "numeric__sq_feet": "The project's square footage",
        "numeric__total_fees": "The total permit fees",
        "numeric__issue_month": "The issue month",
        "numeric__issue_year": "The issue year",
        "numeric__days_to_expiration": "The time between issue and expiration",
    }
    if feature == "numeric__applicant_prior_closure_rate":
        rate = float(request["applicantPriorClosureRate"])
        return (
            "applicant_history",
            f"The applicant's prior permits closed at {rate:.0%}; this {direction} the model-estimated closure risk.",
        )
    if feature in numeric_reasons:
        return (
            feature,
            f"{numeric_reasons[feature]} {direction} the model-estimated closure risk.",
        )
    return "other", f"A recorded permit characteristic {direction} the model-estimated closure risk."


def top_reasons(
    feature_names: Sequence[str],
    contributions: np.ndarray,
    request: dict,
    limit: int = 3,
) -> list[str]:
    order = np.argsort(np.abs(contributions))[::-1]
    reasons: list[str] = []
    seen: set[str] = set()
    for index in order:
        impact = float(contributions[index])
        if impact == 0:
            continue
        key, text = _reason(str(feature_names[index]), impact, request)
        if key in seen:
            continue
        reasons.append(text)
        seen.add(key)
        if len(reasons) == limit:
            break
    return reasons
