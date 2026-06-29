import unittest

from app.db.database import INTERVIEW_RECORDING_SIGNALS_DDL


class RecordingSignalsDdlTests(unittest.TestCase):
    def test_table_and_columns(self) -> None:
        self.assertIn("CREATE TABLE IF NOT EXISTS public.interview_recording_signals", INTERVIEW_RECORDING_SIGNALS_DDL)
        for col in ["session_id", "sample_rate_hz", "samples", "baseline", "aggregates"]:
            self.assertIn(col, INTERVIEW_RECORDING_SIGNALS_DDL, f"missing column: {col}")

    def test_fk_cascade(self) -> None:
        self.assertIn("REFERENCES public.interview_sessions(id) ON DELETE CASCADE", INTERVIEW_RECORDING_SIGNALS_DDL)

    def test_unique_session(self) -> None:
        self.assertIn("UNIQUE(session_id)", INTERVIEW_RECORDING_SIGNALS_DDL)


if __name__ == "__main__":
    unittest.main()
