import unittest

import numpy as np
import pandas as pd

from ml.pipeline import (
    compute_prior_closure_rate,
    engineer_features,
    label_and_split,
    label_mature_permits,
)
from ml.reasons import top_reasons


class PermitPipelineTests(unittest.TestCase):
    def test_prior_rate_uses_only_strictly_earlier_issue_dates(self):
        frame = pd.DataFrame(
            {
                "applicant": ["A", "A", "A", None],
                "issued_date": [
                    "2020-01-01T00:00:00Z",
                    "2020-01-01T00:00:00Z",
                    "2020-01-02T00:00:00Z",
                    "2020-01-03T00:00:00Z",
                ],
                "status": ["Closed", "Open", "Closed", "Open"],
            }
        )
        rates = compute_prior_closure_rate(frame)
        self.assertEqual(rates.iloc[0], 0)
        self.assertEqual(rates.iloc[1], 0)
        self.assertEqual(rates.iloc[2], 0.5)
        self.assertEqual(rates.iloc[3], 0)

    def test_labels_and_chronological_splits(self):
        frame = pd.DataFrame(
            {
                "issued_date": [
                    "2022-01-01T00:00:00Z",
                    "2023-02-01T00:00:00Z",
                    "2024-06-30T00:00:00Z",
                    "2024-07-01T00:00:00Z",
                    "2025-01-01T00:00:00Z",
                ],
                "expiration_date": [None, None, None, None, "2025-12-01T00:00:00Z"],
                "status": ["Closed", "Open", "Open", "Closed", "Open"],
            }
        )
        splits = label_and_split(frame, as_of="2026-01-01T00:00:00Z")
        self.assertEqual(len(splits["train"][1]), 1)
        self.assertEqual(len(splits["validate"][1]), 1)
        self.assertEqual(len(splits["test"][1]), 1)
        self.assertEqual(int(splits["train"][1].iloc[0]), 0)
        self.assertEqual(int(splits["validate"][1].iloc[0]), 1)
        labeled, labels = label_mature_permits(frame, as_of="2026-01-01T00:00:00Z")
        self.assertIn(frame.index[4], labeled.index)
        self.assertEqual(int(labels.loc[frame.index[4]]), 1)

    def test_engineered_features_exclude_status_comments_and_names(self):
        frame = pd.DataFrame(
            {
                "worktype": ["ELECTRICAL"],
                "permittypedescr": ["Short Form"],
                "occupancytype": ["1-3FAM"],
                "zip": ["02109"],
                "declared_valuation": ["$10,000.00"],
                "sq_feet": ["500"],
                "total_fees": ["$100.00"],
                "issued_date": ["2024-01-01T00:00:00Z"],
                "expiration_date": ["2024-07-01T00:00:00Z"],
                "description": ["Install heat pump and EV charger"],
                "applicant": ["Private Contractor"],
                "status": ["Closed"],
                "comments": ["must not become a feature"],
            }
        )
        features = engineer_features(frame, prior_closure_rate=np.array([0.5]))
        self.assertNotIn("status", features.columns)
        self.assertNotIn("comments", features.columns)
        self.assertNotIn("applicant", features.columns)
        self.assertEqual(features.iloc[0]["keyword_heat_pump"], 1)
        self.assertEqual(features.iloc[0]["keyword_ev"], 1)

    def test_description_reasons_never_expose_tfidf_terms(self):
        reasons = top_reasons(
            [
                "description__contractor_name",
                "numeric__applicant_prior_closure_rate",
                "categories__worktype_ELECTRICAL",
            ],
            np.array([0.9, 0.8, -0.7]),
            {"applicantPriorClosureRate": 0.25},
        )
        self.assertEqual(len(reasons), 3)
        self.assertFalse(any("contractor_name" in reason for reason in reasons))


if __name__ == "__main__":
    unittest.main()
