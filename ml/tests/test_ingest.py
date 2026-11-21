import unittest

from ml.ingest import db_row, select_columns


class PermitIngestTests(unittest.TestCase):
    def test_selects_repository_schema_column_names(self):
        selected = select_columns(
            {"permit_number", "issued_date", "work_type", "permit_type_descr"}
        )
        self.assertIn(("permitnumber", "permit_number"), selected)
        self.assertIn(("worktype", "work_type"), selected)

    def test_selects_existing_legacy_database_column_names(self):
        selected = select_columns(
            {"permitnumber", "issued_date", "worktype", "permittypedescr", "applicant"}
        )
        self.assertIn(("permitnumber", "permitnumber"), selected)
        self.assertIn(("worktype", "worktype"), selected)
        self.assertIn(("applicant", "applicant"), selected)

    def test_converts_csv_values_for_database_types(self):
        selected = select_columns(
            {
                "permitnumber",
                "issued_date",
                "expiration_date",
                "declared_valuation",
                "total_fees",
                "sq_feet",
            }
        )
        result = db_row(
            {
                "permitnumber": "A1 ",
                "issued_date": "2024-01-02T03:04:05",
                "expiration_date": "",
                "declared_valuation": "$1,250.50",
                "total_fees": "$70.00",
                "sq_feet": "500",
            },
            selected,
        )
        self.assertEqual(result["permitnumber"], "A1")
        self.assertEqual(str(result["declared_valuation"]), "1250.50")
        self.assertEqual(str(result["sq_feet"]), "500")
        self.assertIsNone(result["expiration_date"])
        self.assertEqual(result["issued_date"].utcoffset().total_seconds(), 0)


if __name__ == "__main__":
    unittest.main()
