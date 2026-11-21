"""Feature engineering and model evaluation for Boston permit closure risk."""

from __future__ import annotations

from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from lightgbm import LGBMClassifier
from sklearn.compose import ColumnTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, roc_auc_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

MODEL_VERSION = "closure_v1"
DATA_PATH = Path(__file__).parent / "data" / "boston_permits_2015.csv"
MODEL_PATH = Path(__file__).parent / "model" / f"{MODEL_VERSION}.joblib"

CATEGORY_COLUMNS = ["worktype", "permittypedescr", "occupancytype", "zip"]
KEYWORD_PATTERNS = {
    "keyword_heat_pump": r"\bheat[\s-]*pump\b",
    "keyword_mini_split": r"\bmini[\s-]?split\b",
    "keyword_ev": r"\bEV\b",
    "keyword_charger": r"\bcharg(?:er|ing)\b",
    "keyword_panel": r"\bpanel\b",
    "keyword_service_upgrade": r"\bservice\s+upgrade\b",
    "keyword_200_amp": r"\b200\s*amp(?:s)?\b",
    "keyword_battery": r"\bbatter(?:y|ies)\b",
    "keyword_solar": r"\bsolar\b",
}
NUMERIC_COLUMNS = [
    "log_declared_valuation",
    "sq_feet",
    "total_fees",
    "issue_month",
    "issue_year",
    "days_to_expiration",
    "applicant_prior_closure_rate",
    *KEYWORD_PATTERNS,
]
FEATURE_COLUMNS = [*CATEGORY_COLUMNS, *NUMERIC_COLUMNS, "description"]


def parse_numeric(values: pd.Series) -> pd.Series:
    cleaned = values.astype("string").str.replace(r"[$,]", "", regex=True)
    return pd.to_numeric(cleaned, errors="coerce")


def compute_prior_closure_rate(frame: pd.DataFrame) -> pd.Series:
    """Rate by applicant, excluding the current date and all later permits."""
    issued = pd.to_datetime(frame["issued_date"], utc=True, errors="coerce")
    applicants = frame["applicant"].astype("string").str.strip().str.casefold()
    valid = issued.notna() & applicants.notna() & applicants.ne("")
    events = pd.DataFrame(
        {
            "applicant_key": applicants[valid],
            "issued_date": issued[valid],
            "is_closed": frame.loc[valid, "status"].eq("Closed").astype("int8"),
        },
        index=frame.index[valid],
    )
    if events.empty:
        return pd.Series(0.0, index=frame.index, dtype="float64")

    by_issue_date = (
        events.groupby(["applicant_key", "issued_date"], sort=True, observed=True)
        .agg(closed=("is_closed", "sum"), permits=("is_closed", "size"))
        .reset_index()
    )
    grouped = by_issue_date.groupby("applicant_key", sort=False, observed=True)
    by_issue_date["prior_closed"] = grouped["closed"].cumsum() - by_issue_date["closed"]
    by_issue_date["prior_permits"] = grouped["permits"].cumsum() - by_issue_date["permits"]
    by_issue_date["prior_rate"] = (
        by_issue_date["prior_closed"] / by_issue_date["prior_permits"].replace(0, np.nan)
    )
    prior_rates = by_issue_date.set_index(["applicant_key", "issued_date"])["prior_rate"]
    row_keys = pd.MultiIndex.from_arrays(
        [applicants[valid].to_numpy(), issued[valid].to_numpy()],
        names=["applicant_key", "issued_date"],
    )
    result = pd.Series(0.0, index=frame.index, dtype="float64")
    result.loc[valid] = prior_rates.reindex(row_keys).fillna(0.0).to_numpy()
    return result


def engineer_features(
    frame: pd.DataFrame,
    prior_closure_rate: pd.Series | np.ndarray | None = None,
) -> pd.DataFrame:
    """Build model inputs without status, comments, or raw applicant names."""
    result = pd.DataFrame(index=frame.index)
    for column in CATEGORY_COLUMNS:
        result[column] = frame[column].astype("string").fillna("__missing__").astype(str)

    valuation = parse_numeric(frame["declared_valuation"]).clip(lower=0)
    result["log_declared_valuation"] = np.log1p(valuation)
    result["sq_feet"] = parse_numeric(frame["sq_feet"]).clip(lower=0)
    result["total_fees"] = parse_numeric(frame["total_fees"]).clip(lower=0)

    issued = pd.to_datetime(frame["issued_date"], utc=True, errors="coerce")
    expiration = pd.to_datetime(frame["expiration_date"], utc=True, errors="coerce")
    result["issue_month"] = issued.dt.month
    result["issue_year"] = issued.dt.year
    result["days_to_expiration"] = (expiration - issued).dt.total_seconds() / 86_400

    if prior_closure_rate is None:
        if "applicant" not in frame or "status" not in frame:
            raise ValueError("Applicant history is required to calculate prior closure rates.")
        prior_closure_rate = compute_prior_closure_rate(frame)
    result["applicant_prior_closure_rate"] = np.asarray(prior_closure_rate, dtype="float64")

    description = frame["description"].fillna("").astype(str)
    result["description"] = description
    for column, pattern in KEYWORD_PATTERNS.items():
        result[column] = description.str.contains(pattern, case=False, regex=True).astype("int8")

    return result.loc[:, FEATURE_COLUMNS]


def label_mature_permits(
    frame: pd.DataFrame, as_of: date | datetime | None = None
) -> tuple[pd.DataFrame, pd.Series]:
    now = pd.Timestamp(as_of or datetime.now(timezone.utc))
    if now.tzinfo is None:
        now = now.tz_localize("UTC")
    else:
        now = now.tz_convert("UTC")
    issued = pd.to_datetime(frame["issued_date"], utc=True, errors="coerce")
    expiration = pd.to_datetime(frame["expiration_date"], utc=True, errors="coerce")
    old_issue_cutoff = now - pd.DateOffset(months=18)
    mature = expiration.lt(now.normalize()) | issued.le(old_issue_cutoff)
    labeled = frame.loc[mature & issued.notna()].copy()
    labels = labeled["status"].ne("Closed").astype("int8")
    return labeled, labels


def split_labeled(
    labeled: pd.DataFrame, labels: pd.Series
) -> dict[str, tuple[pd.DataFrame, pd.Series]]:
    issued = pd.to_datetime(labeled["issued_date"], utc=True)
    split_masks = {
        "train": issued.dt.year.le(2022),
        "validate": issued.dt.year.eq(2023),
        "test": issued.dt.year.eq(2024) & issued.dt.month.le(6),
    }
    return {
        name: (labeled.loc[mask], labels.loc[mask])
        for name, mask in split_masks.items()
    }


def label_and_split(
    frame: pd.DataFrame, as_of: date | datetime | None = None
) -> dict[str, tuple[pd.DataFrame, pd.Series]]:
    return split_labeled(*label_mature_permits(frame, as_of))


def make_preprocessor() -> ColumnTransformer:
    return ColumnTransformer(
        transformers=[
            (
                "categories",
                OneHotEncoder(handle_unknown="ignore"),
                CATEGORY_COLUMNS,
            ),
            (
                "numeric",
                Pipeline(
                    steps=[
                        ("impute", SimpleImputer(strategy="median")),
                        ("scale", StandardScaler(with_mean=False)),
                    ]
                ),
                NUMERIC_COLUMNS,
            ),
            (
                "description",
                TfidfVectorizer(max_features=500, min_df=1, stop_words="english"),
                "description",
            ),
        ],
        sparse_threshold=1.0,
    )


def make_models() -> dict[str, Pipeline]:
    return {
        "Logistic regression": Pipeline(
            [
                ("features", make_preprocessor()),
                (
                    "classifier",
                    LogisticRegression(
                        class_weight="balanced",
                        max_iter=500,
                        solver="liblinear",
                        random_state=42,
                    ),
                ),
            ]
        ),
        "LightGBM": Pipeline(
            [
                ("features", make_preprocessor()),
                (
                    "classifier",
                    LGBMClassifier(
                        class_weight="balanced",
                        n_estimators=300,
                        learning_rate=0.05,
                        num_leaves=31,
                        random_state=42,
                        n_jobs=-1,
                        verbosity=-1,
                    ),
                ),
            ]
        ),
    }


def print_exploration(frame: pd.DataFrame) -> None:
    print(f"Columns ({len(frame.columns)}): {', '.join(frame.columns)}")
    print(f"Rows: {len(frame):,}")
    for column in ("permittypedescr", "worktype", "status"):
        print(f"\n{column} value counts:")
        print(frame[column].value_counts(dropna=False).to_string())
    for column in ("issued_date", "expiration_date"):
        dates = pd.to_datetime(frame[column], utc=True, errors="coerce")
        print(
            f"\n{column} min={dates.min()} max={dates.max()}"
        )


def print_metrics(
    model_name: str,
    split_name: str,
    labels: pd.Series,
    probabilities: np.ndarray,
) -> None:
    auc = roc_auc_score(labels, probabilities)
    pr_auc = average_precision_score(labels, probabilities)
    top_n = max(1, int(np.ceil(len(labels) * 0.10)))
    lift = labels.iloc[np.argsort(probabilities)[::-1][:top_n]].mean() / labels.mean()
    print(
        f"{model_name} {split_name}: ROC AUC={auc:.4f}, PR AUC={pr_auc:.4f}, "
        f"lift@10%={lift:.4f}"
    )

    bins = min(10, len(np.unique(probabilities)))
    calibration = pd.DataFrame(
        {"actual": labels.to_numpy(), "predicted": probabilities}
    )
    calibration["bin"] = pd.qcut(
        calibration["predicted"], q=max(1, bins), duplicates="drop"
    )
    table = calibration.groupby("bin", observed=True).agg(
        count=("actual", "size"),
        mean_predicted=("predicted", "mean"),
        observed_rate=("actual", "mean"),
    )
    print(f"{model_name} {split_name} calibration:")
    print(table.to_string(float_format=lambda value: f"{value:.4f}"))


def train(data_path: Path = DATA_PATH, save: bool = True) -> dict[str, Any]:
    frame = pd.read_csv(
        data_path,
        dtype={
            "permitnumber": "string",
            "worktype": "string",
            "permittypedescr": "string",
            "applicant": "string",
            "occupancytype": "string",
            "zip": "string",
        },
    )
    print_exploration(frame)
    training_date = datetime.now(timezone.utc)
    labeled, all_labels = label_mature_permits(frame, training_date)
    splits = split_labeled(labeled, all_labels)
    print("\nLabel balance (all eligible rows):")
    print(f"As-of date: {training_date.date()}")
    print(f"Eligible rows: {len(all_labels):,}")
    print(all_labels.value_counts().sort_index().rename(index={0: "Closed (0)", 1: "Open (1)"}))
    for name, (_, labels) in splits.items():
        print(f"{name} rows: {len(labels):,}; positive rate: {labels.mean():.4f}")

    prior_rates = compute_prior_closure_rate(frame)
    engineered = engineer_features(frame, prior_rates)
    split_indices = {name: rows.index for name, (rows, _) in splits.items()}
    feature_splits = {
        name: engineered.loc[index]
        for name, index in split_indices.items()
    }

    models = make_models()
    fitted: dict[str, Pipeline] = {}
    for name, model in models.items():
        print(f"\nTraining {name}...")
        model.fit(feature_splits["train"], splits["train"][1])
        fitted[name] = model
        for split_name in ("validate", "test"):
            probabilities = model.predict_proba(feature_splits[split_name])[:, 1]
            print_metrics(
                name,
                split_name,
                splits[split_name][1].reset_index(drop=True),
                probabilities,
            )

    if save:
        MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
        artifact = {
            "version": MODEL_VERSION,
            "pipeline": fitted["LightGBM"],
            "features": list(FEATURE_COLUMNS),
            "reason_policy": "top three distinct SHAP drivers; no raw description terms",
        }
        joblib.dump(artifact, MODEL_PATH, compress=3)
        print(f"Saved model: {MODEL_PATH} ({MODEL_PATH.stat().st_size:,} bytes)")
    return {"models": fitted, "splits": splits, "features": feature_splits}
