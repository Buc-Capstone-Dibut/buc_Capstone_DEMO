"""Reporting package exports with lazy imports for heavy runtime dependencies."""

from __future__ import annotations

from app.interview.reporting.document import (
    REPORT_SCHEMA_VERSION,
    build_report_document,
    build_timeline_entries,
    coerce_report_document,
)

__all__ = [
    "REPORT_SCHEMA_VERSION",
    "ReportAgent",
    "ReportRepository",
    "build_report_document",
    "build_timeline_entries",
    "coerce_report_document",
]


def __getattr__(name: str):
    if name == "ReportAgent":
        from app.interview.reporting.agent import ReportAgent

        return ReportAgent
    if name == "ReportRepository":
        from app.interview.reporting.repository import ReportRepository

        return ReportRepository
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
