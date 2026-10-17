from datetime import date
from typing import List, Optional
from pydantic import BaseModel

class DevEvent(BaseModel):
    title: str
    link: str
    host: Optional[str] = None
    date: str  # Original date string from README
    start_date: Optional[date] = None # Parsed start date
    end_date: Optional[date] = None # Parsed end date
    tags: List[str] = []
    category: Optional[str] = None # Competition, Education, Conference, etc.
    status: str = "recruiting" # recruiting, closed, upcoming
    source: str = "github"
    source_title: Optional[str] = None
    description: Optional[str] = None
    thumbnail: Optional[str] = None
    content: Optional[str] = None
    
    # AI Structured Fields
    summary: Optional[str] = None
    target_audience: List[str] = []
    fee: Optional[str] = None
    schedule: List[str] = []
    benefits: List[str] = []
