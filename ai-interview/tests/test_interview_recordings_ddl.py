import unittest

from app.db.database import INTERVIEW_RECORDINGS_DDL


class InterviewRecordingsDdlTests(unittest.TestCase):
    def test_targets_correct_table(self) -> None:
        self.assertIn(
            "CREATE TABLE IF NOT EXISTS public.interview_recordings",
            INTERVIEW_RECORDINGS_DDL,
        )

    def test_has_required_columns(self) -> None:
        for col in [
            "session_id", "bucket", "storage_path", "duration_ms",
            "mime_type", "size_bytes", "recording_started_at",
        ]:
            self.assertIn(col, INTERVIEW_RECORDINGS_DDL, f"missing column: {col}")

    def test_fk_cascades_with_session(self) -> None:
        self.assertIn(
            "REFERENCES public.interview_sessions(id) ON DELETE CASCADE",
            INTERVIEW_RECORDINGS_DDL,
        )

    def test_unique_session_for_upsert(self) -> None:
        self.assertIn("UNIQUE(session_id)", INTERVIEW_RECORDINGS_DDL)


if __name__ == "__main__":
    unittest.main()
