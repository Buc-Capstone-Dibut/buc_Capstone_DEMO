"""Pydantic schemas for resume normalization endpoint.

ResumePayload mirrors the TypeScript ResumePayload defined in
``web/app/my/[handle]/profile-types.ts``. All fields are optional or
defaulted because users may submit partially-filled resumes.
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


# ── Common helpers ─────────────────────────────────────────────────────


class _Permissive(BaseModel):
    """Allow extra fields so we never reject user payload data we don't model."""

    model_config = ConfigDict(extra="allow")


# ── Personal info ─────────────────────────────────────────────────────


class PersonalLinks(_Permissive):
    github: str | None = None
    blog: str | None = None


class PersonalInfo(_Permissive):
    name: str = ""
    email: str = ""
    phone: str = ""
    intro: str = ""
    links: PersonalLinks = Field(default_factory=PersonalLinks)


# ── Education / experience / projects / skills ────────────────────────


class EducationItem(_Permissive):
    school: str = ""
    major: str = ""
    period: str = ""
    degree: str = ""


class ExperienceItem(_Permissive):
    id: str | None = None
    company: str = ""
    position: str = ""
    period: str = ""
    description: str = ""


class TimelineItem(_Permissive):
    """Timeline items share project shape but include optional STAR fields."""

    id: str | None = None
    company: str = ""
    position: str = ""
    period: str = ""
    description: str = ""
    tags: list[str] = Field(default_factory=list)
    techStack: list[str] = Field(default_factory=list)


class ProjectItem(_Permissive):
    id: str | None = None
    name: str = ""
    period: str = ""
    description: str = ""
    techStack: list[str] = Field(default_factory=list)
    achievements: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)


class SkillItem(_Permissive):
    name: str = ""
    level: str = ""
    category: str | None = None


class CoverLetterItem(_Permissive):
    """Cover letters keep a permissive shape: web side owns the full schema."""

    id: str = ""
    title: str = ""
    content: str = ""


# ── ResumePayload ─────────────────────────────────────────────────────


class ResumePayload(_Permissive):
    personalInfo: PersonalInfo = Field(default_factory=PersonalInfo)
    education: list[EducationItem] = Field(default_factory=list)
    experience: list[ExperienceItem] = Field(default_factory=list)
    timeline: list[TimelineItem] = Field(default_factory=list)
    projects: list[ProjectItem] = Field(default_factory=list)
    skills: list[SkillItem] = Field(default_factory=list)
    selfIntroduction: str = ""
    coverLetters: list[CoverLetterItem] = Field(default_factory=list)


# ── Normalization options ─────────────────────────────────────────────


Tone = Literal["formal", "casual", "impact", "custom"]
Length = Literal["concise", "standard", "detailed"]
Highlight = Literal["skills", "experience", "projects", "selfIntro", "education"]
SelfIntroStyle = Literal["growth", "challenge", "collaboration", "achievement", "custom"]
Strength = Literal["polish", "enhance", "rewrite"]


class NormalizeOptions(BaseModel):
    model_config = ConfigDict(extra="ignore")

    tone: Tone = "formal"
    length: Length = "standard"
    highlights: list[Highlight] = Field(default_factory=list)
    targetRole: str = ""
    selfIntroStyle: SelfIntroStyle = "growth"
    strength: Strength = "enhance"
    notes: str = ""


class ResumeNormalizeRequest(BaseModel):
    """Request body for ``POST /v1/resume/normalize``."""

    model_config = ConfigDict(extra="ignore")

    payload: ResumePayload = Field(default_factory=ResumePayload)
    options: NormalizeOptions = Field(default_factory=NormalizeOptions)


class ResumeNormalizeResponse(BaseModel):
    success: bool = True
    data: dict[str, Any]
