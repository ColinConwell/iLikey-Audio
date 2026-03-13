"""Song CRUD endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Song
from app.schemas import SongCreate, SongUpdate, SongResponse

router = APIRouter()


@router.get("/", response_model=list[SongResponse])
async def list_songs(
    q: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(Song)
    if q:
        query = query.filter(
            Song.title.ilike(f"%{q}%") | Song.artist.ilike(f"%{q}%")
        )
    return query.order_by(Song.created_at.desc()).all()


@router.get("/{song_id}", response_model=SongResponse)
async def get_song(song_id: str, db: Session = Depends(get_db)):
    song = db.query(Song).filter(Song.id == song_id).first()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    return song


@router.post("/", response_model=SongResponse, status_code=201)
async def create_song(data: SongCreate, db: Session = Depends(get_db)):
    song = Song(
        user_id="anonymous",  # TODO: get from auth
        **data.model_dump(),
    )
    db.add(song)
    db.commit()
    db.refresh(song)
    return song


@router.patch("/{song_id}", response_model=SongResponse)
async def update_song(song_id: str, data: SongUpdate, db: Session = Depends(get_db)):
    song = db.query(Song).filter(Song.id == song_id).first()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(song, key, value)

    db.commit()
    db.refresh(song)
    return song


@router.delete("/{song_id}", status_code=204)
async def delete_song(song_id: str, db: Session = Depends(get_db)):
    song = db.query(Song).filter(Song.id == song_id).first()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    db.delete(song)
    db.commit()
