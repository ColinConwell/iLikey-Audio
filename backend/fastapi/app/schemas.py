"""Pydantic schemas for API request/response validation."""

from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional


# ── Songs ──

class SongCreate(BaseModel):
    title: str
    artist: str = "Unknown Artist"
    album: Optional[str] = None
    duration_ms: Optional[int] = None
    source: str = "manual"
    external_id: Optional[str] = None
    external_url: Optional[str] = None
    artwork_url: Optional[str] = None


class SongUpdate(BaseModel):
    title: Optional[str] = None
    artist: Optional[str] = None
    album: Optional[str] = None
    duration_ms: Optional[int] = None


class SongResponse(BaseModel):
    id: str
    user_id: str
    title: str
    artist: str
    album: Optional[str]
    duration_ms: Optional[int]
    source: str
    external_id: Optional[str]
    external_url: Optional[str]
    artwork_url: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Tags ──

class TagCreate(BaseModel):
    song_id: str
    timestamp_ms: int
    label: str = ""
    color: str = "#3b82f6"


class TagUpdate(BaseModel):
    label: Optional[str] = None
    color: Optional[str] = None


class TagResponse(BaseModel):
    id: str
    song_id: str
    timestamp_ms: int
    label: str
    color: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Sections ──

class SectionCreate(BaseModel):
    song_id: str
    start_ms: int
    end_ms: int
    type: str = "custom"
    label: str = ""
    color: str = "#8b5cf6"


class SectionUpdate(BaseModel):
    type: Optional[str] = None
    label: Optional[str] = None
    color: Optional[str] = None
    start_ms: Optional[int] = None
    end_ms: Optional[int] = None


class SectionResponse(BaseModel):
    id: str
    song_id: str
    start_ms: int
    end_ms: int
    type: str
    label: str
    color: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Auth ──

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ── Export ──

class ExportResponse(BaseModel):
    version: int = 1
    exported_at: datetime
    songs: list[SongResponse]
    tags: list[TagResponse]
    sections: list[SectionResponse]
