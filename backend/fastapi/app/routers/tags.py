"""Tag CRUD endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Tag
from app.schemas import TagCreate, TagUpdate, TagResponse

router = APIRouter()


@router.get("/", response_model=list[TagResponse])
async def list_tags(song_id: str | None = None, db: Session = Depends(get_db)):
    query = db.query(Tag)
    if song_id:
        query = query.filter(Tag.song_id == song_id)
    return query.order_by(Tag.timestamp_ms).all()


@router.post("/", response_model=TagResponse, status_code=201)
async def create_tag(data: TagCreate, db: Session = Depends(get_db)):
    tag = Tag(**data.model_dump())
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


@router.patch("/{tag_id}", response_model=TagResponse)
async def update_tag(tag_id: str, data: TagUpdate, db: Session = Depends(get_db)):
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(tag, key, value)

    db.commit()
    db.refresh(tag)
    return tag


@router.delete("/{tag_id}", status_code=204)
async def delete_tag(tag_id: str, db: Session = Depends(get_db)):
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    db.delete(tag)
    db.commit()
