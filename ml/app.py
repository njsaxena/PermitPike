"""FastAPI scoring service for the saved closure-risk model."""

from __future__ import annotations

import hmac
import os
from pathlib import Path
from typing import Annotated, Literal

import joblib
import numpy as np
import pandas as pd
import shap
from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import AwareDatetime, BaseModel, ConfigDict, Field

from ml.pipeline import MODEL_PATH, engineer_features
from ml.reasons import top_reasons


class ScoreRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    workType: str | None
    permitTypeDescr: str | None
    occupancyType: str | None
    zip: str | None
    declaredValuation: float | None = Field(ge=0)
    sqFeet: float | None = Field(ge=0)
    totalFees: float | None = Field(ge=0)
    issuedDate: AwareDatetime
    expirationDate: AwareDatetime | None
    description: str
    applicantPriorClosureRate: float = Field(ge=0, le=1)


class ScoreResponse(BaseModel):
    riskScore: float = Field(ge=0, le=1)
    band: Literal["low", "medium", "high"]
    reasons: list[str] = Field(max_length=3)
    modelVersion: str


class HealthResponse(BaseModel):
    status: Literal["ok"]
    modelVersion: str


model_path = Path(os.environ.get("MODEL_PATH", MODEL_PATH))
artifact = joblib.load(model_path)
pipeline = artifact["pipeline"]
classifier = pipeline.named_steps["classifier"]
explainer = shap.TreeExplainer(classifier)
feature_names = pipeline.named_steps["features"].get_feature_names_out()

app = FastAPI(title="PermitPike Closure Risk", version=artifact["version"])

# The web sends the same shared secret it sends the agent, in the same header.
SECRET_HEADER = "x-permitpike-secret"


def require_secret(
    provided: Annotated[str | None, Header(alias=SECRET_HEADER)] = None,
) -> None:
    """Reject /score calls without the shared secret. No secret configured means no scoring."""
    expected = os.environ.get("AGENT_SHARED_SECRET", "")
    if not expected or not provided or not hmac.compare_digest(provided.encode(), expected.encode()):
        raise HTTPException(status_code=401, detail="Missing or wrong shared secret.")


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", modelVersion=artifact["version"])


@app.post("/score", response_model=ScoreResponse, dependencies=[Depends(require_secret)])
def score(request: ScoreRequest) -> ScoreResponse:
    request_data = request.model_dump()
    row = pd.DataFrame(
        [
            {
                "worktype": request.workType,
                "permittypedescr": request.permitTypeDescr,
                "occupancytype": request.occupancyType,
                "zip": request.zip,
                "declared_valuation": request.declaredValuation,
                "sq_feet": request.sqFeet,
                "total_fees": request.totalFees,
                "issued_date": request.issuedDate,
                "expiration_date": request.expirationDate,
                "description": request.description,
            }
        ]
    )
    features = engineer_features(
        row,
        prior_closure_rate=np.array([request.applicantPriorClosureRate]),
    )
    transformed = pipeline.named_steps["features"].transform(features)
    risk_score = float(classifier.predict_proba(transformed)[0, 1])
    shap_values = explainer.shap_values(transformed)
    if isinstance(shap_values, list):
        shap_values = shap_values[1]
    if hasattr(shap_values, "toarray"):
        shap_values = shap_values.toarray()
    elif hasattr(shap_values, "values"):
        shap_values = shap_values.values
    values = np.asarray(shap_values)
    if values.ndim == 3:
        contributions = values[0, :, 1]
    elif values.ndim == 2:
        contributions = values[0]
    elif values.ndim == 1:
        contributions = values
    else:
        raise ValueError(f"Unexpected SHAP output shape: {values.shape}")
    reasons = top_reasons(feature_names, contributions, request_data)
    band = "low" if risk_score < 1 / 3 else "medium" if risk_score < 2 / 3 else "high"
    return ScoreResponse(
        riskScore=risk_score,
        band=band,
        reasons=reasons,
        modelVersion=artifact["version"],
    )
