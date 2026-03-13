"""SQLAlchemy models matching the core TypeScript models."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Enum
from sqlalchemy.orm import DeclarativeBase, relationship
import enum


class Base(DeclarativeBase):
    pass


class MediaSource(str, enum.Enum):
    spotify = "spotify"
    tidal = "tidal"
    apple_music = "apple-music"
    youtube_music = "youtube-music"
    soundcloud = "soundcloud"
    local_file = "local-file"
    browser = "browser"
    os_now_playing = "os-now-playing"
    manual = "manual"


class SectionType(str, enum.Enum):
    intro = "intro"
    verse = "verse"
    pre_chorus = "pre-chorus"
    chorus = "chorus"
    post_chorus = "post-chorus"
    bridge = "bridge"
    drop = "drop"
    breakdown = "breakdown"
    outro = "outro"
    solo = "solo"
    interlude = "interlude"
    custom = "custom"


def generate_uuid() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    display_name = Column(String, nullable=True)
    email = Column(String, nullable=True, unique=True)
    avatar_url = Column(String, nullable=True)
    auth_provider = Column(String, nullable=False, default="anonymous")
    created_at = Column(DateTime(timezone=True), default=utcnow)

    songs = relationship("Song", back_populates="user", cascade="all, delete-orphan")


class Song(Base):
    __tablename__ = "songs"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    artist = Column(String, nullable=False, default="Unknown Artist")
    album = Column(String, nullable=True)
    duration_ms = Column(Integer, nullable=True)
    source = Column(String, nullable=False, default="manual")
    external_id = Column(String, nullable=True)
    external_url = Column(String, nullable=True)
    artwork_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    user = relationship("User", back_populates="songs")
    tags = relationship("Tag", back_populates="song", cascade="all, delete-orphan")
    sections = relationship("Section", back_populates="song", cascade="all, delete-orphan")


class Tag(Base):
    __tablename__ = "tags"

    id = Column(String, primary_key=True, default=generate_uuid)
    song_id = Column(String, ForeignKey("songs.id"), nullable=False)
    timestamp_ms = Column(Integer, nullable=False)
    label = Column(String, nullable=False, default="")
    color = Column(String, nullable=False, default="#3b82f6")
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    song = relationship("Song", back_populates="tags")


class Section(Base):
    __tablename__ = "sections"

    id = Column(String, primary_key=True, default=generate_uuid)
    song_id = Column(String, ForeignKey("songs.id"), nullable=False)
    start_ms = Column(Integer, nullable=False)
    end_ms = Column(Integer, nullable=False)
    type = Column(String, nullable=False, default="custom")
    label = Column(String, nullable=False, default="")
    color = Column(String, nullable=False, default="#8b5cf6")
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    song = relationship("Song", back_populates="sections")
