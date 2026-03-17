from datetime import datetime
from datetime import date
from typing import Optional

from pydantic import BaseModel, Field


class DevEvent(BaseModel):
    id: Optional[str] = None
    source_key: Optional[str] = None
    source_title: Optional[str] = None
    title: str
    link: str
    host: Optional[str] = None
    date: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    tags: list[str] = Field(default_factory=list)
    category: Optional[str] = None
    status: str = "recruiting"
    source: str = "github"
    description: Optional[str] = None
    thumbnail: Optional[str] = None
    content: Optional[str] = None
    summary: Optional[str] = None
    target_audience: list[str] = Field(default_factory=list)
    fee: Optional[str] = None
    schedule: list[str] = Field(default_factory=list)
    benefits: list[str] = Field(default_factory=list)
    last_seen_at: Optional[datetime] = None
