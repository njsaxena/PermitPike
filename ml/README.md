# Permit closure-risk model card

## Summary

`closure_v1` estimates whether an eligible historical Boston building permit
was still not closed in the source snapshot. It is an operational triage signal,
not a permit decision or a recommendation about an applicant. Only a human
official may approve or return an application.

## Data

- Source: Analyze Boston, **Approved Building Permits**, CKAN resource
  `6ddcd912-32a0-43df-9908-63574f8c7e77`
  ([dataset](https://data.boston.gov/dataset/approved-building-permits)).
- The downloader requests only the columns required for model training and
  database loading, filtering to permits issued on or after 2015-01-01.
- The 2026-11-21 CKAN snapshot contained 477,776 rows, issued 2015-01-02 through
  2026-11-20. Expiration values ranged from 1805-01-03 through 2028-01-02.
- Downloaded CSVs live in the ignored `ml/data/` directory and are never
  committed. The source rows are public data.
- The database loader maps the selected CSV fields to columns supported by the
  existing `boston_permits` table, including recognized legacy column names.
  Applicant, occupancy type, and square footage are loaded only when the target
  table has those columns.

## Labels and splits

A row is eligible when its expiration date is before the training date **or**
its issue date is at least 18 calendar months old. `Closed` is label `0`;
every other status is label `1`. Status is used only for labels and historical
applicant closure-rate calculation, never as a model input.

Rows are split chronologically by issue date:

- Train: through 2022-12-31
- Validation: 2023
- Test: 2024-01-01 through 2024-06-30

Rows outside those windows are not included in the reported evaluation. The
training run used 2026-11-21 as its as-of date. Of 457,253 eligible rows,
204,775 were Closed (0) and 252,478 were not Closed (1). Split sizes and
positive rates were:

| Split | Rows | Positive rate |
|---|---:|---:|
| Train | 332,347 | 0.5762 |
| Validate | 38,519 | 0.5045 |
| Test | 18,888 | 0.4893 |

## Features

Inputs include work type, permit type, occupancy type, ZIP, log-transformed
declared valuation, square footage, total fees, issue month/year, days from
issue to expiration, nine description keyword flags (heat pump, mini-split, EV,
charger, panel, service upgrade, 200 amp, battery, solar), and up to 500
training-only TF-IDF description terms.

Applicant names are used only to calculate a prior closure rate from permits
with a strictly earlier issue date. Permits on the same issue timestamp do not
count as prior. The name itself is not a model feature, stored in the model
artifact, accepted by the scoring API, or included in reasons. Comments are
neither downloaded nor used.

## Models and evaluation

Two class-weighted models are trained: logistic regression (baseline) and
LightGBM. Metrics are reported for validation and test: ROC AUC, average
precision (PR AUC), lift in the top 10% of scores, and a decile calibration
table (count, mean predicted probability, observed positive rate).

### Results

| Model | Split | ROC AUC | PR AUC | Lift@10% |
|---|---|---:|---:|---:|
| Logistic regression | Validate | 0.7443 | 0.7358 | 1.6857 |
| Logistic regression | Test | 0.7328 | 0.7177 | 1.7289 |
| LightGBM | Validate | 0.7700 | 0.7723 | 1.7963 |
| LightGBM | Test | 0.7594 | 0.7596 | 1.8555 |

Calibration deciles are shown as **count / mean predicted probability /
observed positive rate**.

| Model / split | Deciles 1–5 |
|---|---|
| Logistic regression / validate | 3,852 / 0.1245 / 0.1251; 3,852 / 0.2723 / 0.2661; 3,852 / 0.3376 / 0.3450; 3,852 / 0.3946 / 0.4154; 3,852 / 0.4561 / 0.4834 |
| Logistic regression / test | 1,889 / 0.1210 / 0.1308; 1,889 / 0.2574 / 0.2732; 1,889 / 0.3278 / 0.3441; 1,888 / 0.3874 / 0.4131; 1,889 / 0.4485 / 0.4653 |
| LightGBM / validate | 3,852 / 0.1122 / 0.1215; 3,853 / 0.2283 / 0.2546; 3,851 / 0.2949 / 0.3225; 3,852 / 0.3602 / 0.3943; 3,852 / 0.4210 / 0.4486 |
| LightGBM / test | 1,889 / 0.1137 / 0.1233; 1,889 / 0.2176 / 0.2710; 1,889 / 0.2863 / 0.3266; 1,888 / 0.3550 / 0.3676; 1,889 / 0.4188 / 0.4378 |

| Model / split | Deciles 6–10 |
|---|---|
| Logistic regression / validate | 3,851 / 0.5256 / 0.5617; 3,852 / 0.6018 / 0.5994; 3,852 / 0.6769 / 0.6508; 3,852 / 0.7488 / 0.7479; 3,852 / 0.8382 / 0.8505 |
| Logistic regression / test | 1,889 / 0.5158 / 0.5204; 1,888 / 0.5929 / 0.5408; 1,889 / 0.6712 / 0.6400; 1,889 / 0.7483 / 0.7194; 1,889 / 0.8348 / 0.8460 |
| LightGBM / validate | 3,851 / 0.4849 / 0.5204; 3,852 / 0.5617 / 0.6051; 3,852 / 0.6547 / 0.6913; 3,852 / 0.7447 / 0.7806; 3,852 / 0.8622 / 0.9063 |
| LightGBM / test | 1,889 / 0.4851 / 0.4743; 1,888 / 0.5618 / 0.5662; 1,889 / 0.6523 / 0.6501; 1,889 / 0.7443 / 0.7681; 1,889 / 0.8640 / 0.9079 |

The saved LightGBM artifact is 446,938 bytes.

## Scoring service

- Artifact: `ml/model/closure_v1.joblib`; the training command saves it once
  after evaluation and prints its exact file size.
- `POST /score` accepts the feature inputs and an
  `applicantPriorClosureRate` computed upstream from earlier-issued permits.
  It returns `riskScore`, `band`, up to three SHAP-based plain-English
  `reasons`, and `modelVersion`.
- Bands are low below 1/3, medium from 1/3 to below 2/3, and high from 2/3.
- `GET /health` reports service status and model version.
- The app loads the model and SHAP explainer once at startup. Request scoring
  is local; it does not call a database or external service.
- Five warmed local HTTP scoring requests completed in 7.8–9.5 ms each during
  validation (well below the 300 ms target).

Run with Python 3.11:

```bash
python3.11 -m pip install -r ml/requirements.txt
python3.11 -m ml.download_data
python3.11 -m ml.train
python3.11 -m ml.ingest
python3.11 -m uvicorn ml.app:app --host 0.0.0.0 --port 8000
```

`ml.ingest` reads `DATABASE_URL` from the repository `.env` or process
environment. To build the Vultr image after generating the model:

```bash
docker build -f ml/Dockerfile -t permitpike-closure-risk .
```

## Limitations and intended use

- This predicts recorded closure status, not quality, safety, legal compliance,
  or whether a permit should be approved or returned.
- Permit closure reflects administrative workflow and data-entry practices;
  results may not generalize outside Boston or to future process changes.
- The public source is a current snapshot. Historical statuses can reflect
  updates made after a permit's issue date, which may make temporal evaluation
  optimistic even though applicant-history features exclude permits issued on
  or after the row being scored.
- Applicant history, ZIP, occupancy, permit type, and text can encode
  socioeconomic or process-related proxies. Human review is required; the
  score must not be used as the sole basis for a decision.
- Descriptions can be incomplete or inconsistent. Missing numeric values are
  imputed from training data; unseen categories are ignored by the encoder.
